# Rich Email Utility

Save rich HTML reports from the dashboard into this folder:

`C:\Software Development\Patrick Glanville\Email`

Then run `Send-RichUrgencyReport.ps1` to create an Outlook email addressed to all configured users.

Examples:

```powershell
powershell -ExecutionPolicy Bypass -File .\Send-RichUrgencyReport.ps1
```

The default behavior opens an Outlook draft so you can review it before sending.

To send immediately without review:

```powershell
powershell -ExecutionPolicy Bypass -File .\Send-RichUrgencyReport.ps1 -Send
```

This utility requires Microsoft Outlook desktop to be installed and configured.
