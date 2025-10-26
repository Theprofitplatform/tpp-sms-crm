"""Autosuggest provider for keyword expansion."""
import requests
from typing import List, Optional
from providers.base import BaseProvider
from config import settings


class AutosuggestProvider(BaseProvider):
    """Autosuggest keyword expansion from multiple sources."""
    
    def __init__(self):
        super().__init__("autosuggest", settings.autosuggest_rpm)
        self.google_base_url = "https://suggestqueries.google.com/complete/search"
        self.bing_base_url = "https://api.bing.com/osjson.aspx"
        self.youtube_base_url = "https://suggestqueries.google.com/complete/search"
    
    @BaseProvider.with_retry()
    def get_google_suggestions(self, query: str, geo: str = "US", 
                               language: str = "en") -> List[str]:
        """Get Google autosuggest results."""
        cache_key = self._make_cache_key("google", query, geo, language)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        self.rate_limiter.acquire()
        
        params = {
            "client": "firefox",
            "q": query,
            "gl": geo.lower(),
            "hl": language
        }
        
        try:
            response = requests.get(
                self.google_base_url,
                params=params,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            response.raise_for_status()
            
            results = response.json()[1] if response.json() else []
            self._set_cache(cache_key, results, ttl_hours=168)  # 1 week
            return results
            
        except Exception as e:
            print(f"Google autosuggest error for '{query}': {e}")
            return []
    
    @BaseProvider.with_retry()
    def get_bing_suggestions(self, query: str) -> List[str]:
        """Get Bing autosuggest results."""
        cache_key = self._make_cache_key("bing", query)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        self.rate_limiter.acquire()
        
        params = {"query": query}
        
        try:
            response = requests.get(
                self.bing_base_url,
                params=params,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            response.raise_for_status()
            
            results = response.json()[1] if response.json() else []
            self._set_cache(cache_key, results, ttl_hours=168)
            return results
            
        except Exception as e:
            print(f"Bing autosuggest error for '{query}': {e}")
            return []
    
    @BaseProvider.with_retry()
    def get_youtube_suggestions(self, query: str) -> List[str]:
        """Get YouTube autosuggest results."""
        cache_key = self._make_cache_key("youtube", query)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        self.rate_limiter.acquire()
        
        params = {
            "client": "youtube",
            "q": query,
            "ds": "yt"
        }
        
        try:
            response = requests.get(
                self.youtube_base_url,
                params=params,
                timeout=10,
                headers={"User-Agent": "Mozilla/5.0"}
            )
            response.raise_for_status()
            
            results = response.json()[1] if response.json() else []
            self._set_cache(cache_key, results, ttl_hours=168)
            return results
            
        except Exception as e:
            print(f"YouTube autosuggest error for '{query}': {e}")
            return []
    
    def expand_with_modifiers(self, seed: str, modifiers: List[str]) -> List[str]:
        """Expand seed with various modifiers."""
        expansions = []
        
        # Prefix modifiers
        for mod in modifiers:
            expansions.extend(self.get_google_suggestions(f"{mod} {seed}"))
        
        # Suffix modifiers
        for mod in modifiers:
            expansions.extend(self.get_google_suggestions(f"{seed} {mod}"))
        
        # Wildcard expansions (using _ as placeholder)
        wildcard_patterns = [
            f"_ {seed}",
            f"{seed} _",
            f"how to _ {seed}",
            f"best _ {seed}",
        ]
        
        for pattern in wildcard_patterns:
            expansions.extend(self.get_google_suggestions(pattern))
        
        return list(set(expansions))  # De-duplicate
    
    def get_all_suggestions(self, query: str, geo: str = "US", 
                           language: str = "en") -> List[str]:
        """Get suggestions from all sources."""
        all_suggestions = []
        
        # Google
        all_suggestions.extend(self.get_google_suggestions(query, geo, language))
        
        # Bing
        all_suggestions.extend(self.get_bing_suggestions(query))
        
        # YouTube (for video-intent keywords)
        all_suggestions.extend(self.get_youtube_suggestions(query))
        
        return list(set(all_suggestions))
