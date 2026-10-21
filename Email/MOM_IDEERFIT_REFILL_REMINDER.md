# Mom IDeerFit Refill Reminder

The dashboard's **Mom's IDeerFit** button opens the shared refill tracker. It is visible only when Derick's account is selected and is seeded from the Mom Medication Schedule workbook.

- The dispenser is refilled every 14 days.
- Initial last refill date: August 30, 2026.
- The reminder is sent one day before the next refill as a Verizon text to Derick only.
- The text is: `It is time to refill the IDeerFit refill tracker for mom.`
- The text does not include medication names, dosages, dates, or attachments.
- The local task runs daily at 9:30 AM and sends only when a reminder is due.

Install the scheduled task from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\Email\Install-MomIDeerFitRefillReminderTask.ps1
```

Preview the safe test text without sending it:

```powershell
powershell -ExecutionPolicy Bypass -File .\Email\Run-MomIDeerFitRefillReminder.ps1 --send-now --dry-run
```

Send a manual test text:

```powershell
powershell -ExecutionPolicy Bypass -File .\Email\Run-MomIDeerFitRefillReminder.ps1 --send-now
```
