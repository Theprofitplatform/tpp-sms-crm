# Ops Service Dockerfile
# Stock Trading Automation System
# Using Ubuntu 24.04 for GLIBC 2.39 compatibility with better-sqlite3

FROM ubuntu:24.04

# Install Node.js 20.x and build tools
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user for security
RUN useradd -m -s /bin/bash appuser

# Copy package files
COPY package*.json ./

# Install dependencies, remove prebuilt binaries, and compile from source for Node 20
RUN npm ci --only=production && \
    rm -rf node_modules/better-sqlite3/prebuilds && \
    rm -rf node_modules/better-sqlite3/build && \
    cd node_modules/better-sqlite3 && npx node-gyp rebuild --release

# Copy application code
COPY . .

# Create data directory and set permissions
RUN mkdir -p /app/data && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 5100

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5100/health || exit 1

CMD ["node", "server.js"]
