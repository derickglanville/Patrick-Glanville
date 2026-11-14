"""Verify early email, due-day text, and shutdown behavior without sending mail."""

import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from Email import admin_notes_reminders_sms as reminders


class AdminNotesNotificationTests(unittest.TestCase):
    def test_early_email_moves_weekends_to_friday(self):
        self.assertEqual(reminders.email_send_date(date(2026, 11, 14)), date(2026, 11, 13))
        self.assertEqual(reminders.email_send_date(date(2026, 11, 15)), date(2026, 11, 13))
        self.assertEqual(reminders.email_send_date(date(2026, 11, 16)), date(2026, 11, 13))
        self.assertEqual(reminders.email_send_date(date(2026, 11, 17)), date(2026, 11, 16))
        self.assertEqual(reminders.email_send_date(date(2026, 11, 18)), date(2026, 11, 17))
        self.assertEqual(reminders.email_send_date(date(2026, 11, 19)), date(2026, 11, 18))

    def test_channels_have_independent_checkpoints_and_sms_stops(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "state.json"
            checkpoint = Path(folder) / "checkpoint.json"
            entry = {"id": "one", "title": "Follow up", "dueDate": "2026-11-16", "status": "Open"}
            closed = {"id": "closed", "title": "Finished", "dueDate": "2026-11-16", "status": "Completed"}
            source.write_text(json.dumps({"state": {"adminNotesReminders": [entry, closed]}}), encoding="utf-8")
            emails, texts = [], []
            with patch.object(reminders, "CHECKPOINT_PATH", checkpoint), \
                    patch.object(reminders, "send_email", side_effect=emails.append), \
                    patch.object(reminders, "send_sms", side_effect=texts.append):
                self.assertEqual(reminders.run_once(date(2026, 11, 13), state_file=str(source)), 0)
                self.assertEqual(reminders.run_once(date(2026, 11, 13), state_file=str(source)), 0)
                self.assertEqual((len(emails), len(texts)), (1, 0))
                self.assertEqual(reminders.run_once(date(2026, 11, 16), state_file=str(source)), 0)
                self.assertEqual(reminders.run_once(date(2026, 11, 16), state_file=str(source)), 0)
                self.assertEqual((len(emails), len(texts)), (1, 1))
                entry["dueDate"] = "2027-03-31"
                source.write_text(json.dumps({"state": {"adminNotesReminders": [entry]}}), encoding="utf-8")
                self.assertEqual(reminders.run_once(date(2027, 3, 31), state_file=str(source)), 0)
                self.assertEqual(len(texts), 1)


if __name__ == "__main__":
    unittest.main()
