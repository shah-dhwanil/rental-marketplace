import pytest

@pytest.mark.anyio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    print(data)
    assert data["status"] == "healthy"