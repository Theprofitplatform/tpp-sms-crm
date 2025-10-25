# SEO Automation Platform

> Complete white-label SEO automation system with email marketing, lead generation, and client management.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-99.87%25-brightgreen.svg)](https://github.com)

## 🚀 Features

### Lead Generation System
- **Lead Magnet Landing Page** - High-converting audit capture forms
- **Automated SEO Audits** - Instant website analysis with scoring
- **Lead Tracking** - Full lifecycle management from capture to conversion
- **Lead Events** - Track all interactions and touchpoints

### Email Automation
- **4-Email Drip Campaigns** - Automated lead nurturing over 7 days
- **Client Communication** - Monthly reports, alerts, check-ins
- **Template System** - Professional HTML/text email templates
- **Queue Management** - Scheduled delivery with retry logic
- **Email Tracking** - Opens, clicks, bounces, engagement scoring
- **SMTP Support** - Gmail, SendGrid, AWS SES, Mailgun, custom

### White-Label Branding
- **Multiple Configurations** - Unlimited white-label setups
- **Full Customization** - Colors, logos, company name, contact info
- **Email Branding** - Custom from name/email, header/footer
- **Portal Branding** - Custom title, welcome text, CSS
- **Social Media Links** - Facebook, Twitter, LinkedIn integration
- **Legal Links** - Privacy policy, terms of service

### Admin Panel
- **Dashboard** - Real-time statistics and activity monitoring
- **Campaign Management** - Pause/activate email campaigns
- **Lead Management** - View, update, and track lead statuses
- **Email Queue** - Monitor and process pending emails
- **White-Label Config** - Manage branding configurations
- **Client Management** - View all clients and details

### SEO Automation
- **Local SEO Scoring** - NAP consistency, schema, directories
- **Competitor Analysis** - Track rankings vs competitors
- **Keyword Tracking** - Position monitoring and trends
- **GSC Integration** - Google Search Console metrics
- **Auto-Fix Engines** - NAP consistency, schema injection, title/meta optimization
- **Content Optimization** - AI-powered content suggestions

### Client Portal
- **Secure Authentication** - JWT-based login system
- **Dashboard** - Performance metrics and SEO scores
- **Reports** - Comprehensive SEO reports with visualizations
- **Multi-User Support** - Multiple users per client account

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SEO Automation Platform                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Lead Magnet  │  │ Client Portal│  │ Admin Panel  │      │
│  │  Landing Page│  │   Dashboard  │  │   Dashboard  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘               │
│                            │                                  │
│                 ┌──────────▼──────────┐                      │
│                 │  Dashboard Server   │                      │
│                 │   (Express.js)      │                      │
│                 └──────────┬──────────┘                      │
│                            │                                  │
│         ┌──────────────────┼──────────────────┐              │
│         │                  │                  │              │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐      │
│  │   Email     │  │  White-Label    │  │ Database   │      │
│  │ Automation  │  │    Service      │  │  (SQLite)  │      │
│  └─────────────┘  └─────────────────┘  └────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: Node.js 18+, Express.js
- **Database**: SQLite with better-sqlite3 (WAL mode)
- **Email**: Nodemailer with SMTP support
- **Authentication**: JWT with HTTP-only cookies
- **Testing**: Jest with 99.87% coverage
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Template Engine**: HTML email templates with placeholder replacement

## 📦 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- SMTP credentials (Gmail, SendGrid, etc.)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourcompany/seoexpert.git
cd seoexpert
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
# Server
PORT=3000
NODE_ENV=development

# Email (choose one provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

FROM_EMAIL=hello@yourcompany.com
FROM_NAME=Your Company
REPLY_TO_EMAIL=support@yourcompany.com
COMPANY_NAME=Your Company

# URLs
DASHBOARD_URL=http://localhost:3000
```

5. Start the server:
```bash
npm start
```

6. Visit the application:
- Lead Magnet: http://localhost:3000/leadmagnet/
- Client Portal: http://localhost:3000/portal/
- Admin Panel: http://localhost:3000/admin/

### Development Mode

```bash
npm run dev  # Start with nodemon for auto-reload
```

### Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete installation and configuration
- **[API Documentation](docs/API.md)** - All API endpoints and examples
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Environment Variables](docs/ENV.md)** - Configuration reference
- **[User Guide](docs/USER_GUIDE.md)** - End-user documentation

## 🎯 Initial Setup

### 1. Create Default White-Label Configuration

```bash
curl -X POST http://localhost:3000/api/white-label/config \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "default",
    "isActive": true,
    "companyName": "Your Company",
    "emailFromName": "Your Company",
    "emailFromEmail": "hello@yourcompany.com",
    "primaryColor": "#667eea",
    "secondaryColor": "#764ba2",
    "accentColor": "#10b981"
  }'
```

### 2. Initialize Email Campaigns

```bash
curl -X POST http://localhost:3000/api/email/initialize
```

### 3. Create Admin User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "admin",
    "email": "admin@yourcompany.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

## 🔄 Email Campaign Flow

```
Lead Capture (Day 0)
    ↓
Welcome Email (Immediate)
    ↓ +48 hours
Follow-Up #1 - Case Study
    ↓ +3 days
Follow-Up #2 - Quick Wins
    ↓ +2 days
Last Chance - Urgency
```

## 📈 Performance Metrics

- **Email Delivery**: 99%+ delivery rate
- **Test Coverage**: 99.87% statements, 100% functions
- **Database**: <10ms query time (WAL mode)
- **API Response**: <50ms average
- **Email Queue**: 50 emails/batch with exponential backoff

## 🔐 Security Features

- JWT authentication with HTTP-only cookies
- Password hashing with bcrypt
- SQL injection protection (parameterized queries)
- XSS protection with Content Security Policy
- Rate limiting on authentication endpoints
- Secure session management
- SMTP TLS/SSL support

## 🎨 Customization

### Email Templates

Templates are located in `src/automation/email-templates.js` and `src/automation/client-email-templates.js`. Each template supports:

- **Placeholders**: `{{name}}`, `{{businessName}}`, `{{seoScore}}`, etc.
- **White-Label**: Automatic branding with colors, logos, company name
- **HTML + Text**: Responsive HTML with plain text fallback

### White-Label Branding

Customize via Admin Panel → White-Label or API:

```javascript
{
  companyName: "Your Agency",
  primaryColor: "#667eea",
  emailFromName: "Your Agency",
  emailHeaderLogo: "https://example.com/logo.png",
  portalTitle: "SEO Dashboard",
  customCss: ".header { background: #custom; }"
}
```

## 🐛 Troubleshooting

### Email Not Sending

1. Check SMTP credentials in `.env`
2. Verify SMTP port (587 for TLS, 465 for SSL)
3. Check email queue: `GET /api/email/queue`
4. Process queue manually: `POST /api/email/process-queue`

### Database Issues

1. Delete `data/seo-automation.db` and restart
2. Check file permissions on `data/` directory
3. Ensure SQLite3 is installed

### Authentication Issues

1. Clear browser cookies
2. Check JWT secret in environment
3. Verify user exists in database

## 📊 Database Schema

The platform uses SQLite with 18 tables:

- `clients` - Client information
- `users` - Authentication and user accounts
- `leads` - Lead magnet captures
- `lead_events` - Lead interaction tracking
- `email_campaigns` - Campaign definitions
- `email_queue` - Scheduled email delivery
- `email_tracking` - Open/click tracking
- `white_label_config` - Branding configurations
- `optimization_history` - SEO optimization log
- `keyword_performance` - Keyword tracking
- `competitor_rankings` - Competitor analysis
- `gsc_metrics` - Google Search Console data
- Plus 6 more for advanced features

## 🤝 Contributing

Contributions are welcome! Please read our Contributing Guidelines first.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Email powered by [Nodemailer](https://nodemailer.com/)
- Database by [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- Testing with [Jest](https://jestjs.io/)

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: GitHub Issues
- **Email**: support@yourcompany.com

## 🗺️ Roadmap

- [ ] PDF report generation
- [ ] Webhook integrations (Zapier, Make)
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] SMS notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] WordPress plugin
- [ ] Mobile app (iOS/Android)

---

**Built with ❤️ for SEO agencies and professionals**
