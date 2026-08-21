import sys
import subprocess

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFilter

# Create 1024x500 image
width, height = 1024, 500
feature_image = Image.new('RGB', (width, height))

# Create a gradient background
draw = ImageDraw.Draw(feature_image)
for y in range(height):
    # From top #4B0082 (Indigo) to bottom #00C853 (Green) (OmniQ colors roughly)
    r = int(75 - (y / height) * 75)
    g = int((y / height) * 200)
    b = int(130 - (y / height) * 47)
    draw.line([(0, y), (width, y)], fill=(r, g, b))

try:
    icon_path = "/Users/sru_raj/Documents/OmniQ_Ecommerce/frontend/assets/images/icon.png"
    icon = Image.open(icon_path).convert("RGBA")
    
    # Resize icon to 256x256
    icon = icon.resize((256, 256), Image.Resampling.LANCZOS)
    
    # Calculate position (center)
    x = (width - 256) // 2
    y = (height - 256) // 2
    
    # Paste icon with alpha channel
    feature_image.paste(icon, (x, y), icon)
except Exception as e:
    print(f"Warning: Could not add icon: {e}")

feature_image.save("/Users/sru_raj/Desktop/omniq_feature_graphic.png", format="PNG")
print("Saved to /Users/sru_raj/Desktop/omniq_feature_graphic.png")
