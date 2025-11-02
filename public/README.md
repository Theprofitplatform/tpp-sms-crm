# Simple Health Check Interface

## Quick Access

Once the API server is running, access the health check interface at:

```
http://localhost:4000/health.html
```

Or in production:

```
https://your-domain.com/health.html
```

## Features

- ✅ **Simple & Beautiful** - Single HTML page, no build required
- ✅ **Auto-Refresh** - Updates every 5 seconds (toggleable)
- ✅ **Real-Time** - Live service status
- ✅ **Color-Coded** - Easy visual status identification
- ✅ **Responsive** - Works on all devices
- ✅ **No Dependencies** - Pure HTML, CSS, JavaScript
- ✅ **Standalone** - Works without the React dashboard

## What It Shows

### Overall Status
- System health (Healthy/Degraded/Unhealthy)
- Environment (development/production)
- Version
- Uptime
- Check duration

### Services
- API Server
- Dashboard UI
- Database
- File System
- Redis (if configured)
- Google Search Console (if authenticated)
- SerpAPI (if configured)
- WordPress Sites (if configured)

### System Metrics
- Memory usage (process & system)
- CPU information
- Process details

## Usage

1. **Start the API server:**
   ```bash
   npm start
   ```

2. **Open in browser:**
   ```
   http://localhost:4000/health.html
   ```

3. **Auto-refresh:**
   - Toggle on/off with the switch
   - Default: Enabled (5-second refresh)

4. **Manual refresh:**
   - Click the "🔄 Refresh Now" button

## Perfect For

- ✅ Quick system checks
- ✅ Production monitoring
- ✅ Status pages
- ✅ Sharing with non-technical stakeholders
- ✅ Embedding in dashboards
- ✅ Mobile monitoring

## Comparison with React Dashboard

| Feature | Simple Interface | React Dashboard |
|---------|-----------------|-----------------|
| Setup | None required | Requires build |
| Access | Direct URL | Navigate through UI |
| Loading | Instant | Depends on build |
| Dependencies | None | React, Vite, etc. |
| Customization | Edit HTML | Modify components |
| Best For | Quick checks | Full monitoring |

## Customization

The interface is a single HTML file with embedded CSS and JavaScript:

- **Location**: `public/health.html`
- **Edit CSS**: Modify the `<style>` section
- **Edit JavaScript**: Modify the `<script>` section
- **Change refresh rate**: Update `setInterval(loadHealth, 5000)`

## Troubleshooting

### Can't access the page
- **Make sure the API server is running**: `npm start`
- **Check the port**: Default is 4000
- **Check the URL**: `http://localhost:4000/health.html`

### Shows "Error Loading Health Data"
- **API server not running**: Start with `npm start`
- **Wrong port**: Check `API_PORT` environment variable
- **CORS issue**: Already configured to allow all origins

### Data not updating
- **Check auto-refresh toggle**: Should be ON (blue)
- **Browser console**: Press F12 and check for errors
- **Network tab**: Verify API calls are being made

## Integration

### Embed in iframe
```html
<iframe src="http://localhost:4000/health.html" width="100%" height="800px"></iframe>
```

### Link from docs
```markdown
[System Health](http://localhost:4000/health.html)
```

### Bookmark
Add to your browser bookmarks for quick access

---

**Quick Start**: `npm start` → Open `http://localhost:4000/health.html`
