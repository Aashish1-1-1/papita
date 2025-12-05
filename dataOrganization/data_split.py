import shutil
import random
from sklearn.model_selection import train_test_split

def smart_split(quality_df, source_dir, output_dir):
    # Separating by quality
    good_quality = quality_df[quality_df['quality'] == 'good']['filename'].tolist()
    poor_quality = quality_df[quality_df['quality'] == 'poor']['filename'].tolist()
    
    # Ramro chai for training
    train_good, temp_good = train_test_split(good_quality, test_size=0.3, random_state=42)
    val_good, test_good = train_test_split(temp_good, test_size=0.5, random_state=42)
    
    # Poor in for testing and validation
    train_poor, test_poor = train_test_split(poor_quality, test_size=0.7, random_state=42)
    val_poor = train_poor[:len(train_poor)//3]
    train_poor = train_poor[len(train_poor)//3:]
    
    # Combine and copy files
    splits = {
        'train': train_good + train_poor,
        'val': val_good + val_poor,
        'test': test_good + test_poor
    }
    
    for split_name, files in splits.items():
        for filename in files:
            src = source_dir / filename
            dst = output_dir / split_name / 'front' / filename
            shutil.copy(src, dst)
    
    print(f"Train: {len(splits['train'])} images")
    print(f"Val: {len(splits['val'])} images")
    print(f"Test: {len(splits['test'])} images")