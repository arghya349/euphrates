import subprocess
import os
import time
import sys
import webbrowser

def nuclear_clean():
    print("--- EUPHRATES NUCLEAR RESTART ---")
    print("Killing ALL python processes to clear hanging servers...")
    
    # Aggressively kill any python process except this one
    try:
        # Find this script's PID
        my_pid = os.getpid()
        # Get all python PIDs
        output = subprocess.check_output('tasklist /FI "IMAGENAME eq python.exe" /FO CSV /NH', shell=True).decode()
        for line in output.splitlines():
            if 'python.exe' in line:
                pid = line.split(',')[1].strip('"')
                if int(pid) != my_pid:
                    print(f"Killing zombie python process: {pid}")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True)
    except:
        pass
    
    # Also kill anything on the ports just in case
    for port in [8000, 3000]:
        try:
            res = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
            for line in res.splitlines():
                if 'LISTENING' in line:
                    pid = line.strip().split()[-1]
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True)
        except: pass

def launch():
    print("\nStarting clean environment with your API KEY...")
    # Run the verified launcher in a new window
    subprocess.Popen([sys.executable, "run_app.py"], creationflags=subprocess.CREATE_NEW_CONSOLE)
    print("\nSUCCESS: A NEW TERMINAL WINDOW HAS OPENED.")
    print("Wait 10 seconds for the 'GEMINI_API_KEY found' message in that window.")
    print("\nOpening: http://localhost:3000")
    time.sleep(5)
    webbrowser.open("http://localhost:3000")

if __name__ == "__main__":
    nuclear_clean()
    launch()
