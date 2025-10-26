"""Google Trends provider."""
from pytrends.request import TrendReq
from typing import Dict, List, Optional
import pandas as pd
from providers.base import BaseProvider
from config import settings


class TrendsProvider(BaseProvider):
    """Google Trends data provider."""
    
    def __init__(self):
        super().__init__("google_trends", rpm=30)  # Conservative rate limit
        self.pytrends = None
    
    def _get_client(self):
        """Get or create pytrends client."""
        if self.pytrends is None:
            self.pytrends = TrendReq(hl='en-US', tz=360)
        return self.pytrends
    
    @BaseProvider.with_retry()
    def get_interest_over_time(self, keywords: List[str], geo: str = "US",
                               timeframe: str = "today 12-m") -> pd.DataFrame:
        """Get interest over time for keywords."""
        # Can only do 5 keywords at a time
        keywords = keywords[:5]
        
        cache_key = self._make_cache_key("interest", tuple(keywords), geo, timeframe)
        cached = self._get_cached(cache_key)
        if cached:
            return pd.DataFrame(cached)
        
        self.rate_limiter.acquire()
        
        try:
            pytrends = self._get_client()
            pytrends.build_payload(keywords, cat=0, timeframe=timeframe, geo=geo)
            data = pytrends.interest_over_time()
            
            if not data.empty:
                # Remove 'isPartial' column if present
                if 'isPartial' in data.columns:
                    data = data.drop(columns=['isPartial'])
                
                # Cache as dict
                self._set_cache(cache_key, data.to_dict(), ttl_hours=168)
            
            return data
            
        except Exception as e:
            print(f"Trends error for {keywords}: {e}")
            return pd.DataFrame()
    
    @BaseProvider.with_retry()
    def get_trending_searches(self, geo: str = "US") -> List[str]:
        """Get current trending searches."""
        cache_key = self._make_cache_key("trending", geo)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        self.rate_limiter.acquire()
        
        try:
            pytrends = self._get_client()
            trending_df = pytrends.trending_searches(pn=geo.lower())
            
            if not trending_df.empty:
                trending = trending_df[0].tolist()
                self._set_cache(cache_key, trending, ttl_hours=1)  # Short cache
                return trending
            
            return []
            
        except Exception as e:
            print(f"Trending searches error for {geo}: {e}")
            return []
    
    def analyze_trend_direction(self, keyword: str, geo: str = "US") -> Dict[str, any]:
        """Analyze trend direction and seasonality."""
        data = self.get_interest_over_time([keyword], geo)
        
        if data.empty or keyword not in data.columns:
            return {
                "direction": "unknown",
                "current_value": 0,
                "avg_value": 0,
                "peak_value": 0,
                "is_seasonal": False
            }
        
        values = data[keyword].values
        
        # Calculate trend direction
        if len(values) >= 2:
            recent_avg = values[-4:].mean()  # Last month
            older_avg = values[:-4].mean()
            
            if recent_avg > older_avg * 1.2:
                direction = "rising"
            elif recent_avg < older_avg * 0.8:
                direction = "declining"
            else:
                direction = "stable"
        else:
            direction = "unknown"
        
        # Check seasonality (simple peak detection)
        avg_value = values.mean()
        peak_value = values.max()
        is_seasonal = peak_value > avg_value * 1.5
        
        return {
            "direction": direction,
            "current_value": int(values[-1]) if len(values) > 0 else 0,
            "avg_value": int(avg_value),
            "peak_value": int(peak_value),
            "is_seasonal": is_seasonal,
            "data": values.tolist()
        }
