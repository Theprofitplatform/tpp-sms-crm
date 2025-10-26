"""Main orchestration engine for keyword research workflow."""
from typing import List, Dict, Optional
from datetime import datetime
from tqdm import tqdm

from database import get_db, init_db
from models import Project, Keyword, Topic, PageGroup, SerpSnapshot
from expansion import KeywordExpander
from providers.serpapi_client import SerpApiClient
from providers.trends import TrendsProvider
from processing.normalizer import KeywordNormalizer
from processing.intent_classifier import IntentClassifier
from processing.entity_extractor import EntityExtractor
from processing.scoring import KeywordScorer
from processing.clustering import KeywordClusterer
from processing.brief_generator import BriefGenerator
from reporting import ContentCalendarGenerator
from stats_tracker import PipelineStats, QuotaTracker
from checkpoint import CheckpointManager


class KeywordResearchOrchestrator:
    """Orchestrate the entire keyword research workflow."""
    
    def __init__(self):
        self.expander = KeywordExpander()
        self.serp_client = SerpApiClient()
        self.trends_client = TrendsProvider()
        self.normalizer = KeywordNormalizer()
        self.intent_classifier = IntentClassifier()
        self.entity_extractor = EntityExtractor()
        self.scorer = KeywordScorer()
        self.clusterer = None  # Lazy load (heavy)
        self.brief_generator = BriefGenerator()
        self.calendar_generator = ContentCalendarGenerator()

        # Stats and checkpoint (initialized per run)
        self.stats = None
        self.quota_tracker = None
        self.checkpoint_manager = None
    
    def run_full_pipeline(self,
                         project_name: str,
                         seeds: List[str],
                         geo: str = "US",
                         language: str = "en",
                         content_focus: str = "informational",
                         business_url: Optional[str] = None,
                         competitors: Optional[List[str]] = None,
                         resume: bool = False) -> int:
        """
        Run the complete keyword research pipeline.

        Args:
            resume: If True, resume from last checkpoint

        Returns: project_id
        """

        print(f"\n🚀 Starting keyword research for: {project_name}")
        print(f"   Seeds: {len(seeds)}")
        print(f"   Geo: {geo}, Language: {language}")
        print(f"   Focus: {content_focus}\n")

        # Initialize stats tracking
        self.stats = PipelineStats()

        # Initialize database
        init_db()

        # Create project
        with get_db() as db:
            project = Project(
                name=project_name,
                business_url=business_url,
                seed_terms=seeds,
                geo=geo,
                language=language,
                competitors=competitors or [],
                content_focus=content_focus
            )
            db.add(project)
            db.flush()
            project_id = project.id

        print(f"✓ Created project (ID: {project_id})\n")

        # Initialize checkpoint manager
        self.checkpoint_manager = CheckpointManager(project_id)
        self.checkpoint_manager.save_checkpoint('created')
        
        # Step 1: Keyword Expansion
        self.stats.start_stage('expansion')
        print("=" * 80)
        print("STEP 1: KEYWORD EXPANSION")
        print("=" * 80)

        expanded_keywords = self.expander.expand_seeds(
            seeds, geo, language, content_focus,
            include_paa=True,
            include_related=True
        )

        self.stats.keywords_processed = len(expanded_keywords)
        self.checkpoint_manager.save_checkpoint('expansion', {
            'keywords_count': len(expanded_keywords)
        })
        self.stats.end_stage()

        # Step 2: Metrics Collection
        self.stats.start_stage('metrics')
        print("=" * 80)
        print("STEP 2: METRICS COLLECTION")
        print("=" * 80)

        keyword_data = self._collect_metrics(
            expanded_keywords[:500],  # Limit for MVP
            geo, language, project_id
        )

        self.checkpoint_manager.save_checkpoint('metrics')
        self.stats.end_stage()

        # Step 3: Processing & Scoring
        self.stats.start_stage('processing')
        print("\n" + "=" * 80)
        print("STEP 3: PROCESSING & SCORING")
        print("=" * 80)

        processed_keywords = self._process_and_score(
            keyword_data, content_focus
        )

        self.checkpoint_manager.save_checkpoint('scoring')
        self.stats.end_stage()

        # Step 4: Clustering
        self.stats.start_stage('clustering')
        print("\n" + "=" * 80)
        print("STEP 4: CLUSTERING")
        print("=" * 80)

        topics, page_groups = self._cluster_keywords(
            processed_keywords, project_id
        )

        self.checkpoint_manager.save_checkpoint('clustering')
        self.stats.end_stage()

        # Step 5: Brief Generation
        self.stats.start_stage('briefs')
        print("\n" + "=" * 80)
        print("STEP 5: BRIEF GENERATION")
        print("=" * 80)

        briefs = self._generate_briefs(
            page_groups, processed_keywords, project_id
        )

        self.checkpoint_manager.save_checkpoint('briefs')
        self.stats.end_stage()

        # Step 6: Save to Database
        print("\n" + "=" * 80)
        print("STEP 6: SAVING TO DATABASE")
        print("=" * 80)

        self._save_to_database(
            project_id, processed_keywords, topics, page_groups, briefs
        )

        self.checkpoint_manager.save_checkpoint('completed')

        print(f"\n✅ Pipeline complete! Project ID: {project_id}")

        # Print summary
        quota_limits = {
            'serpapi': 5000,  # Adjust based on your plan
            'trends': None    # Usually unlimited
        }
        self.stats.print_summary(quota_limits)

        return project_id
    
    def _collect_metrics(self,
                        keywords: List[str],
                        geo: str,
                        language: str,
                        project_id: int) -> List[Dict]:
        """Collect metrics for keywords."""
        
        keyword_data = []
        
        print(f"Collecting SERP data for {len(keywords)} keywords...")
        
        for keyword in tqdm(keywords, desc="SERP metrics"):
            try:
                # Get SERP metrics
                serp_metrics = self.serp_client.extract_serp_metrics(
                    keyword, geo, language
                )
                
                # Store SERP snapshot
                with get_db() as db:
                    snapshot = SerpSnapshot(
                        project_id=project_id,
                        query=keyword,
                        geo=geo,
                        language=language,
                        results=serp_metrics.get('organic_results', []),
                        features=serp_metrics.get('features', []),
                        ads_count=serp_metrics.get('ads_count', 0),
                        map_pack_present=serp_metrics.get('map_pack_present', False),
                        raw_json=str(serp_metrics.get('raw_data', {})),
                        provider='serpapi'
                    )
                    db.add(snapshot)
                
                data = {
                    'keyword': keyword,
                    'serp_metrics': serp_metrics,
                    'volume': 0,  # Placeholder (would use Google Ads API)
                    'cpc': 0.0     # Placeholder
                }
                
                keyword_data.append(data)
                
            except Exception as e:
                print(f"  Error for '{keyword}': {e}")
                continue
        
        # Get trend data (in batches of 5)
        print(f"\nCollecting trend data...")
        for i in range(0, len(keyword_data), 5):
            batch = keyword_data[i:i+5]
            batch_keywords = [kw['keyword'] for kw in batch]
            
            try:
                # Get trends
                for kw_data in batch:
                    trend_analysis = self.trends_client.analyze_trend_direction(
                        kw_data['keyword'], geo
                    )
                    kw_data['trend'] = trend_analysis
            except Exception as e:
                print(f"  Trend error: {e}")
        
        print(f"\n✓ Collected metrics for {len(keyword_data)} keywords")
        
        return keyword_data
    
    def _process_and_score(self,
                          keyword_data: List[Dict],
                          content_focus: str) -> List[Dict]:
        """Process and score keywords."""
        
        processed = []
        
        print("Processing keywords...")
        
        for data in tqdm(keyword_data, desc="Processing"):
            keyword = data['keyword']
            
            # Normalize
            normalized = self.normalizer.normalize(keyword)
            lemma = self.normalizer.lemmatize(keyword)
            
            # Classify intent
            intent_result = self.intent_classifier.classify_with_confidence(keyword)
            intent = intent_result['intent']
            
            # Extract entities
            entities = self.entity_extractor.extract_entities(keyword)
            
            # Score difficulty (with components)
            serp_metrics = data.get('serp_metrics', {})
            difficulty_result = self.scorer.calculate_difficulty(
                serp_metrics, keyword, return_components=True
            )

            # Extract difficulty score and components
            if isinstance(difficulty_result, dict):
                difficulty = difficulty_result['difficulty']
                difficulty_components = {
                    'serp_strength': difficulty_result['serp_strength'],
                    'competition': difficulty_result['competition'],
                    'crowding': difficulty_result['crowding'],
                    'content_depth': difficulty_result['content_depth']
                }
            else:
                # Backward compatibility if components not available
                difficulty = difficulty_result
                difficulty_components = {
                    'serp_strength': 0.5,
                    'competition': 0.5,
                    'crowding': 0.5,
                    'content_depth': 0.5
                }

            # Calculate traffic potential
            volume = data.get('volume', 0)
            features = serp_metrics.get('features', [])
            traffic_potential = self.scorer.calculate_traffic_potential(
                volume, intent, features, target_rank=3
            )

            # Calculate opportunity
            cpc = data.get('cpc', 0.0)
            opportunity = self.scorer.calculate_opportunity(
                traffic_potential, difficulty, cpc, intent, content_focus, features
            )
            
            # Get trend direction
            trend = data.get('trend', {})
            
            processed_kw = {
                'keyword': keyword,
                'normalized': normalized,
                'lemma': lemma,
                'intent': intent,
                'intent_confidence': intent_result.get('confidence', 0),
                'entities': entities,
                'volume': volume,
                'cpc': cpc,
                'difficulty_components': difficulty_components,
                'difficulty': difficulty,
                'traffic_potential': traffic_potential,
                'opportunity': opportunity,
                'serp_features': features,
                'ads_density': serp_metrics.get('ads_density', 0),
                'trend_direction': trend.get('direction', 'unknown'),
                'trend_data': trend.get('data', []),
                'is_question': self.intent_classifier.is_question(keyword),
                'serp_metrics': serp_metrics
            }
            
            processed.append(processed_kw)
        
        print(f"✓ Processed {len(processed)} keywords")
        
        return processed
    
    def _cluster_keywords(self,
                         keywords: List[Dict],
                         project_id: int) -> tuple:
        """Cluster keywords into topics and page groups."""
        
        if self.clusterer is None:
            self.clusterer = KeywordClusterer()
        
        keyword_texts = [kw['keyword'] for kw in keywords]
        
        print("Clustering into topics...")
        topic_clusters = self.clusterer.cluster_topics(keyword_texts)
        
        print(f"✓ Created {len(topic_clusters)} topic clusters")
        
        topics = []
        all_page_groups = []
        
        for topic_cluster in tqdm(topic_clusters, desc="Processing topics"):
            topic_keywords = [keywords[i] for i in topic_cluster]
            topic_texts = [keywords[i]['keyword'] for i in topic_cluster]
            
            # Select pillar keyword
            pillar_idx = self.clusterer.select_pillar_keyword(
                topic_texts, topic_keywords
            )
            
            # Cluster into page groups
            page_clusters = self.clusterer.cluster_pages(topic_texts)
            
            # Build topic data
            topic_data = {
                'label': topic_keywords[pillar_idx]['keyword'],
                'pillar_keyword': topic_keywords[pillar_idx],
                'keywords': topic_keywords,
                'total_volume': sum(kw.get('volume', 0) for kw in topic_keywords),
                'total_opportunity': sum(kw.get('opportunity', 0) for kw in topic_keywords),
                'avg_difficulty': sum(kw.get('difficulty', 0) for kw in topic_keywords) / len(topic_keywords),
                'page_groups': []
            }
            
            # Process page groups
            for page_cluster in page_clusters:
                page_keywords = [topic_keywords[i] for i in page_cluster]
                page_texts = [topic_keywords[i]['keyword'] for i in page_cluster]
                
                # Select target keyword
                target_idx = self.clusterer.select_pillar_keyword(
                    page_texts, page_keywords
                )
                
                page_group = {
                    'label': page_keywords[target_idx]['keyword'],
                    'target_keyword': page_keywords[target_idx],
                    'keywords': page_keywords,
                    'total_volume': sum(kw.get('volume', 0) for kw in page_keywords),
                    'total_opportunity': sum(kw.get('opportunity', 0) for kw in page_keywords),
                    'intent': page_keywords[target_idx].get('intent', 'informational')
                }
                
                topic_data['page_groups'].append(page_group)
                all_page_groups.append(page_group)
            
            topics.append(topic_data)
        
        print(f"✓ Created {len(all_page_groups)} page groups across {len(topics)} topics")
        
        return topics, all_page_groups
    
    def _generate_briefs(self,
                        page_groups: List[Dict],
                        all_keywords: List[Dict],
                        project_id: int) -> List[Dict]:
        """Generate content briefs for page groups."""
        
        briefs = []
        
        print(f"Generating briefs for {len(page_groups)} page groups...")
        
        for page_group in tqdm(page_groups[:50], desc="Briefs"):  # Limit for MVP
            keywords = page_group['keywords']
            target_kw = page_group['target_keyword']
            
            # Get SERP data for keywords
            serp_data = [kw.get('serp_metrics', {}) for kw in keywords]
            
            # Generate brief
            brief = self.brief_generator.generate_brief(
                page_group_keywords=[kw['keyword'] for kw in keywords],
                keyword_data=keywords,
                serp_data=serp_data,
                target_keyword=target_kw['keyword'],
                intent=page_group['intent']
            )
            
            brief['page_group_label'] = page_group['label']
            brief['total_opportunity'] = page_group['total_opportunity']
            
            briefs.append(brief)
        
        print(f"✓ Generated {len(briefs)} content briefs")
        
        return briefs
    
    def _save_to_database(self,
                         project_id: int,
                         keywords: List[Dict],
                         topics: List[Dict],
                         page_groups: List[Dict],
                         briefs: List[Dict]):
        """Save all data to database."""
        
        print("Saving to database...")
        
        with get_db() as db:
            # Save keywords
            for kw_data in keywords:
                keyword = Keyword(
                    project_id=project_id,
                    text=kw_data['keyword'],
                    lemma=kw_data['lemma'],
                    language='en',
                    volume=kw_data.get('volume', 0),
                    cpc=kw_data.get('cpc', 0.0),
                    intent=kw_data['intent'],
                    entities=kw_data.get('entities', {}),
                    difficulty=kw_data['difficulty'],
                    traffic_potential=kw_data['traffic_potential'],
                    opportunity=kw_data['opportunity'],
                    serp_features=kw_data.get('serp_features', []),
                    ads_density=kw_data.get('ads_density', 0),
                    trend_data=kw_data.get('trend_data', []),
                    trend_direction=kw_data.get('trend_direction', 'unknown'),
                    source='expansion'
                )
                db.add(keyword)
            
            # Save topics (simplified - full implementation would link keywords)
            for topic_data in topics:
                topic = Topic(
                    project_id=project_id,
                    label=topic_data['label'],
                    total_volume=topic_data['total_volume'],
                    total_opportunity=topic_data['total_opportunity'],
                    avg_difficulty=topic_data['avg_difficulty']
                )
                db.add(topic)
            
            # Save page groups with briefs
            for i, page_group in enumerate(page_groups):
                brief = briefs[i] if i < len(briefs) else {}
                
                pg = PageGroup(
                    project_id=project_id,
                    label=page_group['label'],
                    outline=brief.get('outline', []),
                    faqs=brief.get('faqs', []),
                    schema_types=brief.get('schema_types', []),
                    internal_links=brief.get('internal_links', {}),
                    serp_features_target=brief.get('serp_features_target', []),
                    word_range=brief.get('word_range', '1500-2000'),
                    total_volume=page_group['total_volume'],
                    total_opportunity=page_group['total_opportunity']
                )
                db.add(pg)
        
        print(f"✓ Saved to database")
