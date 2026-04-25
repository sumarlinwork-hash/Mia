"""
Menganalisis penggunaan disk pada sistem dan memberikan laporan kesehatan penyimpanan dalam format yang mudah dibaca.
"""
import shutil
import json
import sys

def run():
    total, used, free = shutil.disk_usage("/")
    
    report = {
        "total_gb": total // (2**30),
        "used_gb": used // (2**30),
        "free_gb": free // (2**30),
        "percent_used": round((used / total) * 100, 2)
    }
    
    print(f"--- SYSTEM PULSE REPORT ---")
    print(f"Total Storage: {report['total_gb']} GB")
    print(f"Used Storage : {report['used_gb']} GB ({report['percent_used']}%)")
    print(f"Free Storage : {report['free_gb']} GB")
    
    if report['percent_used'] > 90:
        print("\nWARNING: Penyimpanan hampir penuh!")
    else:
        print("\nSTATUS: Penyimpanan sehat.")

if __name__ == "__main__":
    run()
