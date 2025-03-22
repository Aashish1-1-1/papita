document.getElementById("openDir").addEventListener("click", async () => {
  const dirPath = await window.electronAPI.selectDirectory();
  document.getElementById("selectedDir").innerText =
    dirPath || "No directory selected";
});
