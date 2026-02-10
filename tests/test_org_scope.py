"""Unit tests for inject_org_scope — the multi-tenant query isolation layer.

Tests every regex pattern: bare nodes, property nodes, system labels,
CALL statements, idempotency, CREATE/MERGE/MATCH, and edge cases.
"""

import sys
from pathlib import Path

import pytest

# Allow importing the api package from tests/
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.services.graph import inject_org_scope


class TestBareNodePatterns:
    """(var:Label) → (var:Label {org: $_org})"""

    def test_simple_bare_node(self):
        result = inject_org_scope("MATCH (p:Person) RETURN p", "alpha")
        assert "(p:Person {org: $_org})" in result

    def test_bare_node_with_return(self):
        result = inject_org_scope("MATCH (s:Session) RETURN s.topic", "alpha")
        assert "(s:Session {org: $_org})" in result

    def test_multiple_bare_nodes(self):
        result = inject_org_scope(
            "MATCH (p:Person)-[:BY]->(s:Session) RETURN p, s", "alpha"
        )
        assert "(p:Person {org: $_org})" in result
        assert "(s:Session {org: $_org})" in result

    def test_bare_node_different_var_names(self):
        result = inject_org_scope("MATCH (x:Artifact) RETURN x", "alpha")
        assert "(x:Artifact {org: $_org})" in result

    def test_underscore_var_name(self):
        result = inject_org_scope("MATCH (_node:Quest) RETURN _node", "alpha")
        assert "(_node:Quest {org: $_org})" in result


class TestPropertyNodePatterns:
    """(var:Label {props}) → (var:Label {props, org: $_org})"""

    def test_single_property(self):
        result = inject_org_scope(
            "MATCH (p:Person {name: $name}) RETURN p", "alpha"
        )
        assert "org: $_org}" in result
        assert "name: $name" in result

    def test_multiple_properties(self):
        result = inject_org_scope(
            "MATCH (s:Session {topic: $topic, date: $date}) RETURN s", "alpha"
        )
        assert "org: $_org}" in result
        assert "topic: $topic" in result

    def test_property_with_string_literal(self):
        result = inject_org_scope(
            'MATCH (p:Person {name: "oz"}) RETURN p', "alpha"
        )
        assert "org: $_org}" in result

    def test_mixed_bare_and_property_nodes(self):
        result = inject_org_scope(
            "MATCH (p:Person {name: $name})-[:BY]->(s:Session) RETURN p, s",
            "alpha",
        )
        assert "name: $name, org: $_org}" in result
        assert "(s:Session {org: $_org})" in result


class TestSystemLabels:
    """Org label should NOT be scoped — it's a system-level label."""

    def test_org_label_skipped_bare(self):
        result = inject_org_scope("MATCH (o:Org {id: $id}) RETURN o", "alpha")
        assert "org: $_org" not in result or result == "MATCH (o:Org {id: $id}) RETURN o"

    def test_org_label_skipped_in_mixed_query(self):
        result = inject_org_scope(
            "MATCH (p:Person)-[:MEMBER_OF]->(o:Org) RETURN p, o", "alpha"
        )
        # Person should be scoped
        assert "(p:Person {org: $_org})" in result
        # Org should NOT be scoped
        assert "(o:Org)" in result


class TestCallStatements:
    """CALL statements should pass through unchanged."""

    def test_call_db_schema(self):
        stmt = "CALL db.schema.visualization()"
        result = inject_org_scope(stmt, "alpha")
        assert result == stmt

    def test_call_with_leading_whitespace(self):
        stmt = "  CALL db.labels()"
        result = inject_org_scope(stmt, "alpha")
        assert result == stmt

    def test_call_uppercase(self):
        stmt = "CALL dbms.components()"
        result = inject_org_scope(stmt, "alpha")
        assert result == stmt


class TestIdempotency:
    """Already-scoped queries should not get double org injection."""

    def test_already_scoped_not_doubled(self):
        stmt = "MATCH (p:Person {name: $name, org: $_org}) RETURN p"
        result = inject_org_scope(stmt, "alpha")
        # Should not have "org: $_org, org: $_org"
        assert result.count("org:") == 1 or result.count("org: $_org") == 1

    def test_already_scoped_with_space(self):
        stmt = "MATCH (p:Person {name: $name, org : $_org}) RETURN p"
        result = inject_org_scope(stmt, "alpha")
        assert result.count("org") <= 2  # "org" appears in "org :" check


class TestCreateMerge:
    """CREATE and MERGE statements should also get org-scoped."""

    def test_create_bare_node(self):
        result = inject_org_scope("CREATE (s:Session) RETURN s", "alpha")
        assert "(s:Session {org: $_org})" in result

    def test_merge_bare_node(self):
        result = inject_org_scope("MERGE (p:Person) RETURN p", "alpha")
        assert "(p:Person {org: $_org})" in result

    def test_create_with_properties(self):
        result = inject_org_scope(
            "CREATE (s:Session {topic: $topic}) RETURN s", "alpha"
        )
        assert "org: $_org}" in result
        assert "topic: $topic" in result

    def test_merge_with_properties(self):
        result = inject_org_scope(
            "MERGE (p:Person {name: $name}) RETURN p", "alpha"
        )
        assert "org: $_org}" in result
        assert "name: $name" in result

    def test_merge_then_match_combined(self):
        stmt = (
            "MERGE (p:Person {name: $name}) "
            "WITH p "
            "MATCH (o:Org {id: $_org}) "
            "MERGE (p)-[:MEMBER_OF]->(o)"
        )
        result = inject_org_scope(stmt, "alpha")
        # Person should be scoped
        assert "name: $name, org: $_org}" in result
        # Org should NOT be scoped
        assert "id: $_org}" in result
        # Count: Person gets org added, Org keeps its existing id
        org_count = result.count("org: $_org")
        assert org_count >= 1  # At least Person got scoped


class TestEdgeCases:
    """Relationship patterns and other edge cases."""

    def test_relationship_pattern_unchanged(self):
        """Relationship patterns ()-[:REL]->() should not be modified."""
        result = inject_org_scope(
            "MATCH (p:Person)-[:BY]->(s:Session) RETURN p, s", "alpha"
        )
        assert "[:BY]" in result

    def test_return_1_as_ok(self):
        """Simple RETURN statement with no nodes."""
        stmt = "RETURN 1 AS ok"
        result = inject_org_scope(stmt, "alpha")
        assert result == stmt

    def test_complex_multi_node_query(self):
        stmt = (
            "MATCH (p:Person)-[:BY]->(s:Session), "
            "(a:Artifact)-[:PART_OF]->(q:Quest) "
            "RETURN p, s, a, q"
        )
        result = inject_org_scope(stmt, "alpha")
        assert "(p:Person {org: $_org})" in result
        assert "(s:Session {org: $_org})" in result
        assert "(a:Artifact {org: $_org})" in result
        assert "(q:Quest {org: $_org})" in result

    def test_set_clause_preserved(self):
        stmt = "MATCH (o:Org {id: $_org}) SET o.name = $name RETURN o"
        result = inject_org_scope(stmt, "alpha")
        assert "SET o.name = $name" in result

    def test_where_clause_preserved(self):
        stmt = "MATCH (p:Person) WHERE p.name = $name RETURN p"
        result = inject_org_scope(stmt, "alpha")
        assert "WHERE p.name = $name" in result
        assert "(p:Person {org: $_org})" in result

    def test_project_label(self):
        result = inject_org_scope("MATCH (pr:Project) RETURN pr", "alpha")
        assert "(pr:Project {org: $_org})" in result

    def test_spirit_label(self):
        result = inject_org_scope("MATCH (sp:Spirit) RETURN sp", "alpha")
        assert "(sp:Spirit {org: $_org})" in result
