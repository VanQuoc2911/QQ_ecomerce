#!/bin/bash

echo "========================================"
echo "   QQ E-commerce - Seed Database"
echo "========================================"
echo

echo "Starting MongoDB connection and data seeding..."
echo

cd backend
node seed-data.js

echo
echo "========================================"
echo "   Seed process completed!"
echo "========================================"
