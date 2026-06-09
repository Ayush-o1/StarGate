FROM node:18-alpine AS base

# Install necessary tools
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm turbo

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Generate a partial monorepo with only the packages needed for the worker
RUN turbo prune --scope=@stargate/worker --docker

# Add lockfile and package.json's of isolated subworkspace
FROM node:18-alpine AS installer
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm turbo
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install

# Build the project
COPY --from=base /app/out/full/ .

# Generate Prisma Client
RUN pnpm --filter @stargate/database db:generate

RUN turbo run build --filter=@stargate/worker...

# Setup the runner image
FROM node:18-alpine AS runner
WORKDIR /app

# Don't run production as root
RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 workerjs
RUN adduser --system --uid 1001 workerjs
USER workerjs

COPY --from=installer /app .

CMD ["node", "apps/worker/dist/index.js"]
