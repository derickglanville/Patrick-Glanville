@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
"C:\Program Files\Python38\python.exe" "%SCRIPT_DIR%food_tracking_georgette_diet_reminder.py" >>"%SCRIPT_DIR%food-tracking-georgette-diet-reminder.log" 2>&1
