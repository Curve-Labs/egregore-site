"""Org-level analytics (AM1-AM10).

Runs the same 10 metrics as bin/analytics-data.sh, server-side.
Used by GET /api/analytics/org.
"""

import asyncio

from .graph import execute_query


async def _cadence(org: dict) -> dict:
    """AM1: Session cadence per person (4 weeks)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person)
        WHERE date(s.date) >= date() - duration('P28D')
        WITH p.name AS person,
             duration.inDays(date(s.date), date()).days / 7 AS weeksAgo,
             count(s) AS sessions
        RETURN person, weeksAgo, sessions
        ORDER BY person, weeksAgo
    """)


async def _resolution(org: dict) -> dict:
    """AM2: Handoff resolution time distribution."""
    return await execute_query(org, """
        MATCH (s:Session)-[:HANDED_TO]->(p:Person)
        WHERE s.handoffStatus = 'done' AND date(s.date) >= date() - duration('P30D')
          AND s.handoffReadDate IS NOT NULL
        WITH p.name AS recipient,
             duration.inDays(date(s.date), date(s.handoffReadDate)).days AS resolutionDays
        RETURN recipient,
               avg(resolutionDays) AS avgDays,
               min(resolutionDays) AS minDays,
               max(resolutionDays) AS maxDays,
               count(*) AS total
        ORDER BY recipient
    """)


async def _quest_velocity(org: dict) -> dict:
    """AM3: Quest velocity — artifacts per week per active quest."""
    return await execute_query(org, """
        MATCH (q:Quest {status: 'active'})
        OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
        WHERE a.created >= datetime() - duration('P28D')
        WITH q.id AS quest, q.title AS title,
             CASE WHEN a IS NOT NULL
               THEN duration.inDays(date(a.created), date()).days / 7
               ELSE null END AS weeksAgo,
             count(a) AS artifacts
        RETURN quest, title, weeksAgo, artifacts
        ORDER BY quest, weeksAgo
    """)


async def _collaboration_density(org: dict) -> dict:
    """AM4: Collaboration density — person pairs sharing quest contributions."""
    return await execute_query(org, """
        MATCH (a1:Artifact)-[:CONTRIBUTED_BY]->(p1:Person),
              (a2:Artifact)-[:CONTRIBUTED_BY]->(p2:Person),
              (a1)-[:PART_OF]->(q:Quest),
              (a2)-[:PART_OF]->(q)
        WHERE p1.name < p2.name
        RETURN p1.name AS person1, p2.name AS person2,
               count(DISTINCT q) AS sharedQuests
        ORDER BY sharedQuests DESC
    """)


async def _todo_health(org: dict) -> dict:
    """AM5: Todo health snapshot — status counts per person."""
    return await execute_query(org, """
        MATCH (t:Todo)-[:BY]->(p:Person)
        WHERE t.status IN ['open', 'blocked', 'deferred', 'done']
        WITH p.name AS person, t.status AS status, count(t) AS cnt,
             CASE WHEN t.status = 'blocked' AND t.lastTransitionDate <= datetime() - duration('P3D')
               THEN 1 ELSE 0 END AS isStale
        RETURN person, status, sum(cnt) AS count, sum(isStale) AS staleCount
        ORDER BY person, status
    """)


async def _todo_throughput(org: dict) -> dict:
    """AM6: Todo throughput — created vs completed per week per person (28d)."""
    return await execute_query(org, """
        MATCH (t:Todo)-[:BY]->(p:Person)
        WHERE t.created >= datetime() - duration('P28D') OR
              (t.status = 'done' AND t.lastTransitionDate >= datetime() - duration('P28D'))
        WITH p.name AS person,
             CASE WHEN t.created >= datetime() - duration('P28D')
               THEN duration.inDays(date(t.created), date()).days / 7
               ELSE null END AS createdWeek,
             CASE WHEN t.status = 'done' AND t.lastTransitionDate >= datetime() - duration('P28D')
               THEN duration.inDays(date(t.lastTransitionDate), date()).days / 7
               ELSE null END AS doneWeek
        RETURN person,
               createdWeek, count(CASE WHEN createdWeek IS NOT NULL THEN 1 END) AS created,
               doneWeek, count(CASE WHEN doneWeek IS NOT NULL THEN 1 END) AS completed
        ORDER BY person
    """)


async def _capture_ratio(org: dict) -> dict:
    """AM7: Knowledge capture ratio — sessions with same-day artifacts / total (28d)."""
    return await execute_query(org, """
        MATCH (s:Session)-[:BY]->(p:Person)
        WHERE date(s.date) >= date() - duration('P28D')
        OPTIONAL MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p)
        WHERE a.created >= datetime({year: s.date.year, month: s.date.month, day: s.date.day})
          AND a.created < datetime({year: s.date.year, month: s.date.month, day: s.date.day}) + duration('P1D')
        WITH p.name AS person, s, count(a) AS artifactCount
        WITH person,
             count(s) AS totalSessions,
             count(CASE WHEN artifactCount > 0 THEN 1 END) AS capturedSessions
        RETURN person, totalSessions, capturedSessions,
               CASE WHEN totalSessions > 0
                 THEN round(toFloat(capturedSessions) / toFloat(totalSessions) * 100) / 100
                 ELSE 0.0 END AS ratio
        ORDER BY person
    """)


async def _question_response(org: dict) -> dict:
    """AM8: Question response time — avg days to answer per person."""
    return await execute_query(org, """
        MATCH (qs:QuestionSet {status: 'answered'})-[:ASKED_TO]->(p:Person)
        WHERE qs.created >= datetime() - duration('P30D')
        WITH p.name AS person,
             count(qs) AS answered,
             avg(duration.inDays(date(qs.created), date()).days) AS avgResponseDays
        RETURN person, answered, avgResponseDays
        ORDER BY person
    """)


async def _checkin_frequency(org: dict) -> dict:
    """AM9: Check-in frequency — check-ins per person with totals."""
    return await execute_query(org, """
        MATCH (c:CheckIn)-[:BY]->(p:Person)
        WHERE date(c.date) >= date() - duration('P28D')
        RETURN p.name AS person, count(c) AS checkIns,
               sum(c.totalItems) AS totalReviewed
        ORDER BY person
    """)


async def _issue_lifecycle(org: dict) -> dict:
    """AM10: Issue/todo lifecycle — status distribution, who creates most."""
    return await execute_query(org, """
        MATCH (t:Todo)-[:BY]->(p:Person)
        WITH t.status AS status, p.name AS creator, count(t) AS cnt
        RETURN status, creator, cnt
        ORDER BY status, cnt DESC
    """)


async def get_org_analytics(org: dict) -> dict:
    """Run all 10 analytics queries concurrently and return structured results."""
    results = await asyncio.gather(
        _cadence(org),
        _resolution(org),
        _quest_velocity(org),
        _collaboration_density(org),
        _todo_health(org),
        _todo_throughput(org),
        _capture_ratio(org),
        _question_response(org),
        _checkin_frequency(org),
        _issue_lifecycle(org),
        return_exceptions=True,
    )

    def safe(r):
        if isinstance(r, Exception):
            return {"error": str(r)}
        return r

    return {
        "cadence": safe(results[0]),
        "resolution": safe(results[1]),
        "quest_velocity": safe(results[2]),
        "collaboration_density": safe(results[3]),
        "todo_health": safe(results[4]),
        "todo_throughput": safe(results[5]),
        "capture_ratio": safe(results[6]),
        "question_response": safe(results[7]),
        "checkin_frequency": safe(results[8]),
        "issue_lifecycle": safe(results[9]),
    }
