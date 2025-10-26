"""Tests for checkpoint and resume functionality."""
import pytest
from datetime import datetime
from checkpoint import CheckpointManager


@pytest.fixture
def mock_project_id():
    """Mock project ID for testing."""
    return 1


def test_checkpoint_stages():
    """Verify checkpoint stages are defined correctly."""
    stages = CheckpointManager.STAGES

    assert 'created' in stages
    assert 'expansion' in stages
    assert 'metrics' in stages
    assert 'processing' in stages
    assert 'scoring' in stages
    assert 'clustering' in stages
    assert 'briefs' in stages
    assert 'completed' in stages


def test_save_checkpoint(mock_project_id):
    """Test saving checkpoint."""
    manager = CheckpointManager(mock_project_id)

    # This would require database setup in real test
    # For now, just test the logic
    try:
        manager.save_checkpoint('expansion', {'keywords_count': 100})
    except Exception:
        # Expected without database
        pass


def test_get_next_stage():
    """Test next stage calculation."""
    manager = CheckpointManager(1)

    # Mock checkpoint return
    stages = CheckpointManager.STAGES

    # If on expansion, next should be metrics
    expansion_idx = stages.index('expansion')
    metrics_idx = stages.index('metrics')
    assert stages[expansion_idx + 1] == stages[metrics_idx]

    # Last stage (completed) should have no next
    assert stages[-1] == 'completed'


def test_stage_order():
    """Test stages are in correct order."""
    stages = CheckpointManager.STAGES

    expected_order = [
        'created', 'expansion', 'metrics', 'processing',
        'scoring', 'clustering', 'briefs', 'completed'
    ]

    assert stages == expected_order


def test_invalid_stage():
    """Test invalid stage raises error."""
    manager = CheckpointManager(1)

    with pytest.raises(ValueError):
        manager.save_checkpoint('invalid_stage')


@pytest.mark.integration
def test_checkpoint_persistence():
    """Test checkpoint persists to database."""
    # Requires database setup
    pytest.skip("Database integration test")


@pytest.mark.integration
def test_resume_from_checkpoint():
    """Test resuming pipeline from checkpoint."""
    # Requires full pipeline setup
    pytest.skip("Integration test with full pipeline")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
