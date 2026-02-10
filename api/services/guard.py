"""Query protection layer for the API gateway.

Validates Cypher queries before execution:
- Blocks destructive operations (DELETE, DROP, REMOVE, DETACH)
- Prevents org property tampering
- Rate limits per org
- Audit logs query metadata (no PII)
"""

import re
import time
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Destructive keywords blocked as exact tokens (case-insensitive matching after uppercasing)
_BLOCKED_TOKENS = {"DELETE", "DETACH", "DROP", "REMOVE"}

# Token pairs that are blocked together
_BLOCKED_PAIRS = {("CREATE", "INDEX"), ("CREATE", "CONSTRAINT")}

# Allowlisted CALL procedures — anything not here is blocked
_ALLOWED_CALLS = {
    "db.schema.visualization",
    "db.labels",
    "db.relationshipTypes",
    "db.propertyKeys",
    "dbms.components",
}


class RateLimitError(Exception):
    """Raised when an org exceeds the query rate limit."""
    pass


def _strip_quoted_strings(statement: str) -> str:
    """Remove single- and double-quoted string literals to avoid false positives.

    E.g. SET s.summary = "DELETE the old system" should not trigger DELETE block.
    """
    # Remove double-quoted strings
    result = re.sub(r'"(?:[^"\\]|\\.)*"', '""', statement)
    # Remove single-quoted strings
    result = re.sub(r"'(?:[^'\\]|\\.)*'", "''", result)
    return result


def _tokenize(statement: str) -> list[str]:
    """Extract uppercase word tokens from a statement (after stripping strings)."""
    stripped = _strip_quoted_strings(statement)
    return re.findall(r'\b[A-Za-z_]\w*\b', stripped.upper())


def validate_query(statement: str) -> None:
    """Validate a Cypher query, blocking destructive operations.

    Raises ValueError if the query contains blocked operations.
    """
    tokens = _tokenize(statement)

    # Check for blocked single tokens
    for token in tokens:
        if token in _BLOCKED_TOKENS:
            raise ValueError(
                f"Destructive operation '{token}' is not allowed. "
                f"Egregore is append-only by design."
            )

    # Check for blocked token pairs
    for i in range(len(tokens) - 1):
        pair = (tokens[i], tokens[i + 1])
        if pair in _BLOCKED_PAIRS:
            raise ValueError(
                f"Schema modification '{tokens[i]} {tokens[i+1]}' is not allowed."
            )

    # CALL allowlist — check if the statement has a CALL and validate the procedure
    stripped = _strip_quoted_strings(statement)
    call_match = re.search(r'\bCALL\s+([\w.]+)', stripped, re.IGNORECASE)
    if call_match:
        procedure = call_match.group(1)
        if procedure not in _ALLOWED_CALLS:
            raise ValueError(
                f"Procedure '{procedure}' is not in the allowlist. "
                f"Allowed: {', '.join(sorted(_ALLOWED_CALLS))}"
            )


def check_org_tampering(statement: str, parameters: dict = None) -> None:
    """Reject queries that try to set the org property directly.

    The org property is injected server-side by inject_org_scope().
    Clients must not set it themselves.

    Raises ValueError if tampering is detected.
    """
    # Check for org: in the client-submitted statement (before injection)
    stripped = _strip_quoted_strings(statement)
    if re.search(r'\borg\s*:', stripped):
        raise ValueError(
            "Setting 'org' property directly is not allowed. "
            "Org scoping is applied automatically."
        )

    # Check for _org or org in client parameters
    if parameters:
        if "_org" in parameters or "org" in parameters:
            raise ValueError(
                "Parameters '_org' and 'org' are reserved. "
                "Org scoping is applied automatically."
            )


class RateLimiter:
    """In-memory sliding window rate limiter, per org slug.

    Default: 120 requests per 60 seconds.
    """

    def __init__(self, max_requests: int = 120, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._timestamps: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.monotonic()

    def check(self, org_slug: str) -> None:
        """Check if the org is within rate limits.

        Raises RateLimitError if the limit is exceeded.
        """
        now = time.monotonic()
        window_start = now - self.window_seconds

        # Clean up stale entries periodically (every 60s)
        if now - self._last_cleanup > 60:
            self._cleanup(window_start)
            self._last_cleanup = now

        # Trim this org's timestamps to the current window
        timestamps = self._timestamps[org_slug]
        self._timestamps[org_slug] = [
            t for t in timestamps if t > window_start
        ]

        if len(self._timestamps[org_slug]) >= self.max_requests:
            raise RateLimitError(
                f"Rate limit exceeded: {self.max_requests} queries per "
                f"{self.window_seconds}s. Try again shortly."
            )

        self._timestamps[org_slug].append(now)

    def _cleanup(self, window_start: float) -> None:
        """Remove stale entries for all orgs."""
        empty_orgs = []
        for slug, timestamps in self._timestamps.items():
            self._timestamps[slug] = [
                t for t in timestamps if t > window_start
            ]
            if not self._timestamps[slug]:
                empty_orgs.append(slug)
        for slug in empty_orgs:
            del self._timestamps[slug]


def classify_query(statement: str) -> str:
    """Classify a query as read, write, or schema."""
    tokens = _tokenize(statement)
    if not tokens:
        return "read"

    first = tokens[0]
    if first == "CALL":
        return "schema"
    if first in ("CREATE", "MERGE", "SET"):
        return "write"
    # MATCH ... SET / MATCH ... CREATE patterns
    write_tokens = {"CREATE", "MERGE", "SET"}
    if write_tokens & set(tokens):
        return "write"
    return "read"


def audit_log(org_slug: str, query_type: str, statement_length: int) -> None:
    """Log query metadata for audit trail. No query content, no parameters."""
    logger.info(
        "[AUDIT] org=%s type=%s len=%d",
        org_slug,
        query_type,
        statement_length,
    )


# Module-level rate limiter instance (single process on Railway)
rate_limiter = RateLimiter()
