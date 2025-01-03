document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-recording");
  const stopButton = document.getElementById("stop-recording");

  startButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "start-recording" }, (response) => {
      console.log(response ? "Recording started." : "Failed to start recording.");
    });
    startButton.disabled = true;
    stopButton.disabled = false;
  });

  stopButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stop-recording" }, (response) => {
      console.log(response ? "Recording stopped." : "Failed to stop recording.");
    });
    startButton.disabled = false;
    stopButton.disabled = true;
  });
});
