"""Unit tests for the token service.

Tests create, claim, peek, expiry, cleanup, and prefix conventions.
"""

import sys
import time
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.services.tokens import (
    _tokens,
    claim_token,
    create_invite_token,
    create_token,
    peek_token,
    _cleanup,
)


@pytest.fixture(autouse=True)
def clear_token_store():
    """Clear the in-memory token store before each test."""
    _tokens.clear()
    yield
    _tokens.clear()


class TestCreateToken:
    def test_returns_st_prefix(self):
        token = create_token({"key": "value"})
        assert token.startswith("st_")

    def test_token_has_sufficient_entropy(self):
        token = create_token({"key": "value"})
        # st_ + 24 hex chars (12 bytes)
        assert len(token) == 3 + 24

    def test_tokens_are_unique(self):
        t1 = create_token({"a": 1})
        t2 = create_token({"b": 2})
        assert t1 != t2

    def test_token_stored_with_data(self):
        data = {"fork_url": "https://example.com", "api_key": "ek_test_abc"}
        token = create_token(data)
        assert token in _tokens
        assert _tokens[token]["data"] == data

    def test_token_stored_with_expiry(self):
        before = time.time()
        token = create_token({"x": 1}, ttl=300)
        after = time.time()
        expires = _tokens[token]["expires"]
        assert before + 300 <= expires <= after + 300


class TestCreateInviteToken:
    def test_returns_inv_prefix(self):
        token = create_invite_token({"org": "test"})
        assert token.startswith("inv_")

    def test_invite_token_has_sufficient_entropy(self):
        token = create_invite_token({"org": "test"})
        # inv_ + 24 hex chars
        assert len(token) == 4 + 24

    def test_default_ttl_is_7_days(self):
        before = time.time()
        token = create_invite_token({"org": "test"})
        expires = _tokens[token]["expires"]
        # 7 days = 604800 seconds
        assert expires - before >= 604799


class TestClaimToken:
    def test_claim_returns_data(self):
        data = {"fork_url": "https://example.com"}
        token = create_token(data)
        result = claim_token(token)
        assert result == data

    def test_claim_consumes_token(self):
        token = create_token({"x": 1})
        claim_token(token)
        assert token not in _tokens

    def test_second_claim_returns_none(self):
        token = create_token({"x": 1})
        claim_token(token)
        result = claim_token(token)
        assert result is None

    def test_claim_nonexistent_returns_none(self):
        result = claim_token("st_nonexistent")
        assert result is None

    def test_claim_expired_returns_none(self):
        token = create_token({"x": 1}, ttl=0)
        # Wait for expiry
        time.sleep(0.01)
        result = claim_token(token)
        assert result is None


class TestPeekToken:
    def test_peek_returns_data(self):
        data = {"org": "test"}
        token = create_token(data)
        result = peek_token(token)
        assert result == data

    def test_peek_does_not_consume(self):
        token = create_token({"x": 1})
        peek_token(token)
        # Token should still be in the store
        assert token in _tokens
        # Can still claim it
        result = claim_token(token)
        assert result == {"x": 1}

    def test_peek_nonexistent_returns_none(self):
        result = peek_token("st_nonexistent")
        assert result is None

    def test_peek_expired_returns_none(self):
        token = create_token({"x": 1}, ttl=0)
        time.sleep(0.01)
        result = peek_token(token)
        assert result is None


class TestCleanup:
    def test_removes_expired_tokens(self):
        t1 = create_token({"a": 1}, ttl=0)
        t2 = create_token({"b": 2}, ttl=3600)
        time.sleep(0.01)
        _cleanup()
        assert t1 not in _tokens
        assert t2 in _tokens

    def test_cleanup_called_on_create(self):
        """Creating a token triggers cleanup of expired ones."""
        t1 = create_token({"a": 1}, ttl=0)
        time.sleep(0.01)
        _t2 = create_token({"b": 2}, ttl=3600)
        # t1 should have been cleaned up during t2 creation
        assert t1 not in _tokens

    def test_cleanup_handles_empty_store(self):
        """No error when cleaning empty store."""
        _cleanup()  # Should not raise


class TestTokenExpiry:
    def test_custom_ttl(self):
        token = create_token({"x": 1}, ttl=1)
        # Should be valid immediately
        assert peek_token(token) == {"x": 1}
        # Wait for expiry
        time.sleep(1.1)
        assert peek_token(token) is None

    def test_invite_custom_ttl(self):
        token = create_invite_token({"x": 1}, ttl=1)
        assert peek_token(token) == {"x": 1}
        time.sleep(1.1)
        assert peek_token(token) is None
