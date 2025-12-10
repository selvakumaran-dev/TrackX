FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema and generate
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001

CMD ["npm", "start"]
