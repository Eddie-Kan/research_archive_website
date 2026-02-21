# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/ ./packages/
RUN npm ci --include=dev

# Stage 2: Build the application
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/schema/node_modules ./packages/schema/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV RUNTIME_MODE=local
ENV DATABASE_URL=file:./data/archive.db
ENV CONTENT_REPO_PATH=./content-repo
ENV MEDIA_STORAGE_PATH=./content-repo/media
ENV EXPORT_STATIC=false

RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV RUNTIME_MODE=local
ENV DATABASE_URL=file:./data/archive.db
ENV CONTENT_REPO_PATH=./content-repo
ENV MEDIA_STORAGE_PATH=./content-repo/media
ENV HOST=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p data backups && chown -R nextjs:nodejs data backups

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
