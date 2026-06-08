# Rich Email Utility

Save rich HTML reports from the dashboard into this folder:

`C:\Software Developement\ChatGPT Codex\Patrick Glanville\Email`

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

This utility uses Microsoft Outlook desktop when available. If Outlook desktop is not installed or not registered, it opens a Gmail compose window and opens the rich HTML file so you can attach it or copy the formatted report into the email.

## SMTP Setup For True Automatic Sending

To enable fully automatic local sending without Outlook, set up SMTP credentials on this machine:

```powershell
powershell -ExecutionPolicy Bypass -File .\Set-UrgencyReportSmtpCredential.ps1
```

For Gmail:

- turn on 2-Step Verification for the sender account
- create a Google App Password
- use that App Password when the script prompts for the SMTP password

The setup stores:

- `smtp-settings.json`
- `smtp-credential.clixml`

The credential file is encrypted for the current Windows user on this machine.

## Automatic Draft Creation

Browsers cannot run local PowerShell scripts automatically after a download. To get the same workflow safely, start the watcher before creating the HTML report:

```powershell
powershell -ExecutionPolicy Bypass -File .\Watch-RichUrgencyReports.ps1
```

Leave that window open. Each time a new `patrick-urgency-report-*.html` file is saved into this folder, the watcher will run `Send-RichUrgencyReport.ps1`. It opens a rich Outlook draft when Outlook desktop is available, otherwise it opens Gmail compose and the HTML report file.

To send automatically without review:

```powershell
powershell -ExecutionPolicy Bypass -File .\Watch-RichUrgencyReports.ps1 -Send
```

## Daily Local Generation

To generate the current urgency report directly from Supabase and save it into this folder without sending email:

```powershell
powershell -ExecutionPolicy Bypass -File .\Invoke-DailyUrgencyReport.ps1
```

That script:

- reads the Supabase URL and anon key from `..\supabase-config.js`
- pulls the current `tracker_state` row from Supabase
- saves `patrick-urgency-report-YYYY-MM-DD.html` into this `Email` folder
- moves older `patrick-urgency-report-*.html` files into `.\Archive`
- sends the email automatically by default when SMTP or Outlook is available

To open a draft manually:

```powershell
powershell -ExecutionPolicy Bypass -File .\Invoke-DailyUrgencyReport.ps1 -OpenDraft
```

To send immediately:

```powershell
powershell -ExecutionPolicy Bypass -File .\Invoke-DailyUrgencyReport.ps1 -Send
```

## Python SMTP Comparison

To test the older notebook-style SMTP flow on this machine, use:

```powershell
C:\Users\deric\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe .\send_rich_urgency_report.py
```

That script:

- reads `smtp-settings.json`
- decrypts `smtp-credential.clixml` for the current Windows user
- builds the message with Python MIME classes
- tries Gmail-style SMTP delivery with `starttls()` on port `587`
- falls back to Gmail SSL on port `465`

To validate the configuration without sending:

```powershell
C:\Users\deric\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe .\send_rich_urgency_report.py --print-only
```

## Patrick Update Notifications

To email yourself when Patrick makes tracker changes, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\Watch-PatrickUpdates.ps1
```

That watcher:

- polls the shared Supabase tracker
- checks for new history entries created by `patrick.glanville@gmail.com`
- sends an email summary to Deric listing every Patrick change that was captured
- includes item-type and user tags in the email summary
- includes a closed-items section whenever Patrick marks items `Done`
- stores a local checkpoint so it only reports new Patrick changes

Those tracked changes now include:

- task card updates
- running notes
- monthly bills
- Patrick To-Do Notes
- PDF uploads

## Patrick Change Report

To generate a Supabase-backed HTML report of Patrick's changes and closings for today and save it into this folder, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\Invoke-PatrickChangeReport.ps1 -GenerateOnly
```

That report:

- pulls Patrick's captured history directly from Supabase
- summarizes today's Patrick changes
- includes a separate section for items Patrick marked `Done`
- saves the current day's file into:
  - `C:\Software Developement\ChatGPT Codex\Patrick Glanville\Email`
- moves older `patrick-change-report-*.html` files into:
  - `C:\Software Developement\ChatGPT Codex\Patrick Glanville\Email\Archive`
- after a report is moved into `Archive`, it runs:
  - [send_daily_email.py](C:\Software%20Developement\ChatGPT%20Codex\Patrick%20Glanville\Scripts\send_daily_email.py:1)
  to send the archived Patrick change report email
- set the Gmail app password in the local environment before using the Python sender:
  - `setx PATRICK_REPORT_APP_PASSWORD "your-app-password"`
  - optionally override sender address with:
    - `setx PATRICK_REPORT_SENDER_EMAIL "dglanville@gmail.com"`

To keep that report updated automatically whenever Patrick makes changes, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\Watch-PatrickChangeReport.ps1
```

That watcher:

- polls Supabase for new Patrick history entries
- regenerates the current-day Patrick change report whenever Patrick changes something
- rolls the previous day's report into `Archive` once the date changes

## Email Recipients

The local email sender now reads its recipient list from:

- [smtp-settings.json](C:\Software%20Developement\ChatGPT%20Codex\Patrick%20Glanville\Email\smtp-settings.json:1)

The current configured recipients are:

- `dglanville@gmail.com`
- `patrick.glanville@gmail.com`

To run one check immediately instead of watching continuously:

```powershell
powershell -ExecutionPolicy Bypass -File .\Watch-PatrickUpdates.ps1 -Once
```

To send the notification to a different address:

```powershell
powershell -ExecutionPolicy Bypass -File .\Watch-PatrickUpdates.ps1 -Recipient "your-email@example.com"
```

To explicitly run generate-only mode for testing:

```powershell
powershell -ExecutionPolicy Bypass -File .\Invoke-DailyUrgencyReport.ps1 -GenerateOnly
```

## Manual Button Trigger Helper

If you want the dashboard's `Urgency Report` button to run the local PowerShell process directly, start the helper first:

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-UrgencyReportHelper.ps1
```

Then clicking the `Urgency Report` button in the dashboard will call the local helper, which runs `Invoke-DailyUrgencyReport.ps1` for you.

If the helper is not running, the dashboard falls back to browser-based folder save behavior.

## Separate 9:30 AM Scheduler

The `Claude - Anthropic` folder remains an independent process. For the separate Email-folder automation, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-DailyUrgencyEmailScheduler.ps1
```

That launcher starts:

- `scheduled_urgency_report_sender.py`
- uses `Scripts\send_daily_email.py` for the Gmail send step
- generates a fresh Urgent Report each day by running `Invoke-DailyUrgencyReport.ps1 -GenerateOnly`
- sends the report automatically at `9:30 AM`
- sends the urgency report to:
  - `dglanville@gmail.com`
  - `patrick.glanville@gmail.com`

If `python` is not on PATH, pass the full interpreter path:

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-DailyUrgencyEmailScheduler.ps1 -PythonCommand "C:\Path\To\python.exe"
```
