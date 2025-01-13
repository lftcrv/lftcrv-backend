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

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Start PostgreSQL
echo "Starting PostgreSQL..."
docker compose up -d postgres || docker-compose up -d postgres

echo "PostgreSQL is ready!"

# Create the database if it doesn't exist
PGPASSWORD=carbonable psql -h localhost -U carbonable -d postgres -c "CREATE DATABASE \"ccrp-projectdev\";" 2>/dev/null || true

echo "Database created or already exists"

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma db push --force-reset
npx prisma migrate dev --name init

echo "Generating Prisma client..."
npx prisma generate

echo "Setup complete! You can now run the application with: npm run start:dev"