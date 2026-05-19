# --- Étape 1 : Compilation ---
FROM node:20-slim AS builder
WORKDIR /app

# Limiter la mémoire de Node.js pendant le build pour éviter le crash du VPS
ENV NODE_OPTIONS="--max-old-space-size=450"

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# On force Yarn à ne pas consommer trop de CPU/RAM en parallèle
RUN yarn install --immutable --network-timeout 100000

COPY . .
RUN yarn build

# --- Étape 2 : Image finale de production ---
FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist 
COPY package.json ./

ENV NODE_ENV=production

CMD ["yarn", "start"]