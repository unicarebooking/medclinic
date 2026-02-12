@echo off
echo ====================================
echo DOCTOR SEARCH - Transcription Service
echo ====================================
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting transcription server on port 8000...
python server.py
pause
