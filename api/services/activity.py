"""Activity dashboard queries — server-side.

Replaces 15+ individual Neo4j queries from bin/activity-data.sh with a single
GET /api/activity/dashboard endpoint. Deploy once, everyone gets fixes.
"""

import asyncio

from .graph import execute_query


async def _resolve_person_name(org: dict, github_username: str) -> str:
    """Resolve Person.name from github username.

    Tries: github property match → case-insensitive name match → raw fallback.
    """
    result = await execute_query(org, """
        MATCH (p:Person)
        WHERE p.github = $gh
           OR toLower(p.name) = toLower($gh)
        RETURN p.name AS name
        LIMIT 1
    """, {"gh": github_username})
    values = result.get("values", [])
    if values and values[0] and values[0][0]:
        return values[0][0]
    return github_username


async def _my_sessions(org: dict, me: str) -> dict:
    """Q1: My sessions (last 10, no date filter)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person {name: $me})
        OPTIONAL MATCH (s)-[:HANDED_TO]->(target:Person)
        RETURN s.date AS date, s.topic AS topic, s.id AS id,
               s.filePath AS filePath, target.name AS handedTo
        ORDER BY s.date DESC, s.id DESC LIMIT 10
    """, {"me": me})


async def _team_sessions(org: dict, me: str) -> dict:
    """Q2: Team sessions (7 days)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person)
        WHERE p.name <> $me AND date(s.date) >= date() - duration('P7D')
        RETURN s.date AS date, s.topic AS topic, p.name AS by
        ORDER BY s.date DESC LIMIT 5
    """, {"me": me})


async def _quests(org: dict, me: str) -> dict:
    """Q3: Active quests (scored with personal relevance)."""
    return await execute_query(org, """
        MATCH (q:Quest {status: 'active'})
        OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
        OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
        WHERE p.name IS NOT NULL AND p.name <> 'external'
        OPTIONAL MATCH (q)-[:STARTED_BY]->(starter:Person {name: $me})
        OPTIONAL MATCH (myArt:Artifact)-[:PART_OF]->(q)
        WHERE (myArt)-[:CONTRIBUTED_BY]->(:Person {name: $me})
        WITH q, count(DISTINCT a) AS artifacts, count(DISTINCT p) AS contributors,
             CASE WHEN count(a) > 0
               THEN duration.inDays(date(max(a.created)), date()).days
               ELSE duration.inDays(date(q.started), date()).days END AS daysSince,
             coalesce(q.priority, 0) AS priority,
             CASE WHEN starter IS NOT NULL THEN 1 ELSE 0 END AS iStarted,
             count(DISTINCT myArt) AS myArtifacts
        WITH q, artifacts, daysSince,
             round((toFloat(artifacts) + toFloat(contributors)*1.5
               + toFloat(priority)*5.0
               + 30.0/(1.0+toFloat(daysSince)*0.5)
               + CASE WHEN iStarted = 1 THEN 15.0 ELSE 0.0 END
               + toFloat(myArtifacts)*3.0) * 100)/100 AS score
        ORDER BY score DESC LIMIT 5
        RETURN q.id AS quest, q.title AS title, artifacts, daysSince, score
    """, {"me": me})


async def _pending_questions(org: dict, me: str) -> dict:
    """Q4: Pending questions for me."""
    return await execute_query(org, """
        MATCH (qs:QuestionSet {status: 'pending'})-[:ASKED_TO]->(p:Person {name: $me})
        MATCH (qs)-[:ASKED_BY]->(asker:Person)
        RETURN qs.id AS setId, qs.topic AS topic, qs.created AS created,
               asker.name AS from
        ORDER BY qs.created DESC LIMIT 10
    """, {"me": me})


async def _answered_questions(org: dict, me: str) -> dict:
    """Q5: Answered questions (7 days)."""
    return await execute_query(org, """
        MATCH (qs:QuestionSet {status: 'answered'})-[:ASKED_BY]->(p:Person {name: $me})
        MATCH (qs)-[:ASKED_TO]->(target:Person)
        WHERE qs.created >= datetime() - duration('P7D')
        RETURN qs.id AS setId, qs.topic AS topic, target.name AS answeredBy
        ORDER BY qs.created DESC LIMIT 10
    """, {"me": me})


async def _resolve_and_fetch_handoffs(org: dict, me: str) -> tuple[dict, dict]:
    """Q_resolve + Q6: Auto-resolve read handoffs THEN fetch (sequential pair).

    Must run sequentially: resolve first, then fetch with accurate status.
    """
    resolve_result = await execute_query(org, """
        MATCH (s:Session)-[:HANDED_TO]->(p:Person {name: $me})
        WHERE s.handoffStatus = 'read'
        WITH s, p, coalesce(s.handoffReadDate, s.date) AS sinceDate
        MATCH (later:Session)-[:BY]->(p)
        WHERE later.date > sinceDate
        WITH s, count(later) AS laterSessions WHERE laterSessions > 0
        SET s.handoffStatus = 'done'
        RETURN s.id AS resolved
    """, {"me": me})

    handoffs_to_me = await execute_query(org, """
        MATCH (s:Session)-[:HANDED_TO]->(p:Person {name: $me})
        WHERE date(s.date) >= date() - duration('P7D')
        MATCH (s)-[:BY]->(author:Person)
        RETURN s.topic AS topic, s.date AS date, author.name AS author,
               s.filePath AS filePath, s.id AS sessionId,
               coalesce(s.handoffStatus, 'pending') AS status,
               s.handoffResponse AS response
        ORDER BY
          CASE coalesce(s.handoffStatus, 'pending')
            WHEN 'pending' THEN 0
            WHEN 'read' THEN 1
            ELSE 2
          END,
          s.date DESC
        LIMIT 8
    """, {"me": me})

    return resolve_result, handoffs_to_me


async def _all_handoffs(org: dict, me: str) -> dict:
    """Q7: All handoffs (7 days)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:HANDED_TO]->(target:Person)
        WHERE date(s.date) >= date() - duration('P7D')
        MATCH (s)-[:BY]->(author:Person)
        RETURN s.topic AS topic, s.date AS date, author.name AS from,
               target.name AS to, s.filePath AS filePath
        ORDER BY s.date DESC LIMIT 5
    """, {"me": me})


async def _checkins(org: dict) -> dict:
    """Q_checkins: Recent check-ins (7 days)."""
    return await execute_query(org, """
        MATCH (c:CheckIn)-[:BY]->(p:Person)
        WHERE date(c.date) >= date() - duration('P7D')
        RETURN c.id AS id, c.summary AS summary, c.date AS date,
               p.name AS by, c.totalItems AS total
        ORDER BY c.date DESC LIMIT 5
    """)


async def _todos_merged(org: dict, me: str) -> dict:
    """Q_todos_merged: Active todos + stale blockers + last checkin."""
    return await execute_query(org, """
        OPTIONAL MATCH (t:Todo)-[:BY]->(:Person {name: $me})
        WHERE t.status IN ['open', 'blocked', 'deferred']
        WITH count(t) AS activeTodoCount,
             count(CASE WHEN t.status = 'blocked' THEN 1 END) AS blockedCount,
             count(CASE WHEN t.status = 'deferred' THEN 1 END) AS deferredCount,
             count(CASE WHEN t.status = 'blocked'
               AND t.lastTransitionDate <= datetime() - duration('P3D')
               THEN 1 END) AS staleBlockedCount
        OPTIONAL MATCH (c:CheckIn)-[:BY]->(:Person {name: $me})
        WITH activeTodoCount, blockedCount, deferredCount, staleBlockedCount, c
        ORDER BY c.date DESC LIMIT 1
        RETURN activeTodoCount, blockedCount, deferredCount,
               staleBlockedCount, c.date AS lastCheckinDate
    """, {"me": me})


async def _knowledge_gap(org: dict, me: str) -> dict:
    """Q_gap: Knowledge gap count — sessions without artifacts (14 days)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person {name: $me})
        WHERE date(s.date) >= date() - duration('P14D')
        OPTIONAL MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p)
        WHERE a.created >= datetime({year: s.date.year, month: s.date.month, day: s.date.day})
          AND a.created < datetime({year: s.date.year, month: s.date.month, day: s.date.day}) + duration('P1D')
        WITH s, count(a) AS artifactCount WHERE artifactCount = 0
        RETURN count(s) AS gapCount
    """, {"me": me})


async def _orphans(org: dict) -> dict:
    """Q_orphans: Orphan artifact count (14 days)."""
    return await execute_query(org, """
        OPTIONAL MATCH (a:Artifact)
        WHERE date(a.created) >= date() - duration('P14D')
          AND NOT (a)-[:PART_OF]->(:Quest)
        RETURN count(a) AS orphanCount
    """)


async def _focus_history(org: dict, me: str) -> dict:
    """Q_focus: Focus selection history."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person {name: $me})
        WHERE s.focusSelected IS NOT NULL
        RETURN s.focusShown AS shown, s.focusSelected AS selected,
               s.focusDismissed AS dismissed, s.date AS date, s.topic AS topic
        ORDER BY s.date DESC LIMIT 5
    """, {"me": me})


async def _cadence(org: dict, me: str) -> dict:
    """AM_cadence: My session count per week (4 weeks)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person {name: $me})
        WHERE date(s.date) >= date() - duration('P28D')
        WITH duration.inDays(date(s.date), date()).days / 7 AS weeksAgo,
             count(s) AS sessions
        RETURN weeksAgo, sessions ORDER BY weeksAgo
    """, {"me": me})


async def _resolution(org: dict, me: str) -> dict:
    """AM_resolution: My handoff resolution stats (30d avg)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:HANDED_TO]->(p:Person {name: $me})
        WHERE s.handoffStatus = 'done' AND date(s.date) >= date() - duration('P30D')
          AND s.handoffReadDate IS NOT NULL
        WITH duration.inDays(date(s.date), date(s.handoffReadDate)).days AS days
        RETURN avg(days) AS avgDays, count(*) AS resolved
    """, {"me": me})


async def _throughput(org: dict, me: str) -> dict:
    """AM_throughput: My todo created vs done (28d)."""
    return await execute_query(org, """
        MATCH (t:Todo)-[:BY]->(p:Person {name: $me})
        WHERE t.created >= datetime() - duration('P28D') OR
              (t.status = 'done' AND t.lastTransitionDate >= datetime() - duration('P28D'))
        RETURN count(CASE WHEN t.created >= datetime() - duration('P28D') THEN 1 END) AS created,
               count(CASE WHEN t.status = 'done'
                 AND t.lastTransitionDate >= datetime() - duration('P28D') THEN 1 END) AS completed
    """, {"me": me})


async def _capture(org: dict, me: str) -> dict:
    """AM_capture: My knowledge capture ratio (28d)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person {name: $me})
        WHERE date(s.date) >= date() - duration('P28D')
        OPTIONAL MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p)
        WHERE a.created >= datetime({year: s.date.year, month: s.date.month, day: s.date.day})
          AND a.created < datetime({year: s.date.year, month: s.date.month, day: s.date.day}) + duration('P1D')
        WITH s, count(a) AS artifacts
        RETURN count(s) AS total,
               count(CASE WHEN artifacts > 0 THEN 1 END) AS captured
    """, {"me": me})


async def get_activity_dashboard(org: dict, github_username: str) -> dict:
    """Run all activity queries concurrently and return structured results.

    1. Resolve Person name from github_username
    2. Run all queries concurrently (except resolve+handoffs which are sequential)
    3. Return structured JSON matching bin/activity-data.sh output shape
    """
    me = await _resolve_person_name(org, github_username)

    # Run the sequential resolve+handoffs pair as one task alongside all concurrent queries
    results = await asyncio.gather(
        _my_sessions(org, me),             # 0
        _team_sessions(org, me),           # 1
        _quests(org, me),                  # 2
        _pending_questions(org, me),       # 3
        _answered_questions(org, me),      # 4
        _resolve_and_fetch_handoffs(org, me),  # 5 → (resolve_result, handoffs_to_me)
        _all_handoffs(org, me),            # 6
        _checkins(org),                    # 7
        _todos_merged(org, me),            # 8
        _knowledge_gap(org, me),           # 9
        _orphans(org),                     # 10
        _focus_history(org, me),           # 11
        _cadence(org, me),                 # 12
        _resolution(org, me),             # 13
        _throughput(org, me),              # 14
        _capture(org, me),                 # 15
        return_exceptions=True,
    )

    def safe(r):
        if isinstance(r, Exception):
            return {"error": str(r)}
        return r

    # Unpack the sequential handoff pair
    handoff_pair = results[5]
    if isinstance(handoff_pair, Exception):
        handoffs_to_me = {"error": str(handoff_pair)}
    else:
        handoffs_to_me = handoff_pair[1]

    return {
        "me": me,
        "my_sessions": safe(results[0]),
        "team_sessions": safe(results[1]),
        "quests": safe(results[2]),
        "pending_questions": safe(results[3]),
        "answered_questions": safe(results[4]),
        "handoffs_to_me": handoffs_to_me,
        "all_handoffs": safe(results[6]),
        "checkins": safe(results[7]),
        "todos_merged": safe(results[8]),
        "knowledge_gap": safe(results[9]),
        "orphans": safe(results[10]),
        "focus_history": safe(results[11]),
        "trends": {
            "cadence": safe(results[12]),
            "resolution": safe(results[13]),
            "throughput": safe(results[14]),
            "capture": safe(results[15]),
        },
    }
