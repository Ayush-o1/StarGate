FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm turbo

WORKDIR /app
COPY . .
RUN turbo prune --scope=@stargate/web --docker

FROM node:18-alpine AS installer
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm turbo
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install

COPY --from=base /app/out/full/ .
RUN turbo run build --filter=@stargate/web...

FROM nginx:alpine AS runner
COPY --from=installer /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
EXPOSE 5173
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# Nginx config to serve single page application and bind to 5173 (optional, default is 80)
# To keep simple, we expose 80 and map 5173:80 in compose
CMD ["nginx", "-g", "daemon off;"]
