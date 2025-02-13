#!/bin/bash

# Exit on error
set -e

echo "Setting up the development environment..."

# Check if .env file exists, if not, copy from .env.example
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update the .env file with your local settings if necessary."
fi

# Install main project dependencies
echo "Installing main project dependencies..."
pnpm install

# Install infrastructure project dependencies
echo "Installing infrastructure project dependencies..."
if [ -d "infrastructure" ]; then
    cd infrastructure
    pnpm install
    cd ..
    echo "Infrastructure dependencies installed successfully!"
else
    echo "Warning: Infrastructure directory not found. Skipping infrastructure setup."
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
docker compose up -d postgres || docker compose up -d postgres

echo "PostgreSQL is ready!"

# Create the database if it doesn't exist
PGPASSWORD=leftcurve psql -h localhost -U leftcurve -d postgres -c "CREATE DATABASE \"lftcrv\";" 2>/dev/null || true

echo "Database created or already exists"

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma db push --force-reset
npx prisma migrate dev --name init

echo "Generating Prisma client..."
npx prisma generate

echo "Setup complete! You can now run the application with: npm run start:dev"