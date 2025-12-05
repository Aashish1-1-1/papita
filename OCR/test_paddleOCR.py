from paddleocr import PaddleOCR
import cv2

ocr = PaddleOCR(
    use_angle_cls=True,  # Detect text rotation
    lang='en',           # Firstly fornt page try with hi also for hindi
    use_gpu=True,
    show_log=False
)

def test_ocr_baseline(image_path):

    img = cv2.imread(image_path)

    result = ocr.ocr(image_path, cls=True)

    extracted_text = []
    for line in result[0]:
        text = line[1][0]
        confidence = line[1][1]
        if confidence > 0.5:  # Yo hernu parxa
            extracted_text.append(text)
    
    return ' '.join(extracted_text)

# Testing on 10 random images
sample_images = random.sample(os.listdir('data/processed/train/front/'), 10)
for img in sample_images:
    text = test_ocr_baseline(f'data/processed/train/front/{img}')
    print(f"\n{img}:\n{text[:200]}...")  # First 200 chars