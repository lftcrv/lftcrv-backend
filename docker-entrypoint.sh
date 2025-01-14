#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_retries=30
counter=0

until pnpm prisma db push --skip-generate; do
    counter=$((counter + 1))
    if [ $counter -gt $max_retries ]; then
        echo "Failed to connect to database after $max_retries attempts. Exiting..."
        exit 1
    fi
    echo "Database not ready. Retrying in 5 seconds... ($counter/$max_retries)"
    sleep 5
done

# Run migrations
echo "Running database migrations..."
pnpm prisma migrate deploy

# Start the application
echo "Starting the application..."
exec pnpm start:prod