"""Google Sheets export functionality."""
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from typing import List, Dict, Optional
import pandas as pd


class SheetsExporter:
    """Export keyword data to Google Sheets."""
    
    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize with Google Service Account credentials.
        
        If credentials_path not provided, will look for GOOGLE_APPLICATION_CREDENTIALS env var.
        """
        self.credentials_path = credentials_path
        self.client = None
    
    def _get_client(self):
        """Get or create Google Sheets client."""
        if self.client is None:
            scope = [
                'https://spreadsheets.google.com/feeds',
                'https://www.googleapis.com/auth/drive'
            ]
            
            if self.credentials_path:
                creds = ServiceAccountCredentials.from_json_keyfile_name(
                    self.credentials_path, scope
                )
            else:
                # Try default credentials
                import os
                creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
                if not creds_path:
                    raise ValueError("Google credentials not found")
                creds = ServiceAccountCredentials.from_json_keyfile_name(
                    creds_path, scope
                )
            
            self.client = gspread.authorize(creds)
        
        return self.client
    
    def export_keywords(self,
                       keywords: List[Dict],
                       spreadsheet_name: str,
                       worksheet_name: str = "Keywords"):
        """Export keywords to Google Sheets."""
        
        try:
            client = self._get_client()
            
            # Try to open existing spreadsheet, create if doesn't exist
            try:
                spreadsheet = client.open(spreadsheet_name)
            except gspread.SpreadsheetNotFound:
                spreadsheet = client.create(spreadsheet_name)
            
            # Add or update worksheet
            try:
                worksheet = spreadsheet.worksheet(worksheet_name)
                worksheet.clear()
            except gspread.WorksheetNotFound:
                worksheet = spreadsheet.add_worksheet(
                    title=worksheet_name,
                    rows=len(keywords) + 1,
                    cols=20
                )
            
            # Prepare data
            df = pd.DataFrame(keywords)
            
            # Convert to list of lists
            data = [df.columns.tolist()] + df.values.tolist()
            
            # Update worksheet
            worksheet.update(data, 'A1')
            
            # Format header
            worksheet.format('A1:Z1', {
                'textFormat': {'bold': True},
                'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9}
            })
            
            print(f"✓ Exported {len(keywords)} keywords to Google Sheets: {spreadsheet_name}")
            print(f"  URL: {spreadsheet.url}")
            
            return spreadsheet.url
            
        except Exception as e:
            print(f"Error exporting to Google Sheets: {e}")
            return None
