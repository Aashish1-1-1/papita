const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  readDirectory: () => ipcRenderer.invoke("read-directory"),
  saveLabels: (imageName, labelData) =>
    ipcRenderer.invoke("save-labels", imageName, labelData),
});
