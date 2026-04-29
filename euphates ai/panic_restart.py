import os
import subprocess
import time
import sys

def kill_port(port):
    try:
        # Find process ID using netstat
        result = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
        for line in result.splitlines():
            if f':{port}' in line and 'LISTENING' in line:
                pid = line.strip().split()[-1]
                print(f"Killing process {pid} on port {port}...")
                subprocess.run(f'taskkill /F /PID {pid}', shell=True)
    except Exception:
        pass

def main():
    print("--- EUPHRATES PANIC RESTART ---")
    kill_port(8000)
    kill_port(3000)
    time.sleep(1)
    
    print("\nStarting clean environment...")
    subprocess.Popen([sys.executable, "run_app.py"], creationflags=subprocess.CREATE_NEW_CONSOLE)
    print("\nSUCCESS: A new window has been opened with the app.")
    print("Wait 5 seconds, then refresh http://localhost:3000")

if __name__ == "__main__":
    main()
