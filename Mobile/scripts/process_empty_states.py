import os
from PIL import Image

def process_image(src_path, dest_path):
    if not os.path.exists(src_path):
        print(f"Error: source not found at {src_path}")
        return False
        
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    
    # 1. Key out white background.
    # The background is solid white (255, 255, 255).
    # We will make any pixel that is very close to white transparent, with a smooth alpha transition.
    img_pixels = img.load()
    
    # Find bounding box of non-white pixels
    # Let's create a temporary binary mask for bounding box detection
    mask = Image.new("L", (w, h), 0)
    mask_pixels = mask.load()
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = img_pixels[x, y]
            # If it's not white, it's part of the object
            if r < 250 or g < 250 or b < 250:
                mask_pixels[x, y] = 255
                
    bbox = mask.getbbox()
    if not bbox:
        print(f"Error detecting bbox for {src_path}")
        return False
        
    # Crop to the object's bounding box
    # Add a padding of 20 pixels around the object
    padding = 20
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(w, bbox[2] + padding)
    bottom = min(h, bbox[3] + padding)
    
    cropped = img.crop((left, top, right, bottom))
    cw, ch = cropped.size
    
    # Resize to max 600px width/height while maintaining aspect ratio,
    # then place it centered inside a 512x512 transparent canvas.
    canvas_size = 512
    final_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    
    scale = 420.0 / max(cw, ch)
    nw = int(cw * scale)
    nh = int(ch * scale)
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    
    # Apply transparency to resized image
    r_pixels = resized.load()
    for y in range(nh):
        for x in range(nw):
            r, g, b, a = r_pixels[x, y]
            # Key out white / light grey
            # R, G, B all > 248 is white
            if r > 248 and g > 248 and b > 248:
                r_pixels[x, y] = (0, 0, 0, 0)
            elif r > 235 and g > 235 and b > 235:
                # Soft edge blending
                avg = (r + g + b) / 3.0
                opacity = int(255 * (1.0 - (avg - 235) / (248 - 235)))
                r_pixels[x, y] = (r, g, b, min(a, max(0, opacity)))
                
    paste_x = (canvas_size - nw) // 2
    paste_y = (canvas_size - nh) // 2
    final_img.paste(resized, (paste_x, paste_y), resized)
    
    final_img.save(dest_path, "PNG")
    print(f"Processed and saved {dest_path}")
    return True

def main():
    source_dir = r"C:\Users\ifegw\.gemini\antigravity-ide\brain\025e81ef-905e-40aa-bc64-630ee5b9d799"
    dest_dir = r"c:\Users\ifegw\ChopNow-3\Mobile\assets\images"
    
    targets = [
        ("3d_empty_cart_1781872164238.png", "empty_cart.png"),
        ("3d_empty_orders_1781872192554.png", "empty_orders.png"),
        ("3d_empty_favorites_1781872222125.png", "empty_favorites.png"),
        ("3d_empty_inbox_1781872249738.png", "empty_inbox.png"),
    ]
    
    for src_name, dest_name in targets:
        src = os.path.join(source_dir, src_name)
        dest = os.path.join(dest_dir, dest_name)
        process_image(src, dest)

if __name__ == "__main__":
    main()
