# Build stage
FROM --platform=linux/amd64 node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ dos2unix

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies including prisma
RUN pnpm install --frozen-lockfile

# Copy source code and necessary files
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build application
RUN pnpm build

# Ensure entrypoint script has correct line endings and is executable
RUN dos2unix docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh

# Production stage
FROM --platform=linux/amd64 node:18-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev for prisma)
RUN pnpm install

# Copy prisma files and built application
COPY prisma ./prisma/
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Generate Prisma client in production
RUN pnpm prisma generate

# Copy and setup entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]