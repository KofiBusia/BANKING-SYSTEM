@echo off
echo Starting GhanaBank Backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo ===================================================
echo  GhanaBank Backend starting on http://localhost:5000
echo  Admin: admin@ghanabank.com / Admin@GhanaBank2024
echo ===================================================
echo.
python app.py
