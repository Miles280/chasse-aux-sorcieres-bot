# --- Étape 1 : Compilation ---
FROM node:20-slim AS builder
WORKDIR /app

# On active corepack pour forcer l'utilisation de la version de Yarn définie dans le projet
RUN corepack enable && corepack prepare yarn@4.10.3 --activate

# Limiter la mémoire de Node.js pendant le build
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

# Installation avec Yarn v4 (grâce à corepack)
RUN yarn install --immutable --network-timeout 100000

COPY . .
RUN yarn build

# --- Étape 2 : Image finale de production ---
FROM node:20-slim
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.10.3 --activate

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