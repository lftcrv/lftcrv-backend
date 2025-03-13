#!/bin/bash
set -e
show_help() {
  echo "Development environment setup script"
  echo ""
  echo "Options:"
  echo " -h, --help Display this help"
  echo " -c, --clean Completely erase the database and recreate it"
  echo ""
}
CLEAN_DB=false
while [ "$1" != "" ]; do
  case $1 in
  -c | --clean)
    CLEAN_DB=true
    ;;
  -h | --help)
    show_help
    exit
    ;;
  *)
    show_help
    exit 1
    ;;
  esac
  shift
done
echo "Setting up the development environment..."
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env
  echo "Please update the .env file with your local settings if necessary."
fi
source .env
if ! docker ps | grep -q "lftcrv-postgres"; then
  echo "PostgreSQL is not running. Starting it now..."
  docker compose up -d postgres
  echo "PostgreSQL started!"
  
  # Add a delay to ensure PostgreSQL is fully ready
  echo "Waiting for PostgreSQL to be fully ready..."
  sleep 5
  
  # Test connection until it succeeds or times out
  MAX_RETRIES=10
  RETRY_COUNT=0
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
      echo "PostgreSQL is ready!"
      break
    fi
    
    echo "PostgreSQL not ready yet, waiting..."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
  done
  
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Failed to connect to PostgreSQL after multiple attempts. Please check the logs."
    exit 1
  fi
else
  echo "PostgreSQL is already running."
fi
if [ "$CLEAN_DB" = true ]; then
  echo "Warning: You are about to delete the database $DATABASE_NAME. This action cannot be undone."
  read -p "Are you sure? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Database deletion aborted."
    exit 1
  fi
  read -p "Are you absolutely sure? This will erase all data. (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Database deletion aborted."
    exit 1
  fi
  echo "Clean option enabled: removing database $DATABASE_NAME..."
  PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d postgres -c "DROP DATABASE IF EXISTS \"$DATABASE_NAME\";"
  echo "Database deleted!"
fi
DB_EXISTS=$(PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DATABASE_NAME';")
if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating database $DATABASE_NAME..."
  PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -U $DATABASE_USER -d postgres -c "CREATE DATABASE \"$DATABASE_NAME\";"
  echo "Database created!"
else
  echo "Database already exists. Skipping creation."
fi
echo "Running Prisma migrations..."
npx prisma migrate dev --name init
echo "Generating Prisma client..."
npx prisma generate
echo "Setup complete! You can now run the application with: npm run start:dev"
