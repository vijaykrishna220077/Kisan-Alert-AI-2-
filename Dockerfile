# Use Python 3.11 slim as base image
FROM python:3.11-slim

# Set environment variables to prevent interactive prompts during apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install curl and necessary system dependencies for Node.js and OpenCV
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (version 20.x)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency files first to leverage Docker cache
COPY package.json package-lock.json* ./
COPY backend/requirements.txt ./backend/

# Install Node modules
RUN npm install

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy all project files
COPY . .

# Build the Vite React app and the server bundle
RUN npm run build

# Expose the port the Express server runs on
EXPOSE 3000

# Start the unified server (which spawns both Node.js and Python FastAPI)
CMD ["npm", "start"]
