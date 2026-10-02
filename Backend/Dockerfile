# ── Build stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Production stage ─────────────────────────────────────────────────
FROM node:20-alpine

# Security: add non-root user
RUN addgroup -g 1001 -S chopnow && \
    adduser -S chopnow -u 1001 -G chopnow

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=chopnow:chopnow . .

# Remove files that should not be in production image
RUN rm -rf tests/ scripts/ seed.js seed_test_user.js jest.config.js \
    eslint.config.mjs .prettierrc .prettierignore \
    *.md .git .github

# Set environment
ENV NODE_ENV=production
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Run as non-root
USER chopnow

CMD ["node", "server.js"]
