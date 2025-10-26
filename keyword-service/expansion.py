"""Keyword expansion engine."""
from typing import List, Set, Dict
from providers.autosuggest import AutosuggestProvider
from providers.serpapi_client import SerpApiClient
from processing.normalizer import KeywordNormalizer
from tqdm import tqdm


class KeywordExpander:
    """Expand seed keywords using multiple methods."""
    
    # Common modifiers for expansion
    INTENT_MODIFIERS = {
        'informational': [
            'what is', 'how to', 'why', 'guide', 'tutorial',
            'tips', 'examples', 'benefits', 'explained'
        ],
        'commercial': [
            'best', 'top', 'review', 'comparison', 'vs',
            'alternative', 'cheap', 'affordable', 'premium'
        ],
        'transactional': [
            'buy', 'price', 'cost', 'discount', 'coupon',
            'deal', 'sale', 'order', 'online'
        ],
        'local': [
            'near me', 'nearby', 'local', 'in', 'around',
            'directions', 'hours', 'open'
        ]
    }
    
    GEO_TEMPLATES = [
        '{service} in {geo}',
        '{service} near {geo}',
        '{service} {geo}',
        'best {service} {geo}',
        '{geo} {service}'
    ]
    
    def __init__(self):
        self.autosuggest = AutosuggestProvider()
        self.serp_client = SerpApiClient()
        self.normalizer = KeywordNormalizer()
    
    def expand_seeds(self,
                    seeds: List[str],
                    geo: str = "US",
                    language: str = "en",
                    content_focus: str = "informational",
                    include_paa: bool = True,
                    include_related: bool = True) -> List[str]:
        """
        Expand seed keywords using multiple methods.
        """
        all_keywords = set(seeds)
        
        print(f"\n🌱 Expanding {len(seeds)} seed keywords...")
        
        # 1. Autosuggest expansion
        print("  → Running autosuggest expansion...")
        autosuggest_kws = self._autosuggest_expansion(seeds, geo, language)
        all_keywords.update(autosuggest_kws)
        print(f"    Added {len(autosuggest_kws)} from autosuggest")
        
        # 2. Intent-based modifiers
        print(f"  → Adding {content_focus} modifiers...")
        modifier_kws = self._expand_with_modifiers(seeds, content_focus)
        all_keywords.update(modifier_kws)
        print(f"    Added {len(modifier_kws)} from modifiers")
        
        # 3. People Also Ask questions
        if include_paa:
            print("  → Extracting People Also Ask questions...")
            paa_kws = self._extract_paa_questions(seeds[:5], geo)  # Limit to avoid quota
            all_keywords.update(paa_kws)
            print(f"    Added {len(paa_kws)} from PAA")
        
        # 4. Related searches
        if include_related:
            print("  → Getting related searches...")
            related_kws = self._get_related_searches(seeds[:5], geo)
            all_keywords.update(related_kws)
            print(f"    Added {len(related_kws)} from related searches")
        
        # Deduplicate
        print("  → Deduplicating...")
        unique_keywords = self.normalizer.deduplicate(list(all_keywords))
        
        print(f"✓ Total unique keywords: {len(unique_keywords)}\n")
        
        return unique_keywords
    
    def _autosuggest_expansion(self,
                              seeds: List[str],
                              geo: str,
                              language: str) -> Set[str]:
        """Expand using autosuggest APIs."""
        suggestions = set()
        
        for seed in tqdm(seeds, desc="Autosuggest", disable=len(seeds) < 5):
            # Get suggestions for base seed
            suggestions.update(
                self.autosuggest.get_all_suggestions(seed, geo, language)
            )
            
            # Wildcard patterns
            wildcards = [
                f"how to {seed}",
                f"best {seed}",
                f"{seed} near me",
                f"{seed} vs",
            ]
            
            for pattern in wildcards:
                suggestions.update(
                    self.autosuggest.get_google_suggestions(pattern, geo, language)
                )
        
        return suggestions
    
    def _expand_with_modifiers(self,
                               seeds: List[str],
                               content_focus: str) -> Set[str]:
        """Expand with intent-specific modifiers."""
        modifiers = self.INTENT_MODIFIERS.get(content_focus, [])
        expansions = set()
        
        for seed in seeds:
            # Prefix modifiers
            for mod in modifiers:
                expansions.add(f"{mod} {seed}")
            
            # Suffix modifiers (selected ones)
            suffix_mods = ['guide', 'tips', 'review', 'cost', 'near me']
            for mod in suffix_mods:
                if mod in modifiers:
                    expansions.add(f"{seed} {mod}")
        
        return expansions
    
    def _extract_paa_questions(self,
                              seeds: List[str],
                              geo: str) -> Set[str]:
        """Extract People Also Ask questions."""
        questions = set()
        
        for seed in tqdm(seeds, desc="PAA extraction", disable=len(seeds) < 3):
            try:
                serp_metrics = self.serp_client.extract_serp_metrics(seed, geo)
                paa = serp_metrics.get('paa_questions', [])
                questions.update(paa)
            except Exception as e:
                print(f"    PAA error for '{seed}': {e}")
        
        return questions
    
    def _get_related_searches(self,
                             seeds: List[str],
                             geo: str) -> Set[str]:
        """Get related searches from SERP."""
        related = set()
        
        for seed in tqdm(seeds, desc="Related searches", disable=len(seeds) < 3):
            try:
                serp_data = self.serp_client.search(seed, geo)
                related_searches = serp_data.get('related_searches', [])
                
                for item in related_searches:
                    if isinstance(item, dict):
                        query = item.get('query', '')
                    else:
                        query = str(item)
                    
                    if query:
                        related.add(query)
            except Exception as e:
                print(f"    Related search error for '{seed}': {e}")
        
        return related
    
    def expand_with_geo(self,
                       services: List[str],
                       locations: List[str]) -> List[str]:
        """Expand service keywords with geographic modifiers."""
        expansions = []
        
        for service in services:
            for location in locations:
                for template in self.GEO_TEMPLATES:
                    keyword = template.format(service=service, geo=location)
                    expansions.append(keyword)
        
        return expansions
    
    def extract_competitor_keywords(self,
                                   competitor_url: str,
                                   geo: str = "US",
                                   max_keywords: int = 50) -> List[str]:
        """
        Extract keywords from competitor analysis.
        Uses SERP data to find what competitor ranks for.
        """
        # This is a simplified version
        # In production, you'd use SEO tools or scrape competitor pages
        
        keywords = set()
        
        # Get site: search results
        site_query = f"site:{competitor_url}"
        
        try:
            serp_data = self.serp_client.search(site_query, geo)
            organic_results = serp_data.get('organic_results', [])
            
            # Extract keywords from titles and snippets
            for result in organic_results[:20]:
                title = result.get('title', '')
                snippet = result.get('snippet', '')
                
                # Simple extraction: get 2-4 word phrases
                text = f"{title} {snippet}".lower()
                words = text.split()
                
                # Generate 2-4 word combinations
                for i in range(len(words)):
                    for length in [2, 3, 4]:
                        if i + length <= len(words):
                            phrase = ' '.join(words[i:i+length])
                            # Basic filter
                            if len(phrase) > 10 and phrase.count(' ') >= 1:
                                keywords.add(phrase)
        
        except Exception as e:
            print(f"Competitor analysis error: {e}")
        
        return list(keywords)[:max_keywords]
