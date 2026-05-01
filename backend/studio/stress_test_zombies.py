import sys
import os
import time
import psutil

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.studio import StudioExecutionService, StudioFileService, StudioSessionManager, ExecutionStatus

def stress_test_zombies():
    print("=== Stress Testing MIA Studio Zombie Prevention ===")
    
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    file_service = StudioFileService(project_root)
    execution_service = StudioExecutionService()
    session_manager = StudioSessionManager(execution_service, file_service)
    
    session_id = "stress_test_user"
    
    for i in range(10):
        print(f"Iteration {i+1}/10...")
        code = "import time; time.sleep(0.5); print('Done')"
        try:
            eid = session_manager.run_studio_code(session_id, code)
            # Immediately try to run another (should fail)
            try:
                session_manager.run_studio_code(session_id, "print('Fail')")
                print("FAIL: Concurrent limit not enforced!")
            except:
                pass
            
            # Wait for it to finish or kill it
            if i % 2 == 0:
                time.sleep(1) # Let it finish
            else:
                session_manager.stop_studio_code(session_id, eid) # Hard kill
                
        except Exception as e:
            print(f"Error in iteration {i}: {e}")

    print("\nVerifying no leftover processes...")
    time.sleep(2) # Wait for all threads to settle
    
    orphan_count = 0
    for proc in psutil.process_iter(['pid', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline')
            if cmdline and any("exec_" in arg and ".py" in arg for arg in cmdline):
                print(f"ALERT: Found leftover process! PID: {proc.info['pid']}")
                orphan_count += 1
        except:
            continue
            
    if orphan_count == 0:
        print("SUCCESS: 0 zombie processes found after 10 iterations.")
    else:
        print(f"FAILURE: {orphan_count} zombie processes found!")

if __name__ == "__main__":
    stress_test_zombies()
