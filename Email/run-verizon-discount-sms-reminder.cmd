@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
"C:\Program Files\Python38\python.exe" "%SCRIPT_DIR%verizon_discount_sms_reminder.py" >>"%SCRIPT_DIR%verizon-discount-sms-task.log" 2>&1
