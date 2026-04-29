import subprocess
import os
import time
import sys
import socket

def kill_port(port):
    try:
        if sys.platform == "win32":
            # Aggressively kill anything on the port
            result = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
            for line in result.splitlines():
                if 'LISTENING' in line:
                    pid = line.strip().split()[-1]
                    print(f"Clearing port {port} (PID: {pid})...")
                    subprocess.run(f'taskkill /F /PID {pid}', shell=True)
    except: pass

def run():
    print("=== EUPHRATES ULTIMATE LAUNCHER (NUCLEAR MODE) ===")
    
    # 1. Kill everything
    kill_port(8000)
    kill_port(3000)
    time.sleep(2)
    
    # 2. Start Backend
    print("Starting AI Backend...")
    backend_script = os.path.join("backend", "main.py")
    # Using python3 if python fails
    py_cmd = sys.executable
    
    subprocess.Popen([py_cmd, backend_script], 
                     creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0)
    
    # Wait for backend to bind to port
    print("Waiting for AI to initialize...")
    time.sleep(8)
    
    # 3. Start Frontend
    print("Starting Web Interface...")
    subprocess.Popen([py_cmd, "-m", "http.server", "3000"],
                     creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0)
    
    time.sleep(2)
    print("\nSUCCESS: Euphrates is active!")
    print("Visit: http://localhost:3000")
    
    import webbrowser
    webbrowser.open("http://localhost:3000")

if __name__ == "__main__":
    run()
