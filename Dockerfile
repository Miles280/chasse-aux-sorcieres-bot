# --- Étape 1 : Compilation ---
FROM node:20-slim AS builder
WORKDIR /app

# On installe les outils de build ET les libs de dev pour canvas
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

RUN yarn install --immutable
COPY . .
RUN yarn build

# --- Étape 2 : Image finale de production ---
FROM node:20-slim
WORKDIR /app

# On installe UNIQUEMENT les runtimes graphiques (sans build-essential, bcp plus léger)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# On récupère uniquement ce qui est nécessaire depuis l'étape "builder"
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist 
COPY package.json ./

ENV NODE_ENV=production

CMD ["yarn", "start"]