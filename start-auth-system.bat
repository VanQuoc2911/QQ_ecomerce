@echo off
echo ========================================
echo    QQ ECOMMERCE AUTH SYSTEM SETUP
echo ========================================
echo.

echo [1/5] Installing dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [2/5] Creating .env file...
echo # MongoDB Configuration > .env
echo MONGO_URI=mongodb://localhost:27017/qq_ecommerce >> .env
echo. >> .env
echo # JWT Secret >> .env
echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production >> .env
echo. >> .env
echo # Server Configuration >> .env
echo PORT=4000 >> .env
echo ✅ .env file created

echo.
echo [3/5] Seeding database with real data...
call npm run seed
if %errorlevel% neq 0 (
    echo ❌ Failed to seed database
    echo Make sure MongoDB is running on localhost:27017
    pause
    exit /b 1
)
echo ✅ Database seeded successfully

echo.
echo [4/5] Testing authentication system...
cd ..
node test-auth-complete.js
if %errorlevel% neq 0 (
    echo ❌ Authentication test failed
    pause
    exit /b 1
)
echo ✅ Authentication test passed

echo.
echo [5/5] Starting backend server...
cd backend
echo ✅ Backend server starting on http://localhost:4000
echo.
echo 📋 Available test accounts:
echo    Admin:   admin@qqecommerce.com   / admin123
echo    Seller:  seller@qqecommerce.com  / seller123
echo    Shipper: shipper@qqecommerce.com / shipper123
echo    System:  system@qqecommerce.com  / system123
echo    User:    user@qqecommerce.com    / user123
echo    User 2:  jane@qqecommerce.com   / user123
echo.
echo 🔧 Authentication Features:
echo    ✅ Real MongoDB database
echo    ✅ Password hashing with bcrypt
echo    ✅ JWT token authentication
echo    ✅ Role-based access control
echo    ✅ Comprehensive logging
echo    ✅ Input validation
echo    ✅ Error handling
echo.
echo Press Ctrl+C to stop the server
echo ========================================
call npm run dev
