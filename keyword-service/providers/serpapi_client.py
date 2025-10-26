"""SerpAPI client for SERP data."""
import requests
from typing import Dict, List, Optional, Any
from providers.base import BaseProvider
from config import settings


class SerpApiClient(BaseProvider):
    """SerpAPI client for SERP data acquisition."""
    
    def __init__(self):
        super().__init__("serpapi", settings.serp_api_rpm)
        self.api_key = settings.serpapi_api_key
        self.base_url = "https://serpapi.com/search"
    
    @BaseProvider.with_retry()
    def search(self, query: str, geo: str = "US", language: str = "en",
               device: str = "desktop") -> Dict[str, Any]:
        """Execute a SERP search."""
        cache_key = self._make_cache_key(query, geo, language, device)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        self.rate_limiter.acquire()
        
        params = {
            "q": query,
            "api_key": self.api_key,
            "gl": geo.lower(),
            "hl": language,
            "device": device,
            "num": 10
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            self._set_cache(cache_key, data, ttl_hours=24)  # 1 day for SERP
            
            return data
            
        except Exception as e:
            print(f"SerpAPI error for '{query}': {e}")
            return {}
    
    def extract_organic_results(self, serp_data: Dict) -> List[Dict]:
        """Extract organic results from SERP data."""
        return serp_data.get("organic_results", [])
    
    def extract_features(self, serp_data: Dict) -> List[str]:
        """Extract SERP features present."""
        features = []
        
        if "featured_snippet" in serp_data:
            features.append("featured_snippet")
        
        if "knowledge_graph" in serp_data:
            features.append("knowledge_graph")
        
        if "answer_box" in serp_data:
            features.append("answer_box")
        
        if "related_questions" in serp_data:
            features.append("people_also_ask")
        
        if "local_results" in serp_data or "local_map" in serp_data:
            features.append("map_pack")
        
        if "top_stories" in serp_data:
            features.append("top_stories")
        
        if "images" in serp_data:
            features.append("images")
        
        if "videos" in serp_data:
            features.append("videos")
        
        if "shopping_results" in serp_data:
            features.append("shopping")
        
        return features
    
    def get_paa_questions(self, serp_data: Dict) -> List[str]:
        """Extract People Also Ask questions."""
        paa = []
        related_questions = serp_data.get("related_questions", [])
        
        for q in related_questions:
            if "question" in q:
                paa.append(q["question"])
        
        return paa
    
    def count_ads(self, serp_data: Dict) -> int:
        """Count number of ads."""
        ads_count = 0
        
        if "ads" in serp_data:
            ads_count += len(serp_data["ads"])
        
        if "top_ads" in serp_data:
            ads_count += len(serp_data["top_ads"])
        
        if "bottom_ads" in serp_data:
            ads_count += len(serp_data["bottom_ads"])
        
        return ads_count
    
    def calculate_ads_density(self, serp_data: Dict) -> float:
        """Calculate ads density (0-1)."""
        ads_count = self.count_ads(serp_data)
        # Normalize: 0 ads = 0.0, 4+ ads = 1.0
        return min(ads_count / 4.0, 1.0)
    
    def extract_serp_metrics(self, query: str, geo: str = "US", 
                             language: str = "en") -> Dict[str, Any]:
        """Extract comprehensive SERP metrics."""
        serp_data = self.search(query, geo, language)
        
        if not serp_data:
            return {}
        
        organic_results = self.extract_organic_results(serp_data)
        
        metrics = {
            "organic_results": organic_results,
            "features": self.extract_features(serp_data),
            "paa_questions": self.get_paa_questions(serp_data),
            "ads_count": self.count_ads(serp_data),
            "ads_density": self.calculate_ads_density(serp_data),
            "map_pack_present": "map_pack" in self.extract_features(serp_data),
            "total_results": serp_data.get("search_information", {}).get("total_results", 0),
            "raw_data": serp_data
        }
        
        return metrics
