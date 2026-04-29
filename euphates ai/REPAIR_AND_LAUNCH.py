import subprocess
import sys
import os

def repair():
    print("--- EUPHRATES REPAIR & LAUNCH ---")
    
    packages = ["fastapi", "uvicorn", "pydantic", "pydantic-settings", "google-generativeai", "openai", "python-dotenv", "requests"]
    
    for pkg in packages:
        print(f"Installing {pkg}...")
        subprocess.run([sys.executable, "-m", "pip", "install", pkg], capture_output=True)

    print("\nEnvironment Repaired.")
    print("Launching Euphrates...")
    subprocess.run([sys.executable, "run_app.py"])

if __name__ == "__main__":
    repair()
