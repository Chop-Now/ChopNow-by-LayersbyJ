import os
from PIL import Image

def main():
    img_path = r"C:\Users\ifegw\.gemini\antigravity-ide\brain\025e81ef-905e-40aa-bc64-630ee5b9d799\chopnow_premium_app_icon_1781864045161.png"
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    print("Horizontal cross section at y = 512:")
    # Print every 20th pixel
    for x in range(0, w, 20):
        print(f"x={x}: {img.getpixel((x, 512))}")

if __name__ == "__main__":
    main()
