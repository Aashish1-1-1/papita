import cv2
from pathlib import Path
import pandas as pd

def assess_image_quality_v2(folder_path):
    quality_report = []
    
    for img_path in Path(folder_path).glob("*.jpg"):
        img = cv2.imread(str(img_path))
        
        if img is None:
            continue

        height, width = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Blur Score (Laplacian)
        # For documents, text edges are sharp but sparse. 
        # A score of 30-50 is often acceptable for OCR if the focus is good.
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 2. Brightness
        # ID cards are white/grey. We allow up to 250 (almost pure white).
        brightness = gray.mean()
        
        # 3. Contrast (New Metric - Important for OCR)
        # We check the standard deviation. Low std dev means the image is solid gray.
        # High std dev means there is good separation between black text and white background.
        contrast = gray.std()

        # REVISED THRESHOLDS FOR DOCUMENT OCR
        # Blur: > 30 (Lowered from 100)
        # Brightness: 40 - 250 (Widened from 50-200)
        # Contrast: > 20 (Ensures image isn't a blank gray square)
        is_good = (blur_score > 30) and (40 < brightness < 250) and (contrast > 20)

        quality_report.append({
            'filename': img_path.name,
            'blur_score': blur_score,
            'brightness': brightness,
            'contrast': contrast,
            'quality': 'good' if is_good else 'poor'
        })
    
    df = pd.DataFrame(quality_report)
    print(f"Total: {len(df)}")
    print(f"Good: {len(df[df['quality']=='good'])}")
    print(f"Poor: {len(df[df['quality']=='poor'])}")
    
    # Show the averages of the NEW good set
    good_df = df[df['quality']=='good']
    if not good_df.empty:
        print(f"Avg Good Blur: {good_df['blur_score'].mean():.1f}")
        print(f"Avg Good Brightness: {good_df['brightness'].mean():.1f}")
        
    return df

# Run this updated version
df = assess_image_quality_v2("/home/neer/images/front/")