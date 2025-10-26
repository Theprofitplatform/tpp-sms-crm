# 🎨 Interactive Keyword Research Dashboard

A modern, full-featured web dashboard for AI-powered keyword research and content planning.

![Dashboard Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Flask](https://img.shields.io/badge/Flask-3.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)

## ✨ Features

### 📊 Interactive Visualizations
- **Intent Distribution** - Pie chart showing keyword intent breakdown
- **Difficulty vs Volume** - Scatter plot for opportunity identification
- **Opportunity Funnel** - Strategic keyword categorization
- **Traffic Projections** - 12-month traffic forecast charts

### 🔄 Real-time Updates
- Live progress tracking during project creation
- WebSocket-powered instant updates
- Stage-by-stage pipeline visualization
- Automatic dashboard refresh on completion

### 📈 Advanced Analytics
- Comprehensive keyword metrics table
- Multi-column sorting and filtering
- Search across all keywords
- Intent-based filtering
- Export to CSV, Excel, Sheets, and Notion

### 🎯 Smart Features
- Project management dashboard
- Quick filters and search
- Responsive mobile design
- Dark mode ready (coming soon)
- Keyboard shortcuts (coming soon)

### 🚀 Performance
- Lazy loading for optimal speed
- Efficient caching with React Query
- Virtual scrolling for large datasets
- Optimized API requests
- Progressive web app capabilities

## 🖥️ Screenshots

### Project Dashboard
![Project Dashboard](docs/screenshots/dashboard.png)
*Main dashboard with real-time visualizations and metrics*

### Keyword Analysis
![Keyword Table](docs/screenshots/keywords.png)
*Advanced keyword table with filtering and sorting*

### Project Creation
![Create Project](docs/screenshots/create-project.png)
*Real-time progress tracking during project creation*

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- API Key: SerpAPI (required)

### Installation

```bash
# 1. Install backend dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 2. Install frontend dependencies
cd frontend
npm install
cd ..

# 3. Configure environment
cp .env.example .env
# Edit .env and add your SERPAPI_API_KEY

# 4. Initialize database
python cli.py init
```

### Run the Dashboard

**Option 1: Quick Start (Recommended)**
```bash
./start_dashboard.sh
```

**Option 2: Manual Start**

Terminal 1 (Backend):
```bash
source venv/bin/activate
python web_app_enhanced.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Open in browser:** http://localhost:3000

## 📖 Usage Guide

### Creating a Project

1. Click "Create New Project" button
2. Enter project details:
   - **Project Name**: Descriptive name
   - **Seed Keywords**: 3-10 initial keywords (comma or line separated)
   - **Location**: Target country
   - **Language**: Content language
   - **Focus**: Content intent (informational, commercial, etc.)
3. Click "Create Project"
4. Watch real-time progress as the AI analyzes keywords
5. Automatic redirect to dashboard when complete

### Analyzing Results

**Overview Tab:**
- View key metrics and statistics
- Analyze intent distribution
- Identify quick win opportunities
- Review difficulty vs volume relationships

**Keywords Tab:**
- Browse all discovered keywords
- Sort by any metric
- Filter by intent, volume, or difficulty
- Search for specific keywords
- Export filtered results

**Analytics Tab:**
- Deep dive into SERP analysis
- Competitive intelligence
- Trend analysis
- Content gap identification

### Exporting Data

- **Keywords CSV**: All keyword data with metrics
- **Content Briefs**: AI-generated content outlines
- **Content Calendar**: Planned publishing schedule

Click export buttons in project dashboard to download.

## 🏗️ Architecture

### Frontend Stack
```
React 18 + TypeScript
├── Vite (Build tool)
├── Tailwind CSS (Styling)
├── Recharts (Visualizations)
├── React Query (State management)
├── Socket.IO Client (Real-time)
└── Framer Motion (Animations)
```

### Backend Stack
```
Flask 3.0 + Python 3.9+
├── Flask-SocketIO (WebSocket)
├── SQLAlchemy (ORM)
├── Keyword Research Pipeline
└── Multiple API Integrations
```

### Key Components

**Frontend:**
- `src/pages/` - Main application pages
- `src/components/` - Reusable UI components
- `src/charts/` - Data visualization components
- `src/hooks/` - Custom React hooks
- `src/services/` - API integration layer

**Backend:**
- `web_app_enhanced.py` - Flask app with WebSocket
- `models.py` - Database models
- `orchestrator.py` - Keyword research pipeline
- `processing/` - Data processing modules

## 🔧 Configuration

### Backend Configuration (.env)

```bash
# Required
SERPAPI_API_KEY=your_key_here

# Optional (for enhanced features)
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
NOTION_API_KEY=...

# Performance
SERP_API_RPM=30
TOPIC_CLUSTER_THRESHOLD=0.78
DATABASE_URL=sqlite:///./keyword_research.db

# For production
# DATABASE_URL=postgresql://user:pass@localhost/dbname
```

### Frontend Configuration (vite.config.ts)

```typescript
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:5000',
    '/socket.io': {
      target: 'http://localhost:5000',
      ws: true,
    },
  },
}
```

## 🎨 Customization

### Theming

Edit `frontend/tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#667eea',  // Change your primary color
      },
    },
  },
}
```

### Adding Custom Charts

1. Create chart component in `src/components/charts/`
2. Use Recharts or D3.js
3. Import and use in dashboard pages

Example:
```typescript
import { LineChart, Line, XAxis, YAxis } from 'recharts';

export const MyCustomChart = ({ data }) => (
  <LineChart data={data}>
    <XAxis dataKey="name" />
    <YAxis />
    <Line type="monotone" dataKey="value" stroke="#667eea" />
  </LineChart>
);
```

## 📊 API Reference

### REST Endpoints

```
GET    /api/projects                      - List all projects
GET    /api/project/:id                   - Get project details
POST   /api/create                        - Create new project
DELETE /api/project/:id                   - Delete project

GET    /api/project/:id/keywords          - Get keywords (with filters)
GET    /api/keyword/:id                   - Get single keyword

GET    /api/project/:id/analytics/overview           - Analytics overview
GET    /api/project/:id/analytics/intent-distribution - Intent chart data
GET    /api/project/:id/analytics/difficulty-volume   - Scatter plot data

GET    /api/project/:id/topics            - List topics
GET    /api/project/:id/page-groups       - List page groups

GET    /api/project/:id/export/keywords   - Export keywords CSV
GET    /api/project/:id/export/briefs     - Export briefs
GET    /api/project/:id/export/calendar   - Export calendar
```

### WebSocket Events

```
connect           - Client connects
disconnect        - Client disconnects

subscribe_project - Subscribe to project updates
subscribe_job     - Subscribe to job updates

project_X_update  - Project update event
job_X_update      - Job progress update
```

## 🧪 Testing

### Backend Tests
```bash
# Unit tests
pytest

# With coverage
pytest --cov

# Integration tests (requires API keys)
pytest --run-integration
```

### Frontend Tests
```bash
cd frontend

# Lint
npm run lint

# Build test
npm run build
```

## 🚢 Deployment

### Production Build

**Backend:**
```bash
pip install gunicorn gevent gevent-websocket
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 web_app_enhanced:app
```

**Frontend:**
```bash
cd frontend
npm run build
# Output in frontend/dist/
# Serve with nginx or any static server
```

### Docker (Coming Soon)
```bash
docker-compose up
```

### Environment Variables (Production)
- Set `FLASK_ENV=production`
- Use PostgreSQL: `DATABASE_URL=postgresql://...`
- Enable Redis caching: `REDIS_URL=redis://...`
- Change `SECRET_KEY` in `web_app_enhanced.py`
- Use HTTPS
- Enable rate limiting

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

### Development Guidelines

- Follow TypeScript for frontend
- Follow PEP 8 for backend
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation
- Test before submitting

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ Complete React dashboard with TypeScript
- ✅ Real-time WebSocket updates
- ✅ Interactive data visualizations
- ✅ Advanced keyword table with filtering
- ✅ Project management interface
- ✅ Export functionality
- ✅ Responsive mobile design
- ✅ Flask backend with new API endpoints

### Coming Soon
- 🔜 Dark mode
- 🔜 Advanced analytics dashboard
- 🔜 Content planning workspace (Kanban board)
- 🔜 Team collaboration features
- 🔜 Keyword tracking over time
- 🔜 Competitor monitoring
- 🔜 AI-powered insights

## 🐛 Troubleshooting

**Dashboard won't load:**
- Check both servers are running (backend on :5000, frontend on :3000)
- Clear browser cache
- Check console for errors

**WebSocket not connecting:**
- Ensure `web_app_enhanced.py` is running (not `web_app.py`)
- Check Flask-SocketIO is installed: `pip list | grep flask-socketio`
- Verify no firewall blocking WebSocket connections

**Charts not rendering:**
- Check API is returning data: `curl http://localhost:5000/api/projects`
- Open browser console for JavaScript errors
- Verify Recharts is installed: `npm list recharts`

**API requests failing:**
- Check CORS configuration in `web_app_enhanced.py`
- Verify backend is running and accessible
- Check network tab in browser DevTools

See [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for detailed troubleshooting.

## 📚 Documentation

- [Setup Guide](DASHBOARD_SETUP.md) - Detailed installation and configuration
- [Project Overview](CLAUDE.md) - Full project documentation
- [API Reference](DASHBOARD_SETUP.md#api-endpoints) - Complete API documentation

## 📄 License

Part of the Keyword Research Tool project. See main project for license details.

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [Flask](https://flask.palletsprojects.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [Socket.IO](https://socket.io/)
- [Vite](https://vitejs.dev/)

---

**Made with ❤️ for SEO professionals and content teams**

For questions or support, please open an issue on GitHub.
