import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "services" in data

def test_login_and_topology():
    # Test valid login for admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@unisphere.edu",
        "password": "admin123"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test me endpoint
    me_res = client.get("/api/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "super-admin"

    # Test topology endpoint
    topo_res = client.get("/api/system/topology", headers=headers)
    assert topo_res.status_code == 200
    topo_data = topo_res.json()
    assert topo_data["status"] == "healthy"
    assert len(topo_data["databases"]) >= 5

def test_unauthorized_access():
    res = client.get("/api/system/topology")
    assert res.status_code == 401

import uuid

def test_campus_onboarding():
    # Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@unisphere.edu",
        "password": "admin123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    unique_code = f"T{uuid.uuid4().hex[:3].upper()}"
    # Test campus onboard endpoint
    onboard_res = client.post("/api/campuses/onboard", headers=headers, json={
        "name": "Test Onboard Campus",
        "code": unique_code,
        "city": "TestCity",
        "db_type": "PostgreSQL",
        "port": 5439
    })
    assert onboard_res.status_code == 201
    data = onboard_res.json()
    assert data["code"] == unique_code
    assert "connector_config" in data
    assert "docker_snippet" in data

