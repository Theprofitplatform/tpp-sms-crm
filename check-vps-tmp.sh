#!/bin/bash
echo "=== Checking /tmp directory ==="
df -h /tmp
ls -la /tmp/ | grep deploy
echo ""
echo "=== Checking deployment directory ==="
ls -la /home/avi/seo-automation/current/dashboard/dist/ 2>&1 | head -10
