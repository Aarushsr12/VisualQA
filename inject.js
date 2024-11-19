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

  // Generate a locator (CSS selector or XPath)
  function getLocator(element) {
    if (!element) return null;
    if (element.id) return `#${element.id}`;
    if (element.className) {
      return `.${element.className.split(" ").join(".")}`;
    }
    return element.tagName.toLowerCase();
  }

  // Determine if scroll should be recorded
  function shouldRecordScroll(newPosition) {
    const distance = Math.abs(newPosition.y - lastScrollPosition.y);
    if (distance > scrollThreshold) {
      lastScrollPosition = newPosition; // Update last position
      return true;
    }
    return false;
  }

  // Transform raw rrweb events into custom format
  function transformEvent(event) {
    try {
      switch (event.type) {
        case 2: // Mouse interaction (click)
          const targetElement = rrweb.record.mirror.getNode(event.data?.id);
          if (!targetElement) return null;

          return {
            action: "click",
            locator: getLocator(targetElement),
            elementText: targetElement.innerText || null,
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
            pageTitle: document.title || "",
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

  // Listen for hash changes and history changes
  function captureNavigationEvent() {
    const navigationEvent = {
      action: "navigate",
      url: window.location.href,
      pageTitle: document.title,
      timestamp: Date.now(),
    };
    recordedEvents.push(navigationEvent);
    console.log("Captured navigation event:", navigationEvent);
  }

  // Add event listeners for SPA navigation
  window.addEventListener("hashchange", captureNavigationEvent);
  window.addEventListener("popstate", captureNavigationEvent);

  // Start recording with rrweb
  record({
    emit(event) {
      try {
        const customEvent = transformEvent(event);
        if (customEvent) {
          recordedEvents.push(customEvent);
          console.log("Captured and transformed event:", customEvent);
        }
      } catch (error) {
        console.error("Error handling emitted event:", error, event);
      }
    },
    maskAllInputs: false,
  });

  console.log("Recording started...");

  // Stop recording and download JSON file
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "stop-recording") {
      // Ensure navigation events are captured before stopping
      captureNavigationEvent();

      // Download the JSON file
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
    }
  });
})();
