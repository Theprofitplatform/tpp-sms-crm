"""Difficulty, CTR, and opportunity scoring."""
from typing import Dict, List, Optional
import math


class KeywordScorer:
    """Calculate difficulty, traffic potential, and opportunity scores."""
    
    # CTR curves by SERP layout (position -> CTR %)
    CTR_CURVES = {
        'informational_clean': {
            1: 31.7, 2: 24.7, 3: 18.7, 4: 13.6, 5: 9.5,
            6: 6.9, 7: 5.1, 8: 3.8, 9: 2.8, 10: 2.2
        },
        'informational_featured_snippet': {
            0: 8.6,  # Featured snippet
            1: 19.6, 2: 15.3, 3: 11.3, 4: 8.1, 5: 5.8,
            6: 4.3, 7: 3.2, 8: 2.4, 9: 1.8, 10: 1.4
        },
        'commercial': {
            1: 27.6, 2: 15.8, 3: 11.3, 4: 8.4, 5: 6.1,
            6: 4.5, 7: 3.4, 8: 2.6, 9: 2.0, 10: 1.6
        },
        'local_with_map': {
            'map_1': 15.0, 'map_2': 10.0, 'map_3': 7.0,
            1: 12.0, 2: 9.0, 3: 6.5, 4: 4.8, 5: 3.5,
            6: 2.6, 7: 1.9, 8: 1.4, 9: 1.0, 10: 0.8
        }
    }
    
    def __init__(self):
        pass
    
    def calculate_difficulty(self,
                            serp_metrics: Dict,
                            keyword: str,
                            return_components: bool = False) -> Dict:
        """
        Calculate difficulty score (0-100) with component breakdown.

        Inputs:
        - SERP strength (40%): homepage ratio, brands, exact-match titles
        - Competition (30%): in-title presence (allintitle ratio)
        - SERP crowding (20%): ads + features
        - Content depth (10%): avg word count proxy

        Returns:
            If return_components=False: float (difficulty score)
            If return_components=True: Dict with score and components
        """

        organic_results = serp_metrics.get('organic_results', [])
        features = serp_metrics.get('features', [])
        ads_density = serp_metrics.get('ads_density', 0)

        if not organic_results:
            default_result = {
                'difficulty': 50.0,
                'serp_strength': 0.5,
                'competition': 0.5,
                'crowding': 0.5,
                'content_depth': 0.5
            }
            return default_result if return_components else 50.0

        # 1. SERP Strength (40%) - normalized 0-1
        serp_strength = self._calculate_serp_strength(organic_results, features) / 100.0

        # 2. Competition (30%) - allintitle ratio, normalized 0-1
        competition = self._calculate_competition(organic_results, keyword) / 100.0

        # 3. SERP Crowding (20%) - normalized 0-1
        crowding = self._calculate_crowding(features, ads_density) / 100.0

        # 4. Content Depth (10%) - normalized 0-1
        content_depth = self._calculate_content_depth(organic_results) / 100.0

        # Weighted score (0-100)
        difficulty = (
            serp_strength * 40.0 +
            competition * 30.0 +
            crowding * 20.0 +
            content_depth * 10.0
        )

        difficulty = round(min(max(difficulty, 0), 100), 1)

        if return_components:
            return {
                'difficulty': difficulty,
                'serp_strength': round(serp_strength, 3),
                'competition': round(competition, 3),
                'crowding': round(crowding, 3),
                'content_depth': round(content_depth, 3)
            }

        return difficulty
    
    def _calculate_serp_strength(self, results: List[Dict], 
                                features: List[str]) -> float:
        """Calculate SERP authority strength."""
        if not results:
            return 50.0
        
        score = 0.0
        
        # Check for homepages vs inner pages
        homepage_count = sum(1 for r in results[:5] 
                           if self._is_homepage(r.get('link', '')))
        homepage_ratio = homepage_count / 5.0
        score += homepage_ratio * 30  # More homepages = harder
        
        # Check for big brands (domains with short names)
        brand_count = sum(1 for r in results[:5]
                         if self._is_big_brand(r.get('link', '')))
        brand_ratio = brand_count / 5.0
        score += brand_ratio * 40  # More brands = harder
        
        # Knowledge graph presence
        if 'knowledge_graph' in features:
            score += 15
        
        # Featured snippet
        if 'featured_snippet' in features:
            score += 15
        
        return min(score, 100)
    
    def _calculate_competition(self, results: List[Dict], 
                              keyword: str) -> float:
        """Calculate competition from title matching."""
        if not results:
            return 50.0
        
        keyword_lower = keyword.lower()
        keyword_words = set(keyword_lower.split())
        
        exact_matches = 0
        partial_matches = 0
        
        for result in results[:10]:
            title = result.get('title', '').lower()
            
            # Exact phrase match
            if keyword_lower in title:
                exact_matches += 1
            # All words present
            elif keyword_words.issubset(set(title.split())):
                partial_matches += 1
        
        # More exact matches = harder
        score = (exact_matches * 10) + (partial_matches * 5)
        
        return min(score, 100)
    
    def _calculate_crowding(self, features: List[str], 
                           ads_density: float) -> float:
        """Calculate SERP crowding from ads and features."""
        score = 0.0
        
        # Ads density (0-1 scale)
        score += ads_density * 50
        
        # Number of SERP features
        feature_count = len(features)
        score += min(feature_count * 10, 50)
        
        return min(score, 100)
    
    def _calculate_content_depth(self, results: List[Dict]) -> float:
        """Proxy for content depth from snippets."""
        if not results:
            return 50.0
        
        # Use snippet length as proxy
        snippet_lengths = []
        for result in results[:5]:
            snippet = result.get('snippet', '')
            snippet_lengths.append(len(snippet))
        
        if not snippet_lengths:
            return 50.0
        
        avg_length = sum(snippet_lengths) / len(snippet_lengths)
        
        # Longer snippets suggest longer content
        # Scale: <100 chars = low, 200+ = high
        score = min((avg_length / 200) * 100, 100)
        
        return score
    
    def _is_homepage(self, url: str) -> bool:
        """Check if URL is likely a homepage."""
        # Remove protocol
        url = url.replace('http://', '').replace('https://', '')
        # Remove trailing slash
        url = url.rstrip('/')
        
        # Homepage has no path or just domain
        parts = url.split('/')
        return len(parts) <= 1
    
    def _is_big_brand(self, url: str) -> bool:
        """Simple heuristic for big brands."""
        big_domains = [
            'wikipedia', 'youtube', 'amazon', 'facebook', 'twitter',
            'linkedin', 'reddit', 'instagram', 'tiktok', 'forbes',
            'nytimes', 'cnn', 'bbc', 'medium', 'quora'
        ]
        
        url_lower = url.lower()
        return any(domain in url_lower for domain in big_domains)
    
    def calculate_traffic_potential(self,
                                    volume: int,
                                    intent: str,
                                    features: List[str],
                                    target_rank: int = 3) -> float:
        """Calculate traffic potential at target rank."""
        if volume == 0:
            return 0.0
        
        # Select CTR curve
        if intent == 'local' and 'map_pack' in features:
            curve = self.CTR_CURVES['local_with_map']
        elif 'featured_snippet' in features:
            curve = self.CTR_CURVES['informational_featured_snippet']
        elif intent in ['commercial', 'transactional']:
            curve = self.CTR_CURVES['commercial']
        else:
            curve = self.CTR_CURVES['informational_clean']
        
        # Get CTR for target rank
        ctr_percent = curve.get(target_rank, 2.0)
        ctr = ctr_percent / 100.0
        
        # Traffic potential
        traffic = volume * ctr
        
        return round(traffic, 1)
    
    def calculate_opportunity(self,
                            traffic_potential: float,
                            difficulty: float,
                            cpc: float,
                            intent: str,
                            content_focus: str,
                            features: List[str]) -> float:
        """
        Calculate opportunity score.
        
        Formula: (Traffic × CPC weight × Intent fit) / (Difficulty + Brand crowding)
        """
        
        # CPC weight (higher for commercial intent)
        if intent in ['transactional', 'commercial']:
            cpc_weight = 1.0 + min(cpc / 10.0, 2.0)  # Up to 3x boost
        else:
            cpc_weight = 1.0
        
        # Intent fit (boost if matches content focus)
        intent_fit = 1.5 if intent == content_focus else 1.0
        
        # Brand crowding penalty
        brand_crowding = 0.0
        if 'knowledge_graph' in features:
            brand_crowding += 10
        
        # Calculate
        numerator = traffic_potential * cpc_weight * intent_fit
        denominator = max(difficulty + brand_crowding, 1)
        
        opportunity = numerator / denominator
        
        # Normalize to 0-100 scale (with log scaling)
        if opportunity > 0:
            opportunity = min(math.log1p(opportunity) * 10, 100)
        
        return round(opportunity, 2)
