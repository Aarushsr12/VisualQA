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

  function logNavigationEvent(url, title) {
    const navigationEvent = {
      action: "navigate",
      url: url || window.location.href,
      pageTitle: title || document.title,
      timestamp: Date.now(),
    };
    recordedEvents.push(navigationEvent);
    console.log("Captured navigation event:", navigationEvent);
    saveEvents();
  }

  function saveEvents() {
    chrome.storage.local.set({ recordedEvents }, () => {
      console.log("Events saved to chrome.storage.local:", recordedEvents);
    });
  }

  function loadEvents(callback) {
    chrome.storage.local.get(["recordedEvents"], (result) => {
      const savedEvents = result.recordedEvents || [];
      recordedEvents = savedEvents;
      console.log("Loaded events from chrome.storage.local:", savedEvents);
      if (callback) callback(savedEvents);
    });
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
          const scrollCoordinates = {
            x: event.data?.x || 0,
            y: event.data?.y || 0,
          };
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
          logNavigationEvent(event.data?.href, document.title);
          return null;

        default:
          return null;
      }
    } catch (error) {
      console.error("Error transforming event:", error, event);
      return null;
    }
  }

  // Listen for keyboard input events to capture text manually
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

  window.addEventListener("beforeunload", saveEvents);

  loadEvents(() => {
    logNavigationEvent(window.location.href, document.title);
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "stop-recording") {
      saveEvents();

      const blob = new Blob([JSON.stringify(recordedEvents, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "recorded-events.json";
      downloadLink.click();

      URL.revokeObjectURL(url);
      console.log("Recording stopped. JSON file downloaded.");
      sendResponse({ success: true });

      // Clear recorded events after download
      chrome.storage.local.remove(["recordedEvents"], () => {
        console.log("Cleared events from chrome.storage.local.");
      });
    }
  });
})();
