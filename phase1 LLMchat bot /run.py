#!/usr/bin/env python3
"""
LLM Playground - Launcher Script
Run with: python3 run.py
"""

import os
import sys
import socket
import shutil

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def find_available_port(start_port: int, host: str = "127.0.0.1") -> int:
    port = start_port
    while is_port_in_use(port, host):
        port += 1
    return port

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_file = os.path.join(base_dir, ".env")
    env_example = os.path.join(base_dir, ".env.example")

    if not os.path.exists(env_file) and os.path.exists(env_example):
        print("Creating .env from .env.example...")
        shutil.copy(env_example, env_file)

    try:
        import uvicorn
        from backend import config
    except ImportError:
        print("\n[!] Missing dependencies. Please install them by running:")
        print("    pip install -r requirements.txt\n")
        sys.exit(1)

    host = config.HOST
    desired_port = config.PORT
    port = find_available_port(desired_port, host)

    if port != desired_port:
        print(f"[i] Port {desired_port} is busy. Automatically switched to port {port}.")

    print("=" * 65)
    print("   ⚡ LLM PLAYGROUND - TRANSPARENT AI CHATBOT")
    print("   Exposing Raw LLM Behavior, Hyperparameters & Metrics")
    print("=" * 65)
    print(f"   ▶ Web Interface : http://{host}:{port}")
    print(f"   ▶ API Swagger   : http://{host}:{port}/docs")
    print(f"   ▶ Configured URL: {config.LLM_BASE_URL}")
    print(f"   ▶ Default Model : {config.DEFAULT_MODEL}")
    print(f"   ▶ Default Temp  : {config.DEFAULT_TEMPERATURE}")
    print("=" * 65)
    print("   Press Ctrl+C to stop the server\n")

    uvicorn.run("backend.main:app", host=host, port=port, reload=True)

if __name__ == "__main__":
    main()
