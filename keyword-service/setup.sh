#!/bin/bash
# Setup script for keyword research tool

set -e

echo "🚀 Setting up Keyword Research & Content Planning Tool"
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version || { echo "❌ Python 3 not found. Please install Python 3.8+"; exit 1; }

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Download spaCy model
echo "Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# Copy environment file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys"
else
    echo ".env file already exists"
fi

# Initialize database
echo "Initializing database..."
python cli.py init

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your SERPAPI_API_KEY"
echo "  2. Activate the virtual environment: source venv/bin/activate"
echo "  3. Create your first project: python cli.py create"
echo ""
echo "See QUICKSTART.md for detailed instructions."
