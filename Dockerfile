FROM node:20-slim

# Install system dependencies for Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnss3-dev \
    libxss-dev \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and Chrome
RUN npm install
RUN npx puppeteer browsers install chrome

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8003

# Command to run the application
CMD ["npm", "start"]
