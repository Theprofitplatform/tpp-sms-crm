# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1️⃣ Install Dependencies

```bash
cd dashboard
npm install
```

### 2️⃣ Start Development Server

```bash
npm run dev
```

### 3️⃣ Open in Browser

Visit: **http://localhost:5173**

---

## 📦 What's Included

✅ Modern React dashboard with shadcn/ui
✅ Dark/Light mode toggle
✅ Responsive sidebar navigation
✅ Client management table
✅ Real-time stats cards
✅ Activity feed
✅ Professional UI components

---

## 🛠️ Using the Setup Script

```bash
# Quick setup (checks Node.js + installs deps)
bash dashboard/package-scripts.sh setup

# Start development
bash dashboard/package-scripts.sh dev

# Build for production
bash dashboard/package-scripts.sh build

# Add new components
bash dashboard/package-scripts.sh add dialog
```

---

## 🏗️ Production Build

```bash
# 1. Build the dashboard
cd dashboard
npm run build

# 2. Edit ../dashboard-server.js
# Uncomment line 45:
# app.use(express.static('dashboard/dist'));

# 3. Start the server
cd ..
node dashboard-server.js

# 4. Open http://localhost:9000
```

---

## 🎨 Adding Components

Add any shadcn/ui component:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add calendar
npx shadcn@latest add form
```

Browse all components: https://ui.shadcn.com/docs/components

---

## 📖 Documentation

- **README.md** - Full documentation
- **INSTALLATION.md** - Detailed installation guide
- **DASHBOARD_GUIDE.md** (root) - Complete feature guide

---

## 🆘 Troubleshooting

**Port in use?**
Edit `vite.config.js` and change the port

**API not connecting?**
Make sure Express server is running on port 9000

**Build errors?**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 💡 Next Steps

1. Run the dev server and explore the dashboard
2. Customize the theme in `src/index.css`
3. Add more shadcn components as needed
4. Build additional pages for other sections
5. Connect to your backend APIs

Enjoy your new dashboard! 🎉
