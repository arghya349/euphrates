import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
print(f"Testing Key: {api_key[:10]}...")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

try:
    response = model.generate_content('Hi')
    print("API STATUS: WORKING")
    print(f"RESPONSE: {response.text}")
except Exception as e:
    print("API STATUS: FAILED")
    print(f"ERROR: {e}")
