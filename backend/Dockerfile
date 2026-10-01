FROM node:22-alpine

WORKDIR /app

# Prisma on Alpine needs OpenSSL available at runtime.
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npx prisma generate

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]