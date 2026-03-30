FROM node:20-alpine

# Build arguments for deployment platforms (e.g., Coolify)
ARG COOLIFY_URL
ARG COOLIFY_FQDN
ARG SERVICE_URL_STRATOSFEAR
ARG VITE_GAME_SPEED=1.0
ARG VITE_API_URL
ARG SERVICE_FQDN_STRATOSFEAR

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

COPY . .

RUN npm run build

EXPOSE 3000 6969

ENV NODE_ENV=production
ENV VITE_GAME_SPEED=${VITE_GAME_SPEED}
ENV VITE_API_URL=${VITE_API_URL}

CMD ["npm", "run", "preview"]
