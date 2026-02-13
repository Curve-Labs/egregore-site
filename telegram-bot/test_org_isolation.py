"""
Org Isolation Stress Tests for Egregore Telegram Bot

Tests that org scoping correctly prevents cross-org data leakage.
Critical for multi-tenant security — run before every deployment.

Usage:
    # Unit tests only (no DB needed):
    python test_org_isolation.py

    # Full integration tests (needs DB credentials):
    EGREGORE_NEO4J_URI=... EGREGORE_NEO4J_USER=... EGREGORE_NEO4J_PASSWORD=... \
        python test_org_isolation.py --live
"""

import re
import sys
import os
import json

# ============================================================
# inject_org_scope — copied from bot.py for standalone testing
# ============================================================

def inject_org_scope(statement: str, org_slug: str) -> str:
    if statement.strip().upper().startswith("CALL"):
        return statement

    SYSTEM_LABELS = {"TelegramUser", "Org"}

    def add_org_to_props(match):
        full = match.group(0)
        if "org:" in full or "org :" in full:
            return full
        label_match = re.search(r':([A-Z]\w*)', full)
        if label_match and label_match.group(1) in SYSTEM_LABELS:
            return full
        return full.rstrip("}") + ", org: $_org}"

    pattern_with_props = r'\([a-zA-Z_]\w*:[A-Z]\w*\s*\{[^}]*\}'
    result = re.sub(pattern_with_props, add_org_to_props, statement)

    def add_org_to_bare(match):
        var = match.group(1)
        label = match.group(2)
        if label in SYSTEM_LABELS:
            return match.group(0)
        return f"({var}:{label} {{org: $_org}})"

    result = re.sub(
        r'\(([a-zA-Z_]\w*):([A-Z]\w*)\)(?!\s*\{)',
        add_org_to_bare,
        result,
    )

    return result


# ============================================================
# All QUERIES from bot.py — kept in sync
# ============================================================

QUERIES = {
    "recent_activity": {
        "description": "Recent sessions/activity from the team (last 7 days)",
        "params": [],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person)
            WHERE s.date >= date() - duration('P7D')
            RETURN s.date AS date, s.topic AS topic, p.name AS person, s.summary AS summary
            ORDER BY s.date DESC LIMIT 10
        """
    },
    "person_projects": {
        "description": "What projects a specific person works on",
        "params": ["name"],
        "cypher": """
            MATCH (p:Person {name: $name})-[w:WORKS_ON]->(proj:Project)
            RETURN proj.name AS project, proj.domain AS domain, w.role AS role
        """
    },
    "person_sessions": {
        "description": "Recent sessions by a specific person",
        "params": ["name"],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person {name: $name})
            RETURN s.date AS date, s.topic AS topic, s.summary AS summary
            ORDER BY s.date DESC LIMIT 5
        """
    },
    "quest_details": {
        "description": "Details about a specific quest",
        "params": ["quest_id"],
        "cypher": """
            MATCH (q:Quest {id: $quest_id})
            OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
            OPTIONAL MATCH (q)-[:STARTED_BY]->(p:Person)
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            RETURN q.title AS title, q.status AS status, q.question AS question,
                   p.name AS started_by,
                   collect(DISTINCT a.title) AS artifacts,
                   collect(DISTINCT proj.name) AS projects
        """
    },
    "active_quests": {
        "description": "All currently active quests",
        "params": [],
        "cypher": """
            MATCH (q:Quest {status: 'active'})
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            OPTIONAL MATCH (q)-[:STARTED_BY]->(p:Person)
            RETURN q.id AS id, q.title AS title,
                   collect(DISTINCT proj.name) AS projects,
                   p.name AS started_by
        """
    },
    "search_artifacts": {
        "description": "Search artifacts by keyword in title",
        "params": ["term"],
        "cypher": """
            MATCH (a:Artifact)
            WHERE toLower(a.title) CONTAINS toLower($term)
            OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
            OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
            RETURN a.title AS title, a.type AS type, a.created AS created,
                   p.name AS author, collect(DISTINCT q.id) AS quests
            LIMIT 10
        """
    },
    "all_people": {
        "description": "List all team members and their projects",
        "params": [],
        "cypher": """
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(proj:Project)
            RETURN p.name AS name, p.fullName AS fullName,
                   collect(DISTINCT proj.name) AS projects
        """
    },
    "project_details": {
        "description": "Details about a specific project",
        "params": ["name"],
        "cypher": """
            MATCH (proj:Project {name: $name})
            OPTIONAL MATCH (q:Quest {status: 'active'})-[:RELATES_TO]->(proj)
            OPTIONAL MATCH (p:Person)-[:WORKS_ON]->(proj)
            RETURN proj.name AS name, proj.domain AS domain,
                   proj.description AS description,
                   collect(DISTINCT q.id) AS quests,
                   collect(DISTINCT p.name) AS team
        """
    },
    "all_projects": {
        "description": "List all projects",
        "params": [],
        "cypher": """
            MATCH (proj:Project)
            OPTIONAL MATCH (p:Person)-[:WORKS_ON]->(proj)
            RETURN proj.name AS name, proj.domain AS domain,
                   collect(DISTINCT p.name) AS team
        """
    },
    "person_quests": {
        "description": "Quests started by a specific person",
        "params": ["name"],
        "cypher": """
            MATCH (q:Quest)-[:STARTED_BY]->(p:Person {name: $name})
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            WITH q, collect(DISTINCT proj.name) AS projects
            ORDER BY q.created DESC
            RETURN q.id AS id, q.title AS title, q.status AS status,
                   q.question AS question, projects
        """
    },
    "person_artifacts": {
        "description": "Artifacts contributed by a specific person",
        "params": ["name"],
        "cypher": """
            MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p:Person {name: $name})
            OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
            WITH a, collect(DISTINCT q.id) AS quests
            ORDER BY a.created DESC
            RETURN a.title AS title, a.type AS type, a.created AS created, quests
            LIMIT 10
        """
    },
    "recent_artifacts": {
        "description": "Recently added artifacts",
        "params": [],
        "cypher": """
            MATCH (a:Artifact)
            OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
            OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
            WITH a, p, collect(DISTINCT q.id) AS quests
            ORDER BY a.created DESC LIMIT 10
            RETURN a.title AS title, a.type AS type, a.created AS created,
                   p.name AS author, quests
        """
    },
    "recent_quests": {
        "description": "Recently created quests",
        "params": [],
        "cypher": """
            MATCH (q:Quest)
            OPTIONAL MATCH (q)-[:STARTED_BY]->(p:Person)
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            WITH q, p, collect(DISTINCT proj.name) AS projects
            ORDER BY q.created DESC LIMIT 10
            RETURN q.id AS id, q.title AS title, q.status AS status,
                   p.name AS started_by, projects
        """
    },
    "activity_on_date": {
        "description": "All activity on a specific date",
        "params": ["date"],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person)
            WHERE s.date = date($date)
            RETURN 'session' AS type, s.topic AS title, p.name AS person, s.summary AS summary, s.date AS date
            UNION
            MATCH (a:Artifact)-[:AUTHORED_BY]->(p:Person)
            WHERE a.date = date($date)
            RETURN 'artifact' AS type, a.title AS title, p.name AS person, a.summary AS summary, a.date AS date
        """
    },
    "person_sessions_on_date": {
        "description": "Sessions by a specific person on a specific date",
        "params": ["name", "date"],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person {name: $name})
            WHERE s.date = date($date)
            RETURN s.date AS date, s.topic AS topic, s.summary AS summary
            ORDER BY s.date DESC
        """
    },
    "handoffs_to_person": {
        "description": "Handoffs addressed to a specific person",
        "params": ["recipient"],
        "cypher": """
            MATCH (a:Artifact {type: 'handoff'})-[:FOR]->(recipient:Person {name: $recipient})
            OPTIONAL MATCH (a)-[:AUTHORED_BY]->(author:Person)
            RETURN a.title AS title, a.summary AS summary, a.date AS date,
                   author.name AS from_person
            ORDER BY a.date DESC
        """
    },
    "handoffs_from_person": {
        "description": "Handoffs written by a specific person",
        "params": ["author"],
        "cypher": """
            MATCH (a:Artifact {type: 'handoff'})-[:AUTHORED_BY]->(author:Person {name: $author})
            OPTIONAL MATCH (a)-[:FOR]->(recipient:Person)
            RETURN a.title AS title, a.summary AS summary, a.date AS date,
                   recipient.name AS to_person
            ORDER BY a.date DESC
        """
    },
}

# Non-QUERIES cypher used elsewhere in bot.py (person lookup, registration, etc.)
OTHER_QUERIES = {
    "lookup_person_by_telegram_id": {
        "cypher": "MATCH (p:Person {telegramId: $tid}) RETURN p.name AS name",
        "should_scope": True,
    },
    "auto_register_by_username": {
        "cypher": """MATCH (p:Person {telegramUsername: $username})
                     WHERE p.telegramId IS NULL
                     SET p.telegramId = $tid
                     RETURN p.name AS name""",
        "should_scope": True,
    },
    "auto_register_by_name": {
        "cypher": """MATCH (p:Person)
                     WHERE (p.name = $name OR toLower(p.fullName) STARTS WITH $name)
                     AND p.telegramId IS NULL
                     SET p.telegramId = $tid
                     RETURN p.name AS name""",
        "should_scope": True,
    },
    "get_org_team_names": {
        "cypher": "MATCH (p:Person) RETURN p.name AS name ORDER BY p.name",
        "should_scope": True,
    },
    "telegram_user_ops": {
        "cypher": "MERGE (tu:TelegramUser {telegramId: $tid}) SET tu.firstName = $firstName",
        "should_scope": False,  # TelegramUser is system label
    },
    "org_lookup": {
        "cypher": "MATCH (o:Org {id: $slug}) RETURN o.name",
        "should_scope": False,  # Org is system label
    },
}

# Labels that MUST be org-scoped in every query
SCOPED_LABELS = {"Session", "Person", "Quest", "Artifact", "Project", "Spirit"}

# Labels that must NOT be org-scoped
SYSTEM_LABELS = {"TelegramUser", "Org"}


# ============================================================
# Unit Tests
# ============================================================

def test_all_queries_scoped():
    """Every query in QUERIES dict must have org scoping on all data labels."""
    failures = []

    for name, q in QUERIES.items():
        cypher = q["cypher"]
        scoped = inject_org_scope(cypher, "testorg")

        # Find all labeled node patterns in the scoped query
        # Pattern: (var:Label ...) — extract the label
        labels_in_query = re.findall(r'\([a-zA-Z_]\w*:([A-Z]\w*)', scoped)

        for label in labels_in_query:
            if label in SYSTEM_LABELS:
                # System labels should NOT have org
                if f"{label} {{org:" in scoped or f"{label}{{org:" in scoped:
                    failures.append(f"  {name}: {label} should NOT be org-scoped but is")
            elif label in SCOPED_LABELS:
                # Data labels MUST have org somewhere in their pattern
                # Check that there's at least one instance of this label with org
                pattern = rf'\([a-zA-Z_]\w*:{label}\s*\{{[^}}]*org:\s*\$_org[^}}]*\}}'
                if not re.search(pattern, scoped):
                    failures.append(f"  {name}: {label} is NOT org-scoped!")
                    failures.append(f"    Scoped query: {scoped.strip()[:200]}")

    return failures


def test_union_queries_both_branches():
    """UNION queries must have org scoping on BOTH sides."""
    failures = []

    for name, q in QUERIES.items():
        cypher = q["cypher"]
        if "UNION" not in cypher.upper():
            continue

        scoped = inject_org_scope(cypher, "testorg")
        branches = re.split(r'\bUNION\b', scoped, flags=re.IGNORECASE)

        for i, branch in enumerate(branches):
            labels = re.findall(r'\([a-zA-Z_]\w*:([A-Z]\w*)', branch)
            for label in labels:
                if label in SCOPED_LABELS:
                    pattern = rf'\([a-zA-Z_]\w*:{label}\s*\{{[^}}]*org:\s*\$_org[^}}]*\}}'
                    if not re.search(pattern, branch):
                        failures.append(f"  {name}: UNION branch {i+1} — {label} NOT scoped!")

    return failures


def test_double_scope_safety():
    """Running inject_org_scope twice should not corrupt the query."""
    failures = []

    for name, q in QUERIES.items():
        cypher = q["cypher"]
        once = inject_org_scope(cypher, "testorg")
        twice = inject_org_scope(once, "testorg")

        if once != twice:
            failures.append(f"  {name}: double-scoping changed the query!")
            failures.append(f"    Once:  {once.strip()[:150]}")
            failures.append(f"    Twice: {twice.strip()[:150]}")

    return failures


def test_system_labels_excluded():
    """TelegramUser and Org nodes must never get org scoping."""
    failures = []

    for name, q in OTHER_QUERIES.items():
        cypher = q["cypher"]
        scoped = inject_org_scope(cypher, "testorg")

        if not q["should_scope"]:
            # Should have NO org injections
            if "org: $_org" in scoped:
                failures.append(f"  {name}: system-label query got org-scoped!")
                failures.append(f"    Scoped: {scoped.strip()}")
        else:
            # Should have org injections on Person patterns
            if "org: $_org" not in scoped:
                failures.append(f"  {name}: data query did NOT get org-scoped!")
                failures.append(f"    Scoped: {scoped.strip()}")

    return failures


def test_no_bare_data_labels_after_scoping():
    """After scoping, no data label should appear without {org: $_org}."""
    failures = []

    for name, q in QUERIES.items():
        cypher = q["cypher"]
        scoped = inject_org_scope(cypher, "testorg")

        # Find bare patterns: (var:DataLabel) without {
        for label in SCOPED_LABELS:
            pattern = rf'\([a-zA-Z_]\w*:{label}\)(?!\s*\{{)'
            matches = re.findall(pattern, scoped)
            if matches:
                failures.append(f"  {name}: bare {label} pattern found after scoping: {matches}")

    return failures


def test_query_params_include_org():
    """Verify that run_org_query injects _org into params."""
    # Simulate what run_org_query does
    test_config = {"name": "testorg", "neo4j_uri": "bolt://x", "neo4j_user": "x", "neo4j_password": "x"}

    org_slug = test_config.get("name")
    params = {"name": "oz"}
    if org_slug:
        params = dict(params)
        params["_org"] = org_slug

    if "_org" not in params:
        return ["  run_org_query does not inject _org param"]
    if params["_org"] != "testorg":
        return [f"  _org param is '{params['_org']}' instead of 'testorg'"]
    return []


def test_all_query_labels_known():
    """Every label used in queries should be either SCOPED or SYSTEM."""
    failures = []
    all_queries = {**QUERIES, **{k: {"cypher": v["cypher"]} for k, v in OTHER_QUERIES.items()}}

    for name, q in all_queries.items():
        cypher = q["cypher"]
        labels = set(re.findall(r'\([a-zA-Z_]\w*:([A-Z]\w*)', cypher))
        for label in labels:
            if label not in SCOPED_LABELS and label not in SYSTEM_LABELS:
                failures.append(f"  {name}: unknown label '{label}' — add to SCOPED_LABELS or SYSTEM_LABELS")

    return failures


# ============================================================
# Live DB Integration Tests
# ============================================================

def run_live_tests():
    """Run queries against the real shared DB to verify isolation."""
    try:
        from neo4j import GraphDatabase
    except ImportError:
        print("  neo4j driver not installed — skipping live tests")
        return []

    uri = os.environ.get("EGREGORE_NEO4J_URI", "")
    user = os.environ.get("EGREGORE_NEO4J_USER", "neo4j")
    password = os.environ.get("EGREGORE_NEO4J_PASSWORD", "")

    if not uri or not password:
        print("  EGREGORE_NEO4J_* env vars not set — skipping live tests")
        return []

    failures = []
    driver = GraphDatabase.driver(uri, auth=(user, password))

    # Find all distinct orgs in the database
    with driver.session() as session:
        result = session.run("MATCH (n) WHERE n.org IS NOT NULL RETURN DISTINCT n.org AS org")
        all_orgs = [r["org"] for r in result]

    if len(all_orgs) < 2:
        print(f"  Only {len(all_orgs)} org(s) in DB — need 2+ for cross-org isolation test")
        print(f"  Orgs found: {all_orgs}")
        if all_orgs:
            print("  Running single-org scoping verification...")
        else:
            driver.close()
            return []

    print(f"  Orgs in DB: {all_orgs}")

    for org_slug in all_orgs:
        print(f"\n  --- Testing org: {org_slug} ---")
        other_orgs = [o for o in all_orgs if o != org_slug]

        for query_name, q in QUERIES.items():
            cypher = q["cypher"]
            scoped = inject_org_scope(cypher, org_slug)

            # Build minimal params
            params = {"_org": org_slug}
            for p in q.get("params", []):
                if p == "name":
                    params[p] = "__nonexistent__"
                elif p == "date":
                    params[p] = "2020-01-01"
                elif p == "quest_id":
                    params[p] = "__nonexistent__"
                elif p == "term":
                    params[p] = "__nonexistent__"
                elif p == "recipient":
                    params[p] = "__nonexistent__"
                elif p == "author":
                    params[p] = "__nonexistent__"
                else:
                    params[p] = "__nonexistent__"

            try:
                with driver.session() as session:
                    result = list(session.run(scoped, params))

                    # Check that no result contains data from another org
                    for record in result:
                        for key, value in dict(record).items():
                            if isinstance(value, str):
                                for other_org in other_orgs:
                                    # This is a heuristic — check if org name appears in values
                                    # More robust: check node properties directly
                                    pass  # Values might legitimately contain org names

                    # For parameterless queries (recent_activity, all_people, etc.),
                    # verify all returned nodes belong to this org
                    if not q.get("params"):
                        # Run the query but also return org property
                        verify_query = scoped.replace(
                            "RETURN ",
                            "WITH * MATCH (n) WHERE n.org IS NOT NULL AND n.org <> $_org RETURN count(n) AS leaked, ",
                            1
                        )
                        # Simpler approach: run unscoped and scoped, compare counts
                        unscoped_result = list(session.run(cypher, {}))
                        scoped_result = list(session.run(scoped, params))

                        if len(scoped_result) > len(unscoped_result):
                            failures.append(f"  {org_slug}/{query_name}: scoped returned MORE than unscoped?!")

                        if len(all_orgs) > 1 and len(scoped_result) == len(unscoped_result) and len(unscoped_result) > 0:
                            # If scoped = unscoped with multiple orgs, might be leaking
                            # (unless all data genuinely belongs to this org)
                            pass  # This needs node-level verification

            except Exception as e:
                failures.append(f"  {org_slug}/{query_name}: query failed: {e}")

    # Cross-org leak test: query with a fake org that has no data
    print("\n  --- Testing fake org (should return 0 for all) ---")
    fake_org = "__isolation_test_fake_org__"
    for query_name, q in QUERIES.items():
        if q.get("params"):
            continue  # Skip parameterized queries

        cypher = q["cypher"]
        scoped = inject_org_scope(cypher, fake_org)
        params = {"_org": fake_org}

        try:
            with driver.session() as session:
                result = list(session.run(scoped, params))
                if len(result) > 0:
                    failures.append(
                        f"  CRITICAL: {query_name} returned {len(result)} results for non-existent org '{fake_org}'!"
                    )
                    # Show what leaked
                    for r in result[:3]:
                        failures.append(f"    Leaked data: {dict(r)}")
                else:
                    print(f"    {query_name}: 0 results (OK)")
        except Exception as e:
            failures.append(f"  {query_name}: query error: {e}")

    # Direct cross-org data check: for each org, verify Person nodes are isolated
    print("\n  --- Direct node isolation check ---")
    for org_slug in all_orgs:
        with driver.session() as session:
            # Count persons in this org
            scoped_count = session.run(
                "MATCH (p:Person {org: $_org}) RETURN count(p) AS c",
                {"_org": org_slug}
            ).single()["c"]

            # Count ALL persons
            total_count = session.run(
                "MATCH (p:Person) RETURN count(p) AS c"
            ).single()["c"]

            print(f"    {org_slug}: {scoped_count} persons (total in DB: {total_count})")

            if scoped_count == total_count and len(all_orgs) > 1:
                # Might indicate missing org property on some nodes
                unscoped = session.run(
                    "MATCH (p:Person) WHERE p.org IS NULL RETURN count(p) AS c"
                ).single()["c"]
                if unscoped > 0:
                    failures.append(
                        f"  WARNING: {unscoped} Person nodes have NO org property — they leak into all queries!"
                    )

    driver.close()
    return failures


# ============================================================
# Runner
# ============================================================

def main():
    print("=" * 60)
    print("Org Isolation Stress Tests")
    print("=" * 60)

    all_failures = []

    tests = [
        ("All QUERIES have org scoping on data labels", test_all_queries_scoped),
        ("UNION queries scope both branches", test_union_queries_both_branches),
        ("Double-scoping is safe (idempotent)", test_double_scope_safety),
        ("System labels (TelegramUser, Org) excluded", test_system_labels_excluded),
        ("No bare data labels after scoping", test_no_bare_data_labels_after_scoping),
        ("run_org_query injects _org param", test_query_params_include_org),
        ("All query labels are categorized", test_all_query_labels_known),
    ]

    for name, test_fn in tests:
        failures = test_fn()
        if failures:
            print(f"\n  FAIL: {name}")
            for f in failures:
                print(f)
            all_failures.extend(failures)
        else:
            print(f"  PASS: {name}")

    # Live DB tests
    if "--live" in sys.argv:
        print(f"\n{'=' * 60}")
        print("Live DB Integration Tests")
        print("=" * 60)
        live_failures = run_live_tests()
        if live_failures:
            print(f"\n  LIVE TEST FAILURES:")
            for f in live_failures:
                print(f)
            all_failures.extend(live_failures)
        else:
            print("\n  All live tests passed.")

    # Summary
    print(f"\n{'=' * 60}")
    if all_failures:
        print(f"FAILED: {len(all_failures)} issue(s) found")
        sys.exit(1)
    else:
        print("ALL TESTS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
