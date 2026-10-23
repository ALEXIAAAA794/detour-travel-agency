FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/data
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"]
