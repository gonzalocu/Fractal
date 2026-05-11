# ── Etapa 1: build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ── Etapa 2: servidor ─────────────────────────────────────────
FROM nginx:alpine

# Configuración de nginx para SPA (rutas devuelven index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Archivos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
