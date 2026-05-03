#!/bin/bash
# Start local development environment
set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting local development environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if Supabase is already running
if supabase status > /dev/null 2>&1; then
    echo "✅ Supabase is already running"
else
    echo "📦 Starting Supabase..."
    supabase start
fi

echo ""
echo "🔗 Local URLs:"
echo "  Supabase Studio: http://127.0.0.1:54323"
echo "  Supabase API:    http://127.0.0.1:54321"
echo "  Mailpit:         http://127.0.0.1:54324"
echo ""
echo "📝 To start the backend:"
echo "  cd $(pwd) && uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo "📝 To start the frontend:"
echo "  cd $(pwd)/webapp && pnpm dev"
echo ""
echo "🔑 Test user:"
echo "  Email: test@example.com"
echo "  Password: password123"
