from app.main import health_check


async def test_health_check_returns_service_status():
    assert await health_check() == {"status": "healthy", "service": "edusi-api"}
