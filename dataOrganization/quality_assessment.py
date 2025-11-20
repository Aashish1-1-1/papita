import cv2
import os
from pathlib import Path
import pandas as pd

def assess_image_quality(folder_path):
    quality_report = []
    
    for img_path in Path(folder_path).glob("*.jpg"):
        img = cv2.imread(str(img_path))
        
        # THis checks the resolution
        height, width = img.shape[:2]
        
        # This checks the blur uding Laplacian variance
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # This checks brightness
        brightness = gray.mean()
        
        quality_report.append({
            'filename': img_path.name,
            'width': width,
            'height': height,
            'blur_score': blur_score,  # <100 is very blurry
            'brightness': brightness,   # <50 too dark, >200 too bright
            'quality': 'good' if blur_score > 100 and 50 < brightness < 200 else 'poor'
        })
    
    df = pd.DataFrame(quality_report)
    print(f"Total images: {len(df)}")
    print(f"Good quality: {len(df[df['quality']=='good'])}")
    print(f"Poor quality: {len(df[df['quality']=='poor'])}")
    print(f"Average resolution: {df['width'].mean():.0f}x{df['height'].mean():.0f}")
    
    return df

quality_df = assess_image_quality("/home/neer/images/front/")
quality_df.to_csv("quality_report.csv")