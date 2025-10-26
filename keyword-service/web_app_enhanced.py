"""Enhanced Flask Web Interface with Real-time Updates for Keyword Research Tool"""
from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import threading
import os
from datetime import datetime
from database import get_db
from models import Project, Keyword, Topic, PageGroup, SerpSnapshot
from orchestrator import KeywordResearchOrchestrator
from exports.csv_export import CSVExporter
from sqlalchemy import func, desc

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'keyword-research-tool-secret-key-change-in-production'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store running jobs
running_jobs = {}


# ============================================================================
# WebSocket Event Handlers
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    print(f'Client disconnected: {request.sid}')

@socketio.on('subscribe_project')
def handle_subscribe_project(project_id):
    """Subscribe to project updates."""
    join_room(f'project_{project_id}')
    print(f'Client {request.sid} subscribed to project {project_id}')

@socketio.on('unsubscribe_project')
def handle_unsubscribe_project(project_id):
    """Unsubscribe from project updates."""
    leave_room(f'project_{project_id}')
    print(f'Client {request.sid} unsubscribed from project {project_id}')

@socketio.on('subscribe_job')
def handle_subscribe_job(job_id):
    """Subscribe to job updates."""
    join_room(f'job_{job_id}')
    print(f'Client {request.sid} subscribed to job {job_id}')

@socketio.on('unsubscribe_job')
def handle_unsubscribe_job(job_id):
    """Unsubscribe from job updates."""
    leave_room(f'job_{job_id}')
    print(f'Client {request.sid} unsubscribed from job {job_id}')


# ============================================================================
# HTML Routes (Legacy - for backward compatibility)
# ============================================================================

@app.route('/')
def index():
    """Home page - redirect to React app."""
    return render_template('index.html')

@app.route('/projects')
def projects_list():
    """List all projects page - legacy."""
    return render_template('projects.html')

@app.route('/project/<int:project_id>')
def project_details(project_id):
    """View project details page - legacy."""
    return render_template('project_details.html')


# ============================================================================
# API Routes - Projects
# ============================================================================

@app.route('/api/projects', methods=['GET'])
def api_projects_list():
    """Get all projects as JSON."""
    with get_db() as db:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
        project_data = []
        for p in projects:
            keyword_count = db.query(Keyword).filter(Keyword.project_id == p.id).count()
            total_volume = db.query(func.sum(Keyword.volume)).filter(Keyword.project_id == p.id).scalar() or 0
            avg_difficulty = db.query(func.avg(Keyword.difficulty)).filter(Keyword.project_id == p.id).scalar() or 0

            project_data.append({
                'id': p.id,
                'name': p.name,
                'created_at': p.created_at.isoformat() if p.created_at else None,
                'keyword_count': keyword_count,
                'total_volume': int(total_volume),
                'avg_difficulty': f"{avg_difficulty:.1f}" if avg_difficulty else "0.0",
                'geo': p.geo,
                'language': p.language,
                'focus': p.content_focus or 'any',
                'last_checkpoint': p.last_checkpoint or 'Not started',
                'checkpoint_time': p.checkpoint_timestamp.isoformat() if p.checkpoint_timestamp else None
            })
    return jsonify(project_data)

@app.route('/api/project/<int:project_id>', methods=['GET'])
def api_project_get(project_id):
    """Get single project details."""
    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        # Get aggregated stats
        keyword_count = db.query(Keyword).filter(Keyword.project_id == project_id).count()
        total_volume = db.query(func.sum(Keyword.volume)).filter(Keyword.project_id == project_id).scalar() or 0
        avg_difficulty = db.query(func.avg(Keyword.difficulty)).filter(Keyword.project_id == project_id).scalar() or 0

        # Get intent distribution
        intent_counts = db.query(
            Keyword.intent, func.count(Keyword.id)
        ).filter(
            Keyword.project_id == project_id
        ).group_by(Keyword.intent).all()

        intent_distribution = {intent: count for intent, count in intent_counts if intent}

        project_data = {
            'id': project.id,
            'name': project.name,
            'created_at': project.created_at.isoformat() if project.created_at else None,
            'geo': project.geo,
            'language': project.language,
            'focus': project.content_focus or 'any',
            'keyword_count': keyword_count,
            'total_volume': int(total_volume),
            'avg_difficulty': f"{avg_difficulty:.1f}" if avg_difficulty else "0.0",
            'last_checkpoint': project.last_checkpoint or 'Not started',
            'checkpoint_time': project.checkpoint_timestamp.isoformat() if project.checkpoint_timestamp else None,
            'intent_distribution': intent_distribution
        }

    return jsonify(project_data)

@app.route('/api/project/<int:project_id>', methods=['DELETE'])
def api_project_delete(project_id):
    """Delete a project."""
    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        db.delete(project)
        db.commit()

    return jsonify({'success': True, 'message': 'Project deleted successfully'})


# ============================================================================
# API Routes - Keywords
# ============================================================================

@app.route('/api/project/<int:project_id>/keywords', methods=['GET'])
def api_keywords_list(project_id):
    """Get keywords for a project with optional filtering."""
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    intent_filter = request.args.get('intent', None)
    min_volume = request.args.get('min_volume', None, type=int)
    max_difficulty = request.args.get('max_difficulty', None, type=float)
    search = request.args.get('search', None)

    with get_db() as db:
        query = db.query(Keyword).filter(Keyword.project_id == project_id)

        # Apply filters
        if intent_filter:
            query = query.filter(Keyword.intent == intent_filter)
        if min_volume:
            query = query.filter(Keyword.volume >= min_volume)
        if max_difficulty:
            query = query.filter(Keyword.difficulty <= max_difficulty)
        if search:
            query = query.filter(Keyword.text.ilike(f'%{search}%'))

        # Get total count
        total = query.count()

        # Apply pagination and ordering
        keywords = query.order_by(desc(Keyword.opportunity)).offset(offset).limit(limit).all()

        keyword_data = []
        for kw in keywords:
            keyword_data.append({
                'id': kw.id,
                'text': kw.text,
                'intent': kw.intent or 'unknown',
                'volume': kw.volume or 0,
                'cpc': float(kw.cpc) if kw.cpc else 0,
                'difficulty': float(kw.difficulty) if kw.difficulty else 0,
                'opportunity': float(kw.opportunity) if kw.opportunity else 0,
                'traffic_potential': kw.traffic_potential or 0,
                'trend_direction': kw.trend_direction,
                'serp_features': kw.serp_features or [],
                'entities': kw.entities or [],
                'topic_id': kw.topic_id,
                'page_group_id': kw.page_group_id
            })

    return jsonify({
        'keywords': keyword_data,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/api/keyword/<int:keyword_id>', methods=['GET'])
def api_keyword_get(keyword_id):
    """Get single keyword details."""
    with get_db() as db:
        keyword = db.query(Keyword).filter(Keyword.id == keyword_id).first()
        if not keyword:
            return jsonify({'error': 'Keyword not found'}), 404

        keyword_data = {
            'id': keyword.id,
            'text': keyword.text,
            'intent': keyword.intent,
            'volume': keyword.volume,
            'cpc': float(keyword.cpc) if keyword.cpc else None,
            'difficulty': float(keyword.difficulty) if keyword.difficulty else None,
            'opportunity': float(keyword.opportunity) if keyword.opportunity else None,
            'traffic_potential': keyword.traffic_potential,
            'serp_features': keyword.serp_features,
            'entities': keyword.entities,
            'topic_id': keyword.topic_id,
            'page_group_id': keyword.page_group_id
        }

    return jsonify(keyword_data)


# ============================================================================
# API Routes - Analytics
# ============================================================================

@app.route('/api/project/<int:project_id>/analytics/overview', methods=['GET'])
def api_analytics_overview(project_id):
    """Get comprehensive analytics overview."""
    with get_db() as db:
        # This would be expanded with real analytics calculations
        # For now, return basic structure
        return jsonify({
            'intent_distribution': [],
            'difficulty_volume': [],
            'opportunity_funnel': [],
            'traffic_timeline': []
        })

@app.route('/api/project/<int:project_id>/analytics/intent-distribution', methods=['GET'])
def api_analytics_intent_distribution(project_id):
    """Get intent distribution data."""
    with get_db() as db:
        intent_counts = db.query(
            Keyword.intent, func.count(Keyword.id)
        ).filter(
            Keyword.project_id == project_id
        ).group_by(Keyword.intent).all()

        color_map = {
            'informational': '#3B82F6',
            'commercial': '#EAB308',
            'transactional': '#10B981',
            'navigational': '#8B5CF6',
            'local': '#F97316'
        }

        data = []
        for intent, count in intent_counts:
            if intent:
                data.append({
                    'name': intent,
                    'value': count,
                    'color': color_map.get(intent, '#6B7280')
                })

    return jsonify(data)

@app.route('/api/project/<int:project_id>/analytics/difficulty-volume', methods=['GET'])
def api_analytics_difficulty_volume(project_id):
    """Get difficulty vs volume scatter plot data."""
    with get_db() as db:
        keywords = db.query(Keyword).filter(
            Keyword.project_id == project_id
        ).order_by(desc(Keyword.opportunity)).limit(100).all()

        data = []
        for kw in keywords:
            data.append({
                'keyword': kw.text,
                'volume': kw.volume or 0,
                'difficulty': float(kw.difficulty) if kw.difficulty else 0,
                'opportunity': float(kw.opportunity) if kw.opportunity else 0,
                'intent': kw.intent or 'unknown'
            })

    return jsonify(data)


# ============================================================================
# API Routes - Topics & Page Groups
# ============================================================================

@app.route('/api/project/<int:project_id>/topics', methods=['GET'])
def api_topics_list(project_id):
    """Get all topics for a project."""
    with get_db() as db:
        topics = db.query(Topic).filter(Topic.project_id == project_id).all()

        topic_data = []
        for topic in topics:
            keyword_count = db.query(Keyword).filter(Keyword.topic_id == topic.id).count()
            topic_data.append({
                'id': topic.id,
                'label': topic.label,
                'total_volume': topic.total_volume or 0,
                'total_opportunity': float(topic.total_opportunity) if topic.total_opportunity else 0,
                'avg_difficulty': float(topic.avg_difficulty) if topic.avg_difficulty else 0,
                'keyword_count': keyword_count
            })

    return jsonify(topic_data)

@app.route('/api/project/<int:project_id>/page-groups', methods=['GET'])
def api_page_groups_list(project_id):
    """Get all page groups for a project."""
    with get_db() as db:
        page_groups = db.query(PageGroup).filter(PageGroup.project_id == project_id).all()

        group_data = []
        for group in page_groups:
            keyword_count = db.query(Keyword).filter(Keyword.page_group_id == group.id).count()
            group_data.append({
                'id': group.id,
                'label': group.label,
                'total_volume': group.total_volume or 0,
                'total_opportunity': float(group.total_opportunity) if group.total_opportunity else 0,
                'keyword_count': keyword_count,
                'outline': group.outline or [],
                'faqs': group.faqs or [],
                'word_range': group.word_range
            })

    return jsonify(group_data)


# ============================================================================
# API Routes - SERP Analysis
# ============================================================================

@app.route('/api/project/<int:project_id>/serp-analysis', methods=['GET'])
def api_serp_analysis(project_id):
    """Get SERP analysis for project."""
    with get_db() as db:
        # Get top domains from SERP snapshots
        # This is a simplified version - would be more complex in production
        serp_snapshots = db.query(SerpSnapshot).filter(
            SerpSnapshot.project_id == project_id
        ).limit(100).all()

        # Mock data for now
        data = {
            'top_domains': [],
            'serp_features': [],
            'competitor_presence': []
        }

    return jsonify(data)


# ============================================================================
# API Routes - System & Monitoring
# ============================================================================

@app.route('/api/system-health', methods=['GET'])
def api_system_health():
    """Get system health metrics."""
    # Mock data - would connect to real monitoring in production
    return jsonify({
        'api_quota': {
            'serpapi': {'used': 150, 'limit': 5000, 'percentage': 3.0}
        },
        'api_latency': [],
        'cache_hit_rate': 85.5,
        'active_jobs': len([j for j in running_jobs.values() if j['status'] == 'running'])
    })

@app.route('/api/quota-usage', methods=['GET'])
def api_quota_usage():
    """Get API quota usage."""
    return jsonify({
        'serpapi': {'used': 150, 'limit': 5000, 'percentage': 3.0}
    })

@app.route('/api/audit-logs', methods=['GET'])
def api_audit_logs():
    """Get audit logs."""
    limit = request.args.get('limit', 100, type=int)
    provider = request.args.get('provider', None)

    # Mock data - would query AuditLog model in production
    return jsonify([])


# ============================================================================
# API Routes - Project Creation & Jobs
# ============================================================================

@app.route('/api/create', methods=['POST'])
def api_create_project():
    """Create a new project (async with real-time updates)."""
    data = request.json

    name = data.get('name')
    seeds = data.get('seeds', '')
    geo = data.get('geo', 'US')
    language = data.get('language', 'en')
    focus = data.get('focus', None)

    if not name or not seeds:
        return jsonify({'error': 'Name and seeds are required'}), 400

    # Parse seeds - handle both string and list input
    if isinstance(seeds, list):
        seed_list = [s.strip() for s in seeds if s.strip()]
    else:
        seed_list = [s.strip() for s in seeds.replace('\n', ',').split(',') if s.strip()]

    if not seed_list:
        return jsonify({'error': 'At least one seed keyword is required'}), 400

    # Generate job ID
    import random
    job_id = f"job_{int(datetime.now().timestamp())}_{random.randint(1000, 9999)}"

    # Store job info
    running_jobs[job_id] = {
        'status': 'running',
        'start_time': datetime.now(),
        'name': name,
        'project_id': None,
        'last_checkpoint': 'starting'
    }

    def run_project():
        """Run project in background thread with real-time updates."""
        project_id = None
        try:
            orchestrator = KeywordResearchOrchestrator()

            # Emit updates periodically
            def emit_progress(checkpoint, message=''):
                running_jobs[job_id]['last_checkpoint'] = checkpoint
                socketio.emit(f'job_{job_id}_update', {
                    'job_id': job_id,
                    'status': 'running',
                    'last_checkpoint': checkpoint,
                    'message': message
                }, room=f'job_{job_id}')

            # Run pipeline
            emit_progress('expansion', 'Expanding keywords...')
            project_id = orchestrator.run_full_pipeline(
                project_name=name,
                seeds=seed_list,
                geo=geo,
                language=language,
                content_focus=focus if focus and focus != 'any' else 'informational'
            )

            # Update job status
            running_jobs[job_id]['project_id'] = project_id
            running_jobs[job_id]['status'] = 'completed'
            running_jobs[job_id]['end_time'] = datetime.now()

            # Emit completion
            socketio.emit(f'job_{job_id}_update', {
                'job_id': job_id,
                'status': 'completed',
                'project_id': project_id,
                'last_checkpoint': 'completed'
            }, room=f'job_{job_id}')

        except Exception as e:
            running_jobs[job_id]['status'] = 'failed'
            running_jobs[job_id]['error'] = str(e)
            if project_id:
                running_jobs[job_id]['project_id'] = project_id

            # Emit error
            socketio.emit(f'job_{job_id}_update', {
                'job_id': job_id,
                'status': 'failed',
                'error': str(e)
            }, room=f'job_{job_id}')

    thread = threading.Thread(target=run_project)
    thread.daemon = True
    thread.start()

    return jsonify({
        'success': True,
        'job_id': job_id,
        'message': f'Project "{name}" processing started.'
    })

@app.route('/api/job/<job_id>/status', methods=['GET'])
def api_job_status(job_id):
    """Get job processing status."""
    job = running_jobs.get(job_id, {})
    if not job:
        return jsonify({'error': 'Job not found'}), 404

    response = {
        'job_id': job_id,
        'name': job.get('name'),
        'status': job.get('status', 'unknown'),
        'start_time': job.get('start_time').isoformat() if job.get('start_time') else None,
        'end_time': job.get('end_time').isoformat() if job.get('end_time') else None,
        'project_id': job.get('project_id'),
        'error': job.get('error'),
        'last_checkpoint': job.get('last_checkpoint')
    }

    # Get checkpoint info from project if available
    if job.get('project_id'):
        with get_db() as db:
            project = db.query(Project).filter(Project.id == job['project_id']).first()
            if project:
                response['last_checkpoint'] = project.last_checkpoint
                response['checkpoint_time'] = project.checkpoint_timestamp.isoformat() if project.checkpoint_timestamp else None

    return jsonify(response)

@app.route('/api/project/<int:project_id>/status', methods=['GET'])
def api_project_status(project_id):
    """Get project processing status."""
    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        return jsonify({
            'project_id': project_id,
            'name': project.name,
            'last_checkpoint': project.last_checkpoint,
            'checkpoint_time': project.checkpoint_timestamp.isoformat() if project.checkpoint_timestamp else None
        })


# ============================================================================
# API Routes - Export
# ============================================================================

@app.route('/api/project/<int:project_id>/export/<export_type>')
def api_export_project(project_id, export_type):
    """Export project data."""
    if export_type not in ['keywords', 'briefs', 'calendar']:
        return jsonify({'error': 'Invalid export type'}), 400

    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        exporter = CSVExporter()

        try:
            if export_type == 'keywords':
                filename = exporter.export_keywords(project_id)
            elif export_type == 'briefs':
                filename = exporter.export_briefs(project_id)
            elif export_type == 'calendar':
                filename = exporter.export_calendar(project_id)

            return send_file(filename, as_attachment=True, download_name=os.path.basename(filename))
        except Exception as e:
            return jsonify({'error': str(e)}), 500


# ============================================================================
# API Routes - Automation
# ============================================================================

@app.route('/api/automation/discover-seeds', methods=['POST'])
def api_discover_seeds():
    """Auto-discover seed keywords from URL/competitors/niche."""
    try:
        from automation.seed_discoverer import AutonomousSeedDiscoverer

        data = request.get_json()
        url = data.get('url')
        description = data.get('description')
        competitors = data.get('competitors', [])
        niche = data.get('niche')

        discoverer = AutonomousSeedDiscoverer()
        results = discoverer.discover_all(
            business_url=url,
            business_description=description,
            competitors=competitors,
            niche=niche
        )

        return jsonify({
            'success': True,
            'seeds': results
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/automation/project/<int:project_id>/schedule', methods=['POST'])
def api_schedule_automation(project_id):
    """Setup automation schedules for a project."""
    try:
        from automation.scheduler import setup_default_schedules

        data = request.get_json()
        frequency = data.get('frequency', 'weekly')

        setup_default_schedules(project_id, frequency)

        return jsonify({
            'success': True,
            'message': f'Scheduled {frequency} automation for project {project_id}'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/automation/project/<int:project_id>/alerts', methods=['GET'])
def api_get_alerts(project_id):
    """Get opportunity alerts for a project."""
    try:
        from automation.alert_engine import OpportunityAlertEngine

        engine = OpportunityAlertEngine()
        alerts = engine.scan_project(project_id)

        return jsonify({
            'success': True,
            'alerts': alerts
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/automation/project/<int:project_id>/gaps', methods=['GET'])
def api_analyze_gaps(project_id):
    """Analyze content gaps for a project."""
    try:
        from automation.gap_analyzer import ContentGapAnalyzer

        analyzer = ContentGapAnalyzer()
        results = analyzer.analyze_gaps(project_id, auto_import=True)

        return jsonify({
            'success': True,
            **results
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/automation/project/<int:project_id>/sync-notion', methods=['POST'])
def api_sync_notion(project_id):
    """Sync project to Notion."""
    try:
        from automation.workflow_sync import WorkflowSync

        sync = WorkflowSync()
        results = sync.sync_to_notion(project_id, create_tasks=True)

        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/automation/scheduler/jobs', methods=['GET'])
def api_get_scheduler_jobs():
    """Get all scheduled jobs."""
    try:
        from automation.scheduler import get_scheduler

        scheduler = get_scheduler()
        jobs = scheduler.list_jobs()

        return jsonify({
            'success': True,
            'jobs': jobs
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == '__main__':
    print("=" * 80)
    print("🚀 KEYWORD RESEARCH DASHBOARD - ENHANCED WEB INTERFACE")
    print("=" * 80)
    print()
    print("Backend API:        http://localhost:5000")
    print("Frontend (dev):     http://localhost:4000")
    print("WebSocket support:  Enabled")
    print()
    print("Press CTRL+C to stop the server")
    print("=" * 80)

    # Run with SocketIO (debug=False to avoid reloader issues in WSL)
    socketio.run(app, debug=False, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
