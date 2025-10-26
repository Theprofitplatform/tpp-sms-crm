#!/usr/bin/env python3
"""Command-line interface for keyword research tool."""
import click
import json
from datetime import datetime
from pathlib import Path

from database import get_db, init_db
from models import Project, Keyword, PageGroup
from orchestrator import KeywordResearchOrchestrator
from reporting import ContentCalendarGenerator
from exports.csv_export import CSVExporter
from exports.sheets_export import SheetsExporter
from exports.notion_export import NotionExporter
from config import settings


@click.group()
def cli():
    """Keyword Research & Content Planning Tool"""
    pass


@cli.command()
@click.option('--name', prompt='Project name', help='Name of the project')
@click.option('--seeds', prompt='Seed keywords (comma-separated)', help='Seed keywords')
@click.option('--geo', default='US', help='Geographic location (e.g., US, AU, UK)')
@click.option('--language', default='en', help='Language code (e.g., en, es)')
@click.option('--focus', type=click.Choice(['informational', 'commercial', 'transactional', 'local']),
              default='informational', help='Content focus')
@click.option('--url', help='Business URL')
@click.option('--competitors', help='Competitor URLs (comma-separated)')
@click.option('--resume', is_flag=True, help='Resume from last checkpoint')
def create(name, seeds, geo, language, focus, url, competitors, resume):
    """Create a new keyword research project."""
    
    # Parse inputs
    seed_list = [s.strip() for s in seeds.split(',')]
    competitor_list = [c.strip() for c in competitors.split(',')] if competitors else []
    
    click.echo(f"\n🚀 Creating project: {name}")
    click.echo(f"   Seeds: {len(seed_list)}")
    click.echo(f"   Focus: {focus}")
    
    # Run pipeline
    orchestrator = KeywordResearchOrchestrator()
    
    try:
        project_id = orchestrator.run_full_pipeline(
            project_name=name,
            seeds=seed_list,
            geo=geo,
            language=language,
            content_focus=focus,
            business_url=url,
            competitors=competitor_list,
            resume=resume
        )
        
        click.echo(f"\n✅ Project created successfully! ID: {project_id}")
        click.echo(f"\nNext steps:")
        click.echo(f"  1. View report:   python cli.py report {project_id}")
        click.echo(f"  2. Export data:   python cli.py export {project_id}")
        click.echo(f"  3. List projects: python cli.py list")
        
    except Exception as e:
        click.echo(f"\n❌ Error: {e}", err=True)
        raise


@cli.command()
def list():
    """List all projects."""
    
    init_db()
    
    with get_db() as db:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
        
        if not projects:
            click.echo("No projects found. Create one with: python cli.py create")
            return
        
        click.echo("\n📁 Projects:")
        click.echo("=" * 80)
        
        for p in projects:
            click.echo(f"\nID: {p.id}")
            click.echo(f"Name: {p.name}")
            click.echo(f"Created: {p.created_at.strftime('%Y-%m-%d %H:%M')}")
            click.echo(f"Seeds: {len(p.seed_terms or [])}")
            click.echo(f"Geo: {p.geo}, Language: {p.language}")
            click.echo(f"Focus: {p.content_focus}")


@cli.command()
@click.argument('project_id', type=int)
def report(project_id):
    """Generate and display project report."""
    
    init_db()
    
    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            click.echo(f"Project {project_id} not found", err=True)
            return
        
        keywords = db.query(Keyword).filter(Keyword.project_id == project_id).all()
        
        # Convert to dicts
        keyword_dicts = [
            {
                'keyword': kw.text,
                'intent': kw.intent,
                'volume': kw.volume or 0,
                'difficulty': kw.difficulty or 0,
                'opportunity': kw.opportunity or 0,
                'serp_features': kw.serp_features or []
            }
            for kw in keywords
        ]
        
        project_dict = {
            'name': project.name,
            'id': project.id
        }
        
        # Generate report
        calendar_gen = ContentCalendarGenerator()
        report_data = calendar_gen.generate_report(
            project_dict,
            keyword_dicts,
            [],  # Topics
            []   # Page groups
        )
        
        calendar_gen.print_report(report_data)


@cli.command()
@click.argument('project_id', type=int)
@click.option('--format', type=click.Choice(['csv', 'sheets', 'notion']), 
              default='csv', help='Export format')
@click.option('--output', help='Output file path (for CSV)')
def export(project_id, format, output):
    """Export project data."""
    
    init_db()
    
    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            click.echo(f"Project {project_id} not found", err=True)
            return
        
        keywords = db.query(Keyword).filter(Keyword.project_id == project_id).all()
        page_groups = db.query(PageGroup).filter(PageGroup.project_id == project_id).all()
        
        # Convert to dicts
        keyword_dicts = [
            {
                'keyword': kw.text,
                'intent': kw.intent,
                'volume': kw.volume or 0,
                'cpc': kw.cpc or 0,
                'difficulty': kw.difficulty or 0,
                'traffic_potential': kw.traffic_potential or 0,
                'opportunity': kw.opportunity or 0,
                'trend_direction': kw.trend_direction or 'unknown',
                'serp_features': ', '.join(kw.serp_features or [])
            }
            for kw in keywords
        ]
        
        brief_dicts = [
            {
                'target_keyword': pg.label,
                'intent_summary': f"Focus on {pg.label}",
                'word_range': pg.word_range,
                'schema_types': pg.schema_types or [],
                'serp_features_target': pg.serp_features_target or [],
                'faqs': pg.faqs or [],
                'outline': pg.outline or []
            }
            for pg in page_groups
        ]
        
        # Export based on format
        if format == 'csv':
            if not output:
                output = f"{project.name.replace(' ', '_')}_keywords.csv"
            
            exporter = CSVExporter()
            exporter.export_keywords(keyword_dicts, output)
            
            # Also export briefs
            brief_output = output.replace('_keywords.csv', '_briefs.csv')
            exporter.export_briefs(brief_dicts, brief_output)
            
            # Generate calendar
            calendar_gen = ContentCalendarGenerator()
            calendar = calendar_gen.generate_calendar(
                [{'label': pg.label, 'total_opportunity': pg.total_opportunity or 0, 
                  'intent': 'informational', 'word_range': pg.word_range} 
                 for pg in page_groups]
            )
            
            calendar_output = output.replace('_keywords.csv', '_calendar.csv')
            exporter.export_content_calendar(calendar, calendar_output)
            
        elif format == 'sheets':
            if not settings.google_oauth_client_id:
                click.echo("Google Sheets export requires credentials. Set GOOGLE_APPLICATION_CREDENTIALS", err=True)
                return
            
            exporter = SheetsExporter()
            url = exporter.export_keywords(
                keyword_dicts,
                f"{project.name} - Keyword Research"
            )
            
            if url:
                click.echo(f"\n✓ Exported to Google Sheets: {url}")
        
        elif format == 'notion':
            if not settings.notion_api_key or not settings.notion_database_id:
                click.echo("Notion export requires NOTION_API_KEY and NOTION_DATABASE_ID", err=True)
                return
            
            exporter = NotionExporter(settings.notion_api_key)
            urls = exporter.export_briefs(settings.notion_database_id, brief_dicts)
            
            click.echo(f"\n✓ Exported {len(urls)} briefs to Notion")


@cli.command()
@click.argument('project_id', type=int)
@click.option('--weeks', default=12, help='Number of weeks')
@click.option('--posts-per-week', default=2, help='Posts per week')
def calendar(project_id, weeks, posts_per_week):
    """Generate content calendar."""
    
    init_db()
    
    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            click.echo(f"Project {project_id} not found", err=True)
            return
        
        page_groups = db.query(PageGroup).filter(PageGroup.project_id == project_id).all()
        
        page_group_dicts = [
            {
                'label': pg.label,
                'total_opportunity': pg.total_opportunity or 0,
                'intent': 'informational',
                'word_range': pg.word_range
            }
            for pg in page_groups
        ]
        
        calendar_gen = ContentCalendarGenerator()
        calendar = calendar_gen.generate_calendar(
            page_group_dicts,
            weeks=weeks,
            posts_per_week=posts_per_week
        )
        
        # Display
        click.echo(f"\n📅 {weeks}-Week Content Calendar")
        click.echo("=" * 80)
        
        for entry in calendar[:20]:  # Show first 20
            click.echo(f"\nWeek {entry['week']} - {entry['publish_date']}")
            click.echo(f"  Keyword: {entry['target_keyword']}")
            click.echo(f"  Priority: {entry['priority']}")
            click.echo(f"  Words: {entry['word_count']}")
        
        # Save to file
        output_file = f"{project.name.replace(' ', '_')}_calendar.csv"
        exporter = CSVExporter()
        exporter.export_content_calendar(calendar, output_file)


@cli.command()
def init():
    """Initialize database."""
    init_db()
    click.echo("✓ Database initialized")


if __name__ == '__main__':
    cli()
