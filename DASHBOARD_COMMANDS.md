# 🚀 Dashboard - Command Reference

Quick reference for all dashboard commands and operations.

---

## 📦 Installation

```bash
# Navigate to dashboard
cd dashboard

# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

---

## 🛠️ Development

### Start Development Server
```bash
npm run dev
```
- Opens at: **http://localhost:5173**
- Hot Module Replacement enabled
- API proxied to http://localhost:9000

### Start with Helper Script
```bash
bash package-scripts.sh dev
```

---

## 🏗️ Production Build

### Build for Production
```bash
npm run build
```
- Output directory: `dist/`
- Minified and optimized
- Source maps included

### Preview Production Build
```bash
npm run preview
```
- Test production build locally
- Opens at: http://localhost:4173

---

## 🧩 Adding Components

### Add shadcn/ui Component
```bash
npx shadcn@latest add [component-name]
```

### Examples
```bash
# Add select dropdown
npx shadcn@latest add select

# Add date picker
npx shadcn@latest add calendar

# Add form components
npx shadcn@latest add form

# Add skeleton loader
npx shadcn@latest add skeleton

# Add multiple at once
npx shadcn@latest add select calendar form
```

### Browse All Components
```bash
# Visit
https://ui.shadcn.com/docs/components
```

---

## 🧹 Maintenance

### Clean Build Artifacts
```bash
rm -rf dist
rm -rf node_modules/.vite
```

### Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Update Dependencies
```bash
npm update
```

---

## 🔧 Helper Scripts

### Using package-scripts.sh

```bash
# Setup (check Node.js + install deps)
bash package-scripts.sh setup

# Start development
bash package-scripts.sh dev

# Build for production
bash package-scripts.sh build

# Preview production build
bash package-scripts.sh preview

# Add shadcn component
bash package-scripts.sh add dialog

# Clean build artifacts
bash package-scripts.sh clean

# Show help
bash package-scripts.sh help
```

---

## 🌐 Integration with Express

### Serve Built Dashboard

1. **Build the dashboard:**
   ```bash
   cd dashboard
   npm run build
   ```

2. **Edit `../dashboard-server.js`** (line 45):
   ```javascript
   // Uncomment this line:
   app.use(express.static('dashboard/dist'));
   ```

3. **Start Express server:**
   ```bash
   cd ..
   node dashboard-server.js
   ```

4. **Access dashboard:**
   - URL: **http://localhost:9000**
   - Dashboard + API on same server

---

## 📊 Testing

### Run in Development Mode
```bash
npm run dev
```
Test at: http://localhost:5173

### Test Production Build
```bash
npm run build
npm run preview
```
Test at: http://localhost:4173

### Test Features
1. **Dashboard page** - Stats, clients, activity
2. **Analytics page** - Metrics, charts, keywords
3. **Settings page** - All 5 tabs
4. **Toast notifications** - Click sidebar items
5. **Theme toggle** - Dark/light mode
6. **Responsive design** - Resize browser

---

## 🎨 Customization

### Change Theme Colors
```bash
# Edit src/index.css
# Modify CSS variables in :root
```

### Add New Page
```bash
# 1. Create src/pages/NewPage.jsx
# 2. Import in App.jsx
# 3. Add routing logic
```

### Modify Sidebar
```bash
# Edit src/components/Sidebar.jsx
# Update navGroups array
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Edit vite.config.js
# Change port in server.port
```

### Module Not Found
```bash
npm install
# or
rm -rf node_modules && npm install
```

### Build Errors
```bash
# Clear cache
rm -rf node_modules/.vite dist

# Reinstall
npm install

# Build again
npm run build
```

### Styles Not Loading
```bash
# Verify imports in main.jsx
# Check Tailwind config
# Clear browser cache
```

---

## 📂 File Operations

### Create New Component
```bash
# Create file
touch src/components/MyComponent.jsx

# Or use shadcn
npx shadcn@latest add [component]
```

### Create New Page
```bash
touch src/pages/MyPage.jsx
```

### Create New Hook
```bash
touch src/hooks/use-my-hook.js
```

---

## 🔍 Inspection

### View Build Output
```bash
ls -la dist/
ls -la dist/assets/
```

### Check Dependencies
```bash
npm list
npm list --depth=0
npm outdated
```

### View Package Info
```bash
cat package.json
```

### Check Build Size
```bash
npm run build
# Check output for file sizes
```

---

## 🚀 Deployment

### Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd dashboard
vercel
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd dashboard
npm run build
netlify deploy --prod --dir=dist
```

### Deploy to GitHub Pages
```bash
# Build
npm run build

# Deploy dist/ folder to gh-pages branch
```

### Deploy with Docker
```bash
# Create Dockerfile
# Build image
docker build -t seo-dashboard .

# Run container
docker run -p 3000:80 seo-dashboard
```

---

## 📝 Quick Commands Cheat Sheet

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npx shadcn@latest add X` | Add shadcn component |
| `bash package-scripts.sh setup` | Setup dashboard |
| `bash package-scripts.sh dev` | Start development |
| `bash package-scripts.sh build` | Build production |

---

## 🎯 Common Workflows

### Daily Development
```bash
cd dashboard
npm run dev
# Develop in browser
# Save files (auto-reload)
```

### Adding Feature
```bash
# 1. Create component/page
# 2. Import in App.jsx
# 3. Test in dev mode
npm run dev
```

### Before Commit
```bash
# Test build
npm run build

# Preview
npm run preview

# Verify everything works
```

### Deploying Update
```bash
# Build
npm run build

# Test preview
npm run preview

# If good, deploy dist/
```

---

## 🆘 Getting Help

### Documentation
- `README.md` - Full documentation
- `INSTALLATION.md` - Setup guide
- `QUICK_START.md` - Quick reference
- `DASHBOARD_GUIDE.md` - Feature guide
- `DASHBOARD_UPDATE.md` - Latest changes

### Online Resources
- shadcn/ui: https://ui.shadcn.com
- Vite: https://vitejs.dev
- Tailwind: https://tailwindcss.com
- React: https://react.dev

### Check Logs
```bash
# Development logs
npm run dev
# Watch console output

# Build logs
npm run build
# Check for errors
```

---

## ✅ Pre-Launch Checklist

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Test all features
# - Navigate all pages
# - Test theme toggle
# - Check responsive design

# 4. Build for production
npm run build

# 5. Preview build
npm run preview

# 6. Deploy
# - Copy dist/ to server
# - Or deploy to hosting
```

---

**All commands ready to use!** 🚀

For full documentation, see:
- `dashboard/README.md`
- `DASHBOARD_GUIDE.md`
- `DASHBOARD_UPDATE.md`
