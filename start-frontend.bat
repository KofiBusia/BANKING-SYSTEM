@echo off
echo Starting GhanaBank Frontend...
cd frontend
if not exist node_modules (
    echo Installing npm packages...
    npm install
)
echo.
echo ===================================================
echo  GhanaBank Frontend starting on http://localhost:5173
echo ===================================================
echo.
npm run dev
