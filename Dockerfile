# ClipVault — Docker for Railway / Render / Fly.io
# Bundles yt-dlp + ffmpeg so YouTube/TikTok downloads work (own IP, not blocked)

FROM node:20-bullseye

# System deps: python3 + ffmpeg + yt-dlp
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && rm -rf /var/lib/apt/lists/* \
  && pip3 install --break-system-packages --no-cache-dir -U yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
