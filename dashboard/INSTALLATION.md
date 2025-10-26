# Dashboard Installation Guide

## Quick Start

### 1. Install Dependencies

```bash
cd dashboard
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the dashboard.

## Production Deployment

### Option 1: Integrate with Express Server (Recommended)

1. **Build the dashboard:**
   ```bash
   cd dashboard
   npm run build
   ```

2. **Update dashboard-server.js:**

   The Express server is already configured to serve the built dashboard. Simply uncomment the line in `dashboard-server.js`:

   ```javascript
   // Change this:
   // app.use(express.static('dashboard/dist'));

   // To this:
   app.use(express.static('dashboard/dist'));
   ```

3. **Start the server:**
   ```bash
   cd ..
   node dashboard-server.js
   ```

4. **Access the dashboard:**
   Open `http://localhost:9000` in your browser

### Option 2: Standalone Deployment

Deploy the `dashboard/dist` folder to:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

### Option 3: Docker Deployment

Create a `Dockerfile` in the dashboard directory:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t seo-dashboard .
docker run -p 3000:80 seo-dashboard
```

## Environment Configuration

Create a `.env` file in the dashboard directory:

```env
# API Configuration
VITE_API_URL=http://localhost:9000
VITE_WS_URL=http://localhost:9000

# Optional: Analytics
VITE_ANALYTICS_ID=your-analytics-id
```

## Adding shadcn/ui Components

The dashboard uses shadcn/ui components. To add new components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
# etc.
```

Available components: https://ui.shadcn.com/docs/components

## Troubleshooting

### Port Already in Use

If port 5173 is in use, modify `vite.config.js`:

```javascript
export default defineConfig({
  server: {
    port: 3001, // Change to any available port
  },
})
```

### API Connection Issues

1. Verify the Express server is running on port 9000
2. Check proxy configuration in `vite.config.js`
3. Ensure CORS is properly configured

### Build Errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```

### Dark Mode Not Working

Ensure the theme toggle is working and the `dark` class is being added to the `<html>` element.

## Development Tips

### Hot Module Replacement

Vite provides instant HMR. Changes to React components will reflect immediately without page refresh.

### Component Development

Use the browser console to inspect component props and state:

```javascript
// In browser console
console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
```

### API Mocking

For development without the backend, create mock data in `src/lib/mockData.js`:

```javascript
export const mockDashboardData = {
  stats: { /* ... */ },
  clients: [ /* ... */ ],
}
```

## Next Steps

1. **Customize Theme**: Edit `src/index.css` to change colors
2. **Add Charts**: Implement Recharts in the analytics section
3. **Add More Pages**: Create components for other sections
4. **Connect Real Data**: Replace mock data with API calls
5. **Add Authentication**: Implement user login/logout

## Support

For issues or questions:
- Check the main README.md
- Review shadcn/ui documentation: https://ui.shadcn.com
- Check Vite documentation: https://vitejs.dev
