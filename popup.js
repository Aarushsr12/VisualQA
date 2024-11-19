document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-recording");
    const stopButton = document.getElementById("stop-recording");
  
    startButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "start-recording" });
        startButton.disabled = true;
        stopButton.disabled = false;
      });
    });
  
    stopButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "stop-recording" });
        startButton.disabled = false;
        stopButton.disabled = true;
      });
    });
  });
  