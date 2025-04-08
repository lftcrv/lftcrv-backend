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

if ! docker ps | grep -q "lftcrv-postgres-backend"; then
  echo "PostgreSQL is not running. Starting it now..."
  docker compose up -d postgres
  echo "PostgreSQL started!"
else
  echo "PostgreSQL is already running."
fi

# ✅ Ensure leftcurve_network exists
if ! docker network ls | grep -q "leftcurve_network"; then
  echo "Docker network leftcurve_network doesn't exist. Creating it..."
  docker network create leftcurve_network
  echo "Docker network leftcurve_network created!"
else
  echo "Docker network leftcurve_network already exists."
fi

# 🔄 Ensure Postgres is connected to the agent network
if ! docker network inspect leftcurve_network | grep -q "lftcrv-postgres-backend"; then
  echo "Connecting lftcrv-postgres-backend to leftcurve_network..."
  docker network connect leftcurve_network lftcrv-postgres-backend
  echo "✅ Connected!"
else
  echo "Postgres is already connected to leftcurve_network."
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
  PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d postgres -c "DROP DATABASE IF EXISTS \"$DATABASE_NAME\";"
  echo "Database deleted!"
fi
DB_EXISTS=$(PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DATABASE_NAME';")
if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating database $DATABASE_NAME..."
  PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d postgres -c "CREATE DATABASE \"$DATABASE_NAME\";"
  echo "Database created!"
else
  echo "Database already exists. Skipping creation."
fi
echo "Running Prisma migrations..."
npx prisma migrate dev --name init
echo "Generating Prisma client..."
npx prisma generate
echo "Setup complete! You can now run the application with: npm run start:dev"
