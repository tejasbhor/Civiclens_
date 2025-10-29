"""
Simple manual Auth + Protected API test
to verify JWT login and access to protected routes
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 60)
print("Testing Login and Protected Routes")
print("=" * 60)

# Step 1: Login and get JWT token
print("\n1. Logging in...")
login_payload = {
    "phone": "+919021932646",
    "password": "Admin@123"
}

response = requests.post(
    f"{BASE_URL}/auth/login",
    json=login_payload
)

print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

if response.status_code == 200:
    token = response.json().get("access_token")
    
    if not token:
        print("\n❌ No access_token found in response!")
        exit(1)
    
    print("\n✅ Login successful! Token received.")
    print("-" * 60)
    print(f"Token: {token}")
    print("-" * 60)

    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Test Appeals Stats API
    print("\n2. Testing Appeals Stats API...")
    appeals_response = requests.get(f"{BASE_URL}/appeals/stats", headers=headers)
    print(f"Status: {appeals_response.status_code}")
    print(f"Response: {json.dumps(appeals_response.json(), indent=2)}")

    # Step 3: Test Escalations Stats API
    print("\n3. Testing Escalations Stats API...")
    escalations_response = requests.get(f"{BASE_URL}/escalations/stats", headers=headers)
    print(f"Status: {escalations_response.status_code}")
    print(f"Response: {json.dumps(escalations_response.json(), indent=2)}")

    print("\n✅ All tests completed.")
else:
    print("\n❌ Login failed!")
    print(f"Response: {response.text}")
    print("\n⚠️  Check the backend logs for more details.")
