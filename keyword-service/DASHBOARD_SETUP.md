# Interactive Dashboard Setup Guide

This guide will walk you through setting up and running the complete interactive dashboard for the Keyword Research Tool.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Architecture Overview](#architecture-overview)
6. [Troubleshooting](#troubleshooting)
7. [Development](#development)

---

## Prerequisites

### Required Software

- **Python 3.9+**
- **Node.js 18+** and npm
- **Git**

### API Keys (Required)

At minimum, you need:
- **SerpAPI Key**: For SERP data collection

Optional but recommended:
- Google Ads API credentials (for accurate search volume)
- Google OAuth credentials (for Sheets/Search Console integration)

---

## Installation

### Step 1: Clone and Setup Backend

```bash
# Navigate to project directory
cd /home/user/cursorkeyword

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### Step 2: Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# This will install all required packages:
# - React, TypeScript, Vite
# - Tailwind CSS
# - Recharts for visualizations
# - Socket.IO client for real-time updates
# - React Query for state management
# - And more...
```

### Step 3: Environment Configuration

```bash
# Return to root directory
cd ..

# Copy example environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

**Minimum required in `.env`:**
```bash
SERPAPI_API_KEY=your_serpapi_key_here
```

### Step 4: Initialize Database

```bash
# Initialize the database
python cli.py init

# This creates the SQLite database with all required tables
```

---

## Configuration

### Backend Configuration (`config.py`)

The backend uses environment variables for configuration. Key settings:

```bash
# API Keys
SERPAPI_API_KEY=your_key_here

# Rate Limits (requests per minute)
SERP_API_RPM=30
AUTOSUGGEST_RPM=20

# Clustering Thresholds
TOPIC_CLUSTER_THRESHOLD=0.78
PAGE_GROUP_THRESHOLD=0.88

# Database
DATABASE_URL=sqlite:///./keyword_research.db
```

### Frontend Configuration

The frontend automatically proxies API requests to `http://localhost:5000`. No additional configuration needed for development.

---

## Running the Application

### Method 1: Run Both Servers Separately (Recommended for Development)

**Terminal 1 - Backend:**
```bash
# Activate virtual environment
source venv/bin/activate

# Run enhanced Flask server with WebSocket support
python web_app_enhanced.py
```

The backend will start at: **http://localhost:5000**

**Terminal 2 - Frontend:**
```bash
# Navigate to frontend directory
cd frontend

# Run development server
npm run dev
```

The frontend will start at: **http://localhost:3000**

**Open your browser and go to:** **http://localhost:3000**

### Method 2: Production Build

```bash
# Build frontend for production
cd frontend
npm run build

# The build output will be in frontend/dist/
# Serve it with the Flask backend or any static server
```

---

## Architecture Overview

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (data visualization)
- React Query (server state)
- Socket.IO Client (real-time updates)
- Framer Motion (animations)

**Backend:**
- Flask (web framework)
- Flask-SocketIO (WebSocket support)
- SQLAlchemy (ORM)
- Existing keyword research pipeline

### Application Structure

```
cursorkeyword/
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/        # Basic components
│   │   │   ├── charts/        # Chart components
│   │   │   ├── tables/        # Table components
│   │   │   ├── modals/        # Modal dialogs
│   │   │   └── layout/        # Layout components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API services
│   │   ├── store/             # State management
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── web_app_enhanced.py         # Enhanced Flask app with WebSocket
├── models.py                   # Database models
├── orchestrator.py             # Keyword research pipeline
├── requirements.txt            # Python dependencies
└── ...
```

### API Endpoints

**Projects:**
- `GET /api/projects` - List all projects
- `GET /api/project/:id` - Get project details
- `POST /api/create` - Create new project
- `DELETE /api/project/:id` - Delete project

**Keywords:**
- `GET /api/project/:id/keywords` - Get keywords with filtering
- `GET /api/keyword/:id` - Get single keyword details

**Analytics:**
- `GET /api/project/:id/analytics/overview` - Analytics overview
- `GET /api/project/:id/analytics/intent-distribution` - Intent chart data
- `GET /api/project/:id/analytics/difficulty-volume` - Scatter plot data

**Topics & Clustering:**
- `GET /api/project/:id/topics` - List topics
- `GET /api/project/:id/page-groups` - List page groups

**Real-time:**
- `GET /api/job/:id/status` - Get job status
- WebSocket events: `subscribe_project`, `subscribe_job`

**Export:**
- `GET /api/project/:id/export/keywords` - Export keywords CSV
- `GET /api/project/:id/export/briefs` - Export content briefs
- `GET /api/project/:id/export/calendar` - Export content calendar

---

## Features Overview

### 1. Project Dashboard

**Overview Tab:**
- Real-time project statistics
- Intent distribution pie chart
- Difficulty vs Volume scatter plot
- Opportunity funnel visualization
- Traffic timeline projection

**Keywords Tab:**
- Advanced table with sorting and filtering
- Search functionality
- Intent filtering
- Pagination for large datasets

**Analytics Tab:**
- Advanced analytics features (coming soon)

### 2. Real-time Progress Tracking

When creating a new project:
- Live progress bar showing pipeline stages
- Current stage indicator
- Keywords processed counter
- Automatic redirect on completion

### 3. Keyword Table Features

- Multi-column sorting
- Search across keywords
- Filter by intent
- Expandable rows (future)
- Inline editing (future)

### 4. Data Visualizations

**Intent Distribution Chart:**
- Interactive pie chart
- Color-coded by intent type
- Hover tooltips

**Difficulty vs Volume:**
- Scatter plot with bubble sizes
- Color-coded by intent
- Interactive tooltips showing full keyword data

**Opportunity Funnel:**
- Horizontal bar chart
- Categorizes keywords by priority
- Shows count and percentage

**Traffic Timeline:**
- Area chart showing projected growth
- 12-month forecast
- Based on search volume and target CTR

---

## Troubleshooting

### Common Issues

**1. Backend won't start**

```bash
# Check if port 5000 is already in use
lsof -i :5000

# Kill the process or use a different port
```

**2. Frontend won't start**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+
```

**3. API requests failing**

- Check that backend is running on port 5000
- Verify proxy configuration in `vite.config.ts`
- Check browser console for CORS errors

**4. WebSocket not connecting**

- Ensure Flask-SocketIO is installed: `pip install flask-socketio python-socketio eventlet`
- Check that `web_app_enhanced.py` is running (not `web_app.py`)
- Look for WebSocket connection errors in browser console

**5. Database errors**

```bash
# Reinitialize database
rm keyword_research.db
python cli.py init
```

**6. Charts not rendering**

- Check browser console for errors
- Verify Recharts is installed: `npm list recharts`
- Ensure data is being returned from API

---

## Development

### Adding New Features

**Backend API Endpoint:**

1. Add route to `web_app_enhanced.py`
2. Query database using SQLAlchemy
3. Return JSON response

**Frontend Component:**

1. Create component in appropriate directory
2. Add TypeScript types in `src/types/`
3. Create API service function in `src/services/api.ts`
4. Create custom hook in `src/hooks/`
5. Use hook in component

**Example:**

```typescript
// 1. Add type
export interface NewFeature {
  id: number;
  name: string;
}

// 2. Add API function
export const featureApi = {
  list: () => api.get<NewFeature[]>('/features'),
};

// 3. Create hook
export const useFeatures = () => {
  return useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const response = await featureApi.list();
      return response.data;
    },
  });
};

// 4. Use in component
const MyComponent = () => {
  const { data, isLoading } = useFeatures();
  // ... render component
};
```

### Code Style

**Backend:**
- Follow PEP 8 style guide
- Use type hints
- Document functions with docstrings

**Frontend:**
- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Prefer composition over inheritance

### Testing

**Backend:**
```bash
# Run tests
pytest

# With coverage
pytest --cov

# Integration tests
pytest --run-integration
```

**Frontend:**
```bash
# Run linter
npm run lint

# Build test
npm run build
```

---

## Performance Optimization

### Backend

1. **Database Indexing:** Indexes are already defined in `models.py`
2. **API Caching:** Use Redis for caching (configured in `config.py`)
3. **Query Optimization:** Use eager loading for relationships

### Frontend

1. **Code Splitting:** Vite automatically splits code
2. **Lazy Loading:** Import large components lazily
3. **React Query Caching:** Configured with 5-minute stale time
4. **Virtual Scrolling:** Implement for large tables (future)

---

## Production Deployment

### Backend

```bash
# Use a production WSGI server
pip install gunicorn gevent gevent-websocket

# Run with Gunicorn
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 web_app_enhanced:app
```

### Frontend

```bash
# Build for production
npm run build

# Serve with nginx or similar
# The build output is in frontend/dist/
```

### Environment Variables

Update `.env` for production:
```bash
FLASK_ENV=production
DATABASE_URL=postgresql://user:pass@localhost/dbname
REDIS_URL=redis://localhost:6379/0
```

### Security Considerations

1. Change `SECRET_KEY` in `web_app_enhanced.py`
2. Use HTTPS in production
3. Enable CORS only for your domain
4. Rate limit API endpoints
5. Validate all user inputs
6. Use environment variables for secrets

---

## Advanced Configuration

### PostgreSQL Database (Recommended for Production)

```bash
# Install PostgreSQL adapter
pip install psycopg2-binary

# Update .env
DATABASE_URL=postgresql://username:password@localhost:5432/keyword_research

# Run migrations
alembic upgrade head
```

### Redis Caching

```bash
# Install Redis
# Ubuntu: sudo apt-get install redis-server
# Mac: brew install redis

# Start Redis
redis-server

# Caching is automatically used by the base provider
```

### Custom Theming

Edit `frontend/tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#YOUR_COLOR',
        // ...
      },
    },
  },
},
```

---

## Support & Resources

- **GitHub Issues:** Report bugs and request features
- **Documentation:** See CLAUDE.md for project overview
- **API Reference:** See API endpoint documentation above

---

## Next Steps

After setup:

1. ✅ Create your first project
2. ✅ Explore the dashboard visualizations
3. ✅ Export keyword data
4. ✅ Customize the dashboard to your needs
5. ✅ Integrate with your existing tools

---

**Congratulations!** Your interactive dashboard is now ready to use. 🎉

For questions or issues, please check the troubleshooting section or create a GitHub issue.
