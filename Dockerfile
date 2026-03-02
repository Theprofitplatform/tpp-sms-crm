# WordPress SEO Automation Tool - Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Base
FROM node:25-alpine AS base
LABEL maintainer="Instant Auto Traders"
LABEL description="WordPress SEO Audit and Automation Tool v2.0.0"

# Install basic dependencies
RUN apk add --no-cache \
    curl \
    bash \
    git

WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Stage 3: Development
FROM dependencies AS development

# Install dev dependencies
RUN npm ci

# Copy source code
COPY . .

# Stage 4: Production
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 seouser && \
    adduser -D -u 1001 -G seouser seouser

# Copy production dependencies
COPY --from=dependencies --chown=seouser:seouser /app/node_modules ./node_modules

# Copy application code
COPY --chown=seouser:seouser . .

# Create logs directory
RUN mkdir -p logs && \
    chown -R seouser:seouser logs

# Switch to non-root user
USER seouser

# Environment variables with defaults
ENV NODE_ENV=production \
    DRY_RUN=true \
    LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command (updated for new structure)
CMD ["node", "src/index.js"]

# Labels for metadata
LABEL version="2.0.0"
LABEL org.opencontainers.image.title="WordPress SEO Automation"
LABEL org.opencontainers.image.description="Automated SEO auditing and optimization for WordPress v2.0.0"
LABEL org.opencontainers.image.url="https://github.com/instantautotraders/seo-expert"
LABEL org.opencontainers.image.source="https://github.com/instantautotraders/seo-expert"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.created="2025-10-18"
