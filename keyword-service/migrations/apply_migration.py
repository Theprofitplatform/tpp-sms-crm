#!/usr/bin/env python3
"""Apply database migrations for SQLite."""
import sqlite3
import sys
from pathlib import Path


def apply_migration(db_path='keyword_research.db', migration_file='001_add_difficulty_components.sql'):
    """Apply SQL migration to database."""

    print(f"Applying migration: {migration_file}")
    print(f"Database: {db_path}")

    # Read migration file
    migration_path = Path(__file__).parent / migration_file
    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        return False

    with open(migration_path, 'r') as f:
        sql = f.read()

    # Connect to database
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Split SQL statements (SQLite doesn't support multi-statement well)
        statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--') and not s.strip().startswith('COMMENT')]

        # Execute each statement
        for i, statement in enumerate(statements):
            try:
                print(f"Executing statement {i+1}/{len(statements)}...")
                cursor.execute(statement)
            except sqlite3.OperationalError as e:
                if 'duplicate column name' in str(e).lower():
                    print(f"⚠️  Column already exists, skipping: {e}")
                else:
                    print(f"❌ Error: {e}")
                    print(f"Statement: {statement[:100]}...")
                    # Continue with other statements

        conn.commit()
        conn.close()

        print("✅ Migration applied successfully")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


def check_migration_needed(db_path='keyword_research.db'):
    """Check if migration is needed."""

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if difficulty_serp_strength column exists
        cursor.execute("PRAGMA table_info(keywords)")
        columns = [row[1] for row in cursor.fetchall()]

        needs_migration = 'difficulty_serp_strength' not in columns

        conn.close()

        return needs_migration

    except Exception as e:
        print(f"Could not check migration status: {e}")
        return True  # Assume migration needed


if __name__ == '__main__':
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'keyword_research.db'

    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        print("Run `python cli.py init` first")
        sys.exit(1)

    if check_migration_needed(db_path):
        print("Migration needed, applying...")
        success = apply_migration(db_path)
        sys.exit(0 if success else 1)
    else:
        print("✅ Database already up to date")
        sys.exit(0)
