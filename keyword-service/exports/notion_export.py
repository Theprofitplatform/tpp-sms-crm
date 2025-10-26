"""Notion export functionality."""
from notion_client import Client
from typing import List, Dict, Optional


class NotionExporter:
    """Export content briefs to Notion."""
    
    def __init__(self, api_key: str):
        self.client = Client(auth=api_key)
    
    def create_brief_page(self,
                         database_id: str,
                         brief: Dict) -> Optional[str]:
        """Create a content brief page in Notion database."""
        
        try:
            # Prepare properties
            properties = {
                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": brief.get('target_keyword', 'Untitled')
                            }
                        }
                    ]
                },
                "Intent": {
                    "select": {
                        "name": brief.get('intent_summary', 'informational')[:50]
                    }
                },
                "Word Count": {
                    "rich_text": [
                        {
                            "text": {
                                "content": brief.get('word_range', '')
                            }
                        }
                    ]
                }
            }
            
            # Build content blocks
            children = []
            
            # Intent summary
            children.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Search Intent"}}]
                }
            })
            
            children.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": brief.get('intent_summary', '')}}]
                }
            })
            
            # Outline
            children.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "Content Outline"}}]
                }
            })
            
            outline = brief.get('outline', [])
            for section in outline:
                level = section.get('level', 'H2')
                text = section.get('text', '')
                
                if level == 'H1':
                    block_type = "heading_1"
                elif level == 'H3':
                    block_type = "heading_3"
                else:
                    block_type = "heading_2"
                
                children.append({
                    "object": "block",
                    "type": block_type,
                    block_type: {
                        "rich_text": [{"type": "text", "text": {"content": text}}]
                    }
                })
            
            # FAQs
            faqs = brief.get('faqs', [])
            if faqs:
                children.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": "FAQs"}}]
                    }
                })
                
                for faq in faqs[:10]:
                    children.append({
                        "object": "block",
                        "type": "bulleted_list_item",
                        "bulleted_list_item": {
                            "rich_text": [{"type": "text", "text": {"content": faq.get('question', '')}}]
                        }
                    })
            
            # Create page
            page = self.client.pages.create(
                parent={"database_id": database_id},
                properties=properties,
                children=children
            )
            
            page_url = page.get('url', '')
            print(f"✓ Created Notion page: {brief.get('target_keyword')}")
            return page_url
            
        except Exception as e:
            print(f"Error creating Notion page: {e}")
            return None
    
    def export_briefs(self,
                     database_id: str,
                     briefs: List[Dict]) -> List[str]:
        """Export multiple briefs to Notion."""
        
        urls = []
        for brief in briefs:
            url = self.create_brief_page(database_id, brief)
            if url:
                urls.append(url)
        
        print(f"\n✓ Exported {len(urls)}/{len(briefs)} briefs to Notion")
        return urls
