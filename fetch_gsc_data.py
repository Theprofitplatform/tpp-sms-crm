#!/usr/bin/env python3
"""
Fetch Google Search Console data for InstantAutoTraders.com.au
"""

import os
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path

# Load environment variables
def load_env():
    env_path = Path(__file__).parent / "env" / ".env"
    env_vars = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value
    return env_vars

env = load_env()
API_KEY = env.get('SEARCH_CONSOLE_API')

# Google Search Console API endpoint
# Note: Standard API keys may not work with Search Console API
# You typically need OAuth2 or Service Account authentication

SITE_URL = 'https://instantautotraders.com.au'

def test_api_access():
    """Test if the API key has access to Search Console"""
    print("Testing Google Search Console API access...")
    print(f"API Key: {API_KEY[:20]}..." if API_KEY else "No API key found")

    # Note: Search Console API typically requires OAuth2, not API keys
    # This will likely fail, but let's try

    endpoint = f"https://searchconsole.googleapis.com/v1/urlInspection/index:inspect?key={API_KEY}"

    try:
        response = requests.get(endpoint)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}")

        if response.status_code == 401:
            print("\n⚠️  AUTHENTICATION ERROR")
            print("Google Search Console API requires OAuth2 authentication or Service Account credentials.")
            print("Simple API keys don't work with Search Console API.")
            print("\nYou need to:")
            print("1. Create a Service Account in Google Cloud Console")
            print("2. Download the JSON credentials file")
            print("3. Grant the service account access to your Search Console property")
            return False

        return response.status_code == 200

    except Exception as e:
        print(f"Error: {e}")
        return False

def fetch_queries_oauth(credentials_file=None):
    """
    Fetch query data using proper authentication
    Requires: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
    """
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        if not credentials_file:
            print("\n❌ No credentials file provided")
            print("To fetch Search Console data, you need:")
            print("1. Service account JSON file from Google Cloud Console")
            print("2. Grant access to instantautotraders.com.au in Search Console")
            return None

        # Set up credentials
        SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
        credentials = service_account.Credentials.from_service_account_file(
            credentials_file, scopes=SCOPES
        )

        # Build the service
        service = build('searchconsole', 'v1', credentials=credentials)

        # Set date range (last 90 days)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=90)

        # Request query data
        request = {
            'startDate': start_date.strftime('%Y-%m-%d'),
            'endDate': end_date.strftime('%Y-%m-%d'),
            'dimensions': ['query', 'page'],
            'rowLimit': 25000
        }

        print(f"\n📊 Fetching Search Console data from {start_date} to {end_date}...")

        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body=request
        ).execute()

        if 'rows' in response:
            print(f"✅ Successfully fetched {len(response['rows'])} rows")

            # Save to CSV
            output_file = Path(__file__).parent / "google_search_console_data.csv"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write("Query,Page,Clicks,Impressions,CTR,Position\n")
                for row in response['rows']:
                    query = row['keys'][0]
                    page = row['keys'][1] if len(row['keys']) > 1 else ''
                    clicks = row.get('clicks', 0)
                    impressions = row.get('impressions', 0)
                    ctr = row.get('ctr', 0) * 100  # Convert to percentage
                    position = row.get('position', 0)

                    # Escape quotes in query and page
                    query = query.replace('"', '""')
                    page = page.replace('"', '""')

                    f.write(f'"{query}","{page}",{clicks},{impressions},{ctr:.2f},{position:.1f}\n')

            print(f"💾 Saved to: {output_file}")
            return response
        else:
            print("❌ No data returned from Search Console")
            return None

    except ImportError:
        print("\n❌ Required packages not installed")
        print("Run: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        return None
    except Exception as e:
        print(f"\n❌ Error fetching data: {e}")
        return None

def main():
    print("=" * 80)
    print("GOOGLE SEARCH CONSOLE DATA FETCHER")
    print("=" * 80)

    # First, test basic API access
    if not test_api_access():
        print("\n" + "=" * 80)
        print("MANUAL EXPORT INSTRUCTIONS")
        print("=" * 80)
        print("\nSince API authentication isn't set up, please export manually:")
        print("\n1. Go to: https://search.google.com/search-console")
        print("2. Select: instantautotraders.com.au")
        print("3. Click: Performance → Search Results")
        print("4. Set date range: Last 3 months")
        print("5. Click: Export → Download CSV")
        print("6. Save as: google_search_console_data.csv")
        print("7. Move to this folder")
        print("\nThen I can analyze it alongside your Semrush data!")
        return

    # Try OAuth if credentials exist
    credentials_path = Path(__file__).parent / "env" / "service-account.json"
    if credentials_path.exists():
        print(f"\n✅ Found service account credentials: {credentials_path}")
        fetch_queries_oauth(str(credentials_path))
    else:
        print(f"\n⚠️  No service account credentials found at: {credentials_path}")
        print("\nTo set up automatic fetching:")
        print("1. Go to: https://console.cloud.google.com")
        print("2. Create a Service Account")
        print("3. Download the JSON key file")
        print("4. Save it as: env/service-account.json")
        print("5. Add the service account email to your Search Console property")

if __name__ == "__main__":
    main()
