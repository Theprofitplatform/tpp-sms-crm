# Keyword Research Dashboard - Frontend

Modern, interactive dashboard for the Keyword Research Tool built with React, TypeScript, and Tailwind CSS.

## Features

- 📊 **Interactive Visualizations**: Real-time charts and graphs using Recharts
- 🔄 **Real-time Updates**: WebSocket integration for live progress tracking
- 📱 **Responsive Design**: Mobile-first approach with Tailwind CSS
- ⚡ **Fast Performance**: Optimized with Vite and React Query
- 🎨 **Modern UI**: Beautiful interface with Framer Motion animations

## Tech Stack

- **React 18** with TypeScript
- **Vite** for blazing fast development
- **Tailwind CSS** for styling
- **React Query** for server state management
- **Recharts** for data visualization
- **Socket.IO** for real-time communication
- **Framer Motion** for animations
- **React Router** for navigation

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:3000` and proxy API requests to the Flask backend at `http://localhost:5000`.

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/      # Basic components (Button, Card, etc.)
│   ├── charts/      # Chart components
│   ├── tables/      # Table components
│   ├── modals/      # Modal dialogs
│   └── layout/      # Layout components
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── services/        # API and WebSocket services
├── store/           # State management
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── App.tsx          # Main app component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

The frontend uses Vite's proxy configuration to connect to the backend. No environment variables are required for basic setup.

## Key Features

### Dashboard Overview
- Project statistics and metrics
- Recent projects with quick access
- Quick start guide for new users

### Project Dashboard
- Real-time keyword data
- Interactive charts (Intent Distribution, Difficulty vs Volume, Opportunity Funnel)
- Advanced keyword table with filtering and sorting
- Export functionality

### Real-time Progress
- Live updates during project creation
- WebSocket integration for instant feedback
- Progress bars and status indicators

## Contributing

When adding new features:
1. Create reusable components in `components/`
2. Use TypeScript for type safety
3. Follow the existing code style
4. Test responsive design
5. Ensure accessibility

## License

Part of the Keyword Research Tool project.
