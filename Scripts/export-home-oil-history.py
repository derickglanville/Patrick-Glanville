"""Export the supplied workbook's dated delivery rows for the offline app."""
import datetime
import json
from pathlib import Path

import openpyxl

root = Path(__file__).resolve().parent.parent
sheet = openpyxl.load_workbook(root / "Home Heating Oil" / "Home Heating Oil.xlsx", data_only=True).active
rows = []
for row in list(sheet.values)[1:]:
    if not isinstance(row[0], datetime.datetime):
        continue
    rows.append({
        "id": "oil-import-" + row[0].strftime("%Y%m%d"),
        "date": row[0].strftime("%Y-%m-%d"),
        "gallons": row[1] or 0,
        "price": row[2] or 0,
        "amount": row[7],
        "paidBy": str(row[6] or ""),
        "company": str(row[8] or ""),
        "levelNote": str(row[5] or "") if not isinstance(row[5], datetime.datetime) else "",
        "notes": str(row[9] or ""),
    })
(root / "oil-history.js").write_text(
    "window.HOME_HEATING_OIL_HISTORY = " + json.dumps(rows, ensure_ascii=False, indent=2) + ";\n",
    encoding="utf-8",
)
print(f"Exported {len(rows)} delivery rows")
