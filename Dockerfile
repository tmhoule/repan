FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=src/prisma/schema.prisma
# Provide a dummy DATABASE_URL so the build doesn't fail trying to connect
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npm run build

# Create a minimal production deps stage with only runtime dependencies
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY src/prisma/schema.prisma ./src/prisma/schema.prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npm ci --omit=dev && \
    npx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migration script
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/src/scripts ./src/scripts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy production dependencies (includes pg, prisma, generated client, etc.)
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
