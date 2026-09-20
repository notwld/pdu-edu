FROM node:20.18.0

WORKDIR /app

# Copy package files
COPY package*.json /app

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . /app

# Build the application
RUN npm run build:dist

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create logs directory
RUN mkdir -p logs

# Install PM2 globally
RUN npm install -g pm2

EXPOSE 3000

# Use PM2 to start the application
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]

