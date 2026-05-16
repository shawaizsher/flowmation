FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Run as non-root user
RUN addgroup -S flowa && adduser -S flowa -G flowa && \
    chown -R flowa:flowa /app
USER flowa

EXPOSE 4000

CMD ["node", "src/index.js"]
