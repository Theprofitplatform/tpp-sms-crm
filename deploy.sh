#!/bin/bash
#
# SEO Expert Platform - Interactive Deployment Launcher
#

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                   🚀 SEO Expert Platform - Deployment                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "Choose deployment method:"
echo ""
echo "  [1] GitHub Actions (Recommended)"
echo "  [2] Manual SSH Deployment"
echo "  [3] View Documentation"
echo "  [4] Exit"
echo ""

read -p "Enter your choice [1-4]: " CHOICE

case $CHOICE in
    1)
        echo ""
        echo -e "${GREEN}GitHub Actions Deployment${NC}"
        echo ""
        echo "1. Get SSH key: ./scripts/get-ssh-key-for-github.sh"
        echo "2. Add to: https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions"
        echo "3. Deploy: https://github.com/Theprofitplatform/seoexpert/actions"
        echo "4. Verify: ./scripts/verify-deployment.sh"
        ;;
    2)
        echo ""
        echo -e "${GREEN}Manual SSH Deployment${NC}"
        echo ""
        echo "ssh avi@31.97.222.218"
        echo "cd /var/www/seo-expert && git pull"
        echo "./deploy-manual.sh production"
        ;;
    3)
        less FINAL_DEPLOYMENT_STEPS.md
        ;;
    4)
        exit 0
        ;;
esac
