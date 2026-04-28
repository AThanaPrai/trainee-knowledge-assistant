FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
