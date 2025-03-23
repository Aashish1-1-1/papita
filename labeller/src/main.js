const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp"); // We'll need to add the sharp package for image manipulation

let mainWindow;
let selectedDirectory = null;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile("src/html/index.html");
});

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    selectedDirectory = result.filePaths[0];
    return selectedDirectory;
  }
  return null;
});

ipcMain.handle("read-directory", async () => {
  if (!selectedDirectory) return [];
  try {
    const files = fs.readdirSync(selectedDirectory);
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|bmp)$/i.test(file),
    );
    return imageFiles.map((file) => ({
      path: path.join(selectedDirectory, file),
      name: file,
    }));
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
});

ipcMain.handle("save-labels", async (_, imageName, labelData) => {
  if (!selectedDirectory || !imageName)
    return { success: false, error: "No directory or image selected" };

  try {
    // Create a labels directory if it doesn't exist
    const labelsDir = path.join(selectedDirectory, "labels");
    if (!fs.existsSync(labelsDir)) {
      fs.mkdirSync(labelsDir);
    }

    // Create front and back subdirectories if they don't exist
    const frontDir = path.join(labelsDir, "front");
    const backDir = path.join(labelsDir, "back");

    if (!fs.existsSync(frontDir)) {
      fs.mkdirSync(frontDir);
    }

    if (!fs.existsSync(backDir)) {
      fs.mkdirSync(backDir);
    }

    // Save the label data to a JSON file
    const labelFileName = imageName.replace(/\.[^/.]+$/, "") + ".json";
    const labelFilePath = path.join(labelsDir, labelFileName);
    fs.writeFileSync(labelFilePath, JSON.stringify(labelData, null, 2));

    // Original image path
    const imagePath = path.join(selectedDirectory, imageName);

    // Group bounding boxes by type
    const frontBoxes = labelData.boundingBoxes.filter(
      (box) => box.type === "front",
    );
    const backBoxes = labelData.boundingBoxes.filter(
      (box) => box.type === "back",
    );

    // Process and save each cropped image
    const savedImages = {
      front: [],
      back: [],
    };

    // Process front boxes
    for (let i = 0; i < frontBoxes.length; i++) {
      const box = frontBoxes[i];
      const boxFileName = `${imageName.replace(/\.[^/.]+$/, "")}_front_${i + 1}${path.extname(imageName)}`;
      const outputPath = path.join(frontDir, boxFileName);

      // Crop the image using sharp
      await sharp(imagePath)
        .extract({
          left: box.pixelX,
          top: box.pixelY,
          width: box.pixelWidth,
          height: box.pixelHeight,
        })
        .toFile(outputPath);

      savedImages.front.push(boxFileName);
    }

    // Process back boxes
    for (let i = 0; i < backBoxes.length; i++) {
      const box = backBoxes[i];
      const boxFileName = `${imageName.replace(/\.[^/.]+$/, "")}_back_${i + 1}${path.extname(imageName)}`;
      const outputPath = path.join(backDir, boxFileName);

      // Crop the image using sharp
      await sharp(imagePath)
        .extract({
          left: box.pixelX,
          top: box.pixelY,
          width: box.pixelWidth,
          height: box.pixelHeight,
        })
        .toFile(outputPath);

      savedImages.back.push(boxFileName);
    }

    return {
      success: true,
      path: labelFilePath,
      savedImages: savedImages,
    };
  } catch (error) {
    console.error("Error saving labels:", error);
    return { success: false, error: error.message };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
