"""Intelligent alert engine for keyword opportunities."""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import json
import logging

from database import get_db
from models import Project, Keyword, SerpSnapshot
from config import settings

logger = logging.getLogger(__name__)


class OpportunityAlertEngine:
    """Detect and notify about keyword opportunities."""

    def __init__(self):
        self.alert_thresholds = {
            'difficulty_drop': 10,  # Alert if difficulty drops 10+ points
            'trend_spike': 50,  # Alert if trend increases 50%+
            'serp_volatility': 3,  # Alert if 3+ positions change in top 10
            'new_paa': 3,  # Alert if 3+ new PAA questions appear
        }

    def scan_project(self, project_id: int) -> List[Dict]:
        """
        Scan a project for opportunities and alerts.

        Returns list of alert objects with priority, type, and action.
        """

        alerts = []

        logger.info(f"🔍 Scanning project {project_id} for opportunities...")

        # Run all detection methods
        alerts.extend(self._detect_difficulty_drops(project_id))
        alerts.extend(self._detect_serp_volatility(project_id))
        alerts.extend(self._detect_trending_topics(project_id))
        alerts.extend(self._detect_new_paa_questions(project_id))
        alerts.extend(self._detect_quick_wins(project_id))

        # Sort by urgency
        alerts.sort(key=lambda x: self._urgency_score(x), reverse=True)

        logger.info(f"✅ Found {len(alerts)} opportunities")

        return alerts

    def _detect_difficulty_drops(self, project_id: int) -> List[Dict]:
        """Detect keywords that became easier to rank for."""

        alerts = []

        try:
            with get_db() as db:
                # Get keywords with historical difficulty data
                keywords = (db.query(Keyword)
                           .filter(Keyword.project_id == project_id)
                           .filter(Keyword.difficulty.isnot(None))
                           .all())

                for keyword in keywords:
                    # TODO: Track historical difficulty in separate table
                    # For now, we'll just flag low-difficulty + high-opportunity

                    if keyword.difficulty < 40 and keyword.opportunity > 50:
                        alerts.append({
                            'type': 'easy_opportunity',
                            'keyword': keyword.text,
                            'difficulty': keyword.difficulty,
                            'opportunity': keyword.opportunity,
                            'action': f"Target '{keyword.text}' - Low competition, high value",
                            'urgency': 'high',
                            'data': {
                                'traffic_potential': keyword.traffic_potential,
                                'volume': keyword.volume
                            }
                        })

        except Exception as e:
            logger.error(f"Error detecting difficulty drops: {e}")

        return alerts[:5]  # Top 5

    def _detect_serp_volatility(self, project_id: int) -> List[Dict]:
        """Detect SERP changes indicating opportunity."""

        alerts = []

        try:
            with get_db() as db:
                # Get recent SERP snapshots
                recent_snapshots = (db.query(SerpSnapshot)
                                   .filter(SerpSnapshot.project_id == project_id)
                                   .filter(SerpSnapshot.created_at > datetime.utcnow() - timedelta(days=7))
                                   .all())

                # Group by keyword
                by_keyword = {}
                for snapshot in recent_snapshots:
                    if snapshot.query not in by_keyword:
                        by_keyword[snapshot.query] = []
                    by_keyword[snapshot.query].append(snapshot)

                # Detect volatility
                for keyword, snapshots in by_keyword.items():
                    if len(snapshots) >= 2:
                        # Compare latest two
                        snapshots_sorted = sorted(snapshots, key=lambda x: x.created_at, reverse=True)
                        latest = snapshots_sorted[0]
                        previous = snapshots_sorted[1]

                        # Check for position changes
                        volatility = self._calculate_volatility(latest, previous)

                        if volatility >= self.alert_thresholds['serp_volatility']:
                            alerts.append({
                                'type': 'serp_volatility',
                                'keyword': keyword,
                                'changes': volatility,
                                'action': f"SERP unstable for '{keyword}' - opportunity to rank",
                                'urgency': 'high',
                                'data': {
                                    'latest_date': latest.created_at,
                                    'changes_detected': volatility
                                }
                            })

        except Exception as e:
            logger.error(f"Error detecting SERP volatility: {e}")

        return alerts

    def _detect_trending_topics(self, project_id: int) -> List[Dict]:
        """Detect keywords with rising search interest."""

        alerts = []

        try:
            with get_db() as db:
                keywords = (db.query(Keyword)
                           .filter(Keyword.project_id == project_id)
                           .filter(Keyword.trend_direction == 'rising')
                           .order_by(Keyword.opportunity.desc())
                           .limit(10)
                           .all())

                for keyword in keywords:
                    alerts.append({
                        'type': 'trending',
                        'keyword': keyword.text,
                        'trend': 'rising',
                        'action': f"Create content for '{keyword.text}' NOW - trend is rising",
                        'urgency': 'high',
                        'data': {
                            'opportunity': keyword.opportunity,
                            'volume': keyword.volume
                        }
                    })

        except Exception as e:
            logger.error(f"Error detecting trends: {e}")

        return alerts[:3]  # Top 3

    def _detect_new_paa_questions(self, project_id: int) -> List[Dict]:
        """Detect new People Also Ask questions."""

        alerts = []

        try:
            with get_db() as db:
                # Get snapshots from last 7 days
                recent = (db.query(SerpSnapshot)
                         .filter(SerpSnapshot.project_id == project_id)
                         .filter(SerpSnapshot.created_at > datetime.utcnow() - timedelta(days=7))
                         .all())

                # Extract PAA questions (if stored in raw_json)
                # This is simplified - actual implementation would parse JSON

                for snapshot in recent[:10]:
                    # TODO: Parse raw_json for PAA questions
                    # For now, just flag snapshots with features
                    if snapshot.features and 'people_also_ask' in str(snapshot.features).lower():
                        keyword_obj = (db.query(Keyword)
                                      .filter(Keyword.project_id == project_id)
                                      .filter(Keyword.text == snapshot.query)
                                      .first())

                        if keyword_obj:
                            alerts.append({
                                'type': 'new_paa',
                                'keyword': snapshot.query,
                                'action': f"Add FAQ section to content for '{snapshot.query}'",
                                'urgency': 'medium',
                                'data': {
                                    'serp_features': snapshot.features
                                }
                            })

        except Exception as e:
            logger.error(f"Error detecting PAA: {e}")

        return alerts[:5]

    def _detect_quick_wins(self, project_id: int) -> List[Dict]:
        """Detect quick-win opportunities (low difficulty + decent volume)."""

        alerts = []

        try:
            with get_db() as db:
                quick_wins = (db.query(Keyword)
                             .filter(Keyword.project_id == project_id)
                             .filter(Keyword.difficulty < 35)
                             .filter(Keyword.volume > 100)
                             .order_by(Keyword.opportunity.desc())
                             .limit(5)
                             .all())

                for keyword in quick_wins:
                    alerts.append({
                        'type': 'quick_win',
                        'keyword': keyword.text,
                        'difficulty': keyword.difficulty,
                        'volume': keyword.volume,
                        'action': f"Quick win: '{keyword.text}' - Easy to rank, decent traffic",
                        'urgency': 'medium',
                        'data': {
                            'opportunity': keyword.opportunity,
                            'intent': keyword.intent
                        }
                    })

        except Exception as e:
            logger.error(f"Error detecting quick wins: {e}")

        return alerts

    def _calculate_volatility(self, snapshot1: SerpSnapshot, snapshot2: SerpSnapshot) -> int:
        """Calculate SERP volatility between two snapshots."""

        # Simplified - compare number of results
        # Real implementation would compare URLs and positions

        if not snapshot1.results or not snapshot2.results:
            return 0

        results1 = snapshot1.results if isinstance(snapshot1.results, list) else []
        results2 = snapshot2.results if isinstance(snapshot2.results, list) else []

        # Count how many URLs changed
        urls1 = set([r.get('link', '') for r in results1[:10]])
        urls2 = set([r.get('link', '') for r in results2[:10]])

        changes = len(urls1.symmetric_difference(urls2))

        return changes

    def _urgency_score(self, alert: Dict) -> int:
        """Calculate urgency score for sorting."""

        urgency_map = {
            'high': 100,
            'medium': 50,
            'low': 10
        }

        base_score = urgency_map.get(alert.get('urgency', 'low'), 10)

        # Boost certain types
        type_boost = {
            'serp_volatility': 20,
            'trending': 15,
            'difficulty_drop': 10,
            'easy_opportunity': 5
        }

        boost = type_boost.get(alert.get('type', ''), 0)

        return base_score + boost

    # ========================================================================
    # Notification Methods
    # ========================================================================

    def send_alerts(self,
                   alerts: List[Dict],
                   channels: List[str] = ['email'],
                   recipients: Optional[List[str]] = None):
        """
        Send alerts via configured channels.

        Channels: 'email', 'slack', 'webhook', 'dashboard'
        """

        if not alerts:
            logger.info("No alerts to send")
            return

        for channel in channels:
            try:
                if channel == 'email':
                    self._send_email_alerts(alerts, recipients)
                elif channel == 'slack':
                    self._send_slack_alerts(alerts)
                elif channel == 'webhook':
                    self._send_webhook_alerts(alerts)
                elif channel == 'dashboard':
                    self._store_dashboard_alerts(alerts)

            except Exception as e:
                logger.error(f"Error sending {channel} alerts: {e}")

    def _send_email_alerts(self, alerts: List[Dict], recipients: Optional[List[str]] = None):
        """Send alerts via email."""

        if not recipients:
            logger.warning("No email recipients configured")
            return

        # Build email content
        subject = f"🎯 Keyword Opportunities Alert - {len(alerts)} opportunities found"

        html_body = self._format_email_html(alerts)

        # Send email (simplified - needs proper SMTP config)
        try:
            # TODO: Configure SMTP settings in config.py
            logger.info(f"📧 Would send email to {recipients} with {len(alerts)} alerts")
            # Actual SMTP sending code would go here

        except Exception as e:
            logger.error(f"Error sending email: {e}")

    def _send_slack_alerts(self, alerts: List[Dict]):
        """Send alerts to Slack."""

        # TODO: Get Slack webhook URL from config
        slack_webhook = getattr(settings, 'slack_webhook_url', None)

        if not slack_webhook:
            logger.warning("Slack webhook not configured")
            return

        # Format message
        message = {
            "text": f"🎯 Found {len(alerts)} keyword opportunities!",
            "blocks": []
        }

        for alert in alerts[:5]:  # Top 5 for Slack
            message["blocks"].append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{alert['type'].upper()}*: {alert['action']}"
                }
            })

        try:
            response = requests.post(slack_webhook, json=message)
            response.raise_for_status()
            logger.info("✅ Sent Slack notification")

        except Exception as e:
            logger.error(f"Error sending Slack alert: {e}")

    def _send_webhook_alerts(self, alerts: List[Dict]):
        """Send alerts to custom webhook."""

        webhook_url = getattr(settings, 'alert_webhook_url', None)

        if not webhook_url:
            return

        payload = {
            'timestamp': datetime.utcnow().isoformat(),
            'alert_count': len(alerts),
            'alerts': alerts
        }

        try:
            response = requests.post(webhook_url, json=payload)
            response.raise_for_status()
            logger.info("✅ Sent webhook notification")

        except Exception as e:
            logger.error(f"Error sending webhook: {e}")

    def _store_dashboard_alerts(self, alerts: List[Dict]):
        """Store alerts in database for dashboard display."""

        # TODO: Create alerts table for dashboard
        logger.info(f"📊 Storing {len(alerts)} alerts for dashboard")

    def _format_email_html(self, alerts: List[Dict]) -> str:
        """Format alerts as HTML email."""

        html = f"""
        <html>
        <body>
            <h2>🎯 Keyword Opportunities Alert</h2>
            <p>Found {len(alerts)} opportunities that need your attention:</p>

            <table style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="padding: 10px; border: 1px solid #ddd;">Type</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Keyword</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Action</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Urgency</th>
                    </tr>
                </thead>
                <tbody>
        """

        for alert in alerts:
            urgency_color = {
                'high': '#ff6b6b',
                'medium': '#ffa500',
                'low': '#51cf66'
            }.get(alert.get('urgency', 'low'), '#999')

            html += f"""
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">{alert.get('type', 'N/A')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>{alert.get('keyword', 'N/A')}</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">{alert.get('action', 'N/A')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; background-color: {urgency_color}; color: white;">
                        {alert.get('urgency', 'N/A').upper()}
                    </td>
                </tr>
            """

        html += """
                </tbody>
            </table>

            <p style="margin-top: 20px;">
                <a href="http://localhost:3000" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    View in Dashboard
                </a>
            </p>
        </body>
        </html>
        """

        return html


# ============================================================================
# CLI Usage
# ============================================================================

if __name__ == "__main__":
    """
    Test alert engine:

    python automation/alert_engine.py
    """

    import sys

    if len(sys.argv) < 2:
        print("Usage: python automation/alert_engine.py <project_id>")
        sys.exit(1)

    project_id = int(sys.argv[1])

    engine = OpportunityAlertEngine()
    alerts = engine.scan_project(project_id)

    print(f"\n{'='*80}")
    print(f"🎯 OPPORTUNITY ALERTS FOR PROJECT {project_id}")
    print(f"{'='*80}\n")

    if not alerts:
        print("✅ No urgent alerts - all good!")
    else:
        for i, alert in enumerate(alerts, 1):
            urgency_emoji = {
                'high': '🔴',
                'medium': '🟡',
                'low': '🟢'
            }.get(alert['urgency'], '⚪')

            print(f"{i}. {urgency_emoji} {alert['type'].upper()}")
            print(f"   Keyword: {alert['keyword']}")
            print(f"   Action:  {alert['action']}")
            print(f"   Urgency: {alert['urgency']}")
            print()

    print(f"{'='*80}\n")
