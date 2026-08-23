# Image de production pour le site GPR (Next.js, sortie "standalone").
# Build :  docker compose build
# Lancer : docker compose up
# Le stack Supabase (base + auth) tourne séparément via `supabase start` (CLI, Docker aussi) —
# voir docker-compose.yml pour comment les deux se rejoignent en local.

FROM node:22-alpine AS base

# --- Dépendances ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (pas `ci`) : le lockfile généré sous Windows n'a pas toujours les
# variantes optionnelles natives Linux (ex. binaires Tailwind/lightningcss) —
# `install` les résout à la volée. Suffisant pour un usage dev local.
RUN npm install

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les clés publiques doivent être présentes au build (Next les inline côté client) ;
# fournies par docker-compose.yml via `args`/`environment` selon l'étape.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

# --- Exécution ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
