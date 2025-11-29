"""Standalone entry point for PyInstaller build."""

import sys
import os
import logging

# Set up basic logging before importing anything else
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

if __name__ == "__main__":
    import uvicorn
    from app.main import app
    
    # Create a basic uvicorn config without log_config
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=8000,
        log_config=None,
        access_log=False
    )
    server = uvicorn.Server(config)
    server.run()
