FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Ensure persistent data directories exist
RUN mkdir -p /data public/images

EXPOSE 3000

CMD ["node", "server.js"]
