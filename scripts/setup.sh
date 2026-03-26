#!/bin/bash

# RouteViz Setup Scaffolding Script
# This script automates the installation of dependencies across all 3 services.

echo "📍 Starting RouteViz Scaffolding..."

# 1. Backend
echo "📦 Setting up Backend..."
cd backend
npm install
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created backend/.env (Update your MAPBOX_TOKEN!)"
fi
cd ..

# 2. CV Service
echo "🐍 Setting up CV Service (Python)..."
cd cv-service
# check if venv exists
if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "✅ Created virtual environment"
fi
source venv/bin/activate
pip install -r requirements.txt
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created cv-service/.env"
fi
deactivate
cd ..

# 3. Frontend
echo "💻 Setting up Frontend..."
cd frontend
npm install
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created frontend/.env"
fi
cd ..

echo "----------------------------------------"
echo "🎉 Scaffolding Complete!"
echo "To start everything, run: docker-compose up"
echo "Or start services manually in 3 terminals."
echo "----------------------------------------"
