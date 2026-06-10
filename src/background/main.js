
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/reloaded. Initializing alarm...");

  chrome.alarms.create("cleanup", {
    delayInMinutes: 0.1,
    periodInMinutes: 1,
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanup") {
    runPeriodicStorageCleanup();
  }
});

function runPeriodicStorageCleanup() {
  console.log("Cache Cleared at:", new Date().toLocaleTimeString());
}
