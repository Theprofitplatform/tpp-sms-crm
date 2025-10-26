"""Intent classification for keywords."""
import re
from typing import Dict, List


class IntentClassifier:
    """Classify search intent of keywords."""
    
    # Intent patterns
    INFORMATIONAL_PATTERNS = [
        r'\b(how|what|why|when|where|who|guide|tutorial|learn|explain|definition|meaning)\b',
        r'\b(vs|versus|compared?|difference|review)\b',
        r'\b(tips|ideas|examples|benefits|advantages|disadvantages)\b',
    ]
    
    COMMERCIAL_PATTERNS = [
        r'\b(best|top|review|comparison|affordable|cheap|premium|quality)\b',
        r'\b(vs|versus|alternative|option|solution)\b',
        r'\b(price|cost|pricing|quote|estimate)\b',
    ]
    
    TRANSACTIONAL_PATTERNS = [
        r'\b(buy|purchase|order|shop|sale|deal|discount|coupon|promo)\b',
        r'\b(for sale|to buy|online|store|cart|checkout)\b',
        r'\b(near me|delivery|shipping|book|hire|rent)\b',
    ]
    
    LOCAL_PATTERNS = [
        r'\b(near me|nearby|local|in [A-Z]|around)\b',
        r'\b(directions|hours|location|address|phone|contact)\b',
        r'\b(city|town|suburb|zip|postcode|\d{4,5})\b',
    ]
    
    NAVIGATIONAL_PATTERNS = [
        r'\b(login|sign in|account|dashboard|portal|homepage|official)\b',
        r'^[A-Z][a-z]+ (website|site|app|platform|login)$',
    ]
    
    def __init__(self):
        self.patterns = {
            'informational': [re.compile(p, re.IGNORECASE) for p in self.INFORMATIONAL_PATTERNS],
            'commercial': [re.compile(p, re.IGNORECASE) for p in self.COMMERCIAL_PATTERNS],
            'transactional': [re.compile(p, re.IGNORECASE) for p in self.TRANSACTIONAL_PATTERNS],
            'local': [re.compile(p, re.IGNORECASE) for p in self.LOCAL_PATTERNS],
            'navigational': [re.compile(p, re.IGNORECASE) for p in self.NAVIGATIONAL_PATTERNS],
        }
    
    def classify(self, keyword: str) -> str:
        """Classify keyword intent."""
        scores = {intent: 0 for intent in self.patterns.keys()}
        
        # Score each intent
        for intent, patterns in self.patterns.items():
            for pattern in patterns:
                if pattern.search(keyword):
                    scores[intent] += 1
        
        # Priority order for ties
        priority = ['transactional', 'local', 'commercial', 'navigational', 'informational']
        
        # Get intent with highest score
        max_score = max(scores.values())
        
        if max_score == 0:
            # Default to informational
            return 'informational'
        
        # Return highest priority intent with max score
        for intent in priority:
            if scores[intent] == max_score:
                return intent
        
        return 'informational'
    
    def classify_with_confidence(self, keyword: str) -> Dict[str, any]:
        """Classify with confidence scores."""
        scores = {intent: 0 for intent in self.patterns.keys()}
        matches = {intent: [] for intent in self.patterns.keys()}
        
        # Score each intent and track matches
        for intent, patterns in self.patterns.items():
            for pattern in patterns:
                match = pattern.search(keyword)
                if match:
                    scores[intent] += 1
                    matches[intent].append(match.group())
        
        total_matches = sum(scores.values())
        
        if total_matches == 0:
            return {
                'intent': 'informational',
                'confidence': 0.5,
                'scores': scores,
                'matches': {}
            }
        
        # Normalize scores
        normalized_scores = {
            intent: score / total_matches 
            for intent, score in scores.items()
        }
        
        # Get primary intent
        primary_intent = max(scores, key=scores.get)
        confidence = normalized_scores[primary_intent]
        
        return {
            'intent': primary_intent,
            'confidence': confidence,
            'scores': scores,
            'matches': {k: v for k, v in matches.items() if v}
        }
    
    def is_question(self, keyword: str) -> bool:
        """Check if keyword is a question."""
        question_words = ['how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'is', 'does', 'do']
        
        # Starts with question word
        first_word = keyword.lower().split()[0] if keyword else ""
        if first_word in question_words:
            return True
        
        # Ends with question mark
        if keyword.strip().endswith('?'):
            return True
        
        return False
    
    def extract_intent_modifiers(self, keyword: str) -> List[str]:
        """Extract intent-indicating modifiers."""
        modifiers = []
        
        for intent, patterns in self.patterns.items():
            for pattern in patterns:
                matches = pattern.findall(keyword)
                modifiers.extend(matches)
        
        return list(set(modifiers))
