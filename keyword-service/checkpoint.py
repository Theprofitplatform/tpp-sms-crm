"""Pipeline checkpoint management for resume functionality."""
from typing import Optional, Dict, Any
from datetime import datetime
from database import get_db
from models import Project


class CheckpointManager:
    """Manage pipeline checkpoints for resumable execution."""

    STAGES = [
        'created',
        'expansion',
        'metrics',
        'processing',
        'scoring',
        'clustering',
        'briefs',
        'completed'
    ]

    def __init__(self, project_id: int):
        self.project_id = project_id

    def save_checkpoint(self, stage: str, data: Optional[Dict[str, Any]] = None):
        """Save checkpoint after completing a stage."""
        if stage not in self.STAGES:
            raise ValueError(f"Invalid stage: {stage}. Must be one of {self.STAGES}")

        with get_db() as db:
            project = db.query(Project).filter(Project.id == self.project_id).first()
            if project:
                project.last_checkpoint = stage
                project.checkpoint_timestamp = datetime.utcnow()
                project.checkpoint_data = data or {}
                db.commit()

                print(f"✓ Checkpoint saved: {stage} at {project.checkpoint_timestamp}")

    def get_checkpoint(self) -> Optional[Dict[str, Any]]:
        """Get current checkpoint state."""
        with get_db() as db:
            project = db.query(Project).filter(Project.id == self.project_id).first()
            if project and project.last_checkpoint:
                return {
                    'stage': project.last_checkpoint,
                    'timestamp': project.checkpoint_timestamp,
                    'data': project.checkpoint_data or {}
                }
        return None

    def get_next_stage(self) -> Optional[str]:
        """Get the next stage to execute based on current checkpoint."""
        checkpoint = self.get_checkpoint()
        if not checkpoint:
            return self.STAGES[0]  # Start from beginning

        current_stage = checkpoint['stage']
        if current_stage == 'completed':
            return None  # Already completed

        try:
            current_index = self.STAGES.index(current_stage)
            if current_index < len(self.STAGES) - 1:
                return self.STAGES[current_index + 1]
        except ValueError:
            pass

        return None

    def is_completed(self) -> bool:
        """Check if pipeline is completed."""
        checkpoint = self.get_checkpoint()
        return checkpoint and checkpoint['stage'] == 'completed'

    def can_resume(self) -> bool:
        """Check if project can be resumed."""
        checkpoint = self.get_checkpoint()
        return checkpoint is not None and not self.is_completed()

    def clear_checkpoint(self):
        """Clear checkpoint data (for fresh start)."""
        with get_db() as db:
            project = db.query(Project).filter(Project.id == self.project_id).first()
            if project:
                project.last_checkpoint = None
                project.checkpoint_timestamp = None
                project.checkpoint_data = None
                db.commit()

    def print_status(self):
        """Print checkpoint status."""
        checkpoint = self.get_checkpoint()
        if not checkpoint:
            print("No checkpoint found - starting from beginning")
            return

        stage = checkpoint['stage']
        timestamp = checkpoint['timestamp']

        if self.is_completed():
            print(f"✅ Pipeline completed at {timestamp}")
        else:
            next_stage = self.get_next_stage()
            print(f"📌 Last checkpoint: {stage} at {timestamp}")
            print(f"▶️  Next stage: {next_stage}")


def with_checkpoint(stage_name: str):
    """Decorator to automatically save checkpoint after stage completion."""
    def decorator(func):
        def wrapper(self, *args, **kwargs):
            # Check if this is a method of an object with checkpoint_manager
            if hasattr(self, 'checkpoint_manager'):
                result = func(self, *args, **kwargs)
                self.checkpoint_manager.save_checkpoint(stage_name)
                return result
            else:
                # No checkpoint manager, just run function
                return func(self, *args, **kwargs)
        return wrapper
    return decorator
