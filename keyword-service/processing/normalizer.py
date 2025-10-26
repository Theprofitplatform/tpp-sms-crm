"""Keyword normalization and deduplication."""
import re
import unicodedata
from typing import List, Set
from difflib import SequenceMatcher
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download required NLTK data
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)

try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)


class KeywordNormalizer:
    """Normalize and deduplicate keywords."""
    
    def __init__(self, language: str = "en"):
        self.language = language
        self.lemmatizer = WordNetLemmatizer()
        
        try:
            self.stop_words = set(stopwords.words('english'))
        except:
            self.stop_words = set()
    
    def normalize(self, keyword: str) -> str:
        """Normalize keyword to canonical form."""
        # Lowercase
        text = keyword.lower()
        
        # Unicode normalization (fold accents)
        text = unicodedata.normalize('NFKD', text)
        text = text.encode('ASCII', 'ignore').decode('ASCII')
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def lemmatize(self, keyword: str) -> str:
        """Lemmatize keyword for grouping."""
        normalized = self.normalize(keyword)
        words = normalized.split()
        
        # Lemmatize each word
        lemmatized_words = [self.lemmatizer.lemmatize(word) for word in words]
        
        return ' '.join(lemmatized_words)
    
    def remove_stopwords(self, keyword: str, aggressive: bool = False) -> str:
        """Remove stopwords (optional, not for main lemma)."""
        words = keyword.lower().split()
        
        if aggressive:
            # Remove all stopwords
            filtered = [w for w in words if w not in self.stop_words]
        else:
            # Keep stopwords in middle, remove from start/end
            while words and words[0] in self.stop_words:
                words.pop(0)
            while words and words[-1] in self.stop_words:
                words.pop()
            filtered = words
        
        return ' '.join(filtered) if filtered else keyword
    
    def calculate_similarity(self, kw1: str, kw2: str) -> float:
        """Calculate similarity between two keywords."""
        return SequenceMatcher(None, kw1, kw2).ratio()
    
    def deduplicate(self, keywords: List[str], 
                   similarity_threshold: float = 0.85) -> List[str]:
        """Deduplicate keywords by similarity."""
        if not keywords:
            return []
        
        # Normalize all
        normalized = [(kw, self.normalize(kw), self.lemmatize(kw)) 
                     for kw in keywords]
        
        # Group by exact lemma match first
        lemma_groups = {}
        for original, norm, lemma in normalized:
            if lemma not in lemma_groups:
                lemma_groups[lemma] = []
            lemma_groups[lemma].append((original, norm))
        
        # For each group, pick the most common form
        unique_keywords = []
        seen_lemmas = set()
        
        for original, norm, lemma in normalized:
            if lemma in seen_lemmas:
                continue
            
            # Check fuzzy similarity with existing
            is_duplicate = False
            for existing_lemma in seen_lemmas:
                if self.calculate_similarity(lemma, existing_lemma) > similarity_threshold:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                seen_lemmas.add(lemma)
                unique_keywords.append(original)
        
        return unique_keywords
    
    def extract_tokens(self, keyword: str) -> Set[str]:
        """Extract token set for overlap analysis."""
        normalized = self.normalize(keyword)
        lemmatized = self.lemmatize(keyword)
        
        return set(lemmatized.split())
    
    def calculate_token_overlap(self, kw1: str, kw2: str) -> float:
        """Calculate Jaccard similarity of token sets."""
        tokens1 = self.extract_tokens(kw1)
        tokens2 = self.extract_tokens(kw2)
        
        if not tokens1 or not tokens2:
            return 0.0
        
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        
        return intersection / union if union > 0 else 0.0
