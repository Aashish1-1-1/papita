import glob
import os

from PIL import Image


def extract_roi_from_directory(input_dir, output_dir, x, y, width, height):
    os.makedirs(output_dir, exist_ok=True)

    extensions = ["*.jpg", "*.jpeg", "*.png", "*.bmp", "*.tiff", "*.webp"]

    image_files = []
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(input_dir, ext)))
        image_files.extend(glob.glob(os.path.join(input_dir, ext.upper())))

    if not image_files:
        print(f"No images found in directory: {input_dir}")
        return

    print(f"Found {len(image_files)} images to process")

    # Process each image
    for i, image_path in enumerate(image_files, 1):
        try:
            with Image.open(image_path) as img:
                roi = img.crop((x, y, x + width, y + height))

                # Create output filename
                filename = os.path.basename(image_path)
                output_path = os.path.join(output_dir, filename)

                roi.save(output_path, quality=95)
                print(f"[{i}/{len(image_files)}] Processed: {filename} -> {filename}")

        except Exception as e:
            print(f"Error processing {os.path.basename(image_path)}: {e}")

    print(f"ROI extraction complete! Files saved to: {output_dir}")


if __name__ == "__main__":
    input_directory = "/home"
    output_directory = "/home"

    # Extract ROI: x=0, y=10, width=55, height=75 (for gov embod)
    # Extract ROI: x=75, y=10, width=145, height=75 (for gov logo)
    extract_roi_from_directory(input_directory, output_directory, 75, 10, 145, 75)
