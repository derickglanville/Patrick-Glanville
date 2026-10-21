@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
echo [%date% %time%] Admin bill due SMS task started.>>"%SCRIPT_DIR%admin-bill-due-sms-task.log"
"C:\Program Files\Python38\python.exe" "%SCRIPT_DIR%admin_bill_due_sms_alert.py" --run-if-due >>"%SCRIPT_DIR%admin-bill-due-sms-task.log" 2>&1
echo [%date% %time%] Admin bill due SMS task finished with exit code %ERRORLEVEL%.>>"%SCRIPT_DIR%admin-bill-due-sms-task.log"
exit /b %ERRORLEVEL%
