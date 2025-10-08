from PIL import Image
import os

INPUT_DIR = "documentation/generated"
QUALITY = 60  # qualità jpg (0-100)
MAX_WIDTH = 1080  # ridimensiona se più largo
MAX_HEIGHT = 720

def optimize_image(path):
    try:
        img = Image.open(path)
        img_format = img.format

        # Ridimensiona se troppo grande
        img.thumbnail((MAX_WIDTH, MAX_HEIGHT))

        # Salvataggio ottimizzato
        if img_format in ["JPEG", "JPG"]:
            img.save(path, "JPEG", optimize=True, quality=QUALITY)
        elif img_format == "PNG":
            img.save(path, "PNG", optimize=True)
        else:
            return  # ignora GIF, SVG, ecc.

        print(f"✔ Ottimizzata: {path}")
    except Exception as e:
        print(f"⚠ Errore su {path}: {e}")

for root, _, files in os.walk(INPUT_DIR):
    for file in files:
        if file.lower().endswith((".jpg", ".jpeg", ".png")):
            optimize_image(os.path.join(root, file))
