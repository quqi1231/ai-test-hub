#!/bin/bash
cd /root/ai-test-hub
source venv/bin/activate
while true; do
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
    echo "Backend crashed, restarting in 5 seconds..."
    sleep 5
done
