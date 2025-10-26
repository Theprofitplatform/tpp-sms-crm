#!/bin/bash
# Post-Installation Setup Script for Local Deployment
# Run this after pip install completes

set -e  # Exit on error

echo "========================================="
echo "Local Deployment Setup"
echo "========================================="
echo ""

# Check if venv is activated
if [[ -z "${VIRTUAL_ENV}" ]]; then
    echo "⚠️  Virtual environment not activated!"
    echo "Run: source venv/bin/activate"
    echo "Then run this script again."
    exit 1
fi

echo "✓ Virtual environment active: $VIRTUAL_ENV"
echo ""

# Step 1: Check .env file
echo "Step 1: Checking .env configuration..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "  Creating .env from .env.example..."
        cp .env.example .env
        echo "  ✓ .env created"
        echo "  ⚠️  IMPORTANT: Edit .env and add your SERPAPI_API_KEY!"
        echo ""
    else
        echo "  ❌ .env.example not found!"
        exit 1
    fi
else
    echo "  ✓ .env already exists"
fi

# Check if API key is configured
if grep -q "SERPAPI_API_KEY=your_key_here" .env 2>/dev/null || ! grep -q "SERPAPI_API_KEY=" .env 2>/dev/null; then
    echo "  ⚠️  WARNING: SERPAPI_API_KEY not configured in .env"
    echo "  Please edit .env and add your API key before running tests"
    echo ""
fi
echo ""

# Step 2: Download spaCy model
echo "Step 2: Downloading spaCy language model..."
if python3 -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null; then
    echo "  ✓ spaCy model already installed"
else
    echo "  Downloading en_core_web_sm..."
    python3 -m spacy download en_core_web_sm
    echo "  ✓ spaCy model installed"
fi
echo ""

# Step 3: Initialize database
echo "Step 3: Setting up database..."
if [ -f keyword_research.db ]; then
    echo "  Database already exists"
    read -p "  Apply migration to existing database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        python3 migrations/apply_migration.py keyword_research.db
        echo "  ✓ Migration applied"
    else
        echo "  Skipped migration"
    fi
else
    echo "  Creating fresh database..."
    python3 cli.py init
    echo "  ✓ Database initialized with new schema"
fi
echo ""

# Step 4: Verify installation
echo "Step 4: Verifying installation..."
echo "  Checking CLI..."
if python3 cli.py --help > /dev/null 2>&1; then
    echo "  ✓ CLI working"
else
    echo "  ❌ CLI check failed"
    exit 1
fi

echo "  Checking --resume flag..."
if python3 cli.py create --help | grep -q "\-\-resume"; then
    echo "  ✓ Resume flag available"
else
    echo "  ⚠️  Resume flag not found (might be okay)"
fi

echo "  Checking database schema..."
if sqlite3 keyword_research.db "PRAGMA table_info(keywords)" | grep -q "difficulty_serp_strength"; then
    echo "  ✓ New schema columns present"
else
    echo "  ⚠️  New columns missing - migration may be needed"
fi
echo ""

# Step 5: Run tests (optional)
echo "Step 5: Running validation tests (optional)..."
read -p "Run schema validation tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  Running tests..."
    if pytest tests/test_exports_schema.py -v; then
        echo "  ✓ Schema tests passed"
    else
        echo "  ⚠️  Some tests failed (may be okay if no example data)"
    fi
else
    echo "  Skipped tests"
fi
echo ""

# Step 6: Summary
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure API key (if not done):"
echo "   nano .env  # Add SERPAPI_API_KEY=your_actual_key"
echo ""
echo "2. Run integration test:"
echo "   python3 cli.py create \\"
echo "     --name 'Integration Test' \\"
echo "     --seeds 'seo tools,keyword research' \\"
echo "     --geo US \\"
echo "     --focus informational"
echo ""
echo "3. Expected output:"
echo "   - ✓ Checkpoint saved logs during run"
echo "   - 📊 Stats summary at end"
echo "   - 💰 Quota usage breakdown"
echo "   - ⚡ Stage performance timing"
echo ""
echo "4. Verify results:"
echo "   python3 cli.py report 1"
echo ""
echo "5. Check database:"
echo "   sqlite3 keyword_research.db \\"
echo "     'SELECT keyword, difficulty, difficulty_serp_strength \\"
echo "      FROM keywords LIMIT 3'"
echo ""
echo "========================================="
echo "✅ Ready for client dogfooding!"
echo "========================================="
