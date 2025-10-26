"""Sync keyword research to workflow/project management tools."""
from typing import List, Dict, Optional
from datetime import datetime
import logging

from database import get_db
from models import Project, PageGroup, Keyword
from config import settings

logger = logging.getLogger(__name__)


class WorkflowSync:
    """Sync research data to project management tools."""

    def __init__(self):
        self.notion_enabled = bool(getattr(settings, 'notion_api_key', None))
        self.asana_enabled = False  # TODO: Add Asana support
        self.airtable_enabled = False  # TODO: Add Airtable support

    def auto_sync_project(self,
                         project_id: int,
                         platform: str = 'notion',
                         create_tasks: bool = True) -> Dict:
        """
        Automatically sync project to workflow platform.

        Args:
            project_id: Project to sync
            platform: 'notion', 'asana', 'airtable', 'trello'
            create_tasks: Create tasks for each content brief

        Returns:
            Sync results summary
        """

        if platform == 'notion':
            return self.sync_to_notion(project_id, create_tasks)
        elif platform == 'asana':
            return self.sync_to_asana(project_id, create_tasks)
        elif platform == 'airtable':
            return self.sync_to_airtable(project_id)
        else:
            raise ValueError(f"Unsupported platform: {platform}")

    def sync_to_notion(self, project_id: int, create_tasks: bool = True) -> Dict:
        """
        Sync project to Notion database.

        Creates:
        - One page per content brief
        - Properties: Priority, Status, Word Count, Intent, Opportunity
        - Content: Full outline, FAQs, keywords
        """

        if not self.notion_enabled:
            logger.warning("⚠️  Notion not configured. Set NOTION_API_KEY in .env")
            return {'success': False, 'error': 'Notion not configured'}

        try:
            from notion_client import Client
        except ImportError:
            logger.error("notion-client not installed. Run: pip install notion-client")
            return {'success': False, 'error': 'notion-client not installed'}

        notion = Client(auth=settings.notion_api_key)
        database_id = getattr(settings, 'notion_database_id', None)

        if not database_id:
            logger.error("NOTION_DATABASE_ID not set in .env")
            return {'success': False, 'error': 'Database ID missing'}

        results = {
            'success': True,
            'pages_created': 0,
            'errors': []
        }

        try:
            with get_db() as db:
                project = db.query(Project).filter(Project.id == project_id).first()

                if not project:
                    return {'success': False, 'error': 'Project not found'}

                # Get all page groups (content briefs)
                page_groups = (db.query(PageGroup)
                              .filter(PageGroup.project_id == project_id)
                              .order_by(PageGroup.total_opportunity.desc())
                              .all())

                logger.info(f"📝 Syncing {len(page_groups)} briefs to Notion...")

                for pg in page_groups:
                    try:
                        # Get keywords for this page group
                        keywords = (db.query(Keyword)
                                   .filter(Keyword.project_id == project_id)
                                   .filter(Keyword.text.in_([pg.label]))  # Simplified
                                   .all())

                        # Build Notion page
                        notion_page = self._build_notion_page(pg, keywords, project)

                        # Create page in Notion
                        response = notion.pages.create(**notion_page)

                        results['pages_created'] += 1
                        logger.info(f"  ✅ Created: {pg.label}")

                    except Exception as e:
                        logger.error(f"  ❌ Error creating page for '{pg.label}': {e}")
                        results['errors'].append(str(e))

                logger.info(f"✅ Synced {results['pages_created']} pages to Notion")

        except Exception as e:
            logger.error(f"❌ Notion sync error: {e}")
            results['success'] = False
            results['error'] = str(e)

        return results

    def _build_notion_page(self,
                          page_group: PageGroup,
                          keywords: List[Keyword],
                          project: Project) -> Dict:
        """Build Notion page structure from page group."""

        # Determine priority based on opportunity score
        if page_group.total_opportunity > 70:
            priority = "High"
        elif page_group.total_opportunity > 40:
            priority = "Medium"
        else:
            priority = "Low"

        # Parse word count range
        word_count = self._parse_word_count(page_group.word_range)

        # Build page properties
        properties = {
            'Title': {
                'title': [
                    {
                        'text': {
                            'content': page_group.label
                        }
                    }
                ]
            },
            'Status': {
                'select': {
                    'name': 'To Do'
                }
            },
            'Priority': {
                'select': {
                    'name': priority
                }
            },
            'Word Count': {
                'number': word_count
            },
            'Opportunity Score': {
                'number': round(page_group.total_opportunity, 1)
            },
            'Search Volume': {
                'number': page_group.total_volume
            }
        }

        # Build page content
        children = []

        # Section 1: Overview
        children.append({
            'object': 'block',
            'type': 'heading_1',
            'heading_1': {
                'rich_text': [{'type': 'text', 'text': {'content': 'Content Brief'}}]
            }
        })

        children.append({
            'object': 'block',
            'type': 'paragraph',
            'paragraph': {
                'rich_text': [
                    {
                        'type': 'text',
                        'text': {
                            'content': f"Target Keyword: {page_group.label}\n"
                                     f"Opportunity Score: {page_group.total_opportunity:.1f}\n"
                                     f"Search Volume: {page_group.total_volume}\n"
                                     f"Recommended Word Count: {page_group.word_range}"
                        }
                    }
                ]
            }
        })

        # Section 2: Outline
        if page_group.outline:
            children.append({
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {
                    'rich_text': [{'type': 'text', 'text': {'content': 'Outline'}}]
                }
            })

            for item in page_group.outline[:10]:  # Limit to avoid API limits
                children.append({
                    'object': 'block',
                    'type': 'bulleted_list_item',
                    'bulleted_list_item': {
                        'rich_text': [
                            {'type': 'text', 'text': {'content': str(item)}}
                        ]
                    }
                })

        # Section 3: FAQs
        if page_group.faqs:
            children.append({
                'object': 'block',
                'type': 'heading_2',
                'heading_2': {
                    'rich_text': [{'type': 'text', 'text': {'content': 'FAQs to Include'}}]
                }
            })

            for faq in page_group.faqs[:5]:
                children.append({
                    'object': 'block',
                    'type': 'toggle',
                    'toggle': {
                        'rich_text': [
                            {'type': 'text', 'text': {'content': str(faq)}}
                        ]
                    }
                })

        # Section 4: Target Keywords
        children.append({
            'object': 'block',
            'type': 'heading_2',
            'heading_2': {
                'rich_text': [{'type': 'text', 'text': {'content': 'Target Keywords'}}]
            }
        })

        for kw in keywords[:10]:
            children.append({
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': [
                        {'type': 'text', 'text': {'content': f"{kw.text} (Vol: {kw.volume}, Diff: {kw.difficulty})"}}
                    ]
                }
            })

        # Build full page
        notion_page = {
            'parent': {
                'database_id': settings.notion_database_id
            },
            'properties': properties,
            'children': children[:100]  # Notion limit: 100 blocks per request
        }

        return notion_page

    def sync_to_asana(self, project_id: int, create_tasks: bool = True) -> Dict:
        """Sync to Asana (placeholder)."""

        logger.info("📋 Asana sync not yet implemented")

        return {
            'success': False,
            'error': 'Asana integration coming soon'
        }

    def sync_to_airtable(self, project_id: int) -> Dict:
        """Sync to Airtable (placeholder)."""

        logger.info("📊 Airtable sync not yet implemented")

        return {
            'success': False,
            'error': 'Airtable integration coming soon'
        }

    def _parse_word_count(self, word_range: str) -> int:
        """Parse word count range to single number (use midpoint)."""

        try:
            if '-' in word_range:
                parts = word_range.split('-')
                low = int(parts[0].strip())
                high = int(parts[1].strip())
                return (low + high) // 2
            else:
                return int(word_range.strip())
        except:
            return 2000  # Default

    def setup_notion_database(self) -> Dict:
        """
        Create a Notion database with proper schema.

        Returns database_id to add to .env
        """

        if not self.notion_enabled:
            return {'success': False, 'error': 'Notion API key not configured'}

        try:
            from notion_client import Client
            notion = Client(auth=settings.notion_api_key)

            # TODO: Create database via API
            # For now, user must create manually

            logger.info("📝 Please create a Notion database manually with these properties:")
            logger.info("  - Title (title)")
            logger.info("  - Status (select): To Do, In Progress, Done")
            logger.info("  - Priority (select): High, Medium, Low")
            logger.info("  - Word Count (number)")
            logger.info("  - Opportunity Score (number)")
            logger.info("  - Search Volume (number)")

            return {
                'success': False,
                'error': 'Manual setup required',
                'instructions': 'Create database in Notion, then add database_id to .env'
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}


# ============================================================================
# CLI Usage
# ============================================================================

if __name__ == "__main__":
    """
    Test workflow sync:

    # Setup
    export NOTION_API_KEY=secret_xxx
    export NOTION_DATABASE_ID=xxx

    # Sync
    python automation/workflow_sync.py <project_id>
    """

    import sys

    if len(sys.argv) < 2:
        print("Usage: python automation/workflow_sync.py <project_id>")
        print("\nRequired environment variables:")
        print("  NOTION_API_KEY=secret_xxx")
        print("  NOTION_DATABASE_ID=xxx")
        sys.exit(1)

    project_id = int(sys.argv[1])

    sync = WorkflowSync()

    print(f"\n{'='*80}")
    print(f"🔄 SYNCING PROJECT {project_id} TO NOTION")
    print(f"{'='*80}\n")

    if not sync.notion_enabled:
        print("❌ Notion not configured")
        print("\nSetup instructions:")
        print("  1. Get Notion integration token: https://www.notion.so/my-integrations")
        print("  2. Create a database in Notion")
        print("  3. Share database with your integration")
        print("  4. Add to .env:")
        print("     NOTION_API_KEY=secret_xxx")
        print("     NOTION_DATABASE_ID=xxx")
        sys.exit(1)

    results = sync.sync_to_notion(project_id)

    if results['success']:
        print(f"✅ Success! Created {results['pages_created']} pages in Notion")
    else:
        print(f"❌ Error: {results.get('error', 'Unknown error')}")

    if results.get('errors'):
        print(f"\n⚠️  {len(results['errors'])} errors occurred")

    print(f"\n{'='*80}\n")
