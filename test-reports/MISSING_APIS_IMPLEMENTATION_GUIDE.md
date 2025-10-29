# Missing APIs Implementation Guide

**Document Purpose:** Detailed specifications for implementing missing API endpoints  
**Total Missing APIs:** 40+ endpoints  
**Priority:** High  
**Estimated Effort:** 9-13 development days  

---

## 📊 Quick Stats

| Category | Endpoints | Priority | Effort |
|----------|-----------|----------|--------|
| Recommendations | 3 | Critical | 1 day |
| Goals | 4 | Critical | 1 day |
| Notifications | 4 | Critical | 1 day |
| Webhooks | 6 | High | 2 days |
| White Label | 3 | High | 1 day |
| Settings | 2 | High | 0.5 day |
| Local SEO | 2 | Medium | 0.5 day |
| GSC Expansion | 2 | Medium | 1 day |
| Export/Backup | 4 | Medium | 1 day |
| WordPress | 3 | Medium | 1 day |
| Research | 3 | Low | 1 day |

**Total:** 36 endpoints, 9-13 days

---

## 🔴 CRITICAL PRIORITY - Sprint 1 (Week 1)

### 1. Recommendations API

**Purpose:** Power the RecommendationsPage with AI-generated SEO recommendations

#### Endpoints Needed

```javascript
// 1. GET /api/recommendations/:clientId
// Description: Get all recommendations for a client
// Returns: Array of recommendations with priority, status, impact estimate

app.get('/api/recommendations/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { status, priority, limit } = req.query;
  
  try {
    const recommendations = await recommendationsDB.getByClient(clientId, {
      status, // 'pending', 'applied', 'dismissed'
      priority, // 'critical', 'high', 'medium', 'low'
      limit: parseInt(limit) || 50
    });
    
    res.json({
      success: true,
      recommendations,
      meta: {
        total: recommendations.length,
        pending: recommendations.filter(r => r.status === 'pending').length,
        applied: recommendations.filter(r => r.status === 'applied').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/recommendations/generate/:clientId
// Description: Generate new recommendations based on latest audit
// Triggers: AI analysis of client's SEO data

app.post('/api/recommendations/generate/:clientId', async (req, res) => {
  const { clientId } = req.params;
  
  try {
    // Fetch latest audit data
    const auditData = await getLatestAudit(clientId);
    
    // Generate recommendations using AI or rule-based system
    const recommendations = await generateRecommendations(clientId, auditData);
    
    // Save to database
    await recommendationsDB.saveMany(recommendations);
    
    res.json({
      success: true,
      generated: recommendations.length,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. PUT /api/recommendations/:id/apply
// Description: Mark recommendation as applied (optionally auto-apply)
// Actions: Can trigger actual SEO changes if recommendation is actionable

app.put('/api/recommendations/:id/apply', async (req, res) => {
  const { id } = req.params;
  const { autoApply, notes } = req.body;
  
  try {
    const recommendation = await recommendationsDB.getById(id);
    
    if (autoApply && recommendation.actionable) {
      // Execute the recommendation automatically
      await executeRecommendation(recommendation);
    }
    
    // Update status
    await recommendationsDB.update(id, {
      status: 'applied',
      appliedAt: new Date(),
      notes
    });
    
    res.json({ success: true, recommendation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Database Schema

```sql
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL,
  type TEXT NOT NULL, -- 'content', 'technical', 'onpage', 'offpage'
  priority TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impactEstimate TEXT, -- 'High traffic increase', 'Better rankings'
  effortEstimate TEXT, -- 'Low', 'Medium', 'High'
  status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'dismissed'
  actionable BOOLEAN DEFAULT false,
  autoApplyConfig TEXT, -- JSON config for auto-apply
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  appliedAt DATETIME,
  notes TEXT
);
```

**Effort:** 1 day  
**Impact:** Makes RecommendationsPage fully functional  

---

### 2. Goals API

**Purpose:** Power the GoalsPage with goal tracking and achievement monitoring

#### Endpoints Needed

```javascript
// 1. GET /api/goals
// Description: Get all goals (optionally filter by client)

app.get('/api/goals', async (req, res) => {
  const { clientId, status, type } = req.query;
  
  try {
    const goals = await goalsDB.getAll({
      clientId,
      status, // 'active', 'achieved', 'failed', 'archived'
      type // 'traffic', 'ranking', 'conversions', 'engagement'
    });
    
    res.json({
      success: true,
      goals,
      stats: {
        total: goals.length,
        active: goals.filter(g => g.status === 'active').length,
        achieved: goals.filter(g => g.status === 'achieved').length,
        avgProgress: goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/goals
// Description: Create a new goal

app.post('/api/goals', async (req, res) => {
  const { clientId, type, title, description, targetValue, currentValue, deadline, metric } = req.body;
  
  try {
    const goal = {
      id: generateId(),
      clientId,
      type,
      title,
      description,
      targetValue,
      currentValue: currentValue || 0,
      metric, // 'visits', 'rank', 'conversions', etc.
      deadline,
      status: 'active',
      progress: 0,
      createdAt: new Date()
    };
    
    await goalsDB.create(goal);
    
    res.json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. PUT /api/goals/:id
// Description: Update goal (progress, status, or config)

app.put('/api/goals/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    // Calculate progress if currentValue changed
    if (updates.currentValue !== undefined) {
      const goal = await goalsDB.getById(id);
      updates.progress = Math.min(
        (updates.currentValue / goal.targetValue) * 100,
        100
      );
      
      // Check if goal achieved
      if (updates.progress >= 100 && goal.status === 'active') {
        updates.status = 'achieved';
        updates.achievedAt = new Date();
        
        // Send achievement notification
        await notifyGoalAchieved(goal);
      }
    }
    
    await goalsDB.update(id, updates);
    const updatedGoal = await goalsDB.getById(id);
    
    res.json({ success: true, goal: updatedGoal });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET /api/goals/:id/progress
// Description: Get detailed progress data for a goal

app.get('/api/goals/:id/progress', async (req, res) => {
  const { id } = req.params;
  const { period } = req.query; // 'week', 'month', 'all'
  
  try {
    const goal = await goalsDB.getById(id);
    const progressHistory = await goalsDB.getProgressHistory(id, period);
    
    res.json({
      success: true,
      goal,
      progressHistory,
      projection: calculateProjection(goal, progressHistory)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Database Schema

```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL,
  type TEXT NOT NULL, -- 'traffic', 'ranking', 'conversions', 'engagement'
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL, -- 'visits', 'rank', 'conversions', 'bounce_rate'
  targetValue REAL NOT NULL,
  currentValue REAL DEFAULT 0,
  progress REAL DEFAULT 0, -- Percentage 0-100
  deadline DATETIME,
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'failed', 'archived'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  achievedAt DATETIME,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goal_progress_history (
  id TEXT PRIMARY KEY,
  goalId TEXT NOT NULL,
  value REAL NOT NULL,
  progress REAL NOT NULL,
  recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goalId) REFERENCES goals(id)
);
```

**Effort:** 1 day  
**Impact:** Makes GoalsPage fully functional  

---

### 3. Notifications API

**Purpose:** Power NotificationCenterPage with user notifications

#### Endpoints Needed

```javascript
// 1. GET /api/notifications
// Description: Get notifications for current user

app.get('/api/notifications', async (req, res) => {
  const { status, type, limit } = req.query;
  
  try {
    const notifications = await notificationsDB.getAll({
      status, // 'unread', 'read', 'archived'
      type, // 'info', 'success', 'warning', 'error'
      limit: parseInt(limit) || 50
    });
    
    res.json({
      success: true,
      notifications,
      meta: {
        total: notifications.length,
        unread: notifications.filter(n => n.status === 'unread').length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. PUT /api/notifications/:id/read
// Description: Mark notification as read

app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  
  try {
    await notificationsDB.update(id, {
      status: 'read',
      readAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/notifications/preferences
// Description: Update notification preferences

app.post('/api/notifications/preferences', async (req, res) => {
  const { emailNotifications, pushNotifications, categories } = req.body;
  
  try {
    await settingsDB.updateNotificationPreferences({
      emailNotifications,
      pushNotifications,
      categories // Which types of notifications to receive
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. DELETE /api/notifications/:id
// Description: Delete/archive notification

app.delete('/api/notifications/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await notificationsDB.delete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### Database Schema

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'info', 'success', 'warning', 'error'
  category TEXT, -- 'audit', 'goal', 'issue', 'update'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Optional link to related page
  status TEXT DEFAULT 'unread', -- 'unread', 'read', 'archived'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  readAt DATETIME
);
```

**Effort:** 1 day  
**Impact:** Makes NotificationCenterPage fully functional  

---

## 🟡 HIGH PRIORITY - Sprint 2 (Week 2)

### 4. Webhooks API

**Purpose:** Enable webhook integrations for external systems

#### Endpoints Needed (6)

```javascript
GET  /api/webhooks           - List all webhooks
POST /api/webhooks           - Create webhook
PUT  /api/webhooks/:id       - Update webhook
DELETE /api/webhooks/:id     - Delete webhook
POST /api/webhooks/:id/test  - Test webhook delivery
GET  /api/webhooks/:id/logs  - Get delivery logs
```

#### Database Schema

```sql
CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of subscribed events
  secret TEXT,
  active BOOLEAN DEFAULT true,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastDelivery DATETIME,
  totalDeliveries INTEGER DEFAULT 0,
  successfulDeliveries INTEGER DEFAULT 0,
  failedDeliveries INTEGER DEFAULT 0
);

CREATE TABLE webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhookId TEXT NOT NULL,
  event TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  status INTEGER, -- HTTP status code
  responseTime INTEGER, -- milliseconds
  error TEXT,
  deliveredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhookId) REFERENCES webhooks(id)
);
```

**Effort:** 2 days  
**Impact:** Makes WebhooksPage fully functional  

---

### 5. White Label API

**Purpose:** Enable custom branding and white-label configuration

#### Endpoints Needed (3)

```javascript
GET  /api/white-label       - Get current white-label config
PUT  /api/white-label       - Update white-label settings
POST /api/white-label/logo  - Upload custom logo
```

**Effort:** 1 day  
**Impact:** Makes WhiteLabelPage fully functional  

---

### 6. Settings API

**Purpose:** User settings persistence

#### Endpoints Needed (2)

```javascript
GET  /api/settings  - Get user settings
PUT  /api/settings  - Update user settings
```

**Effort:** 0.5 day  
**Impact:** Makes SettingsPage fully functional  

---

## 🟠 MEDIUM PRIORITY - Sprint 3 (Weeks 3-4)

### 7-11. Expansion APIs

#### Local SEO Expansion
- GET /api/local-seo/scores
- GET /api/local-seo/:clientId

#### GSC Expansion
- GET /api/gsc/queries/:clientId
- GET /api/gsc/pages/:clientId

#### Export/Backup
- GET /api/export/:type
- POST /api/backup/create
- POST /api/backup/restore
- GET /api/backup/list

#### WordPress Expansion
- GET /api/wordpress/:clientId/posts
- GET /api/wordpress/:clientId/plugins
- POST /api/wordpress/:clientId/update

#### Research Expansion
- POST /api/v2/research/projects
- GET /api/v2/research/projects
- GET /api/v2/research/projects/:id

**Total Effort:** 3-4 days  
**Impact:** Removes all mock data, adds full functionality  

---

## 📋 Implementation Checklist

### For Each API Endpoint

- [ ] Define route in dashboard-server.js
- [ ] Create/update database schema
- [ ] Implement database operations (CRUD)
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add authentication/authorization (if needed)
- [ ] Test with curl/Postman
- [ ] Update API documentation
- [ ] Test integration with frontend
- [ ] Add logging
- [ ] Consider rate limiting
- [ ] Add to automated tests

---

## 🎯 Success Criteria

Each API implementation is complete when:
1. ✅ All endpoints respond correctly
2. ✅ Data persists to database
3. ✅ Frontend page fully functional
4. ✅ Error handling works
5. ✅ Tests pass
6. ✅ Documentation updated

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-28  
**Status:** Ready for Implementation
