#!/bin/bash

# Dashboard Quick Setup Script
# Usage: bash package-scripts.sh [command]

set -e

DASHBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   SEO Automation Platform - Dashboard Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        echo -e "${YELLOW}Please install Node.js 18 or higher: https://nodejs.org/${NC}"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version is too old (v$NODE_VERSION)${NC}"
        echo -e "${YELLOW}Please upgrade to Node.js 18 or higher${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"
}

# Function to install dependencies
install_deps() {
    echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
    cd "$DASHBOARD_DIR"

    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi

    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Function to start dev server
start_dev() {
    echo -e "\n${YELLOW}🚀 Starting development server...${NC}"
    cd "$DASHBOARD_DIR"

    echo -e "${BLUE}Dashboard will be available at: http://localhost:5173${NC}"
    echo -e "${BLUE}Press Ctrl+C to stop${NC}"
    echo ""

    npm run dev
}

# Function to build for production
build_prod() {
    echo -e "\n${YELLOW}🔨 Building for production...${NC}"
    cd "$DASHBOARD_DIR"

    npm run build

    echo -e "${GREEN}✓ Build complete!${NC}"
    echo -e "${BLUE}Built files are in: $DASHBOARD_DIR/dist${NC}"
    echo ""
    echo -e "${YELLOW}To serve the dashboard:${NC}"
    echo -e "  1. Uncomment line 45 in ../dashboard-server.js"
    echo -e "  2. Run: node ../dashboard-server.js"
    echo -e "  3. Open: http://localhost:9000"
}

# Function to preview production build
preview_prod() {
    echo -e "\n${YELLOW}👀 Starting preview server...${NC}"
    cd "$DASHBOARD_DIR"

    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ No build found. Run 'build' first${NC}"
        exit 1
    fi

    npm run preview
}

# Function to add shadcn component
add_component() {
    echo -e "\n${YELLOW}➕ Adding shadcn/ui component...${NC}"
    cd "$DASHBOARD_DIR"

    if [ -z "$1" ]; then
        echo -e "${BLUE}Available components:${NC}"
        echo "  button, card, badge, tabs, dialog, dropdown-menu"
        echo "  input, select, checkbox, switch, radio-group"
        echo "  toast, alert, popover, tooltip, hover-card"
        echo "  table, sheet, accordion, separator"
        echo "  calendar, command, and more..."
        echo ""
        echo -e "${YELLOW}Usage: $0 add <component-name>${NC}"
        exit 1
    fi

    npx shadcn@latest add "$1"
}

# Function to clean build artifacts
clean() {
    echo -e "\n${YELLOW}🧹 Cleaning build artifacts...${NC}"
    cd "$DASHBOARD_DIR"

    rm -rf dist
    rm -rf node_modules/.vite

    echo -e "${GREEN}✓ Clean complete${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}Available commands:${NC}"
    echo ""
    echo -e "  ${GREEN}setup${NC}       - Check Node.js and install dependencies"
    echo -e "  ${GREEN}dev${NC}         - Start development server"
    echo -e "  ${GREEN}build${NC}       - Build for production"
    echo -e "  ${GREEN}preview${NC}     - Preview production build"
    echo -e "  ${GREEN}add${NC}         - Add a shadcn/ui component"
    echo -e "  ${GREEN}clean${NC}       - Clean build artifacts"
    echo -e "  ${GREEN}help${NC}        - Show this help message"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo -e "  bash $0 setup"
    echo -e "  bash $0 dev"
    echo -e "  bash $0 add dialog"
    echo ""
}

# Main command handler
case "${1:-help}" in
    setup)
        check_node
        install_deps
        echo -e "\n${GREEN}✓ Setup complete!${NC}"
        echo -e "${BLUE}Run 'bash $0 dev' to start the development server${NC}"
        ;;
    dev)
        check_node
        if [ ! -d "$DASHBOARD_DIR/node_modules" ]; then
            echo -e "${YELLOW}Dependencies not installed. Running setup...${NC}"
            install_deps
        fi
        start_dev
        ;;
    build)
        check_node
        if [ ! -d "$DASHBOARD_DIR/node_modules" ]; then
            echo -e "${YELLOW}Dependencies not installed. Running setup...${NC}"
            install_deps
        fi
        build_prod
        ;;
    preview)
        check_node
        preview_prod
        ;;
    add)
        check_node
        add_component "$2"
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
