import glob
import os

from PIL import Image


def resize_images(input_dir, output_dir=None, size=(300, 300)):
    if output_dir is None:
        output_dir = input_dir + "_resized"
    os.makedirs(output_dir, exist_ok=True)

    extensions = ["*.jpg", "*.jpeg", "*.png", "*.bmp", "*.tiff", "*.webp"]

    image_files = []
    for ext in extensions:
        image_files.extend(glob.glob(os.path.join(input_dir, ext)))
        image_files.extend(glob.glob(os.path.join(input_dir, ext.upper())))

    print(f"Found {len(image_files)} images to resize")

    for i, img_path in enumerate(image_files, 1):
        try:
            with Image.open(img_path) as img:
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGB")

                resized_img = img.resize(size, Image.Resampling.LANCZOS)

                # Get filename and create output path
                filename = os.path.basename(img_path)
                output_path = os.path.join(output_dir, filename)

                # Save resized image
                resized_img.save(output_path, quality=95)

                print(f"[{i}/{len(image_files)}] Resized: {filename}")

        except Exception as e:
            print(f"Error processing {img_path}: {str(e)}")

    print(f"Resizing complete! Images saved to: {output_dir}")


if __name__ == "__main__":
    input_directory = "/home/"
    output_directory = "/home/"

    resize_images(input_directory, output_directory)
