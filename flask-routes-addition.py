"""
Add these routes to /home/avi/projects/seoanalyst/seo-analyst-agent/web/app.py
Place them before the 'if __name__ == "__main__"' block
"""

from flask import send_from_directory, abort
import json
from pathlib import Path

# SEO Audit Reports Routes
@app.route('/report')
def reports_index():
    """Serve the reports index page"""
    reports_dir = Path(app.root_path) / 'static' / 'reports'
    index_file = reports_dir / 'index.html'

    if index_file.exists():
        return send_from_directory(reports_dir, 'index.html')
    else:
        return render_template('reports_placeholder.html'), 404

@app.route('/report/list')
def reports_list():
    """API endpoint to list all available reports"""
    reports_dir = Path(app.root_path) / 'static' / 'reports'

    result = {
        'total_clients': 0,
        'total_reports': 0,
        'latest_date': None,
        'clients': {}
    }

    if not reports_dir.exists():
        return jsonify(result)

    # Scan for client directories
    for client_dir in reports_dir.iterdir():
        if client_dir.is_dir() and not client_dir.name.startswith('.'):
            client_name = client_dir.name
            reports = []

            # Find all audit HTML files
            for report_file in client_dir.glob('audit-*.html'):
                # Extract date from filename
                date_match = report_file.stem.split('audit-')[1] if 'audit-' in report_file.stem else ''

                reports.append({
                    'name': report_file.name,
                    'date': date_match,
                    'url': f'/report/{client_name}/{report_file.name}',
                    'size': report_file.stat().st_size
                })

            if reports:
                # Sort by date descending
                reports.sort(key=lambda x: x['date'], reverse=True)
                result['clients'][client_name] = reports
                result['total_clients'] += 1
                result['total_reports'] += len(reports)

                # Track latest date
                if reports[0]['date']:
                    if not result['latest_date'] or reports[0]['date'] > result['latest_date']:
                        result['latest_date'] = reports[0]['date']

    return jsonify(result)

@app.route('/report/<client_name>/<report_file>')
def serve_report(client_name, report_file):
    """Serve a specific audit report"""
    reports_dir = Path(app.root_path) / 'static' / 'reports'
    client_dir = reports_dir / client_name

    if not client_dir.exists():
        abort(404)

    try:
        return send_from_directory(client_dir, report_file)
    except FileNotFoundError:
        abort(404)

@app.route('/report/<client_name>')
def client_reports(client_name):
    """List all reports for a specific client"""
    reports_dir = Path(app.root_path) / 'static' / 'reports'
    client_dir = reports_dir / client_name

    if not client_dir.exists():
        abort(404)

    reports = []
    for report_file in client_dir.glob('audit-*.html'):
        date_match = report_file.stem.split('audit-')[1] if 'audit-' in report_file.stem else ''
        reports.append({
            'name': report_file.name,
            'date': date_match,
            'url': f'/report/{client_name}/{report_file.name}'
        })

    reports.sort(key=lambda x: x['date'], reverse=True)

    return render_template('client_reports.html',
                         client_name=client_name.replace('-', ' ').title(),
                         reports=reports)
