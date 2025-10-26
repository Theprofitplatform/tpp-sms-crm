"""Content gap analysis - identify missing topics and opportunities."""
from typing import List, Dict, Optional
from collections import defaultdict
import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

from database import get_db
from models import Project, Keyword, Topic, PageGroup
from processing.intent_classifier import IntentClassifier

logger = logging.getLogger(__name__)


class ContentGapAnalyzer:
    """Identify content gaps in your coverage."""

    def __init__(self):
        self.intent_classifier = IntentClassifier()

    def analyze_gaps(self,
                    project_id: int,
                    existing_content: Optional[List[Dict]] = None,
                    auto_import: bool = True) -> Dict:
        """
        Find content gaps in keyword coverage.

        Args:
            project_id: Project to analyze
            existing_content: List of existing URLs/titles (optional)
            auto_import: Try to import from sitemap/GSC

        Returns:
            {
                'gaps': [...],
                'coverage_score': 0-100,
                'recommendations': [...]
            }
        """

        logger.info(f"🔍 Analyzing content gaps for project {project_id}...")

        with get_db() as db:
            project = db.query(Project).filter(Project.id == project_id).first()

            if not project:
                return {'error': 'Project not found'}

            # Import existing content if needed
            if auto_import and not existing_content:
                existing_content = self._auto_import_content(project)

            # Get all keyword clusters
            topics = (db.query(Topic)
                     .filter(Topic.project_id == project_id)
                     .all())

            page_groups = (db.query(PageGroup)
                          .filter(PageGroup.project_id == project_id)
                          .all())

            keywords = (db.query(Keyword)
                       .filter(Keyword.project_id == project_id)
                       .all())

        # Analyze coverage
        coverage_analysis = self._analyze_coverage(
            topics, page_groups, keywords, existing_content
        )

        # Identify gaps
        gaps = self._identify_gaps(
            topics, page_groups, keywords, existing_content
        )

        # Generate recommendations
        recommendations = self._generate_recommendations(gaps, project)

        results = {
            'coverage_score': coverage_analysis['score'],
            'total_topics': len(topics),
            'covered_topics': coverage_analysis['covered'],
            'total_page_groups': len(page_groups),
            'covered_page_groups': coverage_analysis['covered_pages'],
            'gaps': gaps,
            'recommendations': recommendations,
            'existing_content_count': len(existing_content) if existing_content else 0
        }

        logger.info(f"✅ Coverage: {results['coverage_score']:.1f}% - Found {len(gaps)} gaps")

        return results

    def _auto_import_content(self, project: Project) -> List[Dict]:
        """Auto-import existing content from sitemap or URL crawl."""

        content = []

        if project.business_url:
            logger.info(f"📥 Importing content from {project.business_url}...")

            # Try sitemap first
            sitemap_content = self._import_from_sitemap(project.business_url)

            if sitemap_content:
                content.extend(sitemap_content)
            else:
                # Fallback: Crawl homepage
                homepage_content = self._import_from_homepage(project.business_url)
                content.extend(homepage_content)

        return content

    def _import_from_sitemap(self, base_url: str) -> List[Dict]:
        """Import URLs from sitemap.xml."""

        content = []

        sitemap_urls = [
            f"{base_url.rstrip('/')}/sitemap.xml",
            f"{base_url.rstrip('/')}/sitemap_index.xml",
        ]

        for sitemap_url in sitemap_urls:
            try:
                response = requests.get(sitemap_url, timeout=10)
                response.raise_for_status()

                # Parse XML
                root = ET.fromstring(response.content)

                # Handle namespace
                namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

                # Extract URLs
                for url_element in root.findall('.//ns:url', namespace):
                    loc = url_element.find('ns:loc', namespace)

                    if loc is not None:
                        url = loc.text

                        # Extract title from URL (better than nothing)
                        path = urlparse(url).path
                        title = path.strip('/').replace('-', ' ').replace('_', ' ').title()

                        content.append({
                            'url': url,
                            'title': title,
                            'source': 'sitemap'
                        })

                logger.info(f"  ✅ Imported {len(content)} URLs from sitemap")
                return content

            except Exception as e:
                continue

        return content

    def _import_from_homepage(self, url: str) -> List[Dict]:
        """Crawl homepage and extract internal links."""

        content = []

        try:
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0'
            })
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Find blog/article links
            for link in soup.find_all('a', href=True):
                href = link['href']

                # Filter for content URLs (blog posts, articles, guides)
                if any(x in href for x in ['blog', 'article', 'guide', 'post', 'resource']):
                    title = link.get_text().strip()

                    if title:
                        content.append({
                            'url': href,
                            'title': title,
                            'source': 'homepage_crawl'
                        })

            logger.info(f"  ✅ Found {len(content)} content URLs from homepage")

        except Exception as e:
            logger.error(f"  ❌ Error crawling homepage: {e}")

        return content

    def _analyze_coverage(self,
                         topics: List[Topic],
                         page_groups: List[PageGroup],
                         keywords: List[Keyword],
                         existing_content: Optional[List[Dict]]) -> Dict:
        """Calculate coverage score."""

        if not existing_content:
            return {
                'score': 0,
                'covered': 0,
                'covered_pages': 0
            }

        # Extract keywords from existing content titles
        existing_keywords = set()
        for content in existing_content:
            title = content.get('title', '').lower()
            # Simple keyword extraction
            words = title.split()
            for keyword in keywords:
                if keyword.text.lower() in title:
                    existing_keywords.add(keyword.text)

        # Calculate topic coverage
        covered_topics = 0
        for topic in topics:
            # Check if topic label is covered
            if any(topic.label.lower() in content.get('title', '').lower()
                   for content in existing_content):
                covered_topics += 1

        # Calculate page group coverage
        covered_pages = 0
        for pg in page_groups:
            if any(pg.label.lower() in content.get('title', '').lower()
                   for content in existing_content):
                covered_pages += 1

        # Overall coverage score
        total_items = len(topics) + len(page_groups)
        covered_items = covered_topics + covered_pages

        score = (covered_items / total_items * 100) if total_items > 0 else 0

        return {
            'score': score,
            'covered': covered_topics,
            'covered_pages': covered_pages,
            'existing_keywords': len(existing_keywords)
        }

    def _identify_gaps(self,
                      topics: List[Topic],
                      page_groups: List[PageGroup],
                      keywords: List[Keyword],
                      existing_content: Optional[List[Dict]]) -> List[Dict]:
        """Identify specific content gaps."""

        gaps = []

        if not existing_content:
            # All topics are gaps
            for topic in topics:
                gaps.append({
                    'type': 'missing_topic',
                    'topic': topic.label,
                    'opportunity': topic.total_opportunity,
                    'volume': topic.total_volume,
                    'recommended_action': 'create_pillar_content',
                    'priority': self._calculate_gap_priority(topic)
                })

            return gaps

        # Find uncovered topics
        for topic in topics:
            is_covered = any(
                topic.label.lower() in content.get('title', '').lower()
                for content in existing_content
            )

            if not is_covered:
                gaps.append({
                    'type': 'missing_topic',
                    'topic': topic.label,
                    'opportunity': topic.total_opportunity,
                    'volume': topic.total_volume,
                    'recommended_action': 'create_pillar_content',
                    'priority': self._calculate_gap_priority(topic)
                })

        # Find uncovered page groups
        for pg in page_groups:
            is_covered = any(
                pg.label.lower() in content.get('title', '').lower()
                for content in existing_content
            )

            if not is_covered:
                gaps.append({
                    'type': 'missing_page',
                    'page_group': pg.label,
                    'opportunity': pg.total_opportunity,
                    'volume': pg.total_volume,
                    'recommended_action': 'create_article',
                    'priority': self._calculate_page_priority(pg)
                })

        # Sort by priority
        gaps.sort(key=lambda x: x['priority'], reverse=True)

        return gaps

    def _generate_recommendations(self, gaps: List[Dict], project: Project) -> List[Dict]:
        """Generate actionable recommendations."""

        recommendations = []

        # Group gaps by type
        by_type = defaultdict(list)
        for gap in gaps:
            by_type[gap['type']].append(gap)

        # Recommendation 1: High-priority missing topics
        high_priority_topics = [
            g for g in by_type.get('missing_topic', [])
            if g['priority'] > 70
        ]

        if high_priority_topics:
            recommendations.append({
                'recommendation': 'Create pillar content for high-opportunity topics',
                'action': 'create_pillar_content',
                'topics': [g['topic'] for g in high_priority_topics[:5]],
                'expected_impact': 'high',
                'estimated_effort': 'high',
                'timeline': '2-4 weeks'
            })

        # Recommendation 2: Quick wins (high opportunity, low effort)
        quick_wins = [
            g for g in gaps
            if g['volume'] > 100 and g['priority'] > 50
        ][:10]

        if quick_wins:
            recommendations.append({
                'recommendation': 'Target quick-win keywords first',
                'action': 'create_articles',
                'keywords': [g.get('page_group') or g.get('topic') for g in quick_wins[:5]],
                'expected_impact': 'medium',
                'estimated_effort': 'low',
                'timeline': '1-2 weeks'
            })

        # Recommendation 3: Fill content clusters
        recommendations.append({
            'recommendation': 'Create content clusters around pillar topics',
            'action': 'cluster_strategy',
            'details': 'Build hub-and-spoke content model',
            'expected_impact': 'high',
            'estimated_effort': 'medium',
            'timeline': '4-8 weeks'
        })

        return recommendations

    def _calculate_gap_priority(self, topic: Topic) -> int:
        """Calculate priority score for a gap (0-100)."""

        # Factors: opportunity, volume, avg difficulty
        opportunity_score = min(topic.total_opportunity, 100)
        volume_score = min(topic.total_volume / 100, 100)  # Normalize
        difficulty_bonus = (100 - topic.avg_difficulty) * 0.5  # Easier = higher priority

        priority = (opportunity_score * 0.5 +
                   volume_score * 0.3 +
                   difficulty_bonus * 0.2)

        return int(priority)

    def _calculate_page_priority(self, page_group: PageGroup) -> int:
        """Calculate priority score for a page group gap."""

        opportunity_score = min(page_group.total_opportunity, 100)
        volume_score = min(page_group.total_volume / 100, 100)

        priority = opportunity_score * 0.6 + volume_score * 0.4

        return int(priority)


# ============================================================================
# CLI Usage
# ============================================================================

if __name__ == "__main__":
    """
    Test gap analyzer:

    python automation/gap_analyzer.py <project_id>
    """

    import sys

    if len(sys.argv) < 2:
        print("Usage: python automation/gap_analyzer.py <project_id>")
        sys.exit(1)

    project_id = int(sys.argv[1])

    analyzer = ContentGapAnalyzer()
    results = analyzer.analyze_gaps(project_id, auto_import=True)

    print(f"\n{'='*80}")
    print(f"📊 CONTENT GAP ANALYSIS - PROJECT {project_id}")
    print(f"{'='*80}\n")

    print(f"Coverage Score: {results['coverage_score']:.1f}%")
    print(f"Topics: {results['covered_topics']}/{results['total_topics']} covered")
    print(f"Page Groups: {results['covered_page_groups']}/{results['total_page_groups']} covered")
    print(f"Existing Content: {results['existing_content_count']} pages")
    print()

    print(f"{'='*80}")
    print(f"🎯 TOP 10 CONTENT GAPS")
    print(f"{'='*80}\n")

    for i, gap in enumerate(results['gaps'][:10], 1):
        print(f"{i}. {gap['type'].upper()}")
        print(f"   Topic/Keyword: {gap.get('topic') or gap.get('page_group')}")
        print(f"   Opportunity: {gap['opportunity']:.1f}")
        print(f"   Priority: {gap['priority']}/100")
        print(f"   Action: {gap['recommended_action']}")
        print()

    print(f"{'='*80}")
    print(f"💡 RECOMMENDATIONS")
    print(f"{'='*80}\n")

    for i, rec in enumerate(results['recommendations'], 1):
        print(f"{i}. {rec['recommendation']}")
        print(f"   Impact: {rec['expected_impact'].upper()}")
        print(f"   Effort: {rec['estimated_effort'].upper()}")
        print(f"   Timeline: {rec['timeline']}")
        print()

    print(f"{'='*80}\n")
