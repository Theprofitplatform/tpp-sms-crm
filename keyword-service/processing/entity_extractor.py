"""Entity extraction from keywords."""
import re
from typing import List, Dict, Set


class EntityExtractor:
    """Extract entities from keywords."""
    
    # Common entity patterns
    PRODUCT_MODIFIERS = [
        'software', 'tool', 'app', 'platform', 'service', 'product',
        'system', 'solution', 'program', 'device', 'machine'
    ]
    
    AUDIENCE_MODIFIERS = [
        'for beginners', 'for students', 'for professionals', 'for kids',
        'for small business', 'for enterprise', 'for startups',
        'for seniors', 'for women', 'for men'
    ]
    
    PRICE_MODIFIERS = [
        'free', 'cheap', 'affordable', 'expensive', 'premium', 'budget',
        'low cost', 'high end', 'luxury', 'discount'
    ]
    
    COMPARISON_MODIFIERS = [
        'vs', 'versus', 'compared to', 'alternative to', 'instead of',
        'better than', 'like', 'similar to'
    ]
    
    TIME_MODIFIERS = [
        r'\d{4}',  # Year
        'today', 'now', 'current', 'latest', 'new', 'upcoming',
        'future', 'modern', 'old', 'vintage'
    ]
    
    def __init__(self):
        self.product_pattern = re.compile(
            r'\b(' + '|'.join(self.PRODUCT_MODIFIERS) + r')\b',
            re.IGNORECASE
        )
        
        self.audience_pattern = re.compile(
            r'\b(' + '|'.join(self.AUDIENCE_MODIFIERS) + r')\b',
            re.IGNORECASE
        )
        
        self.price_pattern = re.compile(
            r'\b(' + '|'.join(self.PRICE_MODIFIERS) + r')\b',
            re.IGNORECASE
        )
    
    def extract_entities(self, keyword: str) -> Dict[str, List[str]]:
        """Extract all entity types."""
        entities = {
            'products': self._extract_products(keyword),
            'locations': self._extract_locations(keyword),
            'audience': self._extract_audience(keyword),
            'price_signals': self._extract_price_signals(keyword),
            'brands': self._extract_brands(keyword),
            'years': self._extract_years(keyword),
            'problems': self._extract_problems(keyword),
        }
        
        # Remove empty lists
        return {k: v for k, v in entities.items() if v}
    
    def _extract_products(self, keyword: str) -> List[str]:
        """Extract product mentions."""
        matches = self.product_pattern.findall(keyword)
        return list(set(matches))
    
    def _extract_locations(self, keyword: str) -> List[str]:
        """Extract location mentions."""
        locations = []
        
        # Common location patterns
        patterns = [
            r'\bin ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',  # "in New York"
            r'\bnear ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',  # "near Sydney"
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:area|region|city|suburb)\b',
            r'\b(near me|nearby|local)\b',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, keyword, re.IGNORECASE)
            locations.extend(matches)
        
        return list(set(locations))
    
    def _extract_audience(self, keyword: str) -> List[str]:
        """Extract audience/demographic mentions."""
        matches = self.audience_pattern.findall(keyword)
        return list(set(matches))
    
    def _extract_price_signals(self, keyword: str) -> List[str]:
        """Extract price/cost signals."""
        matches = self.price_pattern.findall(keyword)
        
        # Also check for currency symbols and numbers
        currency_matches = re.findall(r'[$£€¥]\s*\d+', keyword)
        matches.extend(currency_matches)
        
        return list(set(matches))
    
    def _extract_brands(self, keyword: str) -> List[str]:
        """Extract brand mentions (capitalized words)."""
        # Simple heuristic: consecutive capitalized words
        brands = re.findall(r'\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\b', keyword)
        
        # Filter out common non-brand words
        common_words = {'How', 'What', 'Why', 'When', 'Where', 'Best', 'Top', 'The'}
        brands = [b for b in brands if b not in common_words]
        
        return brands
    
    def _extract_years(self, keyword: str) -> List[str]:
        """Extract year mentions."""
        years = re.findall(r'\b(19\d{2}|20\d{2})\b', keyword)
        return years
    
    def _extract_problems(self, keyword: str) -> List[str]:
        """Extract problem/pain point indicators."""
        problem_patterns = [
            r'\b(problem|issue|error|fail|broken|not working|fix|solve|resolve)\b',
            r'\bhow to (fix|repair|resolve|solve)\b',
        ]
        
        problems = []
        for pattern in problem_patterns:
            matches = re.findall(pattern, keyword, re.IGNORECASE)
            problems.extend(matches)
        
        return list(set(problems))
    
    def get_core_topic(self, keyword: str) -> str:
        """Extract core topic by removing modifiers."""
        # Remove common modifiers
        text = keyword.lower()
        
        # Remove question words
        text = re.sub(r'^\b(how|what|why|when|where|who|which)\b\s+', '', text)
        text = re.sub(r'^\b(is|are|do|does|can|could|should|will)\b\s+', '', text)
        
        # Remove intent modifiers
        text = re.sub(r'\b(best|top|good|great|cheap|free|affordable)\b\s+', '', text)
        text = re.sub(r'\s+\b(review|reviews|guide|tutorial|tips)\b', '', text)
        
        # Remove location modifiers
        text = re.sub(r'\s+\b(near me|nearby|local)\b', '', text)
        
        return text.strip()
