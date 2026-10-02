import os
from PIL import Image

def main():
    img_path = r"C:\Users\ifegw\.gemini\antigravity-ide\brain\025e81ef-905e-40aa-bc64-630ee5b9d799\chopnow_premium_app_icon_1781864045161.png"
    if not os.path.exists(img_path):
        print(f"Error: image not found at {img_path}")
        return

    # Open image
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    print(f"Original image size: {w}x{h}")

    # 1. Crop the squircle app icon.
    # The squircle spans roughly from 176 to 848 (width 672).
    # Let's crop it with a small margin to capture the soft shadow.
    squircle_box = (170, 170, 854, 854)
    cropped_squircle = img.crop(squircle_box)
    
    # Resize to standard 1024x1024
    app_icon = cropped_squircle.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    dest_dir = r"c:\Users\ifegw\ChopNow-3\Mobile\assets\images"
    app_icon_path = os.path.join(dest_dir, "app_icon.png")
    splash_logo_path = os.path.join(dest_dir, "splash_logo.png")
    
    app_icon.save(app_icon_path, "PNG")
    print(f"Saved cropped app icon to {app_icon_path}")
    
    # Splash screen logo - we can use the same cropped squircle or the symbol itself.
    # Let's use the cropped squircle.
    app_icon.save(splash_logo_path, "PNG")
    print(f"Saved splash logo to {splash_logo_path}")

    # 2. Extract the central symbol (green and orange leaf monogram).
    # Let's find all pixels that are colored green or orange.
    # Green pixels: G is high, R and B are lower.
    # Orange pixels: R is high, G is medium, B is low.
    # Let's write a mask filter.
    symbol_mask = Image.new("L", (w, h), 0)
    img_pixels = img.load()
    mask_pixels = symbol_mask.load()
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = img_pixels[x, y]
            is_green = (g > 70 and g > r + 15 and g > b + 25)
            is_orange = (r > 120 and g > 50 and b < 80 and r - b > 60)
            # Include transitions (blending) by detecting any non-white/non-grey pixels
            is_colored = is_green or is_orange
            if is_colored:
                mask_pixels[x, y] = 255
                
    symbol_bbox = symbol_mask.getbbox()
    if symbol_bbox:
        # Add a padding of 10 pixels around the symbol
        left = max(0, symbol_bbox[0] - 10)
        top = max(0, symbol_bbox[1] - 10)
        right = min(w, symbol_bbox[2] + 10)
        bottom = min(h, symbol_bbox[3] + 10)
        print(f"Detected symbol bounding box: {(left, top, right, bottom)}")
        
        symbol_cropped = img.crop((left, top, right, bottom))
        sc_w, sc_h = symbol_cropped.size
        
        # We want to paste the symbol centered in a 1024x1024 transparent canvas.
        fg_size = 1024
        foreground = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        
        # Scale symbol to fit well within safe zone (e.g. 600px of 1024px)
        scale_factor = 600.0 / max(sc_w, sc_h)
        nsw = int(sc_w * scale_factor)
        nsh = int(sc_h * scale_factor)
        symbol_resized = symbol_cropped.resize((nsw, nsh), Image.Resampling.LANCZOS)
        
        # We need to make the background of symbol_resized transparent.
        # The background of symbol_resized is the squircle white/light grey body.
        # Let's check each pixel in symbol_resized and make it transparent if it's close to white/light grey.
        sr_pixels = symbol_resized.load()
        for y in range(nsh):
            for x in range(nsw):
                r, g, b, a = sr_pixels[x, y]
                # If it's light grey or white, make it transparent
                # A pixel is light grey/white if all R, G, B channels are above 215
                if r > 215 and g > 215 and b > 210:
                    sr_pixels[x, y] = (0, 0, 0, 0)
                # Soft blend edges
                elif r > 195 and g > 195 and b > 190:
                    avg = (r + g + b) / 3.0
                    opacity = int(255 * (1.0 - (avg - 195) / (220 - 195)))
                    sr_pixels[x, y] = (r, g, b, min(a, max(0, opacity)))
                    
        paste_x = (fg_size - nsw) // 2
        paste_y = (fg_size - nsh) // 2
        foreground.paste(symbol_resized, (paste_x, paste_y), symbol_resized)
        
        foreground_path = os.path.join(dest_dir, "app_icon_foreground.png")
        foreground.save(foreground_path, "PNG")
        print(f"Saved adaptive foreground to {foreground_path}")
    else:
        print("Error: Could not detect symbol bounding box using color filters.")

if __name__ == "__main__":
    main()
