FROM node:22-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .

# Hardcode production URLs for Next.js build-time inlining.
# NEXT_PUBLIC_* vars must be present during `next build`.
ENV NEXT_PUBLIC_SUPABASE_URL=https://aaxjhvapcslcruhriggk.supabase.co
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_LaAUWZEOhLUR6Z35UJfdJA_iSz_dp-l
ENV NEXT_PUBLIC_API_URL=https://backend-production-b134.up.railway.app
ENV NEXT_PUBLIC_BACKEND_URL=https://backend-production-b134.up.railway.app

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

CMD ["node", "server.js"]
