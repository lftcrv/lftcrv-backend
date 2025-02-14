#!/bin/bash

# Find all stopped containers with the image "julienbrs/eliza:latest" and remove them
echo "🔍 Searching for stopped containers with image 'julienbrs/eliza:latest'..."

# Get the list of stopped container IDs with the specified image
CONTAINERS_TO_REMOVE=$(docker ps -a --filter "ancestor=julienbrs/eliza:latest" --filter "status=exited" --format "{{.ID}}")

if [ -z "$CONTAINERS_TO_REMOVE" ]; then
  echo "✅ No stopped 'julienbrs/eliza:latest' containers found. Nothing to remove."
else
  echo "🗑 Removing stopped containers..."
  docker rm $CONTAINERS_TO_REMOVE
  echo "✅ Stopped containers removed successfully."
fi
