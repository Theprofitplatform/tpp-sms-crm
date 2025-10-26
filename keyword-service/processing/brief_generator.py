"""Content brief generator."""
from typing import List, Dict, Optional, Set, Tuple
import re


class BriefGenerator:
    """Generate content briefs for page groups."""
    
    # Schema recommendations by intent
    SCHEMA_BY_INTENT = {
        'informational': ['Article', 'FAQPage', 'HowTo'],
        'commercial': ['Product', 'Review', 'AggregateRating', 'FAQPage'],
        'transactional': ['Product', 'Offer', 'Organization'],
        'local': ['LocalBusiness', 'Service', 'FAQPage'],
        'navigational': ['Organization', 'WebSite', 'SearchAction']
    }
    
    def __init__(self):
        pass
    
    def generate_brief(self,
                      page_group_keywords: List[str],
                      keyword_data: List[Dict],
                      serp_data: List[Dict],
                      target_keyword: str,
                      intent: str) -> Dict:
        """
        Generate comprehensive content brief.
        
        Returns:
        - intent_summary
        - outline (H2/H3 structure)
        - faqs
        - internal_links
        - schema_types
        - serp_features_target
        - word_range
        """
        
        # Extract entities from all keywords
        all_entities = self._extract_all_entities(keyword_data)
        
        # Generate outline
        outline = self._generate_outline(
            target_keyword,
            page_group_keywords,
            all_entities,
            serp_data,
            intent
        )
        
        # Collect FAQs
        faqs = self._collect_faqs(serp_data)
        
        # Recommended schema types
        schema_types = self.SCHEMA_BY_INTENT.get(intent, ['Article'])
        
        # SERP features to target
        serp_features_target = self._identify_serp_targets(serp_data)
        
        # Word range recommendation
        word_range = self._suggest_word_count(serp_data, intent)
        
        # Intent summary
        intent_summary = self._generate_intent_summary(
            target_keyword,
            intent,
            page_group_keywords
        )
        
        return {
            'intent_summary': intent_summary,
            'outline': outline,
            'faqs': faqs,
            'schema_types': schema_types,
            'serp_features_target': serp_features_target,
            'word_range': word_range,
            'target_keyword': target_keyword,
            'supporting_keywords': page_group_keywords,
            'must_cover_entities': list(all_entities)[:20]  # Top 20
        }
    
    def _extract_all_entities(self, keyword_data: List[Dict]) -> Set[str]:
        """Extract all unique entities from keyword data."""
        entities = set()
        
        for data in keyword_data:
            kw_entities = data.get('entities', {})
            for entity_type, entity_list in kw_entities.items():
                entities.update(entity_list)
        
        return entities
    
    def _generate_outline(self,
                         target_keyword: str,
                         supporting_keywords: List[str],
                         entities: Set[str],
                         serp_data: List[Dict],
                         intent: str) -> List[Dict]:
        """
        Generate H2/H3 outline structure.
        """
        outline = []
        
        # H1 (title)
        outline.append({
            'level': 'H1',
            'text': self._generate_h1(target_keyword, intent)
        })
        
        # Introduction section
        outline.append({
            'level': 'H2',
            'text': f"What is {target_keyword.title()}?",
            'subsections': []
        })
        
        # Intent-specific sections
        if intent == 'informational':
            outline.extend(self._informational_outline(target_keyword, supporting_keywords))
        elif intent == 'commercial':
            outline.extend(self._commercial_outline(target_keyword, supporting_keywords))
        elif intent == 'transactional':
            outline.extend(self._transactional_outline(target_keyword))
        elif intent == 'local':
            outline.extend(self._local_outline(target_keyword))
        
        # Add entity-based sections
        if entities:
            entity_sections = self._entity_outline(list(entities)[:5])
            outline.extend(entity_sections)
        
        # FAQ section
        outline.append({
            'level': 'H2',
            'text': 'Frequently Asked Questions',
            'subsections': []
        })
        
        # Conclusion
        outline.append({
            'level': 'H2',
            'text': 'Conclusion',
            'subsections': []
        })
        
        return outline
    
    def _generate_h1(self, keyword: str, intent: str) -> str:
        """Generate compelling H1 title."""
        if intent == 'commercial':
            return f"Best {keyword.title()} [Year] - Expert Reviews & Comparisons"
        elif intent == 'informational':
            return f"{keyword.title()}: Complete Guide for [Year]"
        elif intent == 'transactional':
            return f"Buy {keyword.title()} - Best Deals & Prices"
        elif intent == 'local':
            return f"{keyword.title()} Near You - Find Local Services"
        else:
            return keyword.title()
    
    def _informational_outline(self, target: str, supporting: List[str]) -> List[Dict]:
        """Outline for informational intent."""
        return [
            {
                'level': 'H2',
                'text': f"How Does {target.title()} Work?",
                'subsections': []
            },
            {
                'level': 'H2',
                'text': f"Benefits of {target.title()}",
                'subsections': []
            },
            {
                'level': 'H2',
                'text': f"Types of {target.title()}",
                'subsections': []
            },
            {
                'level': 'H2',
                'text': f"How to Choose the Right {target.title()}",
                'subsections': []
            }
        ]
    
    def _commercial_outline(self, target: str, supporting: List[str]) -> List[Dict]:
        """Outline for commercial intent."""
        return [
            {
                'level': 'H2',
                'text': f"Top {target.title()} Options",
                'subsections': [
                    {'level': 'H3', 'text': 'Option 1: [Product Name]'},
                    {'level': 'H3', 'text': 'Option 2: [Product Name]'},
                    {'level': 'H3', 'text': 'Option 3: [Product Name]'}
                ]
            },
            {
                'level': 'H2',
                'text': 'Comparison Table',
                'subsections': []
            },
            {
                'level': 'H2',
                'text': 'Buying Guide',
                'subsections': [
                    {'level': 'H3', 'text': 'Key Features to Consider'},
                    {'level': 'H3', 'text': 'Price Range'},
                    {'level': 'H3', 'text': 'Where to Buy'}
                ]
            }
        ]
    
    def _transactional_outline(self, target: str) -> List[Dict]:
        """Outline for transactional intent."""
        return [
            {
                'level': 'H2',
                'text': f"Why Buy {target.title()} From Us?",
                'subsections': []
            },
            {
                'level': 'H2',
                'text': 'Pricing & Packages',
                'subsections': []
            },
            {
                'level': 'H2',
                'text': 'Shipping & Delivery',
                'subsections': []
            }
        ]
    
    def _local_outline(self, target: str) -> List[Dict]:
        """Outline for local intent."""
        return [
            {
                'level': 'H2',
                'text': f"{target.title()} in Your Area",
                'subsections': []
            },
            {
                'level': 'H2',
                'text': 'Service Areas',
                'subsections': []
            },
            {
                'level': 'H2',
                'text': 'Hours & Contact',
                'subsections': []
            }
        ]
    
    def _entity_outline(self, entities: List[str]) -> List[Dict]:
        """Generate sections based on entities."""
        sections = []
        for entity in entities:
            sections.append({
                'level': 'H2',
                'text': f"{entity.title()} Explained",
                'subsections': []
            })
        return sections
    
    def _collect_faqs(self, serp_data: List[Dict]) -> List[Dict]:
        """Collect FAQs from PAA and SERP data."""
        faqs = []
        
        for serp in serp_data:
            paa_questions = serp.get('paa_questions', [])
            for question in paa_questions:
                faqs.append({
                    'question': question,
                    'answer': '[To be written based on research]'
                })
        
        # Deduplicate
        seen = set()
        unique_faqs = []
        for faq in faqs:
            q = faq['question'].lower()
            if q not in seen:
                seen.add(q)
                unique_faqs.append(faq)
        
        return unique_faqs[:10]  # Top 10
    
    def _identify_serp_targets(self, serp_data: List[Dict]) -> List[str]:
        """Identify SERP features to optimize for."""
        feature_counts = {}
        
        for serp in serp_data:
            features = serp.get('features', [])
            for feature in features:
                feature_counts[feature] = feature_counts.get(feature, 0) + 1
        
        # Features present in >30% of SERPs
        total = len(serp_data) if serp_data else 1
        threshold = total * 0.3
        
        targets = [
            feature for feature, count in feature_counts.items()
            if count >= threshold
        ]
        
        return targets
    
    def _suggest_word_count(self, serp_data: List[Dict], intent: str) -> str:
        """Suggest word count range based on SERP analysis."""
        # Base ranges by intent
        ranges = {
            'informational': '1500-2500',
            'commercial': '2000-3000',
            'transactional': '800-1200',
            'local': '600-1000',
            'navigational': '300-600'
        }
        
        return ranges.get(intent, '1200-1800')
    
    def _generate_intent_summary(self,
                                target_keyword: str,
                                intent: str,
                                supporting_keywords: List[str]) -> str:
        """Generate search intent summary."""
        summaries = {
            'informational': f"Users searching for '{target_keyword}' want to learn and understand the topic. Provide comprehensive, educational content.",
            'commercial': f"Users are evaluating options and comparing products/services related to '{target_keyword}'. Include comparisons, reviews, and buying guidance.",
            'transactional': f"Users are ready to take action on '{target_keyword}'. Optimize for conversion with clear CTAs and product information.",
            'local': f"Users are looking for local services/businesses related to '{target_keyword}'. Include location information, hours, and contact details.",
            'navigational': f"Users are looking for a specific page or brand related to '{target_keyword}'."
        }
        
        return summaries.get(intent, f"Primary intent: {intent}")
    
    def generate_internal_link_plan(self,
                                    hub_keyword: str,
                                    spoke_keywords: List[str],
                                    sibling_pairs: List[Tuple[str, str]]) -> Dict:
        """Generate internal linking recommendations."""
        links = {
            'hub_links': [],
            'spoke_to_hub': [],
            'sibling_links': []
        }
        
        # Spoke pages should link to hub
        for spoke in spoke_keywords:
            links['spoke_to_hub'].append({
                'from': spoke,
                'to': hub_keyword,
                'anchor_text': hub_keyword,
                'context': 'related topic'
            })
        
        # Hub should link to top spokes
        for spoke in spoke_keywords[:5]:  # Top 5
            links['hub_links'].append({
                'from': hub_keyword,
                'to': spoke,
                'anchor_text': spoke,
                'context': 'deep dive'
            })
        
        # Sibling links
        for spoke1, spoke2 in sibling_pairs:
            links['sibling_links'].append({
                'from': spoke1,
                'to': spoke2,
                'anchor_text': spoke2,
                'context': 'related topic'
            })
        
        return links
