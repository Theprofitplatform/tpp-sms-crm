"""Flask Web Interface for Keyword Research Tool"""
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_cors import CORS
import threading
import os
from datetime import datetime, timezone
from database import get_db
from models import Project, Keyword
from orchestrator import KeywordResearchOrchestrator
from exports.csv_export import CSVExporter

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'keyword-research-tool-secret-key'

# Store running jobs
running_jobs = {}


@app.route('/')
def index():
    """Home page with project creation form."""
    return render_template('index.html')


@app.route('/projects')
def projects_list():
    """List all projects."""
    with get_db() as db:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
        project_data = []
        for p in projects:
            keyword_count = db.query(Keyword).filter(Keyword.project_id == p.id).count()
            project_data.append({
                'id': p.id,
                'name': p.name,
                'created_at': p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else 'N/A',
                'keyword_count': keyword_count,
                'geo': p.geo,
                'language': p.language,
                'focus': p.content_focus or 'any',
                'last_checkpoint': p.last_checkpoint or 'Not started',
                'checkpoint_time': p.checkpoint_timestamp.strftime('%Y-%m-%d %H:%M') if p.checkpoint_timestamp else None
            })
    return render_template('projects.html', projects=project_data)


@app.route('/project/<int:project_id>')
def project_details(project_id):
    """View project details and results."""
    with get_db() as db:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return "Project not found", 404
        
        keywords = db.query(Keyword).filter(Keyword.project_id == project_id)\
            .order_by(Keyword.opportunity.desc()).limit(100).all()
        
        # Calculate stats
        all_keywords = db.query(Keyword).filter(Keyword.project_id == project_id).all()
        intent_counts = {}
        total_volume = 0
        avg_difficulty = 0
        
        for kw in all_keywords:
            intent = kw.intent or 'unknown'
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
            if kw.volume:
                total_volume += kw.volume
            if kw.difficulty:
                avg_difficulty += kw.difficulty
        
        if all_keywords:
            avg_difficulty = avg_difficulty / len(all_keywords)
        
        keyword_data = []
        for kw in keywords[:50]:  # Show top 50
            keyword_data.append({
                'text': kw.text,
                'intent': kw.intent or 'unknown',
                'volume': kw.volume or 0,
                'cpc': f"${kw.cpc:.2f}" if kw.cpc else 'N/A',
                'difficulty': f"{kw.difficulty:.1f}" if kw.difficulty else 'N/A',
                'opportunity': f"{kw.opportunity:.1f}" if kw.opportunity else 'N/A',
                'traffic_potential': kw.traffic_potential or 0
            })
        
        project_data = {
            'id': project.id,
            'name': project.name,
            'created_at': project.created_at.strftime('%Y-%m-%d %H:%M') if project.created_at else 'N/A',
            'geo': project.geo,
            'language': project.language,
            'focus': project.content_focus or 'any',
            'last_checkpoint': project.last_checkpoint or 'Not started',
            'keyword_count': len(all_keywords),
            'total_volume': total_volume,
            'avg_difficulty': f"{avg_difficulty:.1f}",
            'intent_distribution': intent_counts
        }
    
    return render_template('project_details.html', project=project_data, keywords=keyword_data)


@app.route('/api/create', methods=['POST'])
def create_project():
    """API endpoint to create a new project."""
    data = request.json
    
    name = data.get('name')
    seeds = data.get('seeds', '')
    geo = data.get('geo', 'US')
    language = data.get('language', 'en')
    focus = data.get('focus', None)
    
    if not name or not seeds:
        return jsonify({'error': 'Name and seeds are required'}), 400
    
    # Parse seeds (comma or newline separated)
    seed_list = [s.strip() for s in seeds.replace('\n', ',').split(',') if s.strip()]
    
    if not seed_list:
        return jsonify({'error': 'At least one seed keyword is required'}), 400
    
    # Generate a temporary job ID
    import random
    temp_job_id = f"temp_{int(datetime.now().timestamp())}_{random.randint(1000, 9999)}"

    # Start background job tracker
    running_jobs[temp_job_id] = {
        'status': 'running',
        'start_time': datetime.now(),
        'name': name,
        'project_id': None
    }

    def run_project():
        """Run project in background thread."""
        project_id = None
        try:
            orchestrator = KeywordResearchOrchestrator()
            project_id = orchestrator.run_full_pipeline(
                project_name=name,
                seeds=seed_list,
                geo=geo,
                language=language,
                content_focus=focus if focus and focus != 'any' else 'informational'
            )

            # Update job status
            running_jobs[temp_job_id]['project_id'] = project_id
            running_jobs[temp_job_id]['status'] = 'completed'
            running_jobs[temp_job_id]['end_time'] = datetime.now()
        except Exception as e:
            running_jobs[temp_job_id]['status'] = 'failed'
            running_jobs[temp_job_id]['error'] = str(e)
            if project_id:
                running_jobs[temp_job_id]['project_id'] = project_id
    
    thread = threading.Thread(target=run_project)
    thread.daemon = True
    thread.start()

    return jsonify({
        'success': True,
        'job_id': temp_job_id,
        'message': f'Project "{name}" processing started. Check /api/job/{temp_job_id}/status for progress.'
    })


@app.route('/api/job/<job_id>/status')
def job_status(job_id):
    """Get job processing status by job ID."""
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
        'error': job.get('error')
    }

    # If we have a project_id, get the checkpoint info
    if job.get('project_id'):
        with get_db() as db:
            project = db.query(Project).filter(Project.id == job['project_id']).first()
            if project:
                response['last_checkpoint'] = project.last_checkpoint
                response['checkpoint_time'] = project.checkpoint_timestamp.isoformat() if project.checkpoint_timestamp else None

    return jsonify(response)


@app.route('/api/project/<int:project_id>/status')
def project_status(project_id):
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


@app.route('/api/project/<int:project_id>/export/<export_type>')
def export_project(project_id, export_type):
    """Export project data as CSV."""
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


if __name__ == '__main__':
    print("=" * 80)
    print("🌐 KEYWORD RESEARCH TOOL - WEB INTERFACE")
    print("=" * 80)
    print()
    print("Starting server at http://localhost:5000")
    print()
    print("Press CTRL+C to stop the server")
    print("=" * 80)
    app.run(debug=True, host='0.0.0.0', port=5000)
