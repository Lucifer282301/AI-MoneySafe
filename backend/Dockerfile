FROM node:22-alpine

# Prisma needs OpenSSL on Alpine
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production

# The schema must exist before npm ci because postinstall runs "prisma generate"
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY . .

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD wget -qO- http://localhost:4000/health || exit 1

# Apply pending migrations, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]