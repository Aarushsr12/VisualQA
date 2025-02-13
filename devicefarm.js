const fs = require("fs");
const path = require("path");
const webdriverio = require("webdriverio");
const AWS = require("aws-sdk");
require('dotenv').config();

// AWS Device Farm Project ARN
const PROJECT_ARN = process.env.PROJECT_ARN;

// Initialize AWS SDK for Device Farm
const devicefarm = new AWS.DeviceFarm({ region: "us-west-2" });

async function getTestGridUrl() {
  try {
    // Request a TestGrid session URL
    const result = await devicefarm
      .createTestGridUrl({
        projectArn: PROJECT_ARN,
        expiresInSeconds: 600, // 10 minutes
      })
      .promise();

    console.log("Created TestGrid session URL:", result.url);
    return result.url;
  } catch (error) {
    console.error("Error creating TestGrid session URL:", error);
    throw error;
  }
}

// Ensure folder exists
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

// Capture screenshot
async function captureScreenshot(browser, folder, step) {
  const screenshot = await browser.takeScreenshot();
  const screenshotPath = path.join(folder, `step-${step}.png`);
  fs.writeFileSync(screenshotPath, screenshot, "base64");
  console.log(`Captured screenshot: ${screenshotPath}`);
}

const isBaseline = process.argv.includes("--baseline");

async function runTest(urlString, recordedEvents) {
  const url = new URL(urlString);

  // Set up the current screenshots folder
  const folderType = isBaseline ? "baseline" : "current";
  const screenshotFolder = path.join(__dirname, "screenshots", folderType);
  ensureFolderExists(screenshotFolder);

  // Initialize Webdriver.IO with the TestGrid URL
  const browser = await webdriverio.remote({
    logLevel: "trace",
    hostname: url.host,
    path: url.pathname,
    protocol: "https",
    port: 443,
    connectionRetryTimeout: 180000,
    capabilities: {
      browserName: "chrome",
      webSocketUrl: false,
    },
  });

  try {
    console.log("Starting Webdriver.IO session...");
    let step = 1; // Step counter for screenshots

    for (const event of recordedEvents) {
      console.log(`Executing event: ${JSON.stringify(event)}`);

      switch (event.action) {
        case "navigate":
          console.log(`Navigating to URL: ${event.url}`);
          await browser.url(event.url);
          break;

        case "scroll":
          console.log(`Scrolling to coordinates: (${event.coordinates.x}, ${event.coordinates.y})`);
          await browser.execute(
            `window.scrollTo(${event.coordinates.x}, ${event.coordinates.y});`
          );
          break;

        case "click":
          console.log(`Clicking on locator: ${event.locator}`);
          const clickElement = await browser.$(event.locator);
          await clickElement.click();
          break;

        case "input":
          console.log(`Typing in locator: ${event.locator}, value: ${event.value}`);
          const inputElement = await browser.$(event.locator);
          await inputElement.clearValue();
          await inputElement.setValue(event.value);
          break;

        default:
          console.log(`Unknown action: ${event.action}`);
      }

      // Capture screenshot after each action
      await captureScreenshot(browser, screenshotFolder, step);
      step++;

      // Optional delay to ensure stable screenshots
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("Error during Webdriver.IO session:", error);
  } finally {
    console.log("Ending Webdriver.IO session...");
    await browser.deleteSession();
  }
}

(async () => {
  try {
    // Load the recorded JSON events
    const recordedEvents = JSON.parse(fs.readFileSync("recorded-events.json", "utf-8"));

    // Get the TestGrid session URL
    const testGridUrl = await getTestGridUrl();

    // Replay the recorded events
    await runTest(testGridUrl, recordedEvents);
  } catch (error) {
    console.error("Error in Device Farm replay:", error);
  }
})();
