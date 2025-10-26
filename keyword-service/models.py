"""Database models for keyword research tool."""
from sqlalchemy import (
    Column, Integer, String, Float, JSON, Text, DateTime, 
    ForeignKey, Boolean, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Project(Base):
    """Project entity storing settings and configuration."""
    __tablename__ = 'projects'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    business_url = Column(String(500))
    seed_terms = Column(JSON)  # List of seed keywords
    geo = Column(String(10))  # e.g., US, AU, UK
    language = Column(String(10))  # e.g., en, es
    competitors = Column(JSON)  # List of competitor URLs
    content_focus = Column(String(50))  # info, commercial, local, transactional
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    settings = Column(JSON)  # Additional settings

    # Pipeline checkpoint for resume functionality
    last_checkpoint = Column(String(50))  # Stage name: expansion, metrics, processing, clustering, briefs
    checkpoint_timestamp = Column(DateTime)
    checkpoint_data = Column(JSON)  # Additional checkpoint state
    
    # Relationships
    keywords = relationship("Keyword", back_populates="project", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="project", cascade="all, delete-orphan")
    page_groups = relationship("PageGroup", back_populates="project", cascade="all, delete-orphan")
    serp_snapshots = relationship("SerpSnapshot", back_populates="project", cascade="all, delete-orphan")


class Keyword(Base):
    """Keyword entity with all metrics and classifications."""
    __tablename__ = 'keywords'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    text = Column(String(500), nullable=False)
    lemma = Column(String(500))  # Normalized form
    language = Column(String(10))
    
    # Metrics
    volume = Column(Integer)  # Monthly search volume
    cpc = Column(Float)  # Cost per click
    trend_data = Column(JSON)  # Time series from Google Trends
    trend_direction = Column(String(20))  # rising, stable, declining
    
    # SERP features
    serp_features = Column(JSON)  # List of features present
    ads_density = Column(Float)  # 0-1 scale
    
    # Classification
    intent = Column(String(50))  # informational, commercial, transactional, navigational, local
    entities = Column(JSON)  # Extracted entities
    
    # Scoring
    difficulty = Column(Float)  # 0-100
    difficulty_serp_strength = Column(Float)  # Component breakdown
    difficulty_competition = Column(Float)  # Component breakdown
    difficulty_serp_crowding = Column(Float)  # Component breakdown
    difficulty_content_depth = Column(Float)  # Component breakdown
    traffic_potential = Column(Float)
    opportunity = Column(Float)
    
    # Clustering
    topic_id = Column(Integer, ForeignKey('topics.id'))
    page_group_id = Column(Integer, ForeignKey('page_groups.id'))
    is_pillar = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    source = Column(String(100))  # seed, autosuggest, paa, competitor, etc.
    notes = Column(Text)
    
    # Relationships
    project = relationship("Project", back_populates="keywords")
    topic = relationship("Topic", back_populates="keywords", foreign_keys=[topic_id])
    page_group = relationship("PageGroup", back_populates="keywords", foreign_keys=[page_group_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_project_opportunity', 'project_id', 'opportunity'),
        Index('idx_project_intent', 'project_id', 'intent'),
        Index('idx_lemma', 'lemma'),
    )


class SerpSnapshot(Base):
    """SERP snapshot for reproducibility and analysis."""
    __tablename__ = 'serp_snapshots'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    query = Column(String(500), nullable=False)
    geo = Column(String(10))
    language = Column(String(10))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # SERP data
    results = Column(JSON)  # Top 10 results with titles, URLs, snippets
    features = Column(JSON)  # Featured snippets, PAA, videos, images, etc.
    ads_count = Column(Integer)
    map_pack_present = Column(Boolean)
    
    # Raw response
    raw_json = Column(Text)  # Full provider response
    provider = Column(String(50))
    request_id = Column(String(100))
    
    # Relationships
    project = relationship("Project", back_populates="serp_snapshots")
    
    # Indexes
    __table_args__ = (
        Index('idx_query_geo_lang', 'query', 'geo', 'language'),
    )


class Topic(Base):
    """Topic cluster grouping related keywords."""
    __tablename__ = 'topics'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    label = Column(String(255))
    pillar_keyword_id = Column(Integer, ForeignKey('keywords.id'))
    
    # Metrics
    total_volume = Column(Integer)
    total_opportunity = Column(Float)
    avg_difficulty = Column(Float)
    
    # Graph
    graph_data = Column(JSON)  # Hub-cluster structure
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="topics")
    keywords = relationship("Keyword", back_populates="topic", foreign_keys=[Keyword.topic_id])


class PageGroup(Base):
    """Page group within a topic for single-page targeting."""
    __tablename__ = 'page_groups'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    topic_id = Column(Integer, ForeignKey('topics.id'))
    label = Column(String(255))
    target_keyword_id = Column(Integer, ForeignKey('keywords.id'))
    
    # Brief data
    outline = Column(JSON)  # H2/H3 structure
    faqs = Column(JSON)  # List of questions and answers
    schema_types = Column(JSON)  # Recommended schema.org types
    internal_links = Column(JSON)  # Hub/spoke links
    serp_features_target = Column(JSON)  # Features to optimize for
    word_range = Column(String(50))  # e.g., "1500-2000"
    
    # Metrics
    total_volume = Column(Integer)
    total_opportunity = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="page_groups")
    keywords = relationship("Keyword", back_populates="page_group", foreign_keys=[Keyword.page_group_id])


class AuditLog(Base):
    """Audit trail for data sources and operations."""
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'))
    timestamp = Column(DateTime, default=datetime.utcnow)
    operation = Column(String(100))  # expansion, metrics_fetch, clustering, etc.
    data_source = Column(String(100))  # google_ads, serpapi, trends, etc.
    request_id = Column(String(100))
    quota_used = Column(Integer)
    status = Column(String(50))  # success, error, partial
    error_message = Column(Text)
    audit_metadata = Column(JSON)


class Cache(Base):
    """Cache for API responses."""
    __tablename__ = 'cache'
    
    id = Column(Integer, primary_key=True)
    cache_key = Column(String(500), unique=True, nullable=False)
    value = Column(Text)  # JSON serialized
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_cache_key_expires', 'cache_key', 'expires_at'),
    )
