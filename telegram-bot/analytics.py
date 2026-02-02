"""
Egregore Bot Analytics - Unit Economics Tracking

Tracks query costs (tokens, latency) for understanding bot economics.
Uses the existing events.db with a 'bot_query' event type.

Usage:
    # Log a query event (called from bot.py)
    from analytics import log_query_event
    log_query_event(query_type="person_sessions", tokens_in=2000, ...)

    # Generate cost report
    python -m analytics           # Last 7 days
    python -m analytics --days 30 # Last 30 days
"""

import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import argparse

# Database path - same as existing events.db
DB_PATH = Path(__file__).parent.parent / "data" / "events.db"

# Anthropic Haiku pricing (as of 2026)
# https://www.anthropic.com/pricing
INPUT_COST_PER_MILLION = 0.80   # $0.80 per 1M input tokens
OUTPUT_COST_PER_MILLION = 4.00  # $4.00 per 1M output tokens

# Infrastructure costs (monthly estimates)
# Update these based on your actual billing
INFRA_COSTS = {
    "railway": 5.00,      # Railway Hobby plan ~$5/month
    "neo4j_aura": 0.00,   # Free tier (or $65/month for dedicated)
    "telegram": 0.00,     # Free
}
MONTHLY_INFRA_COST = sum(INFRA_COSTS.values())


def calculate_cost(tokens_in: int, tokens_out: int) -> float:
    """Calculate USD cost from token counts."""
    input_cost = (tokens_in / 1_000_000) * INPUT_COST_PER_MILLION
    output_cost = (tokens_out / 1_000_000) * OUTPUT_COST_PER_MILLION
    return input_cost + output_cost


def log_query_event(
    query_type: str,
    tokens_in: int,
    tokens_out: int,
    latency_ms: float,
    results_count: int,
    success: bool,
    user_id: Optional[int] = None,
    user_name: Optional[str] = None,
    question: Optional[str] = None,
    decision_tokens_in: int = 0,
    decision_tokens_out: int = 0,
    decision_latency_ms: float = 0,
    format_tokens_in: int = 0,
    format_tokens_out: int = 0,
    format_latency_ms: float = 0,
    neo4j_latency_ms: float = 0,
) -> None:
    """
    Store a bot query event in events.db.

    Args:
        query_type: The query that was executed (e.g., 'person_sessions', 'direct')
        tokens_in: Total input tokens (decision + format)
        tokens_out: Total output tokens (decision + format)
        latency_ms: Total latency in milliseconds
        results_count: Number of results returned
        success: Whether the query succeeded
        user_id: Telegram user ID
        user_name: Person name if identified
        question: The original question text
        decision_tokens_in/out: Tokens for the agent decision step
        decision_latency_ms: Latency for agent decision
        format_tokens_in/out: Tokens for response formatting
        format_latency_ms: Latency for formatting
        neo4j_latency_ms: Latency for Neo4j query
    """
    cost_usd = calculate_cost(tokens_in, tokens_out)

    event_data = {
        "query_type": query_type,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": round(cost_usd, 6),
        "latency_ms": round(latency_ms, 1),
        "results_count": results_count,
        "success": success,
        # Detailed breakdown
        "decision_tokens_in": decision_tokens_in,
        "decision_tokens_out": decision_tokens_out,
        "decision_latency_ms": round(decision_latency_ms, 1),
        "format_tokens_in": format_tokens_in,
        "format_tokens_out": format_tokens_out,
        "format_latency_ms": round(format_latency_ms, 1),
        "neo4j_latency_ms": round(neo4j_latency_ms, 1),
    }

    if user_id:
        event_data["user_id"] = user_id
    if user_name:
        event_data["user_name"] = user_name
    if question:
        # Truncate long questions
        event_data["question"] = question[:500] if len(question) > 500 else question

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            """INSERT INTO events (event_id, event_type, timestamp, tenant_id, data)
               VALUES (?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                "bot_query",
                datetime.utcnow().isoformat(),
                "default",
                json.dumps(event_data)
            )
        )

        conn.commit()
        conn.close()
    except Exception as e:
        # Don't let analytics failures break the bot
        import logging
        logging.getLogger(__name__).error(f"Failed to log query event: {e}")


def get_query_events(days: int = 7) -> list:
    """Retrieve bot_query events from the last N days."""
    if not DB_PATH.exists():
        return []

    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """SELECT data FROM events
           WHERE event_type = 'bot_query' AND timestamp >= ?
           ORDER BY timestamp DESC""",
        (cutoff,)
    )

    rows = cursor.fetchall()
    conn.close()

    return [json.loads(row[0]) for row in rows]


def report(days: int = 7) -> None:
    """Print cost summary for last N days."""
    events = get_query_events(days)

    if not events:
        print(f"No bot queries in the last {days} days.")
        print(f"\nInfra costs (monthly): ${MONTHLY_INFRA_COST:.2f}")
        return

    total_queries = len(events)
    total_api_cost = sum(e.get("cost_usd", 0) for e in events)
    total_tokens_in = sum(e.get("tokens_in", 0) for e in events)
    total_tokens_out = sum(e.get("tokens_out", 0) for e in events)
    avg_latency = sum(e.get("latency_ms", 0) for e in events) / total_queries

    success_count = sum(1 for e in events if e.get("success", False))
    success_rate = (success_count / total_queries) * 100 if total_queries > 0 else 0

    empty_count = sum(1 for e in events if e.get("results_count", 0) == 0 and e.get("success", False))

    # Calculate prorated infrastructure cost for the period
    infra_cost_period = (MONTHLY_INFRA_COST / 30) * days
    total_cost = total_api_cost + infra_cost_period

    # Project monthly costs based on current usage
    queries_per_day = total_queries / days
    projected_monthly_api = (total_api_cost / days) * 30
    projected_monthly_total = projected_monthly_api + MONTHLY_INFRA_COST

    print(f"""
EGREGORE BOT ECONOMICS — Last {days} Days
{'=' * 50}

Queries: {total_queries} ({queries_per_day:.1f}/day)
Success Rate: {success_rate:.1f}%
Empty Results: {empty_count} ({(empty_count/total_queries*100):.1f}%)

COSTS (This Period)
  API (tokens):     ${total_api_cost:.4f}
  Infra (prorated): ${infra_cost_period:.2f}
  Total:            ${total_cost:.2f}
  Per Query:        ${total_cost/total_queries:.4f}

PROJECTED MONTHLY
  API:    ${projected_monthly_api:.2f}
  Infra:  ${MONTHLY_INFRA_COST:.2f}
  Total:  ${projected_monthly_total:.2f}

Avg Latency: {avg_latency:.0f}ms

Tokens:
  Input: {total_tokens_in:,}
  Output: {total_tokens_out:,}
""")

    # By query type
    query_types = {}
    for e in events:
        qt = e.get("query_type", "unknown")
        if qt not in query_types:
            query_types[qt] = {"count": 0, "cost": 0, "success": 0}
        query_types[qt]["count"] += 1
        query_types[qt]["cost"] += e.get("cost_usd", 0)
        if e.get("success", False):
            query_types[qt]["success"] += 1

    print("By Query Type:")
    for qt, stats in sorted(query_types.items(), key=lambda x: x[1]["count"], reverse=True):
        rate = (stats["success"] / stats["count"]) * 100 if stats["count"] > 0 else 0
        print(f"  {qt:25} {stats['count']:4} queries  {rate:5.1f}% success  ${stats['cost']:.4f}")

    # By user
    users = {}
    for e in events:
        user = e.get("user_name", "unknown")
        if user not in users:
            users[user] = {"count": 0, "success": 0}
        users[user]["count"] += 1
        if e.get("success", False):
            users[user]["success"] += 1

    if users:
        print("\nBy User:")
        for user, stats in sorted(users.items(), key=lambda x: x[1]["count"], reverse=True):
            rate = (stats["success"] / stats["count"]) * 100 if stats["count"] > 0 else 0
            print(f"  {user:15} {stats['count']:4} queries  {rate:5.1f}% success")

    # Infrastructure breakdown
    print("\nINFRA BREAKDOWN (monthly)")
    for service, cost in INFRA_COSTS.items():
        print(f"  {service:15} ${cost:.2f}")
    print(f"  {'─' * 20}")
    print(f"  {'Total':15} ${MONTHLY_INFRA_COST:.2f}")
    print("\n  (Update INFRA_COSTS in analytics.py to match actual billing)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Egregore Bot Analytics Report")
    parser.add_argument("--days", type=int, default=7, help="Number of days to report on")
    args = parser.parse_args()

    report(args.days)
