let isRecordingActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "start-recording") {
    isRecordingActive = true; 
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["dist/inject.bundle.js"],
      });
      console.log("Recording started.");
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === "stop-recording") {

    isRecordingActive = false; // Reset recording flag
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stop-recording" }, (response) => {
        console.log("Recording stopped.", response);
        sendResponse(response);
      });
    });
    return true;
  }
});

//injecting the script again on open new tab or refreshing the page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active && isRecordingActive) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["dist/inject.bundle.js"],
    });
    console.log("Reinjected recording script after navigation.");
  }
});