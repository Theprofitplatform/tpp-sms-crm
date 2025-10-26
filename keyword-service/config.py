"""Configuration management for keyword research tool."""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""
    
    # Google Ads API
    google_ads_client_id: Optional[str] = None
    google_ads_client_secret: Optional[str] = None
    google_ads_developer_token: Optional[str] = None
    google_ads_refresh_token: Optional[str] = None
    google_ads_customer_id: Optional[str] = None
    
    # Google APIs
    google_oauth_client_id: Optional[str] = None
    google_oauth_client_secret: Optional[str] = None
    google_oauth_refresh_token: Optional[str] = None
    
    # SERP API
    serpapi_api_key: Optional[str] = None
    zenserp_api_key: Optional[str] = None
    dataforseo_login: Optional[str] = None
    dataforseo_password: Optional[str] = None
    serp_provider: str = "serpapi"
    
    # Search Console
    search_console_property_url: Optional[str] = None
    
    # Notion
    notion_api_key: Optional[str] = None
    notion_database_id: Optional[str] = None
    
    # WordPress
    wordpress_url: Optional[str] = None
    wordpress_username: Optional[str] = None
    wordpress_app_password: Optional[str] = None
    
    # Infrastructure
    redis_url: str = "redis://localhost:6379/0"
    database_url: str = "sqlite:///./keyword_research.db"
    
    # Rate Limits (requests per minute)
    google_ads_rpm: int = 60
    serp_api_rpm: int = 30
    autosuggest_rpm: int = 20
    
    # Clustering thresholds
    topic_cluster_threshold: float = 0.78
    page_group_threshold: float = 0.88
    sibling_link_threshold: float = 0.90
    
    # Defaults
    default_language: str = "en"
    default_geo: str = "US"
    default_target_rank: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
