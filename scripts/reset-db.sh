#!/bin/bash
# Reset local Supabase database and re-run migrations + seed
set -e

cd "$(dirname "$0")/.."

echo "🔄 Resetting local Supabase database..."
supabase db reset

echo "✅ Database reset complete!"
echo ""
echo "Test user credentials:"
echo "  Email: test@example.com"
echo "  Password: password123"
