const fs = require("fs");
const webdriver = require("selenium-webdriver");
const AWS = require("aws-sdk");

// AWS Device Farm Project ARN
const PROJECT_ARN = "arn:aws:devicefarm:us-west-2:206233454061:testgrid-project:d4f7c141-0ba5-40ea-83f8-30ae3f580670";

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

async function runTest(urlString, recordedEvents) {
  // Initialize WebDriver with the TestGrid URL
  const driver = await new webdriver.Builder()
    .usingServer(urlString)
    .withCapabilities({ browserName: "chrome" })
    .build();

  try {
    console.log("Starting WebDriver session using TestGrid URL...");
    const session = await driver.getSession();
    console.log("New WebDriver session created:", session);

    for (const event of recordedEvents) {
      console.log(`Executing event: ${JSON.stringify(event)}`);

      switch (event.action) {
        case "navigate":
          console.log(`Navigating to URL: ${event.url}`);
          await driver.get(event.url); // Navigate to the URL
          break;

        case "scroll":
          console.log(`Scrolling to coordinates: (${event.coordinates.x}, ${event.coordinates.y})`);
          await driver.executeScript(
            `window.scrollTo(${event.coordinates.x}, ${event.coordinates.y});`
          );
          break;

        case "click":
          console.log(`Clicking on locator: ${event.locator}`);
          const clickElement = await driver.findElement(webdriver.By.css(event.locator));
          await clickElement.click();
          break;

        case "input":
          console.log(`Typing in locator: ${event.locator}, value: ${event.value}`);
          const inputElement = await driver.findElement(webdriver.By.css(event.locator));
          
          // Clear the input field before entering the value
          await inputElement.clear();
          
          // Enter the recorded value
          await inputElement.sendKeys(event.value);
          break;

        default:
          console.log(`Unknown action: ${event.action}`);
      }

      // Add delay to simulate user interaction
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("Error during WebDriver session:", error);
  } finally {
    console.log("Ending WebDriver session...");
    await driver.quit();
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
