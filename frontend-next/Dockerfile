# Multi-stage Dockerfile for Next.js frontend

# 1) Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# 2) Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only the necessary output and minimal files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Install production deps only
RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
