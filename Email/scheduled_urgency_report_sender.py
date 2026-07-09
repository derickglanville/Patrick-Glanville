import sys
from pathlib import Path


SCRIPT_FOLDER = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_FOLDER.parent

sys.path.insert(0, str(SCRIPT_FOLDER))

from weekly_report_scheduler import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
