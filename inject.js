import { record } from "rrweb";

(function () {
  if (window.hasRecordingInitialized) {
    console.log("Recording script already initialized.");
    return;
  }

  window.hasRecordingInitialized = true;

  let recordedEvents = [];
  let lastScrollPosition = { x: 0, y: 0 };
  const scrollThreshold = 50;

  console.log("Starting rrweb recording...");

  function ensureRRWebLoaded(callback) {
    if (window.rrweb) {
      console.log("rrweb already loaded.");
      callback();
      return;
    }

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("libs/rrweb.min.js"); // Path to rrweb library
    script.onload = () => {
      console.log("rrweb loaded successfully.");
      callback();
    };
    script.onerror = () => {
      console.error("Failed to load rrweb.");
    };
    document.head.appendChild(script);
  }

  function transformEvent(event) {
    try {
      switch (event.type) {
        case 2: // Mouse click
          const targetElement = rrweb.record.mirror.getNode(event.data?.id);
          if (!targetElement) return null;
          return {
            action: "click",
            locator: getLocator(targetElement),
            elementText: targetElement.innerText || "",
            coordinates: { x: event.data?.x || 0, y: event.data?.y || 0 },
            timestamp: event.timestamp,
          };

        case 3: // Scroll
          const scrollCoordinates = { x: event.data?.x || 0, y: event.data?.y || 0 };
          if (shouldRecordScroll(scrollCoordinates)) {
            return {
              action: "scroll",
              coordinates: scrollCoordinates,
              timestamp: event.timestamp,
            };
          }
          return null;

        case 5: // Input
          const inputElement = rrweb.record.mirror.getNode(event.data?.id);
          if (!inputElement) return null;
          return {
            action: "input",
            locator: getLocator(inputElement),
            value: event.data?.text || "",
            timestamp: event.timestamp,
          };

        case 4: // Navigation
          return {
            action: "navigate",
            url: event.data?.href || window.location.href,
            pageTitle: document.title,
            timestamp: event.timestamp,
          };

        default:
          return null;
      }
    } catch (error) {
      console.error("Error transforming event:", error, event);
      return null;
    }
  }

  function getLocator(element) {
    if (!element) return null;
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(" ").join(".")}`;
    return element.tagName.toLowerCase();
  }

  function shouldRecordScroll(newPosition) {
    const distance = Math.abs(newPosition.y - lastScrollPosition.y);
    if (distance > scrollThreshold) {
      lastScrollPosition = newPosition;
      return true;
    }
    return false;
  }

  function saveEvents() {
    chrome.storage.local.get(["recordedEvents"], (result) => {
      const existingEvents = result.recordedEvents || [];
      const updatedEvents = [...existingEvents, ...recordedEvents];
      chrome.storage.local.set({ recordedEvents: updatedEvents }, () => {
        console.log("Events saved to chrome.storage.local:", updatedEvents);
      });
      recordedEvents = [];
    });
  }

  function startRecording() {
    document.addEventListener("input", (e) => {
      const inputEvent = {
        action: "input",
        locator: getLocator(e.target),
        value: e.target.value || "",
        timestamp: Date.now(),
      };
      recordedEvents.push(inputEvent);
      console.log("Captured input event:", inputEvent);
      saveEvents();
    });

    record({
      emit(event) {
        const customEvent = transformEvent(event);
        if (customEvent) {
          recordedEvents.push(customEvent);
          console.log("Captured and transformed event:", customEvent);
          saveEvents();
        }
      },
      maskAllInputs: false,
    });

    console.log("Recording started...");
  }

  // Ensure rrweb is loaded before starting recording
  ensureRRWebLoaded(startRecording);

  // Save events before page unload
  window.addEventListener("beforeunload", saveEvents);

  // Handle stop-recording message
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "stop-recording") {
      saveEvents();
      chrome.storage.local.get(["recordedEvents"], (result) => {
        const allEvents = result.recordedEvents || [];
        if (allEvents.length === 0) {
          console.error("No recorded events found.");
          sendResponse({ success: false, message: "No recorded events found." });
          return;
        }

        const blob = new Blob([JSON.stringify(allEvents, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "recorded-events.json";
        downloadLink.click();
        URL.revokeObjectURL(url);

        console.log("Recording stopped. JSON downloaded.");
        chrome.storage.local.remove(["recordedEvents"], () => console.log("Cleared recorded events."));
        sendResponse({ success: true });
      });
    }
  });
})();
