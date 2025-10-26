"""Automated scheduling for continuous keyword research."""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from typing import Optional, Dict, List
import logging

from database import get_db
from models import Project, Keyword
from orchestrator import KeywordResearchOrchestrator
from providers.serpapi_client import SerpApiClient
from providers.trends import TrendsProvider
from processing.scoring import KeywordScorer

logger = logging.getLogger(__name__)


class ResearchScheduler:
    """Schedule automated research tasks."""

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.orchestrator = KeywordResearchOrchestrator()
        self.serp_client = SerpApiClient()
        self.trends_client = TrendsProvider()
        self.scorer = KeywordScorer()

        # Start scheduler
        self.scheduler.start()
        logger.info("✅ Research scheduler started")

    def schedule_project_refresh(self,
                                 project_id: int,
                                 frequency: str = "weekly") -> str:
        """
        Schedule automatic refresh of project data.

        Args:
            project_id: Project to refresh
            frequency: 'daily', 'weekly', 'monthly', or cron expression

        Returns:
            job_id for management
        """

        # Define trigger based on frequency
        if frequency == "daily":
            trigger = CronTrigger(hour=2, minute=0)  # 2 AM daily
        elif frequency == "weekly":
            trigger = CronTrigger(day_of_week='mon', hour=2, minute=0)  # Monday 2 AM
        elif frequency == "biweekly":
            trigger = CronTrigger(day_of_week='mon', week='*/2', hour=2, minute=0)
        elif frequency == "monthly":
            trigger = CronTrigger(day=1, hour=2, minute=0)  # 1st of month
        else:
            # Assume cron expression
            trigger = CronTrigger.from_crontab(frequency)

        job_id = f"refresh_project_{project_id}"

        # Schedule the job
        self.scheduler.add_job(
            func=self._refresh_project,
            trigger=trigger,
            args=[project_id],
            id=job_id,
            replace_existing=True,
            max_instances=1  # Prevent overlapping runs
        )

        logger.info(f"✅ Scheduled {frequency} refresh for project {project_id}")

        return job_id

    def schedule_serp_monitoring(self,
                                 project_id: int,
                                 top_n: int = 50) -> str:
        """
        Monitor SERP changes for top keywords daily.

        Args:
            project_id: Project to monitor
            top_n: Monitor top N keywords by opportunity score
        """

        job_id = f"monitor_serps_{project_id}"

        # Daily at 3 AM
        trigger = CronTrigger(hour=3, minute=0)

        self.scheduler.add_job(
            func=self._monitor_serp_changes,
            trigger=trigger,
            args=[project_id, top_n],
            id=job_id,
            replace_existing=True
        )

        logger.info(f"✅ Scheduled daily SERP monitoring for project {project_id}")

        return job_id

    def schedule_trend_monitoring(self, project_id: int) -> str:
        """Monitor Google Trends for spikes (daily check)."""

        job_id = f"monitor_trends_{project_id}"

        # Daily at 4 AM
        trigger = CronTrigger(hour=4, minute=0)

        self.scheduler.add_job(
            func=self._monitor_trends,
            trigger=trigger,
            args=[project_id],
            id=job_id,
            replace_existing=True
        )

        logger.info(f"✅ Scheduled trend monitoring for project {project_id}")

        return job_id

    def run_once_at(self, job_func, run_time: datetime, *args, **kwargs) -> str:
        """Schedule a one-time job."""

        job = self.scheduler.add_job(
            func=job_func,
            trigger='date',
            run_date=run_time,
            args=args,
            kwargs=kwargs
        )

        return job.id

    def cancel_job(self, job_id: str):
        """Cancel a scheduled job."""
        self.scheduler.remove_job(job_id)
        logger.info(f"❌ Cancelled job {job_id}")

    def list_jobs(self) -> List[Dict]:
        """List all scheduled jobs."""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'next_run': job.next_run_time,
                'trigger': str(job.trigger)
            })
        return jobs

    # ========================================================================
    # Internal job functions
    # ========================================================================

    def _refresh_project(self, project_id: int):
        """Refresh all data for a project."""

        logger.info(f"🔄 Starting scheduled refresh for project {project_id}")

        try:
            with get_db() as db:
                project = db.query(Project).filter(Project.id == project_id).first()

                if not project:
                    logger.error(f"❌ Project {project_id} not found")
                    return

                keywords = db.query(Keyword).filter(Keyword.project_id == project_id).all()

                logger.info(f"Refreshing {len(keywords)} keywords...")

                # Refresh SERP data and re-score
                for keyword in keywords[:100]:  # Limit to avoid quota issues
                    try:
                        # Re-fetch SERP data
                        serp_metrics = self.serp_client.extract_serp_metrics(
                            keyword.text,
                            project.geo,
                            project.language
                        )

                        # Re-calculate difficulty
                        difficulty_result = self.scorer.calculate_difficulty(
                            serp_metrics,
                            keyword.text,
                            return_components=True
                        )

                        if isinstance(difficulty_result, dict):
                            difficulty = difficulty_result['difficulty']
                        else:
                            difficulty = difficulty_result

                        # Update keyword
                        keyword.difficulty = difficulty
                        keyword.updated_at = datetime.utcnow()

                        # Re-calculate opportunity (traffic potential stays same)
                        opportunity = self.scorer.calculate_opportunity(
                            keyword.traffic_potential,
                            difficulty,
                            keyword.cpc,
                            keyword.intent,
                            project.content_focus,
                            serp_metrics.get('features', [])
                        )

                        keyword.opportunity = opportunity

                    except Exception as e:
                        logger.error(f"Error refreshing {keyword.text}: {e}")
                        continue

                # Mark project as updated
                project.updated_at = datetime.utcnow()

            logger.info(f"✅ Completed refresh for project {project_id}")

        except Exception as e:
            logger.error(f"❌ Error in scheduled refresh: {e}")

    def _monitor_serp_changes(self, project_id: int, top_n: int = 50):
        """Monitor SERP changes and detect opportunities."""

        logger.info(f"👀 Monitoring SERP changes for project {project_id}")

        try:
            with get_db() as db:
                project = db.query(Project).filter(Project.id == project_id).first()

                if not project:
                    return

                # Get top keywords by opportunity
                keywords = (db.query(Keyword)
                           .filter(Keyword.project_id == project_id)
                           .order_by(Keyword.opportunity.desc())
                           .limit(top_n)
                           .all())

                changes_detected = []

                for keyword in keywords:
                    try:
                        # Get current SERP
                        current_serp = self.serp_client.extract_serp_metrics(
                            keyword.text,
                            project.geo,
                            project.language
                        )

                        # Compare with previous difficulty
                        old_difficulty = keyword.difficulty

                        new_difficulty_result = self.scorer.calculate_difficulty(
                            current_serp,
                            keyword.text,
                            return_components=True
                        )

                        if isinstance(new_difficulty_result, dict):
                            new_difficulty = new_difficulty_result['difficulty']
                        else:
                            new_difficulty = new_difficulty_result

                        # Detect significant changes
                        difficulty_change = old_difficulty - new_difficulty

                        if abs(difficulty_change) > 10:  # 10+ point change
                            changes_detected.append({
                                'keyword': keyword.text,
                                'old_difficulty': old_difficulty,
                                'new_difficulty': new_difficulty,
                                'change': difficulty_change,
                                'type': 'easier' if difficulty_change > 0 else 'harder'
                            })

                            # Update in database
                            keyword.difficulty = new_difficulty

                    except Exception as e:
                        logger.error(f"Error monitoring {keyword.text}: {e}")
                        continue

                if changes_detected:
                    logger.info(f"🎯 Detected {len(changes_detected)} significant SERP changes")

                    # TODO: Trigger alert notification
                    # This will be implemented in alert_engine.py

        except Exception as e:
            logger.error(f"❌ Error in SERP monitoring: {e}")

    def _monitor_trends(self, project_id: int):
        """Monitor Google Trends for trending keywords."""

        logger.info(f"📈 Monitoring trends for project {project_id}")

        try:
            with get_db() as db:
                keywords = (db.query(Keyword)
                           .filter(Keyword.project_id == project_id)
                           .limit(50)
                           .all())

                trending_keywords = []

                for keyword in keywords:
                    try:
                        trend_analysis = self.trends_client.analyze_trend_direction(
                            keyword.text,
                            'US'
                        )

                        if trend_analysis['direction'] == 'rising':
                            trending_keywords.append({
                                'keyword': keyword.text,
                                'trend': trend_analysis
                            })

                    except Exception as e:
                        continue

                if trending_keywords:
                    logger.info(f"🔥 Found {len(trending_keywords)} trending keywords")

                    # TODO: Trigger alert

        except Exception as e:
            logger.error(f"❌ Error in trend monitoring: {e}")

    def shutdown(self):
        """Gracefully shutdown scheduler."""
        self.scheduler.shutdown()
        logger.info("👋 Scheduler shutdown")


# ============================================================================
# Global scheduler instance
# ============================================================================

_scheduler_instance: Optional[ResearchScheduler] = None


def get_scheduler() -> ResearchScheduler:
    """Get or create global scheduler instance."""
    global _scheduler_instance

    if _scheduler_instance is None:
        _scheduler_instance = ResearchScheduler()

    return _scheduler_instance


def setup_default_schedules(project_id: int, frequency: str = "weekly"):
    """Setup default monitoring for a project."""

    scheduler = get_scheduler()

    # Schedule refresh
    scheduler.schedule_project_refresh(project_id, frequency)

    # Schedule SERP monitoring (daily)
    scheduler.schedule_serp_monitoring(project_id, top_n=50)

    # Schedule trend monitoring (daily)
    scheduler.schedule_trend_monitoring(project_id)

    logger.info(f"✅ Setup all automation for project {project_id}")


# ============================================================================
# CLI Usage Example
# ============================================================================

if __name__ == "__main__":
    """
    Test scheduler:

    python automation/scheduler.py
    """

    import time

    scheduler = get_scheduler()

    # Example: Schedule weekly refresh for project 1
    job_id = scheduler.schedule_project_refresh(
        project_id=1,
        frequency="weekly"
    )

    print(f"✅ Scheduled job: {job_id}")

    # List all jobs
    jobs = scheduler.list_jobs()
    print(f"\n📋 Scheduled Jobs ({len(jobs)}):")
    for job in jobs:
        print(f"  - {job['id']}: Next run at {job['next_run']}")

    # Keep alive for testing
    print("\n⏰ Scheduler running... (Ctrl+C to stop)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        scheduler.shutdown()
        print("\n👋 Goodbye!")
