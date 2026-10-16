"""Generate the Home Screen and web manifest icons."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
MASTER_SIZE = 1024
image = Image.new("RGB", (MASTER_SIZE, MASTER_SIZE), "#123b5d")
draw = ImageDraw.Draw(image)

# The single initial stays legible at the small size used on a Home Screen.
font_path = Path("C:/Windows/Fonts/segoeuib.ttf")
font = ImageFont.truetype(str(font_path), 670)
bounds = draw.textbbox((0, 0), "B", font=font)
width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
draw.text(
    ((MASTER_SIZE - width) / 2 - bounds[0], (MASTER_SIZE - height) / 2 - bounds[1] - 12),
    "B",
    fill="white",
    font=font,
)
draw.ellipse((745, 120, 900, 275), fill="#f5c542")

for size in (180, 192, 512):
    image.resize((size, size), Image.Resampling.LANCZOS).save(
        ROOT / f"budget-notifications-{size}.png", optimize=True
    )
