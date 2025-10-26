# SEO Automation Dashboard

Modern React dashboard built with shadcn/ui components for the SEO automation platform.

## Features

- **Modern UI**: Built with shadcn/ui and Tailwind CSS
- **Real-time Updates**: WebSocket integration for live data
- **Responsive Design**: Works on all devices
- **Dark Mode**: Built-in theme switcher
- **Client Management**: Manage multiple SEO clients
- **Analytics**: Track rankings, traffic, and conversions
- **Automation Controls**: Manage SEO automation workflows

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **shadcn/ui** - Component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts and graphs
- **Socket.IO** - Real-time communication

## Getting Started

### Installation

```bash
cd dashboard
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

The dev server is configured to proxy API requests to the Express backend at `http://localhost:9000`

### Build for Production

Build the dashboard for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
dashboard/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   ├── StatsCards.jsx # Dashboard stats
│   │   ├── ClientsTable.jsx
│   │   └── RecentActivity.jsx
│   ├── pages/             # Page components
│   │   └── DashboardPage.jsx
│   ├── lib/               # Utilities
│   │   └── utils.js       # Helper functions
│   ├── hooks/             # Custom React hooks
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── index.html             # HTML template
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
├── components.json        # shadcn/ui configuration
└── package.json
```

## Adding New shadcn/ui Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add calendar
```

## API Integration

The dashboard connects to the Express backend API at `/api/*`:

- `GET /api/dashboard` - Get dashboard data
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients/:id/test` - Test client connection
- `POST /api/clients/:id/audit` - Run SEO audit

Real-time updates are received via Socket.IO on the `/socket.io` endpoint.

## Customization

### Theming

Edit the CSS variables in `src/index.css` to customize colors:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* ... more variables */
}
```

Or use the shadcn/ui theme builder: https://ui.shadcn.com/themes

### Adding New Sections

1. Create a new page component in `src/pages/`
2. Add navigation item to `Sidebar.jsx`
3. Add route handling in `App.jsx`

Example:
```jsx
// In App.jsx
{currentSection === 'analytics' && <AnalyticsPage data={dashboardData} />}
```

## Environment Variables

Create a `.env` file in the dashboard directory:

```env
VITE_API_URL=http://localhost:9000
VITE_WS_URL=http://localhost:9000
```

## Deployment

### With Express Server

The Express server in the root directory can serve the built dashboard:

```bash
# Build the dashboard
cd dashboard
npm run build

# Start the Express server (from root)
cd ..
node dashboard-server.js
```

The dashboard will be served at `http://localhost:9000`

### Standalone Deployment

Deploy the built `dist/` folder to any static hosting service:

- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront
- GitHub Pages

## Troubleshooting

### Module not found errors

Make sure all dependencies are installed:
```bash
npm install
```

### Styles not applying

Check that Tailwind is properly configured and the CSS file is imported in `main.jsx`

### API requests failing

Verify the proxy configuration in `vite.config.js` points to your Express server

## License

MIT
