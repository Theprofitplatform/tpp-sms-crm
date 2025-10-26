"""
PyTest configuration and shared fixtures
"""

import pytest
import os
from pathlib import Path


def pytest_addoption(parser):
    """Add custom command line options"""
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="Run integration tests that require API keys"
    )
    parser.addoption(
        "--run-slow",
        action="store_true",
        default=False,
        help="Run slow tests"
    )


def pytest_configure(config):
    """Configure test markers"""
    config.addinivalue_line("markers", "integration: mark test as integration test requiring API keys")
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "smoke: mark test as smoke test")


def pytest_collection_modifyitems(config, items):
    """Skip tests based on command line options"""
    if not config.getoption("--run-integration"):
        skip_integration = pytest.mark.skip(reason="need --run-integration option to run")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_integration)
    
    if not config.getoption("--run-slow"):
        skip_slow = pytest.mark.skip(reason="need --run-slow option to run")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)


@pytest.fixture
def test_database():
    """Create a temporary test database"""
    db_path = "test_keyword_research.db"
    
    # Setup: Create test database
    # from database import init_db
    # init_db(db_path)
    
    yield db_path
    
    # Teardown: Remove test database
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture
def mock_env_vars():
    """Set test environment variables"""
    original_env = os.environ.copy()
    
    os.environ['DATABASE_URL'] = 'sqlite:///./test.db'
    os.environ['SERPAPI_API_KEY'] = 'test_key'
    os.environ['OFFLINE_MODE'] = 'true'
    
    yield
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def sample_keywords():
    """Sample keyword data for testing"""
    return [
        "best seo tools",
        "seo tools for beginners",
        "free seo tools",
        "seo software comparison",
        "top seo tools 2024"
    ]


@pytest.fixture
def sample_serp_data():
    """Sample SERP data for testing"""
    return {
        'organic_results': [
            {
                'position': 1,
                'title': 'Best SEO Tools in 2024',
                'link': 'https://example.com/best-seo-tools',
                'snippet': 'Discover the top SEO tools...',
                'displayed_link': 'example.com › best-seo-tools'
            },
            {
                'position': 2,
                'title': 'Top 10 SEO Tools Compared',
                'link': 'https://another.com/seo-tools',
                'snippet': 'We tested 50+ SEO tools...',
                'displayed_link': 'another.com › seo-tools'
            }
        ],
        'related_searches': [
            {'query': 'seo tools free'},
            {'query': 'best free seo tools'}
        ],
        'people_also_ask': [
            {
                'question': 'What are SEO tools?',
                'snippet': 'SEO tools are software applications...'
            }
        ]
    }


@pytest.fixture
def tmp_output_dir(tmp_path):
    """Create temporary output directory"""
    output_dir = tmp_path / "output"
    output_dir.mkdir()
    return output_dir
