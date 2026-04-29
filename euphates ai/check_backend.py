import requests
import json

data = {
    "name": "Test Location",
    "lat": 22.5,
    "lng": 88.3,
    "vegetation": "High",
    "vegetationValue": 75.0,
    "landType": "Urban",
    "openSpace": "Low"
}

print("Testing Backend Report Endpoint...")
try:
    response = requests.post("http://localhost:8000/api/report", json=data, timeout=30)
    print(f"STATUS: {response.status_code}")
    print(f"RESPONSE: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"FAILED: {e}")
