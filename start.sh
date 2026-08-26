#!/bin/sh
# Ensure the uploads directory exists in the persistent volume
mkdir -p /app/data/uploads

# Ensure the database directory exists
mkdir -p /app/data

# Create symlink if it doesn't exist
if [ ! -L /app/public/uploads ]; then
  rm -rf /app/public/uploads
  ln -s /app/data/uploads /app/public/uploads
fi

# Start the Next.js app
exec node server.js
