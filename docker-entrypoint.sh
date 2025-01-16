#!/bin/sh
set -e

# Function to wait for database and run migrations
wait_for_db_and_migrate() {
    echo "Waiting for database to be ready..."
    max_retries=30
    counter=0

    until pnpm prisma migrate deploy || [ $counter -gt $max_retries ]
    do
        counter=$((counter+1))
        if [ $counter -gt $max_retries ]; then
            echo "Failed to connect to database after $max_retries attempts"
            exit 1
        fi
        echo "Database not ready. Retrying in 5 seconds... ($counter/$max_retries)"
        sleep 5
    done

    echo "Migrations completed successfully"
}

# Check if we're running in migration mode
if [ "$RUN_MIGRATIONS" = "true" ]; then
    wait_for_db_and_migrate
else
    # Start the application
    echo "Starting application..."
    exec node dist/main
fi