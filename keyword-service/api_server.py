"""
Flask API Server for Keyword Research Service
Provides REST API endpoints for the Node.js application to access keyword research functionality
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import KeywordOrchestrator
from models import Project, Keyword, Topic, PageGroup
from database import get_session
from config import Settings

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js frontend

settings = Settings()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'keyword-research'}), 200


@app.route('/api/keyword/projects', methods=['GET'])
def list_projects():
    """List all keyword research projects"""
    try:
        session = next(get_session())
        projects = session.query(Project).all()

        return jsonify({
            'success': True,
            'projects': [{
                'id': p.id,
                'name': p.name,
                'created_at': p.created_at.isoformat(),
                'total_keywords': p.total_keywords,
                'total_topics': p.total_topics,
                'status': p.status
            } for p in projects]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/keyword/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Get detailed project information"""
    try:
        session = next(get_session())
        project = session.query(Project).filter_by(id=project_id).first()

        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404

        # Get top keywords
        top_keywords = session.query(Keyword)\
            .filter_by(project_id=project_id)\
            .order_by(Keyword.opportunity_score.desc())\
            .limit(20)\
            .all()

        return jsonify({
            'success': True,
            'project': {
                'id': project.id,
                'name': project.name,
                'created_at': project.created_at.isoformat(),
                'total_keywords': project.total_keywords,
                'total_topics': project.total_topics,
                'status': project.status,
                'top_keywords': [{
                    'keyword': k.keyword,
                    'volume': k.monthly_volume,
                    'difficulty': k.difficulty_score,
                    'opportunity': k.opportunity_score,
                    'intent': k.intent
                } for k in top_keywords]
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/keyword/research', methods=['POST'])
def create_research():
    """Create a new keyword research project"""
    try:
        data = request.json

        # Required fields
        if not data.get('name') or not data.get('seeds'):
            return jsonify({
                'success': False,
                'error': 'Name and seeds are required'
            }), 400

        # Parse seeds
        seeds = [s.strip() for s in data['seeds'].split(',')]

        # Create orchestrator
        orchestrator = KeywordOrchestrator(settings)

        # Run the pipeline
        project_id = orchestrator.run_pipeline(
            project_name=data['name'],
            seed_keywords=seeds,
            geo=data.get('geo', 'US'),
            language=data.get('language', 'en'),
            focus=data.get('focus', 'informational')
        )

        return jsonify({
            'success': True,
            'project_id': project_id,
            'message': 'Keyword research started successfully'
        }), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/keyword/projects/<int:project_id>/keywords', methods=['GET'])
def get_keywords(project_id):
    """Get keywords for a project with pagination and filtering"""
    try:
        session = next(get_session())

        # Pagination
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))

        # Filters
        intent = request.args.get('intent')
        min_volume = request.args.get('min_volume', type=int)
        max_difficulty = request.args.get('max_difficulty', type=float)

        # Build query
        query = session.query(Keyword).filter_by(project_id=project_id)

        if intent:
            query = query.filter_by(intent=intent)
        if min_volume:
            query = query.filter(Keyword.monthly_volume >= min_volume)
        if max_difficulty:
            query = query.filter(Keyword.difficulty_score <= max_difficulty)

        # Get total count
        total = query.count()

        # Get paginated results
        keywords = query.order_by(Keyword.opportunity_score.desc())\
            .offset((page - 1) * per_page)\
            .limit(per_page)\
            .all()

        return jsonify({
            'success': True,
            'keywords': [{
                'id': k.id,
                'keyword': k.keyword,
                'volume': k.monthly_volume,
                'difficulty': k.difficulty_score,
                'opportunity': k.opportunity_score,
                'intent': k.intent,
                'cpc': k.cpc
            } for k in keywords],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/keyword/projects/<int:project_id>/topics', methods=['GET'])
def get_topics(project_id):
    """Get topic clusters for a project"""
    try:
        session = next(get_session())

        topics = session.query(Topic)\
            .filter_by(project_id=project_id)\
            .all()

        return jsonify({
            'success': True,
            'topics': [{
                'id': t.id,
                'label': t.label,
                'keyword_count': t.keyword_count,
                'total_volume': t.total_volume,
                'avg_difficulty': t.avg_difficulty
            } for t in topics]
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/keyword/projects/<int:project_id>/export', methods=['POST'])
def export_keywords(project_id):
    """Export keywords to CSV"""
    try:
        from exports.csv_exporter import CSVExporter

        session = next(get_session())
        project = session.query(Project).filter_by(id=project_id).first()

        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404

        # Create export
        exporter = CSVExporter()
        file_path = f"exports/{project.name.replace(' ', '_')}_keywords.csv"
        exporter.export(project, file_path)

        return jsonify({
            'success': True,
            'file_path': file_path,
            'message': 'Export created successfully'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/keyword/stats', methods=['GET'])
def get_stats():
    """Get overall keyword research statistics"""
    try:
        session = next(get_session())

        total_projects = session.query(Project).count()
        total_keywords = session.query(Keyword).count()
        total_topics = session.query(Topic).count()

        return jsonify({
            'success': True,
            'stats': {
                'total_projects': total_projects,
                'total_keywords': total_keywords,
                'total_topics': total_topics
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    # Initialize database
    from database import init_db
    init_db()

    print("\n" + "="*60)
    print("🔍 Keyword Research API Server")
    print("="*60)
    print("\n✅ Server running at: http://localhost:5000")
    print("\n📊 API Endpoints:")
    print("   → GET  /health")
    print("   → GET  /api/keyword/projects")
    print("   → POST /api/keyword/research")
    print("   → GET  /api/keyword/projects/<id>")
    print("   → GET  /api/keyword/projects/<id>/keywords")
    print("   → GET  /api/keyword/projects/<id>/topics")
    print("   → POST /api/keyword/projects/<id>/export")
    print("   → GET  /api/keyword/stats")
    print("\nPress Ctrl+C to stop the server\n")

    app.run(host='0.0.0.0', port=5000, debug=True)
