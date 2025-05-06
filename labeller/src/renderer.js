let currentImages = [];
let currentImageIndex = -1;
let currentBoundingBoxes = [];
let isDrawing = false;
let startX, startY;
let currentBox = null;
let currentImageDimensions = { width: 0, height: 0 };
let canvasScaleInfo = {
  offsetX: 0,
  offsetY: 0,
  displayWidth: 0,
  displayHeight: 0,
  scale: 1,
};

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

let selectedLabelType = "front"; // Default label type

// Resize handler with debounce to avoid too many rapid redraws
window.addEventListener(
  "resize",
  debounce(function () {
    if (currentImageIndex >= 0 && currentImages.length > 0) {
      showImage(currentImageIndex);
    }
  }, 200),
);

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

  const manualIndexing = document.createElement("form");
  manualIndexing.id = "manualindex";

  // Create an input field for the index
  const indexInput = document.createElement("input");
  indexInput.type = "number";
  indexInput.id = "index-input";
  indexInput.placeholder = "Enter index";
  indexInput.required = true;
  indexInput.min = "0";

  // Create a submit button
  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Submit";

  // Create a label for the form
  const formLabel = document.createElement("label");
  formLabel.textContent = "Manual indexing: ";
  formLabel.htmlFor = "index-input";

  manualIndexing.style.margin = "15px 0";
  manualIndexing.style.display = "flex";
  manualIndexing.style.gap = "10px";
  indexInput.style.padding = "5px";
  submitButton.style.padding = "5px 10px";
  submitButton.style.cursor = "pointer";
  // Append elements to the form
  manualIndexing.appendChild(formLabel);
  manualIndexing.appendChild(indexInput);
  manualIndexing.appendChild(submitButton);
  manualIndexing.addEventListener("submit", function (event) {
    // Prevent default form submission behavior
    event.preventDefault();

    const index = parseInt(indexInput.value, 10);

    // Validate that it's a valid number before proceeding
    if (!isNaN(index) && index >= 0 && index < currentImages.length) {
      currentImageIndex = index - 1;
      showImage(index - 1);
    } else {
      // Alert the user if the index is invalid
      alert(
        `Please enter a valid index between 0 and ${currentImages.length - 1}`,
      );
    }

    // Optional: Reset the form
    this.reset();
  });
  controlsDiv.appendChild(prevButton);
  controlsDiv.appendChild(imageCounter);
  controlsDiv.appendChild(nextButton);
  controlsDiv.appendChild(manualIndexing);
  // Drawing area
  const drawingContainer = document.createElement("div");
  drawingContainer.className = "drawing-container";
  drawingContainer.id = "drawingContainer";

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
  canvas.addEventListener("mouseleave", () => {
    if (isDrawing) {
      finishDrawingBox({ clientX: 0, clientY: 0, cancelDrawing: true });
    }
  });

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

  // Add debug info display
  const debugInfoDiv = document.createElement("div");
  debugInfoDiv.id = "debugInfo";
  debugInfoDiv.style.fontSize = "10px";
  debugInfoDiv.style.fontFamily = "monospace";
  debugInfoDiv.style.marginTop = "10px";
  debugInfoDiv.style.whiteSpace = "pre";

  actionButtons.appendChild(clearButton);
  actionButtons.appendChild(saveButton);

  labelControls.appendChild(labelTypeForm);
  labelControls.appendChild(actionButtons);
  labelControls.appendChild(debugInfoDiv);

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
    // Store original image dimensions
    currentImageDimensions.width = img.naturalWidth;
    currentImageDimensions.height = img.naturalHeight;

    // Get the container dimensions
    const container = document.getElementById("drawingContainer");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate scaling to fit image in container
    const scaleWidth = containerWidth / img.naturalWidth;
    const scaleHeight = containerHeight / img.naturalHeight;
    const scale = Math.min(scaleWidth, scaleHeight, 1); // Don't scale up small images

    // Calculate displayed dimensions
    const displayWidth = Math.floor(img.naturalWidth * scale);
    const displayHeight = Math.floor(img.naturalHeight * scale);

    // Calculate offsets for centering the image in the container
    const offsetX = Math.max(
      0,
      Math.floor((containerWidth - displayWidth) / 2),
    );
    const offsetY = Math.max(
      0,
      Math.floor((containerHeight - displayHeight) / 2),
    );

    // Store all scaling info for coordinate conversions
    canvasScaleInfo = {
      offsetX,
      offsetY,
      displayWidth,
      displayHeight,
      scale,
    };

    // Set the image size and position
    img.style.width = `${displayWidth}px`;
    img.style.height = `${displayHeight}px`;

    // Update the canvas positioning to match the image
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    // Add image name/label
    const label = document.createElement("div");
    label.className = "image-label";
    label.textContent = currentImages[index].name;
    imageDisplay.appendChild(label);

    // Position the image display with proper centering
    imageDisplay.style.position = "absolute";
    imageDisplay.style.left = `${offsetX}px`;
    imageDisplay.style.top = `${offsetY}px`;

    // Attempt to load existing labels for this image
    tryLoadExistingLabels(currentImages[index].name);

    // Update debug info
    updateDebugInfo();

    // Redraw any existing bounding boxes with the new scale
    redrawCanvas();
  };

  imageDisplay.appendChild(img);
  updateBoundingBoxList();
}

function updateDebugInfo() {
  const debugInfo = document.getElementById("debugInfo");
  if (!debugInfo) return;

  debugInfo.textContent = `Image: ${currentImageDimensions.width}x${currentImageDimensions.height}
Display: ${canvasScaleInfo.displayWidth}x${canvasScaleInfo.displayHeight}
Scale: ${canvasScaleInfo.scale.toFixed(3)}
Offset: (${canvasScaleInfo.offsetX}, ${canvasScaleInfo.offsetY})`;
}

// Convert from screen coordinates to normalized (0-1) image coordinates
function screenToNormalizedCoords(screenX, screenY) {
  // Adjust for the offset of the image within the container
  const adjustedX = screenX - canvasScaleInfo.offsetX;
  const adjustedY = screenY - canvasScaleInfo.offsetY;

  // Convert to the original image coordinates (0-1)
  return {
    x: Math.max(0, Math.min(1, adjustedX / canvasScaleInfo.displayWidth)),
    y: Math.max(0, Math.min(1, adjustedY / canvasScaleInfo.displayHeight)),
  };
}

// Convert from normalized (0-1) image coordinates to screen coordinates
function normalizedToScreenCoords(normalizedX, normalizedY) {
  return {
    x: normalizedX * canvasScaleInfo.displayWidth + canvasScaleInfo.offsetX,
    y: normalizedY * canvasScaleInfo.displayHeight + canvasScaleInfo.offsetY,
  };
}

async function tryLoadExistingLabels(imageName) {
  // This is a placeholder for future enhancement
  // Would need a new IPC handler to load existing label files
  // For now, just start with empty bounding boxes for each image
}

function startDrawingBox(e) {
  const canvas = document.getElementById("boundingBoxCanvas");
  const rect = canvas.getBoundingClientRect();

  // Get the mouse position relative to the canvas
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Check if the click is within the image bounds
  if (
    mouseX < canvasScaleInfo.offsetX ||
    mouseY < canvasScaleInfo.offsetY ||
    mouseX > canvasScaleInfo.offsetX + canvasScaleInfo.displayWidth ||
    mouseY > canvasScaleInfo.offsetY + canvasScaleInfo.displayHeight
  ) {
    return; // Ignore clicks outside the image area
  }

  startX = mouseX;
  startY = mouseY;
  isDrawing = true;

  // Create a new box (initial size is 0)
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
  const rect = canvas.getBoundingClientRect();

  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  // Calculate dimensions based on current mouse position
  currentBox.width = currentX - startX;
  currentBox.height = currentY - startY;

  // Redraw all boxes
  redrawCanvas();

  // Draw the current box
  const ctx = canvas.getContext("2d");
  drawBoxOnCanvas(ctx, currentBox, true);
}

function finishDrawingBox(e) {
  if (!isDrawing) return;
  isDrawing = false;

  // If called from mouseleave event with cancelDrawing flag, just cancel
  if (e.cancelDrawing) {
    currentBox = null;
    redrawCanvas();
    return;
  }

  const canvas = document.getElementById("boundingBoxCanvas");
  const rect = canvas.getBoundingClientRect();

  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;

  // Calculate correct coordinates
  let x = Math.min(startX, endX);
  let y = Math.min(startY, endY);
  let width = Math.abs(endX - startX);
  let height = Math.abs(endY - startY);

  // Only add the box if it has some minimum size
  if (width > 5 && height > 5) {
    // Convert start coordinates to normalized coordinates
    const startNormalized = screenToNormalizedCoords(x, y);

    // Calculate width and height in normalized coordinates
    const endNormalized = screenToNormalizedCoords(x + width, y + height);
    const normalizedWidth = endNormalized.x - startNormalized.x;
    const normalizedHeight = endNormalized.y - startNormalized.y;

    // Create the normalized box
    const normalizedBox = {
      x: startNormalized.x,
      y: startNormalized.y,
      width: normalizedWidth,
      height: normalizedHeight,
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
  currentBoundingBoxes.forEach((normalizedBox) => {
    // Convert the normalized box to screen coordinates
    const start = normalizedToScreenCoords(normalizedBox.x, normalizedBox.y);
    const end = normalizedToScreenCoords(
      normalizedBox.x + normalizedBox.width,
      normalizedBox.y + normalizedBox.height,
    );

    const screenBox = {
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      type: normalizedBox.type,
    };

    drawBoxOnCanvas(ctx, screenBox, false);
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

  // Account for any direction of drawing
  let x = box.width < 0 ? box.x + box.width : box.x;
  let y = box.height < 0 ? box.y + box.height : box.y;
  let width = Math.abs(box.width);
  let height = Math.abs(box.height);

  // Draw the box
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.rect(x, y, width, height);
  ctx.fill();
  ctx.stroke();

  // Draw label
  ctx.font = "12px Arial";
  ctx.fillStyle = strokeColor;
  ctx.fillText(box.type, x + 5, y + 15);

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

    // Calculate pixel values for display in list
    const pixelX = Math.round(box.x * currentImageDimensions.width);
    const pixelY = Math.round(box.y * currentImageDimensions.height);
    const pixelWidth = Math.round(box.width * currentImageDimensions.width);
    const pixelHeight = Math.round(box.height * currentImageDimensions.height);

    const boxInfo = document.createElement("span");
    boxInfo.textContent = `Box ${index + 1}: ${box.type} (${pixelX},${pixelY},${pixelWidth}x${pixelHeight})`;

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

  // Calculate all pixel values from normalized coordinates for saving
  const boundingBoxesWithPixels = currentBoundingBoxes.map((box) => {
    // Calculate pixel values directly from normalized coordinates
    const pixelX = Math.round(box.x * currentImageDimensions.width);
    const pixelY = Math.round(box.y * currentImageDimensions.height);
    const pixelWidth = Math.round(box.width * currentImageDimensions.width);
    const pixelHeight = Math.round(box.height * currentImageDimensions.height);

    return {
      ...box,
      pixelX,
      pixelY,
      pixelWidth,
      pixelHeight,
    };
  });

  // Prepare the label data
  const labelData = {
    filename: currentImage.name,
    imageDimensions: {
      width: currentImageDimensions.width,
      height: currentImageDimensions.height,
    },
    boundingBoxes: boundingBoxesWithPixels,
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

// Process boxes function for the main process
function processBoxes(imagePath, imageName, labelData, dir, type) {
  const path = require("path");
  const sharp = require("sharp");

  return Promise.all(
    labelData.boundingBoxes
      .filter((box) => box.type === type)
      .map(async (box, index) => {
        const outputFileName = `${imageName.replace(/\.[^/.]+$/, "")}_${type}_${index + 1}${path.extname(imageName)}`;
        const outputPath = path.join(dir, outputFileName);

        // Use the pre-calculated pixel values from the label data
        const left = Math.max(0, box.pixelX);
        const top = Math.max(0, box.pixelY);
        const width = Math.min(
          Math.max(1, box.pixelWidth),
          labelData.imageDimensions.width - left,
        );
        const height = Math.min(
          Math.max(1, box.pixelHeight),
          labelData.imageDimensions.height - top,
        );

        try {
          await sharp(imagePath)
            .extract({
              left,
              top,
              width,
              height,
            })
            .toFile(outputPath);
          return outputFileName;
        } catch (err) {
          console.error(`Error processing ${type} box:`, err);
          return null;
        }
      }),
  );
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
