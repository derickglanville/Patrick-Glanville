@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
echo [%date% %time%] Admin Notes & Reminders SMS task started.>>"%SCRIPT_DIR%admin-notes-reminders-sms-task.log"
"C:\Program Files\Python38\python.exe" "%SCRIPT_DIR%admin_notes_reminders_sms.py" >>"%SCRIPT_DIR%admin-notes-reminders-sms-task.log" 2>&1
echo [%date% %time%] Admin Notes & Reminders SMS task finished with exit code %ERRORLEVEL%.>>"%SCRIPT_DIR%admin-notes-reminders-sms-task.log"
endlocal
