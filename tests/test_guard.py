"""Tests for API gateway query protections.

Covers: validate_query, check_org_tampering, RateLimiter, audit_log,
classify_query, and the 10KB query size limit on GraphQuery.
"""

import sys
import time
import logging
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.services.guard import (
    validate_query,
    check_org_tampering,
    RateLimiter,
    RateLimitError,
    audit_log,
    classify_query,
    _strip_quoted_strings,
    _tokenize,
)


# =============================================================================
# VALIDATE_QUERY — BLOCKED OPERATIONS
# =============================================================================


class TestBlockedOperations:
    """Destructive operations must be rejected."""

    def test_delete_blocked(self):
        with pytest.raises(ValueError, match="DELETE"):
            validate_query("MATCH (n:Person) DELETE n")

    def test_detach_delete_blocked(self):
        with pytest.raises(ValueError, match="DETACH"):
            validate_query("MATCH (n) DETACH DELETE n")

    def test_drop_blocked(self):
        with pytest.raises(ValueError, match="DROP"):
            validate_query("DROP INDEX my_index")

    def test_remove_blocked(self):
        with pytest.raises(ValueError, match="REMOVE"):
            validate_query("MATCH (n:Person) REMOVE n.email")

    def test_create_index_blocked(self):
        with pytest.raises(ValueError, match="CREATE INDEX"):
            validate_query("CREATE INDEX FOR (n:Person) ON (n.name)")

    def test_create_constraint_blocked(self):
        with pytest.raises(ValueError, match="CREATE CONSTRAINT"):
            validate_query("CREATE CONSTRAINT FOR (n:Person) REQUIRE n.id IS UNIQUE")

    def test_delete_case_insensitive(self):
        with pytest.raises(ValueError, match="DELETE"):
            validate_query("match (n) delete n")

    def test_detach_in_complex_query(self):
        with pytest.raises(ValueError, match="DETACH"):
            validate_query(
                "MATCH (n:Person {org: $_org}) DETACH DELETE n"
            )

    def test_unauthorized_call_blocked(self):
        with pytest.raises(ValueError, match="not in the allowlist"):
            validate_query("CALL dbms.security.createUser('admin', 'pass', false)")

    def test_unauthorized_call_apoc_blocked(self):
        with pytest.raises(ValueError, match="not in the allowlist"):
            validate_query("CALL apoc.periodic.iterate('MATCH (n) RETURN n', 'DELETE n')")


# =============================================================================
# VALIDATE_QUERY — ALLOWED OPERATIONS
# =============================================================================


class TestAllowedOperations:
    """Legitimate operations must pass validation."""

    def test_match_return(self):
        validate_query("MATCH (p:Person) RETURN p")

    def test_create_node(self):
        validate_query("CREATE (s:Session {topic: $topic})")

    def test_merge_node(self):
        validate_query("MERGE (p:Person {name: $name})")

    def test_set_property(self):
        validate_query("MATCH (p:Person {name: $name}) SET p.email = $email")

    def test_match_with_where(self):
        validate_query("MATCH (p:Person) WHERE p.name = $name RETURN p")

    def test_complex_merge_match(self):
        validate_query(
            "MERGE (p:Person {name: $name}) "
            "WITH p "
            "MATCH (o:Org {id: $_org}) "
            "MERGE (p)-[:MEMBER_OF]->(o)"
        )

    def test_return_literal(self):
        validate_query("RETURN 1 AS ok")

    def test_call_db_schema_visualization(self):
        validate_query("CALL db.schema.visualization()")

    def test_call_db_labels(self):
        validate_query("CALL db.labels()")

    def test_call_db_relationship_types(self):
        validate_query("CALL db.relationshipTypes()")

    def test_call_db_property_keys(self):
        validate_query("CALL db.propertyKeys()")

    def test_call_dbms_components(self):
        validate_query("CALL dbms.components()")

    def test_order_by_limit(self):
        validate_query("MATCH (s:Session) RETURN s ORDER BY s.date DESC LIMIT 10")

    def test_count_aggregation(self):
        validate_query("MATCH (p:Person)-[:BY]->(s:Session) RETURN p.name, count(s)")

    def test_optional_match(self):
        validate_query(
            "MATCH (p:Person) OPTIONAL MATCH (p)-[:BY]->(s:Session) RETURN p, s"
        )

    def test_unwind(self):
        validate_query("UNWIND $names AS name MERGE (p:Person {name: name})")


# =============================================================================
# FALSE POSITIVE PREVENTION
# =============================================================================


class TestFalsePositivePrevention:
    """Keywords inside strings and property names must NOT trigger blocks."""

    def test_delete_in_string_literal_double_quotes(self):
        validate_query('SET s.summary = "DELETE the old system"')

    def test_delete_in_string_literal_single_quotes(self):
        validate_query("SET s.summary = 'We need to DELETE old records'")

    def test_remove_in_string_literal(self):
        validate_query('SET s.action = "REMOVE old permissions"')

    def test_drop_in_string_literal(self):
        validate_query('SET s.note = "DROP what is not needed"')

    def test_deleted_at_property_name(self):
        """deletedAt as a property name should NOT trigger DELETE."""
        validate_query("MATCH (p:Person) WHERE p.deletedAt IS NULL RETURN p")

    def test_removal_property_name(self):
        """removalDate should NOT trigger REMOVE."""
        validate_query("MATCH (a:Artifact) SET a.removalDate = $date")

    def test_dropdown_property_name(self):
        """dropdown should NOT trigger DROP."""
        validate_query("MATCH (f:Form) SET f.dropdown = $options")

    def test_keyword_as_substring_of_variable(self):
        """Variable names containing keywords should not trigger."""
        validate_query("MATCH (deleteFlag:Person) RETURN deleteFlag")

    def test_escaped_quotes_in_string(self):
        validate_query(r'SET s.note = "She said \"DELETE everything\""')


# =============================================================================
# REAL-WORLD QUERIES (from activity dashboard)
# =============================================================================


class TestRealWorldQueries:
    """Complex queries from actual Egregore usage must pass."""

    def test_activity_dashboard_sessions(self):
        validate_query(
            "MATCH (s:Session {org: $_org}) "
            "OPTIONAL MATCH (s)<-[:BY]-(p:Person {org: $_org}) "
            "RETURN s.id, s.topic, s.started, p.name "
            "ORDER BY s.started DESC LIMIT 20"
        )

    def test_activity_dashboard_recent_artifacts(self):
        validate_query(
            "MATCH (a:Artifact {org: $_org}) "
            "OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest {org: $_org}) "
            "OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person {org: $_org}) "
            "RETURN a.id, a.title, a.type, a.created, q.name, p.name "
            "ORDER BY a.created DESC LIMIT 20"
        )

    def test_quest_with_relationships(self):
        validate_query(
            "MATCH (q:Quest {org: $_org}) "
            "OPTIONAL MATCH (q)<-[:PART_OF]-(a:Artifact {org: $_org}) "
            "OPTIONAL MATCH (q)<-[:INVOLVES]-(p:Person {org: $_org}) "
            "RETURN q.name, q.status, count(a) AS artifacts, collect(p.name) AS people"
        )

    def test_person_activity_summary(self):
        validate_query(
            "MATCH (p:Person {name: $name, org: $_org}) "
            "OPTIONAL MATCH (p)-[:BY]->(s:Session {org: $_org}) "
            "OPTIONAL MATCH (p)-[:CONTRIBUTED_BY]->(a:Artifact {org: $_org}) "
            "RETURN p.name, count(DISTINCT s) AS sessions, count(DISTINCT a) AS artifacts"
        )


# =============================================================================
# CHECK_ORG_TAMPERING
# =============================================================================


class TestOrgTampering:
    """Clients must not set org property or _org parameter."""

    def test_org_in_statement_rejected(self):
        with pytest.raises(ValueError, match="org"):
            check_org_tampering(
                "MATCH (p:Person {org: 'attacker-org'}) RETURN p", {}
            )

    def test_org_in_statement_with_spaces(self):
        with pytest.raises(ValueError, match="org"):
            check_org_tampering(
                "MATCH (p:Person {org : 'attacker-org'}) RETURN p", {}
            )

    def test_underscore_org_in_parameters(self):
        with pytest.raises(ValueError, match="_org"):
            check_org_tampering("MATCH (p:Person) RETURN p", {"_org": "attacker"})

    def test_org_in_parameters(self):
        with pytest.raises(ValueError, match="org"):
            check_org_tampering("MATCH (p:Person) RETURN p", {"org": "attacker"})

    def test_clean_query_passes(self):
        check_org_tampering("MATCH (p:Person {name: $name}) RETURN p", {"name": "oz"})

    def test_none_parameters_passes(self):
        check_org_tampering("MATCH (p:Person) RETURN p", None)

    def test_empty_parameters_passes(self):
        check_org_tampering("MATCH (p:Person) RETURN p", {})

    def test_org_in_string_not_flagged(self):
        """org: inside a quoted string should not trigger."""
        check_org_tampering('SET s.note = "org: something"', {})

    def test_github_org_parameter_allowed(self):
        """github_org is not org or _org — should be fine."""
        check_org_tampering(
            "MATCH (o:Org) SET o.github_org = $github_org",
            {"github_org": "Curve-Labs"},
        )


# =============================================================================
# RATE LIMITER
# =============================================================================


class TestRateLimiter:
    """Sliding window rate limiter tests."""

    def test_allows_under_limit(self):
        rl = RateLimiter(max_requests=5, window_seconds=60)
        for _ in range(5):
            rl.check("alpha")

    def test_blocks_at_limit(self):
        rl = RateLimiter(max_requests=3, window_seconds=60)
        rl.check("alpha")
        rl.check("alpha")
        rl.check("alpha")
        with pytest.raises(RateLimitError, match="Rate limit exceeded"):
            rl.check("alpha")

    def test_independent_per_org(self):
        rl = RateLimiter(max_requests=2, window_seconds=60)
        rl.check("alpha")
        rl.check("alpha")
        # Alpha is at limit
        with pytest.raises(RateLimitError):
            rl.check("alpha")
        # Beta is independent — should work
        rl.check("beta")
        rl.check("beta")

    def test_window_slides(self):
        """After the window expires, requests are allowed again."""
        rl = RateLimiter(max_requests=2, window_seconds=0.1)
        rl.check("alpha")
        rl.check("alpha")
        with pytest.raises(RateLimitError):
            rl.check("alpha")
        # Wait for window to expire
        time.sleep(0.15)
        # Should be allowed again
        rl.check("alpha")

    def test_cleanup_removes_stale_orgs(self):
        rl = RateLimiter(max_requests=10, window_seconds=0.1)
        rl.check("stale-org")
        time.sleep(0.15)
        # Force cleanup
        rl._cleanup(time.monotonic() - 0.1)
        assert "stale-org" not in rl._timestamps


# =============================================================================
# CLASSIFY_QUERY
# =============================================================================


class TestClassifyQuery:
    def test_match_is_read(self):
        assert classify_query("MATCH (p:Person) RETURN p") == "read"

    def test_return_is_read(self):
        assert classify_query("RETURN 1 AS ok") == "read"

    def test_create_is_write(self):
        assert classify_query("CREATE (s:Session {topic: $t})") == "write"

    def test_merge_is_write(self):
        assert classify_query("MERGE (p:Person {name: $n})") == "write"

    def test_match_set_is_write(self):
        assert classify_query("MATCH (p:Person) SET p.name = $n") == "write"

    def test_call_is_schema(self):
        assert classify_query("CALL db.schema.visualization()") == "schema"

    def test_empty_is_read(self):
        assert classify_query("") == "read"


# =============================================================================
# AUDIT LOG
# =============================================================================


class TestAuditLog:
    def test_audit_log_format(self, caplog):
        with caplog.at_level(logging.INFO):
            audit_log("alpha", "write", 245)
        assert "[AUDIT]" in caplog.text
        assert "org=alpha" in caplog.text
        assert "type=write" in caplog.text
        assert "len=245" in caplog.text

    def test_audit_log_no_query_content(self, caplog):
        """Audit log must not contain query content."""
        with caplog.at_level(logging.INFO):
            audit_log("beta", "read", 100)
        assert "MATCH" not in caplog.text
        assert "Person" not in caplog.text


# =============================================================================
# STRING STRIPPING (internal helper)
# =============================================================================


class TestStringStripping:
    def test_double_quoted_stripped(self):
        result = _strip_quoted_strings('SET s.x = "DELETE me"')
        assert "DELETE" not in result

    def test_single_quoted_stripped(self):
        result = _strip_quoted_strings("SET s.x = 'REMOVE this'")
        assert "REMOVE" not in result

    def test_escaped_quotes_handled(self):
        result = _strip_quoted_strings(r'SET s.x = "say \"DROP\" please"')
        assert "DROP" not in result

    def test_non_string_preserved(self):
        result = _strip_quoted_strings("MATCH (p:Person) DELETE p")
        assert "DELETE" in result


# =============================================================================
# QUERY SIZE LIMIT (via Pydantic model)
# =============================================================================


class TestQuerySizeLimit:
    def test_normal_query_accepted(self):
        from api.models import GraphQuery
        q = GraphQuery(statement="MATCH (p:Person) RETURN p")
        assert q.statement == "MATCH (p:Person) RETURN p"

    def test_max_length_query_accepted(self):
        from api.models import GraphQuery
        stmt = "A" * 10240
        q = GraphQuery(statement=stmt)
        assert len(q.statement) == 10240

    def test_oversized_query_rejected(self):
        from pydantic import ValidationError
        from api.models import GraphQuery
        with pytest.raises(ValidationError):
            GraphQuery(statement="A" * 10241)
