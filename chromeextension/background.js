chrome.action.onClicked.addListener((tab) => {
  setInterval(() => {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: ["script.js"],
      })
      .then(() => {
        console.log("Script injected successfully.");
      })
      .catch((error) => {
        console.error("Error injecting script:", error);
      });
  }, 1000);
});
