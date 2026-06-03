from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from textwrap import wrap
from typing import List, Optional, Union


ROOT = Path(__file__).resolve().parent
SOURCE_PATH = ROOT / "PROCESS_GUIDE.md"
OUTPUT_PATH = ROOT / "Patrick_Glanville_Process_Guide_v2.pdf"

PAGE_WIDTH = 612
PAGE_HEIGHT = 792
MARGIN_X = 54
MARGIN_Y = 54
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2)


@dataclass
class Line:
    text: str
    font: str
    size: int
    leading: int


def escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def parse_markdown(path: Path) -> List[Line]:
    lines: List[Line] = []

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            lines.append(Line("", "F1", 11, 16))
            continue

        if stripped.startswith("# "):
            lines.append(Line(stripped[2:].strip(), "F2", 20, 26))
            continue

        if stripped.startswith("## "):
            lines.append(Line(stripped[3:].strip(), "F2", 15, 21))
            continue

        if stripped.startswith("- "):
            bullet_text = f"- {stripped[2:].strip()}"
            wrapped = wrap(bullet_text, width=88, subsequent_indent="  ")
            for part in wrapped:
                lines.append(Line(part, "F1", 11, 16))
            continue

        if stripped[0].isdigit() and ". " in stripped[:4]:
            wrapped = wrap(stripped, width=88, subsequent_indent="   ")
            for part in wrapped:
                lines.append(Line(part, "F1", 11, 16))
            continue

        wrapped = wrap(stripped, width=92)
        for part in wrapped:
            lines.append(Line(part, "F1", 11, 16))

    return lines


def paginate(lines: List[Line]) -> List[List[Line]]:
    pages: List[List[Line]] = []
    current_page: List[Line] = []
    available_height = PAGE_HEIGHT - (MARGIN_Y * 2)
    used_height = 0

    for line in lines:
        required = line.leading
        if current_page and used_height + required > available_height:
            pages.append(current_page)
            current_page = []
            used_height = 0
        current_page.append(line)
        used_height += required

    if current_page:
        pages.append(current_page)

    return pages


def build_content_stream(page_lines: List[Line]) -> bytes:
    commands = ["BT", f"{MARGIN_X} {PAGE_HEIGHT - MARGIN_Y} Td"]
    current_font: Optional[str] = None
    current_size: Optional[int] = None
    first_line = True

    for line in page_lines:
        if not first_line:
            commands.append(f"0 -{line.leading} Td")
        first_line = False

        if line.font != current_font or line.size != current_size:
            commands.append(f"/{line.font} {line.size} Tf")
            current_font = line.font
            current_size = line.size

        if line.text:
            commands.append(f"({escape_pdf_text(line.text)}) Tj")

    commands.append("ET")
    return "\n".join(commands).encode("latin-1", errors="replace")


def render_pdf_bytes(pages: List[List[Line]]) -> bytes:
    objects: List[bytes] = []

    def add_object(data: Union[str, bytes]) -> int:
        payload = data.encode("latin-1") if isinstance(data, str) else data
        objects.append(payload)
        return len(objects)

    font_regular_id = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold_id = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    content_ids: List[int] = []
    page_ids: List[int] = []

    for page_lines in pages:
        stream = build_content_stream(page_lines)
        stream_object = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1")
            + stream
            + b"\nendstream"
        )
        content_ids.append(add_object(stream_object))
        page_ids.append(0)

    pages_id_placeholder = add_object("<< /Type /Pages /Kids [] /Count 0 >>")

    for index, content_id in enumerate(content_ids):
        page_object = (
            f"<< /Type /Page /Parent {pages_id_placeholder} 0 R "
            f"/MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        )
        page_ids[index] = add_object(page_object)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id_placeholder - 1] = (
        f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("latin-1")
    )

    catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_id_placeholder} 0 R >>")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, payload in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin-1"))
        pdf.extend(payload)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF"
        ).encode("latin-1")
    )

    return bytes(pdf)


def main() -> int:
    lines = parse_markdown(SOURCE_PATH)
    pages = paginate(lines)
    OUTPUT_PATH.write_bytes(render_pdf_bytes(pages))
    print(f"Created PDF guide: {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
