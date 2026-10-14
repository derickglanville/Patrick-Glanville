@echo off
set "SCRIPT_DIR=%~dp0"
"C:\Program Files\Python38\python.exe" "%SCRIPT_DIR%home_heating_oil_sms.py" >>"%SCRIPT_DIR%home-heating-oil-sms-task.log" 2>&1
