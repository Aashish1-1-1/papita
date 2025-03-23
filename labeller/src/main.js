const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

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
      enableRemoteModule: false, // Explicitly disabled for security
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
    return files
      .filter((file) => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file))
      .map((file) => ({
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
    const labelsDir = path.join(selectedDirectory, "labels");
    if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir, { recursive: true });

    const frontDir = path.join(labelsDir, "front");
    const backDir = path.join(labelsDir, "back");
    [frontDir, backDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const labelFilePath = path.join(labelsDir, `${imageName}.json`);
    fs.writeFileSync(labelFilePath, JSON.stringify(labelData, null, 2));

    const imagePath = path.join(selectedDirectory, imageName);

    const processBoxes = async (boxes, dir, type) => {
      return Promise.all(
        boxes.map(async (box, index) => {
          const outputFileName = `${imageName.replace(/\.[^/.]+$/, "")}_${type}_${index + 1}${path.extname(imageName)}`;
          const outputPath = path.join(dir, outputFileName);
          try {
            await sharp(imagePath)
              .extract({
                left: Math.max(0, box.pixelX),
                top: Math.max(0, box.pixelY),
                width: Math.max(1, box.pixelWidth),
                height: Math.max(1, box.pixelHeight),
              })
              .toFile(outputPath);
            return outputFileName;
          } catch (err) {
            console.error(`Error processing ${type} box:`, err);
            return null;
          }
        }),
      );
    };

    const [frontImages, backImages] = await Promise.all([
      processBoxes(
        labelData.boundingBoxes.filter((b) => b.type === "front"),
        frontDir,
        "front",
      ),
      processBoxes(
        labelData.boundingBoxes.filter((b) => b.type === "back"),
        backDir,
        "back",
      ),
    ]);

    return {
      success: true,
      path: labelFilePath,
      savedImages: {
        front: frontImages.filter(Boolean),
        back: backImages.filter(Boolean),
      },
    };
  } catch (error) {
    console.error("Error saving labels:", error);
    return { success: false, error: error.message };
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
