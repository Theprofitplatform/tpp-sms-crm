"""CSV export functionality."""
import csv
from typing import List, Dict
import pandas as pd


class CSVExporter:
    """Export keyword data to CSV."""
    
    def export_keywords(self,
                       keywords: List[Dict],
                       filepath: str,
                       include_columns: List[str] = None):
        """Export keywords to CSV."""
        
        if not keywords:
            print("No keywords to export")
            return
        
        # Default columns
        if include_columns is None:
            include_columns = [
                'keyword', 'intent', 'volume', 'cpc', 'difficulty',
                'traffic_potential', 'opportunity', 'topic', 'page_group',
                'trend_direction', 'serp_features'
            ]
        
        # Filter and flatten data
        export_data = []
        for kw in keywords:
            row = {}
            for col in include_columns:
                value = kw.get(col, '')
                
                # Handle lists/dicts
                if isinstance(value, (list, dict)):
                    value = str(value)
                
                row[col] = value
            
            export_data.append(row)
        
        # Write CSV
        df = pd.DataFrame(export_data)
        df.to_csv(filepath, index=False)
        
        print(f"✓ Exported {len(export_data)} keywords to {filepath}")
    
    def export_briefs(self,
                     briefs: List[Dict],
                     filepath: str):
        """Export content briefs to CSV."""
        
        if not briefs:
            print("No briefs to export")
            return
        
        export_data = []
        for brief in briefs:
            # Flatten brief data
            row = {
                'target_keyword': brief.get('target_keyword', ''),
                'intent': brief.get('intent_summary', ''),
                'word_range': brief.get('word_range', ''),
                'schema_types': ', '.join(brief.get('schema_types', [])),
                'serp_features': ', '.join(brief.get('serp_features_target', [])),
                'faq_count': len(brief.get('faqs', [])),
                'supporting_keywords': ', '.join(brief.get('supporting_keywords', [])[:5]),
            }
            export_data.append(row)
        
        df = pd.DataFrame(export_data)
        df.to_csv(filepath, index=False)
        
        print(f"✓ Exported {len(export_data)} briefs to {filepath}")
    
    def export_content_calendar(self,
                               calendar: List[Dict],
                               filepath: str):
        """Export content calendar to CSV."""
        
        if not calendar:
            print("No calendar items to export")
            return
        
        df = pd.DataFrame(calendar)
        df.to_csv(filepath, index=False)
        
        print(f"✓ Exported {len(calendar)} calendar items to {filepath}")
