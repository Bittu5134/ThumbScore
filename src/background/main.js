chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("cleanup", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(() => {
  runPeriodicStorageCleanup();
});


function runPeriodicStorageCleanup() {
    console.log("Cache Cleared at", Date.now());
    
}