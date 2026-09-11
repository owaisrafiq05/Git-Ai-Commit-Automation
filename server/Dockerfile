# Zero-dependency server, so this stays tiny - Alpine + Node is enough.
# Works both for Render (BACKEND=gemini) and for a real VM alongside an
# Ollama container (BACKEND=ollama) - see docker-compose.yml at repo root.
FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY index.js .

# Render sets PORT itself; 3000 is the local/compose default.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]
