FROM node:18-alpine

# Install dependencies for node-gyp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S hakikisha -u 1001

# Change ownership of the app directory
RUN chown -R hakikisha:nodejs /usr/src/app
USER hakikisha

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js

# Start the application
CMD [ "npm", "start" ]