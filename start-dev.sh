#!/bin/bash

echo "🚀 Starting QQ E-commerce Development Environment..."

echo ""
echo "📦 Starting Backend Server..."
cd backend && npm run dev &
BACKEND_PID=$!

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "🎨 Starting Frontend Server..."
cd ../web && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo "📡 Backend: http://localhost:4000"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for user to stop
wait
