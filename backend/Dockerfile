# ── Stage 1: install deps + generate Prisma client ──
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# ── Stage 2: lean production image ──
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app ./

EXPOSE 4000
# Run pending migrations, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]