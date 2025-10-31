# SEO Automation Platform - New Dashboard

## Overview

A modern, React-based dashboard has been created using **shadcn/ui** components. This replaces the legacy HTML/CSS dashboard with a fully featured, component-based UI.

## Features

### 🎨 Modern UI Components
- Built with shadcn/ui and Tailwind CSS
- Fully responsive design
- Dark/Light mode toggle
- Professional component library

### 📊 Dashboard Features
- **Stats Overview**: Real-time metrics for clients, campaigns, rankings
- **Client Management**: Search, filter, and manage SEO clients
- **Recent Activity**: Live feed of system activities
- **Performance Charts**: Placeholder for analytics visualization
- **Sidebar Navigation**: Easy access to all platform features

### 🔧 Technical Stack
- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **shadcn/ui** - High-quality component library
- **Tailwind CSS** - Utility-first styling
- **Lucide Icons** - Beautiful icon set
- **Socket.IO Client** - Real-time updates

## Quick Start

### Development Mode

1. **Install dependencies:**
   ```bash
   cd dashboard
   npm install
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   Navigate to `http://localhost:5173`

The dev server includes:
- Hot Module Replacement (instant updates)
- API proxy to Express backend (port 9000)
- Real-time debugging

### Production Mode

1. **Build the dashboard:**
   ```bash
   cd dashboard
   npm run build
   ```

2. **Update Express server:**
   Edit `dashboard-server.js` and uncomment line 45:
   ```javascript
   app.use(express.static('dashboard/dist'));
   ```

3. **Start the server:**
   ```bash
   node dashboard-server.js
   ```

4. **Access dashboard:**
   Open `http://localhost:9000`

## Project Structure

```
dashboard/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── badge.jsx
│   │   │   ├── tabs.jsx
│   │   │   ├── dropdown-menu.jsx
│   │   │   └── input.jsx
│   │   ├── Sidebar.jsx            # Navigation sidebar
│   │   ├── StatsCards.jsx         # Dashboard statistics
│   │   ├── ClientsTable.jsx       # Client management table
│   │   └── RecentActivity.jsx     # Activity feed
│   ├── pages/
│   │   └── DashboardPage.jsx      # Main dashboard page
│   ├── lib/
│   │   └── utils.js               # Utility functions
│   ├── App.jsx                    # Main application
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Global styles + Tailwind
├── public/                        # Static assets
├── index.html                     # HTML template
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
├── components.json                # shadcn/ui configuration
├── package.json
├── README.md                      # Dashboard documentation
└── INSTALLATION.md                # Installation guide
```

## Using shadcn/ui Components

The dashboard is set up with shadcn/ui. To add new components:

```bash
cd dashboard
npx shadcn@latest add [component-name]
```

### Examples:

```bash
# Add a dialog component
npx shadcn@latest add dialog

# Add a select component
npx shadcn@latest add select

# Add multiple components
npx shadcn@latest add calendar date-picker form
```

### Available Components:
- button, card, badge, tabs, dialog, dropdown-menu
- input, select, checkbox, switch, radio-group
- toast, alert, popover, tooltip, hover-card
- table, sheet, accordion, separator
- calendar, command, context-menu, menubar
- progress, skeleton, slider, scroll-area
- And many more...

Full list: https://ui.shadcn.com/docs/components

## Customization

### Theme Colors

Edit `dashboard/src/index.css` to customize the color scheme:

```css
:root {
  --primary: 221.2 83.2% 53.3%;        /* Primary blue */
  --secondary: 210 40% 96.1%;          /* Light gray */
  --destructive: 0 84.2% 60.2%;        /* Red */
  --success: 142 76% 36%;              /* Green */
  /* ... more colors */
}
```

Or use the theme builder: https://ui.shadcn.com/themes

### Adding New Pages

1. Create a page component in `src/pages/`:
   ```jsx
   // src/pages/AnalyticsPage.jsx
   export function AnalyticsPage({ data }) {
     return (
       <div>
         <h1>Analytics</h1>
         {/* Your content */}
       </div>
     )
   }
   ```

2. Import and use in `App.jsx`:
   ```jsx
   import { AnalyticsPage } from './pages/AnalyticsPage'

   // In the render method:
   {currentSection === 'analytics' && <AnalyticsPage data={dashboardData} />}
   ```

3. The sidebar navigation is already configured!

### Adding Charts

The dashboard includes Recharts. Example usage:

```bash
npm install recharts
```

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const data = [
  { month: 'Jan', rankings: 4.2 },
  { month: 'Feb', rankings: 3.8 },
  // ...
]

<LineChart width={600} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="rankings" stroke="#8884d8" />
</LineChart>
```

## API Integration

The dashboard connects to your Express backend:

### Endpoints Used:
- `GET /api/dashboard` - Dashboard overview data
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients/:id/test` - Test client connection
- `POST /api/clients/:id/audit` - Run SEO audit

### Real-time Updates:
The dashboard connects to Socket.IO for live updates:

```javascript
// In App.jsx or custom hook
import io from 'socket.io-client'

const socket = io('http://localhost:9000')

socket.on('ranking-update', (data) => {
  // Handle ranking updates
})

socket.on('audit-complete', (data) => {
  // Handle audit completion
})
```

## Component Examples

### Using the Button Component

```jsx
import { Button } from '@/components/ui/button'

<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Using the Card Component

```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Your content */}
  </CardContent>
</Card>
```

### Using Dropdown Menu

```jsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Next Steps

### Immediate Enhancements:
1. **Add Authentication**: Implement login/logout functionality
2. **Connect Real APIs**: Replace mock data with actual backend calls
3. **Add Charts**: Implement Recharts for analytics visualization
4. **Build Other Sections**: Create pages for all sidebar items
5. **Add Form Validation**: Use react-hook-form + zod for forms

### Suggested Features:
- User management and permissions
- Advanced filtering and search
- Export functionality (PDF, CSV)
- Notifications system
- Activity logs
- Scheduled reports
- Custom widgets/dashboards

## Deployment Options

### 1. Integrated with Express (Recommended)
Best for keeping everything in one server.

### 2. Separate Static Hosting
Deploy to Vercel, Netlify, or Cloudflare Pages for CDN benefits.

### 3. Docker Container
Containerize for easy deployment and scaling.

### 4. Hybrid Approach
Static hosting for dashboard + Express for API only.

## Troubleshooting

### Common Issues:

**Port conflicts:**
```bash
# Change port in vite.config.js
server: { port: 3001 }
```

**Build errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**API not connecting:**
- Check Express server is running on port 9000
- Verify proxy settings in `vite.config.js`

**Styles not loading:**
- Ensure Tailwind is properly configured
- Check `index.css` is imported in `main.jsx`

## Resources

- **shadcn/ui Documentation**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **Vite**: https://vitejs.dev
- **React**: https://react.dev
- **Lucide Icons**: https://lucide.dev

## Support

For questions or issues:
1. Check `dashboard/README.md`
2. Review `dashboard/INSTALLATION.md`
3. Visit shadcn/ui documentation
4. Check the main project documentation

---

**Created with shadcn/ui** - A collection of re-usable components built with Radix UI and Tailwind CSS.
