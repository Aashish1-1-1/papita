let currentImages = [];
let currentImageIndex = -1;
let currentBoundingBoxes = [];
let isDrawing = false;
let startX, startY;
let currentBox = null;
let currentImageDimensions = { width: 0, height: 0 };
let selectedLabelType = "front"; // Default label type

document.getElementById("openDir").addEventListener("click", async () => {
  const dirPath = await window.electronAPI.selectDirectory();
  const selectedDirElement = document.getElementById("selectedDir");

  if (dirPath) {
    selectedDirElement.textContent = dirPath;
    await loadImages();
  } else {
    selectedDirElement.textContent = "No directory selected";
  }
});

async function loadImages() {
  const imageContainer = document.getElementById("imageContainer");
  imageContainer.innerHTML = ""; // Clear previous content

  // Get all images from the selected directory
  currentImages = await window.electronAPI.readDirectory();

  if (currentImages.length === 0) {
    imageContainer.innerHTML = "<p>No images found in this directory</p>";
    return;
  }

  // Create layout elements
  const imageViewerContainer = document.createElement("div");
  imageViewerContainer.className = "image-viewer-container";

  // Navigation controls
  const controlsDiv = document.createElement("div");
  controlsDiv.className = "navigation-controls";

  const prevButton = document.createElement("button");
  prevButton.id = "prevImage";
  prevButton.textContent = "Previous";
  prevButton.addEventListener("click", showPreviousImage);

  const imageCounter = document.createElement("span");
  imageCounter.id = "imageCounter";

  const nextButton = document.createElement("button");
  nextButton.id = "nextImage";
  nextButton.textContent = "Next";
  nextButton.addEventListener("click", showNextImage);

  controlsDiv.appendChild(prevButton);
  controlsDiv.appendChild(imageCounter);
  controlsDiv.appendChild(nextButton);

  // Drawing area
  const drawingContainer = document.createElement("div");
  drawingContainer.className = "drawing-container";

  const imageDisplay = document.createElement("div");
  imageDisplay.id = "imageDisplay";

  // Create canvas for drawing bounding boxes
  const canvas = document.createElement("canvas");
  canvas.id = "boundingBoxCanvas";
  canvas.className = "bounding-box-canvas";

  // Add drawing event listeners to canvas
  canvas.addEventListener("mousedown", startDrawingBox);
  canvas.addEventListener("mousemove", drawBox);
  canvas.addEventListener("mouseup", finishDrawingBox);

  drawingContainer.appendChild(imageDisplay);
  drawingContainer.appendChild(canvas);

  // Label controls
  const labelControls = document.createElement("div");
  labelControls.className = "label-controls";

  // Radio buttons for label type
  const labelTypeForm = document.createElement("form");
  labelTypeForm.className = "label-type-form";

  const frontLabel = createRadioButton(
    "labelType",
    "front",
    "Document Front",
    true,
  );
  const backLabel = createRadioButton(
    "labelType",
    "back",
    "Document Back",
    false,
  );

  frontLabel.addEventListener("change", () => {
    selectedLabelType = "front";
  });
  backLabel.addEventListener("change", () => {
    selectedLabelType = "back";
  });

  labelTypeForm.appendChild(frontLabel);
  labelTypeForm.appendChild(backLabel);

  // Add clear and save buttons
  const actionButtons = document.createElement("div");
  actionButtons.className = "action-buttons";

  const clearButton = document.createElement("button");
  clearButton.id = "clearBoxes";
  clearButton.textContent = "Clear Boxes";
  clearButton.addEventListener("click", clearBoundingBoxes);

  const saveButton = document.createElement("button");
  saveButton.id = "saveLabels";
  saveButton.textContent = "Save Labels";
  saveButton.addEventListener("click", saveImageLabels);

  actionButtons.appendChild(clearButton);
  actionButtons.appendChild(saveButton);

  labelControls.appendChild(labelTypeForm);
  labelControls.appendChild(actionButtons);

  // Bounding box list
  const boxListContainer = document.createElement("div");
  boxListContainer.className = "box-list-container";

  const boxListTitle = document.createElement("h3");
  boxListTitle.textContent = "Bounding Boxes";

  const boxList = document.createElement("ul");
  boxList.id = "boundingBoxList";

  boxListContainer.appendChild(boxListTitle);
  boxListContainer.appendChild(boxList);

  // Put it all together
  imageViewerContainer.appendChild(controlsDiv);
  imageViewerContainer.appendChild(drawingContainer);
  imageViewerContainer.appendChild(labelControls);
  imageViewerContainer.appendChild(boxListContainer);

  imageContainer.appendChild(imageViewerContainer);

  // Show the first image
  currentImageIndex = 0;
  currentBoundingBoxes = [];
  await showImage(currentImageIndex);
}

function createRadioButton(name, value, labelText, checked) {
  const container = document.createElement("div");
  container.className = "radio-container";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.id = value;
  input.checked = checked;

  const label = document.createElement("label");
  label.htmlFor = value;
  label.textContent = labelText;

  container.appendChild(input);
  container.appendChild(label);

  return container;
}

async function showImage(index) {
  if (currentImages.length === 0 || index < 0 || index >= currentImages.length)
    return;

  // Reset bounding boxes for new image
  currentBoundingBoxes = [];

  const imageDisplay = document.getElementById("imageDisplay");
  const imageCounter = document.getElementById("imageCounter");
  const canvas = document.getElementById("boundingBoxCanvas");
  const ctx = canvas.getContext("2d");

  // Update counter
  imageCounter.textContent = `Image ${index + 1} of ${currentImages.length}`;

  // Clear previous image and canvas
  imageDisplay.innerHTML = "";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Create and display new image
  const img = document.createElement("img");
  img.src = `file://${currentImages[index].path}`;
  img.alt = currentImages[index].name;
  img.id = "currentImage";

  // Handle image loading to set canvas dimensions
  img.onload = function () {
    // Store image dimensions for bounding box calculations
    currentImageDimensions.width = img.naturalWidth;
    currentImageDimensions.height = img.naturalHeight;

    // Set canvas dimensions to match the image
    const container = document.querySelector(".drawing-container");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate scaling to fit image in container
    const scaleWidth = containerWidth / img.naturalWidth;
    const scaleHeight = containerHeight / img.naturalHeight;
    const scale = Math.min(scaleWidth, scaleHeight, 1); // Don't scale up small images

    const displayWidth = img.naturalWidth * scale;
    const displayHeight = img.naturalHeight * scale;

    // Set the image size
    img.style.width = `${displayWidth}px`;
    img.style.height = `${displayHeight}px`;

    // Set canvas size to match displayed image
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Add image name/label
    const label = document.createElement("div");
    label.className = "image-label";
    label.textContent = currentImages[index].name;
    imageDisplay.appendChild(label);

    // Attempt to load existing labels for this image
    tryLoadExistingLabels(currentImages[index].name);
  };

  imageDisplay.appendChild(img);
  updateBoundingBoxList();
}

async function tryLoadExistingLabels(imageName) {
  // This is a placeholder for future enhancement
  // Would need a new IPC handler to load existing label files
  // For now, just start with empty bounding boxes for each image
}

function startDrawingBox(e) {
  const canvas = document.getElementById("boundingBoxCanvas");
  const rect = canvas.getBoundingClientRect();

  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  isDrawing = true;

  // Create a new box
  currentBox = {
    x: startX,
    y: startY,
    width: 0,
    height: 0,
    type: selectedLabelType,
  };
}

function drawBox(e) {
  if (!isDrawing) return;

  const canvas = document.getElementById("boundingBoxCanvas");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();

  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  // Update the current box dimensions
  currentBox.width = currentX - startX;
  currentBox.height = currentY - startY;

  // Redraw all boxes
  redrawCanvas();

  // Draw the current box
  drawBoxOnCanvas(ctx, currentBox, true);
}

function finishDrawingBox(e) {
  if (!isDrawing) return;
  isDrawing = false;

  const canvas = document.getElementById("boundingBoxCanvas");
  const rect = canvas.getBoundingClientRect();

  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;

  // Ensure box has positive width and height
  let x = Math.min(startX, endX);
  let y = Math.min(startY, endY);
  let width = Math.abs(endX - startX);
  let height = Math.abs(endY - startY);

  // Only add the box if it has some size
  if (width > 5 && height > 5) {
    // Normalize coordinates to 0-1 range relative to the image
    const normalizedBox = {
      x: x / canvas.width,
      y: y / canvas.height,
      width: width / canvas.width,
      height: height / canvas.height,
      type: selectedLabelType,
    };

    currentBoundingBoxes.push(normalizedBox);
    updateBoundingBoxList();
  }

  // Redraw all boxes
  redrawCanvas();

  // Reset current box
  currentBox = null;
}

function redrawCanvas() {
  const canvas = document.getElementById("boundingBoxCanvas");
  const ctx = canvas.getContext("2d");

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all saved boxes
  currentBoundingBoxes.forEach((box) => {
    // Convert normalized coordinates back to canvas pixels
    const canvasBox = {
      x: box.x * canvas.width,
      y: box.y * canvas.height,
      width: box.width * canvas.width,
      height: box.height * canvas.height,
      type: box.type,
    };

    drawBoxOnCanvas(ctx, canvasBox, false);
  });
}

function drawBoxOnCanvas(ctx, box, isActive) {
  // Set colors based on box type and if it's being actively drawn
  let strokeColor, fillColor;

  if (box.type === "front") {
    strokeColor = "#2196F3"; // Blue
    fillColor = "rgba(33, 150, 243, 0.2)";
  } else {
    // "back"
    strokeColor = "#FF5722"; // Orange
    fillColor = "rgba(255, 87, 34, 0.2)";
  }

  // Use dashed line for active drawing
  if (isActive) {
    ctx.setLineDash([5, 3]);
  } else {
    ctx.setLineDash([]);
  }

  // Draw the box
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.fill();
  ctx.stroke();

  // Draw label
  ctx.font = "12px Arial";
  ctx.fillStyle = strokeColor;
  ctx.fillText(box.type, box.x + 5, box.y + 15);

  // Reset dash pattern
  ctx.setLineDash([]);
}

function updateBoundingBoxList() {
  const boxList = document.getElementById("boundingBoxList");
  boxList.innerHTML = "";

  if (currentBoundingBoxes.length === 0) {
    const noBoxesItem = document.createElement("li");
    noBoxesItem.textContent = "No boxes added yet";
    boxList.appendChild(noBoxesItem);
    return;
  }

  currentBoundingBoxes.forEach((box, index) => {
    const boxItem = document.createElement("li");
    boxItem.className = `box-item ${box.type}`;

    const boxInfo = document.createElement("span");
    boxInfo.textContent = `Box ${index + 1}: ${box.type}`;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-box";
    deleteBtn.textContent = "X";
    deleteBtn.addEventListener("click", () => {
      currentBoundingBoxes.splice(index, 1);
      updateBoundingBoxList();
      redrawCanvas();
    });

    boxItem.appendChild(boxInfo);
    boxItem.appendChild(deleteBtn);
    boxList.appendChild(boxItem);
  });
}

function clearBoundingBoxes() {
  currentBoundingBoxes = [];
  updateBoundingBoxList();
  redrawCanvas();
}

async function saveImageLabels() {
  if (currentImages.length === 0 || currentImageIndex < 0) {
    alert("No image selected");
    return;
  }

  const currentImage = currentImages[currentImageIndex];

  if (currentBoundingBoxes.length === 0) {
    if (!confirm("No bounding boxes have been created. Save anyway?")) {
      return;
    }
  }

  // Prepare the label data
  const labelData = {
    filename: currentImage.name,
    imageDimensions: {
      width: currentImageDimensions.width,
      height: currentImageDimensions.height,
    },
    boundingBoxes: currentBoundingBoxes.map((box) => ({
      ...box,
      // Add pixel values alongside normalized values for convenience
      pixelX: Math.round(box.x * currentImageDimensions.width),
      pixelY: Math.round(box.y * currentImageDimensions.height),
      pixelWidth: Math.round(box.width * currentImageDimensions.width),
      pixelHeight: Math.round(box.height * currentImageDimensions.height),
    })),
  };

  try {
    const result = await window.electronAPI.saveLabels(
      currentImage.name,
      labelData,
    );

    if (result.success) {
      let message = `Labels saved successfully to ${result.path}`;

      if (result.savedImages) {
        if (result.savedImages.front.length > 0) {
          message += `\n\n${result.savedImages.front.length} cropped front images saved to front/ directory:`;
          result.savedImages.front.forEach((img) => {
            message += `\n- ${img}`;
          });
        }

        if (result.savedImages.back.length > 0) {
          message += `\n\n${result.savedImages.back.length} cropped back images saved to back/ directory:`;
          result.savedImages.back.forEach((img) => {
            message += `\n- ${img}`;
          });
        }
      }

      alert(message);
    } else {
      alert(`Error saving labels: ${result.error}`);
    }
  } catch (error) {
    alert(`Error saving labels: ${error.message}`);
  }
}
function showNextImage() {
  if (currentImages.length === 0) return;

  currentImageIndex = (currentImageIndex + 1) % currentImages.length;
  showImage(currentImageIndex);
}

function showPreviousImage() {
  if (currentImages.length === 0) return;

  currentImageIndex =
    (currentImageIndex - 1 + currentImages.length) % currentImages.length;
  showImage(currentImageIndex);
}

// Add keyboard navigation
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    showNextImage();
  } else if (event.key === "ArrowLeft") {
    showPreviousImage();
  }
});
