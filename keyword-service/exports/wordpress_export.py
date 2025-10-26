"""WordPress export functionality."""
import requests
from typing import Dict, List, Optional
from requests.auth import HTTPBasicAuth


class WordPressExporter:
    """Export content briefs to WordPress as draft posts."""
    
    def __init__(self, site_url: str, username: str, app_password: str):
        """
        Initialize WordPress exporter.
        
        Args:
            site_url: WordPress site URL (e.g., https://example.com)
            username: WordPress username
            app_password: WordPress application password
        """
        self.site_url = site_url.rstrip('/')
        self.api_url = f"{self.site_url}/wp-json/wp/v2"
        self.auth = HTTPBasicAuth(username, app_password)
    
    def create_draft_post(self, brief: Dict) -> Optional[int]:
        """Create a draft post from content brief."""
        
        try:
            # Build post content
            content = self._build_post_content(brief)
            
            # Prepare post data
            post_data = {
                'title': brief.get('target_keyword', 'Untitled').title(),
                'content': content,
                'status': 'draft',
                'excerpt': brief.get('intent_summary', ''),
                'meta': {
                    'word_count_target': brief.get('word_range', '1500-2000'),
                    'target_keyword': brief.get('target_keyword', ''),
                    'intent': brief.get('intent_summary', '')
                }
            }
            
            # Create post
            response = requests.post(
                f"{self.api_url}/posts",
                json=post_data,
                auth=self.auth,
                headers={'Content-Type': 'application/json'}
            )
            
            response.raise_for_status()
            
            post_id = response.json().get('id')
            post_url = response.json().get('link', '')
            
            print(f"✓ Created WordPress draft: {brief.get('target_keyword')}")
            print(f"  URL: {post_url}")
            
            # Add schema JSON-LD if available
            schema_types = brief.get('schema_types', [])
            if schema_types:
                self._add_schema_meta(post_id, schema_types)
            
            return post_id
            
        except Exception as e:
            print(f"Error creating WordPress post: {e}")
            return None
    
    def _build_post_content(self, brief: Dict) -> str:
        """Build HTML content from brief outline."""
        
        html = []
        
        # Intent summary
        intent = brief.get('intent_summary', '')
        if intent:
            html.append(f'<p><em>{intent}</em></p>')
        
        html.append('<hr>')
        
        # Outline
        outline = brief.get('outline', [])
        for section in outline:
            level = section.get('level', 'H2')
            text = section.get('text', '')
            
            if level == 'H1':
                continue  # Skip H1, it's the title
            elif level == 'H2':
                html.append(f'<h2>{text}</h2>')
                html.append('<p>[Content to be written]</p>')
            elif level == 'H3':
                html.append(f'<h3>{text}</h3>')
                html.append('<p>[Content to be written]</p>')
        
        # FAQs
        faqs = brief.get('faqs', [])
        if faqs:
            html.append('<h2>Frequently Asked Questions</h2>')
            
            for faq in faqs[:10]:
                question = faq.get('question', '')
                html.append(f'<h3>{question}</h3>')
                html.append('<p>[Answer to be written]</p>')
        
        # Supporting keywords (as comment)
        supporting = brief.get('supporting_keywords', [])
        if supporting:
            html.append('<!-- Supporting Keywords: ')
            html.append(', '.join(supporting[:10]))
            html.append(' -->')
        
        return '\n'.join(html)
    
    def _add_schema_meta(self, post_id: int, schema_types: List[str]):
        """Add schema.org type recommendation as post meta."""
        
        try:
            meta_data = {
                'meta': {
                    'recommended_schema_types': ', '.join(schema_types)
                }
            }
            
            response = requests.post(
                f"{self.api_url}/posts/{post_id}",
                json=meta_data,
                auth=self.auth,
                headers={'Content-Type': 'application/json'}
            )
            
            response.raise_for_status()
            
        except Exception as e:
            print(f"  Warning: Could not add schema meta: {e}")
    
    def export_briefs(self, briefs: List[Dict]) -> List[int]:
        """Export multiple briefs to WordPress."""
        
        post_ids = []
        
        for brief in briefs:
            post_id = self.create_draft_post(brief)
            if post_id:
                post_ids.append(post_id)
        
        print(f"\n✓ Exported {len(post_ids)}/{len(briefs)} briefs to WordPress")
        
        return post_ids
    
    def get_post_url(self, post_id: int) -> Optional[str]:
        """Get edit URL for a post."""
        
        try:
            response = requests.get(
                f"{self.api_url}/posts/{post_id}",
                auth=self.auth
            )
            response.raise_for_status()
            
            return response.json().get('link', '')
            
        except Exception as e:
            print(f"Error getting post URL: {e}")
            return None
