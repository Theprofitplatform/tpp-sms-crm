"""Reporting and content calendar generation."""
from typing import List, Dict
from datetime import datetime, timedelta
import random


class ContentCalendarGenerator:
    """Generate content calendar from keyword research."""
    
    def __init__(self):
        pass
    
    def generate_calendar(self,
                         page_groups: List[Dict],
                         start_date: datetime = None,
                         weeks: int = 12,
                         posts_per_week: int = 2) -> List[Dict]:
        """
        Generate 12-week content calendar.
        
        Prioritizes by opportunity score and considers seasonality.
        """
        
        if start_date is None:
            start_date = datetime.now()
        
        # Sort page groups by opportunity (descending)
        sorted_groups = sorted(
            page_groups,
            key=lambda x: x.get('total_opportunity', 0),
            reverse=True
        )
        
        calendar = []
        current_date = start_date
        
        # Distribute content over weeks
        total_slots = weeks * posts_per_week
        
        for i, page_group in enumerate(sorted_groups[:total_slots]):
            # Calculate publish date
            week_num = i // posts_per_week
            day_offset = (i % posts_per_week) * 3  # Space out within week
            
            publish_date = start_date + timedelta(weeks=week_num, days=day_offset)
            
            # Determine priority
            if i < total_slots * 0.2:
                priority = "High"
            elif i < total_slots * 0.5:
                priority = "Medium"
            else:
                priority = "Low"
            
            # Create calendar entry
            entry = {
                'week': week_num + 1,
                'publish_date': publish_date.strftime('%Y-%m-%d'),
                'target_keyword': page_group.get('label', ''),
                'intent': page_group.get('intent', ''),
                'word_count': page_group.get('word_range', '1500-2000'),
                'priority': priority,
                'estimated_traffic': page_group.get('total_opportunity', 0),
                'status': 'planned',
                'assigned_to': '',
                'notes': ''
            }
            
            calendar.append(entry)
        
        return calendar
    
    def generate_report(self,
                       project: Dict,
                       keywords: List[Dict],
                       topics: List[Dict],
                       page_groups: List[Dict]) -> Dict:
        """Generate summary report."""
        
        # Calculate aggregate metrics
        total_keywords = len(keywords)
        total_volume = sum(kw.get('volume', 0) for kw in keywords)
        avg_difficulty = sum(kw.get('difficulty', 0) for kw in keywords) / max(total_keywords, 1)
        total_opportunity = sum(kw.get('opportunity', 0) for kw in keywords)
        
        # Intent distribution
        intent_dist = {}
        for kw in keywords:
            intent = kw.get('intent', 'unknown')
            intent_dist[intent] = intent_dist.get(intent, 0) + 1
        
        # Top opportunities
        top_keywords = sorted(
            keywords,
            key=lambda x: x.get('opportunity', 0),
            reverse=True
        )[:20]
        
        # SERP feature analysis
        feature_counts = {}
        for kw in keywords:
            features = kw.get('serp_features', [])
            for feature in features:
                feature_counts[feature] = feature_counts.get(feature, 0) + 1
        
        report = {
            'project_name': project.get('name', ''),
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'summary': {
                'total_keywords': total_keywords,
                'total_topics': len(topics),
                'total_page_groups': len(page_groups),
                'total_monthly_volume': total_volume,
                'avg_difficulty': round(avg_difficulty, 1),
                'total_opportunity_score': round(total_opportunity, 1)
            },
            'intent_distribution': intent_dist,
            'top_opportunities': [
                {
                    'keyword': kw.get('keyword', ''),
                    'volume': kw.get('volume', 0),
                    'difficulty': kw.get('difficulty', 0),
                    'opportunity': kw.get('opportunity', 0)
                }
                for kw in top_keywords
            ],
            'serp_features': feature_counts,
            'recommendations': self._generate_recommendations(
                keywords, topics, page_groups
            )
        }
        
        return report
    
    def _generate_recommendations(self,
                                 keywords: List[Dict],
                                 topics: List[Dict],
                                 page_groups: List[Dict]) -> List[str]:
        """Generate strategic recommendations."""
        
        recommendations = []
        
        # Check for quick wins
        quick_wins = [
            kw for kw in keywords
            if kw.get('difficulty', 100) < 30 and kw.get('volume', 0) > 100
        ]
        
        if quick_wins:
            recommendations.append(
                f"Found {len(quick_wins)} quick win opportunities (low difficulty, decent volume). Prioritize these for fast results."
            )
        
        # Check for high-value targets
        high_value = [
            kw for kw in keywords
            if kw.get('opportunity', 0) > 50
        ]
        
        if high_value:
            recommendations.append(
                f"Identified {len(high_value)} high-value keywords. Focus content efforts here for maximum ROI."
            )
        
        # Intent analysis
        intent_counts = {}
        for kw in keywords:
            intent = kw.get('intent', 'unknown')
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
        
        dominant_intent = max(intent_counts, key=intent_counts.get)
        recommendations.append(
            f"Primary search intent is '{dominant_intent}'. Ensure content strategy aligns with this user behavior."
        )
        
        # Topic coverage
        if len(topics) > 10:
            recommendations.append(
                f"With {len(topics)} distinct topics, consider creating topic clusters with pillar pages and supporting content."
            )
        
        return recommendations
    
    def print_report(self, report: Dict):
        """Print report to console."""
        
        print("\n" + "="*80)
        print(f"KEYWORD RESEARCH REPORT: {report['project_name']}")
        print(f"Generated: {report['generated_at']}")
        print("="*80)
        
        print("\n📊 SUMMARY")
        print("-" * 80)
        summary = report['summary']
        print(f"  Total Keywords:      {summary['total_keywords']:,}")
        print(f"  Topics:              {summary['total_topics']}")
        print(f"  Page Groups:         {summary['total_page_groups']}")
        print(f"  Monthly Volume:      {summary['total_monthly_volume']:,}")
        print(f"  Avg Difficulty:      {summary['avg_difficulty']}/100")
        print(f"  Opportunity Score:   {summary['total_opportunity_score']:.1f}")
        
        print("\n🎯 INTENT DISTRIBUTION")
        print("-" * 80)
        for intent, count in sorted(report['intent_distribution'].items(), key=lambda x: x[1], reverse=True):
            pct = (count / summary['total_keywords'] * 100)
            print(f"  {intent:20s} {count:5d} ({pct:5.1f}%)")
        
        print("\n🏆 TOP OPPORTUNITIES")
        print("-" * 80)
        print(f"  {'Keyword':<40} {'Volume':>10} {'Diff':>6} {'Opp':>8}")
        print("  " + "-" * 78)
        for kw in report['top_opportunities'][:10]:
            print(f"  {kw['keyword']:<40} {kw['volume']:>10,} {kw['difficulty']:>6.0f} {kw['opportunity']:>8.1f}")
        
        print("\n💡 RECOMMENDATIONS")
        print("-" * 80)
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"  {i}. {rec}")
        
        print("\n" + "="*80 + "\n")
