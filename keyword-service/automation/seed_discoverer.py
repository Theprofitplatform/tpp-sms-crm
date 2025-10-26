"""Autonomous seed keyword discovery from multiple sources."""
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
import re
from collections import Counter
from urllib.parse import urlparse
import spacy

from providers.autosuggest import AutosuggestProvider
from providers.serpapi_client import SerpApiClient
from config import settings


class AutonomousSeedDiscoverer:
    """Automatically discover seed keywords without manual input."""

    def __init__(self):
        self.autosuggest = AutosuggestProvider()
        self.serp_client = SerpApiClient()
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("⚠️  spaCy model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None

    def discover_all(self,
                     business_url: Optional[str] = None,
                     business_description: Optional[str] = None,
                     competitors: Optional[List[str]] = None,
                     niche: Optional[str] = None) -> Dict[str, List[str]]:
        """
        Discover seeds from all available sources.

        Returns:
            {
                'from_website': [...],
                'from_description': [...],
                'from_competitors': [...],
                'from_niche': [...],
                'recommended': [...]  # Top seeds across all sources
            }
        """

        all_seeds = {
            'from_website': [],
            'from_description': [],
            'from_competitors': [],
            'from_niche': [],
        }

        # Source 1: Website content
        if business_url:
            print(f"🔍 Discovering seeds from {business_url}...")
            all_seeds['from_website'] = self.discover_from_url(business_url)

        # Source 2: Business description
        if business_description:
            print(f"🔍 Extracting topics from description...")
            all_seeds['from_description'] = self.discover_from_description(business_description)

        # Source 3: Competitor analysis
        if competitors:
            print(f"🔍 Analyzing {len(competitors)} competitors...")
            all_seeds['from_competitors'] = self.discover_from_competitors(competitors)

        # Source 4: Niche/industry keywords
        if niche:
            print(f"🔍 Generating seeds for {niche} niche...")
            all_seeds['from_niche'] = self.discover_from_niche(niche)

        # Merge and rank by frequency
        all_keywords = []
        for source, keywords in all_seeds.items():
            if source != 'recommended':
                all_keywords.extend(keywords)

        # Count frequency (more sources = more important)
        keyword_counts = Counter(all_keywords)
        recommended = [kw for kw, count in keyword_counts.most_common(30)]

        all_seeds['recommended'] = recommended

        # Print summary
        print("\n" + "=" * 60)
        print("📊 SEED DISCOVERY SUMMARY")
        print("=" * 60)
        for source, keywords in all_seeds.items():
            if keywords:
                print(f"{source:20s}: {len(keywords):3d} seeds")
        print("=" * 60)

        return all_seeds

    def discover_from_url(self, url: str, max_pages: int = 5) -> List[str]:
        """
        Extract topics from a website by crawling and analyzing content.

        Strategy:
        1. Crawl homepage + key pages (about, services, products)
        2. Extract main topics via NLP (named entities, noun phrases)
        3. Identify product/service categories
        4. Extract from meta descriptions and headers
        """

        seeds = set()

        try:
            # Fetch homepage
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # 1. Extract from title and meta
            title = soup.find('title')
            if title:
                seeds.update(self._extract_keywords_from_text(title.get_text()))

            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                seeds.update(self._extract_keywords_from_text(meta_desc['content']))

            # 2. Extract from headings
            for heading in soup.find_all(['h1', 'h2', 'h3']):
                text = heading.get_text().strip()
                if text:
                    seeds.update(self._extract_keywords_from_text(text))

            # 3. Extract from navigation (service/product categories)
            for nav in soup.find_all(['nav', 'header']):
                for link in nav.find_all('a'):
                    text = link.get_text().strip()
                    if text and len(text.split()) <= 4:  # Short phrases
                        seeds.add(text.lower())

            # 4. Extract from main content
            main_content = soup.find('main') or soup.find('article') or soup.find('body')
            if main_content:
                text = main_content.get_text()
                # Sample first 2000 characters
                sample_text = text[:2000]
                seeds.update(self._extract_keywords_from_text(sample_text))

            # 5. Find internal links to discover more pages
            internal_links = self._find_internal_links(soup, url, max_count=max_pages-1)

            for link in internal_links[:max_pages-1]:
                try:
                    link_response = requests.get(link, timeout=5, headers={
                        'User-Agent': 'Mozilla/5.0'
                    })
                    link_soup = BeautifulSoup(link_response.text, 'html.parser')

                    # Extract from page title
                    link_title = link_soup.find('title')
                    if link_title:
                        seeds.update(self._extract_keywords_from_text(link_title.get_text()))

                except Exception as e:
                    continue

        except Exception as e:
            print(f"  ⚠️  Error crawling {url}: {e}")
            return []

        # Clean and filter
        cleaned_seeds = self._clean_and_filter_seeds(list(seeds))

        return cleaned_seeds[:50]  # Top 50

    def discover_from_description(self, description: str) -> List[str]:
        """
        Extract seed keywords from a business description using NLP.

        Example inputs:
        - "I run a SaaS for project management targeting small businesses"
        - "Etsy shop selling handmade jewelry, focus on wedding rings"
        - "Local plumber in Austin, Texas"
        """

        seeds = set()

        # Extract explicit keywords
        seeds.update(self._extract_keywords_from_text(description))

        # If we have the description, expand with modifiers
        base_keywords = list(seeds)[:5]

        # Add question modifiers
        question_modifiers = ['what is', 'how to', 'best', 'guide to', 'tutorial']
        for keyword in base_keywords:
            for modifier in question_modifiers:
                seeds.add(f"{modifier} {keyword}")

        return self._clean_and_filter_seeds(list(seeds))[:30]

    def discover_from_competitors(self, competitor_urls: List[str], limit: int = 20) -> List[str]:
        """
        Discover seeds by analyzing what competitors rank for.

        Strategy:
        1. Search for competitor domain
        2. Extract keywords they rank for from SERP
        3. Analyze their title tags and content
        """

        seeds = set()

        for competitor_url in competitor_urls[:3]:  # Limit to 3 competitors
            try:
                domain = urlparse(competitor_url).netloc

                # Method 1: Extract from their website
                competitor_seeds = self.discover_from_url(competitor_url, max_pages=3)
                seeds.update(competitor_seeds)

                # Method 2: Search for the domain and see what they rank for
                try:
                    # Get SERP for site:competitor.com
                    search_query = f"site:{domain}"
                    serp_results = self.serp_client.fetch_raw(
                        query=search_query,
                        geo='US',
                        language='en'
                    )

                    # Extract keywords from their ranking pages
                    if 'organic_results' in serp_results:
                        for result in serp_results['organic_results'][:10]:
                            title = result.get('title', '')
                            snippet = result.get('snippet', '')

                            seeds.update(self._extract_keywords_from_text(title))
                            seeds.update(self._extract_keywords_from_text(snippet))

                except Exception as e:
                    print(f"  ⚠️  SERP error for {domain}: {e}")

            except Exception as e:
                print(f"  ⚠️  Error analyzing competitor {competitor_url}: {e}")
                continue

        return self._clean_and_filter_seeds(list(seeds))[:limit]

    def discover_from_niche(self, niche: str, geo: str = 'US') -> List[str]:
        """
        Generate seeds for an industry/niche using autosuggest.

        Strategy:
        1. Use autosuggest with niche + common modifiers
        2. Expand with question words
        3. Add comparison/buying intent terms
        """

        seeds = set()

        # Base niche keywords
        seeds.add(niche.lower())

        # Common modifiers for informational content
        info_modifiers = [
            'what is', 'how to', 'guide to', 'tutorial', 'best practices',
            'tips', 'examples', 'meaning', 'definition'
        ]

        # Commercial modifiers
        commercial_modifiers = [
            'best', 'top', 'vs', 'review', 'comparison',
            'tools', 'software', 'services', 'products'
        ]

        # Get autosuggest for each
        all_modifiers = info_modifiers + commercial_modifiers

        for modifier in all_modifiers[:10]:  # Limit API calls
            query = f"{modifier} {niche}"

            try:
                suggestions = self.autosuggest.get_google_suggestions(query, geo)
                seeds.update(suggestions[:5])  # Top 5 from each

            except Exception as e:
                print(f"  ⚠️  Autosuggest error for '{query}': {e}")
                continue

        return self._clean_and_filter_seeds(list(seeds))[:40]

    def _extract_keywords_from_text(self, text: str) -> List[str]:
        """Extract meaningful keywords from text using NLP."""

        keywords = set()

        if not text or not self.nlp:
            return list(keywords)

        # Process with spaCy
        doc = self.nlp(text.lower())

        # Extract named entities
        for ent in doc.ents:
            if ent.label_ in ['PRODUCT', 'ORG', 'GPE', 'WORK_OF_ART']:
                keywords.add(ent.text.strip())

        # Extract noun chunks (2-4 words)
        for chunk in doc.noun_chunks:
            if 2 <= len(chunk.text.split()) <= 4:
                keywords.add(chunk.text.strip())

        # Extract important nouns
        for token in doc:
            if token.pos_ == 'NOUN' and not token.is_stop:
                keywords.add(token.text)

        return list(keywords)

    def _find_internal_links(self, soup: BeautifulSoup, base_url: str, max_count: int = 10) -> List[str]:
        """Find internal links to crawl."""

        internal_links = []
        base_domain = urlparse(base_url).netloc

        for link in soup.find_all('a', href=True):
            href = link['href']

            # Convert relative to absolute
            if href.startswith('/'):
                href = f"{base_url.rstrip('/')}{href}"
            elif not href.startswith('http'):
                continue

            # Check if internal
            link_domain = urlparse(href).netloc
            if link_domain == base_domain:
                # Prioritize /about, /services, /products pages
                if any(x in href for x in ['about', 'service', 'product', 'solution']):
                    internal_links.insert(0, href)
                else:
                    internal_links.append(href)

            if len(internal_links) >= max_count:
                break

        return internal_links

    def _clean_and_filter_seeds(self, seeds: List[str]) -> List[str]:
        """Clean and filter seed keywords."""

        cleaned = []

        for seed in seeds:
            # Clean
            seed = seed.lower().strip()
            seed = re.sub(r'[^\w\s-]', '', seed)  # Remove special chars
            seed = re.sub(r'\s+', ' ', seed)  # Normalize whitespace

            # Filter
            if not seed or len(seed) < 3:
                continue
            if len(seed.split()) > 5:  # Too long
                continue
            if seed in ['home', 'about', 'contact', 'blog', 'privacy', 'terms']:
                continue

            cleaned.append(seed)

        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for seed in cleaned:
            if seed not in seen:
                seen.add(seed)
                deduped.append(seed)

        return deduped


# ============================================================================
# CLI USAGE EXAMPLE
# ============================================================================

if __name__ == "__main__":
    """
    Example usage:

    python automation/seed_discoverer.py \\
        --url "https://example.com" \\
        --description "SaaS for project management" \\
        --competitors "asana.com,monday.com" \\
        --niche "project management software"
    """

    import argparse

    parser = argparse.ArgumentParser(description="Auto-discover seed keywords")
    parser.add_argument('--url', help='Business website URL')
    parser.add_argument('--description', help='Business description')
    parser.add_argument('--competitors', help='Competitor URLs (comma-separated)')
    parser.add_argument('--niche', help='Industry/niche')

    args = parser.parse_args()

    discoverer = AutonomousSeedDiscoverer()

    competitors = args.competitors.split(',') if args.competitors else None

    results = discoverer.discover_all(
        business_url=args.url,
        business_description=args.description,
        competitors=competitors,
        niche=args.niche
    )

    print("\n" + "=" * 60)
    print("🎯 RECOMMENDED SEEDS TO USE:")
    print("=" * 60)
    for i, seed in enumerate(results['recommended'], 1):
        print(f"{i:2d}. {seed}")
    print("=" * 60)
