import os
import shutil
import random
from pathlib import Path
import pandas as pd

# CONFIGURATION
# ---------------------------------------------------------
RAW_FRONT_DIR = Path("/home/neer/images/front/")
RAW_BACK_DIR = Path("/home/neer/images/back/")
QUALITY_REPORT = "quality_report.csv" # The file you generated earlier
OUTPUT_DIR = Path("data/processed")
UNPAIRED_DIR = Path("data/unpaired_review") # Where mismatched files go

SPLIT_RATIOS = {'train': 0.7, 'val': 0.15, 'test': 0.15}
# ---------------------------------------------------------

def clean_and_split():
    # 1. Load Quality Report & Identify Trash
    print("--- Step 1: Filtering Quality ---")
    df = pd.read_csv(QUALITY_REPORT)
    
    # Get list of filenames marked as 'poor'
    # Note: This assumes quality report was run on FRONT images. 
    # If a front image is poor, we discard the whole pair.
    poor_files = set(df[df['quality'] == 'poor']['filename'].tolist())
    print(f"Found {len(poor_files)} poor quality images to exclude.")

    # 2. Map Files
    print("\n--- Step 2: Mapping Files ---")
    # Get all jpgs from raw folders
    front_all = {f.name for f in RAW_FRONT_DIR.glob("*.jpg")}
    back_all = {f.name for f in RAW_BACK_DIR.glob("*.jpg")}
    
    # 3. Find Valid Pairs (Intersection)
    # A Valid Pair is: Exists in Front AND Exists in Back AND is NOT Poor
    valid_pairs = (front_all.intersection(back_all)) - poor_files
    
    # Find Issues
    orphans_front = (front_all - back_all) - poor_files
    orphans_back = (back_all - front_all)
    
    print(f"Total Front Images: {len(front_all)}")
    print(f"Total Back Images: {len(back_all)}")
    print(f"Valid Pairs (Ready for AI): {len(valid_pairs)}")
    print(f"Unpaired/Mismatched (Requires Manual Fix): {len(orphans_front) + len(orphans_back)}")

    # 4. Handle Unpaired Files (Move to a review folder)
    if len(orphans_front) > 0 or len(orphans_back) > 0:
        print("\n--- Moving Unpaired files to 'data/unpaired_review' ---")
        os.makedirs(UNPAIRED_DIR / "front", exist_ok=True)
        os.makedirs(UNPAIRED_DIR / "back", exist_ok=True)
        
        for f in orphans_front:
            shutil.copy(RAW_FRONT_DIR / f, UNPAIRED_DIR / "front" / f)
            
        for f in orphans_back:
            shutil.copy(RAW_BACK_DIR / f, UNPAIRED_DIR / "back" / f)
            
        print("ACTION REQUIRED: Go to 'data/unpaired_review' later and verify these.")

    # 5. Perform the Split
    print("\n--- Step 3: Splitting Data ---")
    valid_pairs_list = list(valid_pairs)
    random.seed(42)
    random.shuffle(valid_pairs_list)
    
    total = len(valid_pairs_list)
    train_end = int(total * SPLIT_RATIOS['train'])
    val_end = train_end + int(total * SPLIT_RATIOS['val'])
    
    splits = {
        'train': valid_pairs_list[:train_end],
        'val': valid_pairs_list[train_end:val_end],
        'test': valid_pairs_list[val_end:]
    }
    
    for split_name, files in splits.items():
        # Create directories
        dest_front = OUTPUT_DIR / split_name / "front"
        dest_back = OUTPUT_DIR / split_name / "back"
        os.makedirs(dest_front, exist_ok=True)
        os.makedirs(dest_back, exist_ok=True)
        
        for filename in files:
            shutil.copy(RAW_FRONT_DIR / filename, dest_front / filename)
            shutil.copy(RAW_BACK_DIR / filename, dest_back / filename)
            
    print(f"\n✅ SUCCESS! Data organized in '{OUTPUT_DIR}'")
    print(f"Train: {len(splits['train'])} pairs")
    print(f"Val: {len(splits['val'])} pairs")
    print(f"Test: {len(splits['test'])} pairs")

if __name__ == "__main__":
    clean_and_split()