import subprocess
import sys
import os
import time
import webbrowser
import socket

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def kill_port(port):
    try:
        result = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
        for line in result.splitlines():
            if f':{port}' in line and 'LISTENING' in line:
                pid = line.strip().split()[-1]
                subprocess.run(f'taskkill /F /PID {pid}', shell=True)
    except: pass

def run_app():
    print("--- EUPHRATES SYSTEM INITIALIZATION ---")
    
    # 1. Force Clear Ports
    print("Clearing environment...")
    kill_port(8000)
    kill_port(3000)
    time.sleep(1)

    # 2. Start Backend
    print("Launching AI Backend (Port 8000)...")
    backend_script = os.path.join("backend", "main.py")
    backend_process = subprocess.Popen([sys.executable, backend_script], 
                                     stdout=subprocess.DEVNULL, 
                                     stderr=subprocess.DEVNULL)
    
    # 3. Start Frontend
    print("Launching Interface (Port 3000)...")
    frontend_process = subprocess.Popen([sys.executable, "-m", "http.server", "3000"],
                                      stdout=subprocess.DEVNULL, 
                                      stderr=subprocess.DEVNULL)
    
    time.sleep(3)
    
    if backend_process.poll() is not None or frontend_process.poll() is not None:
        print("\nERROR: Systems failed to stay alive.")
        print("Check if you have an API key in your .env file.")
        return

    url = "http://localhost:3000"
    print(f"\nSUCCESS: Euphrates is active at {url}")
    webbrowser.open(url)
    
    print("\n[KEEP THIS WINDOW OPEN]")
    print("Press Ctrl+C to shut down.")
    
    try:
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                print("Backend stopped. Restarting...")
                backend_process = subprocess.Popen([sys.executable, backend_script], 
                                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        backend_process.terminate()
        frontend_process.terminate()

if __name__ == "__main__":
    run_app()

