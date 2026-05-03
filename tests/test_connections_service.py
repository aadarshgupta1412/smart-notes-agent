"""Test smart connections service (unit tests)."""


def test_connections_module_imports():
    """Verify the module can be imported."""
    from app.services.connections_service import MAX_CONNECTIONS, SIMILARITY_THRESHOLD

    assert MAX_CONNECTIONS == 5
    assert SIMILARITY_THRESHOLD == 0.6
