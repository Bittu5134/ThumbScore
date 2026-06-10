chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/reloaded. Initializing alarm...");
  chrome.alarms.create("cleanup", { delayInMinutes: 0.1, periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanup") {
    runPeriodicStorageCleanup();
  }
});

function runPeriodicStorageCleanup() {
  console.log("Cache Cleanup started at:", new Date().toLocaleTimeString());

  const DB_NAME = "ThumbScoreDB";
  const DB_STORE = "scores";
  const DB_VERSION = 1;

  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(DB_STORE)) {
      db.createObjectStore(DB_STORE, { keyPath: "videoId" });
    }
  };

  request.onsuccess = (event) => {
    const dbInstance = event.target.result;

    // 1. Open a single transaction for reading and writing
    const transaction = dbInstance.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);

    const now = Date.now();
    let totalEntriesCount = 0;
    let purgedCount = 0;

    // 2. A Cursor is the best pattern here: safe modifications during iteration
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        totalEntriesCount++;
        const entry = cursor.value;

        console.log(entry.videoId, "expiresAt:", entry.expiresAt, "now:", now);

        // FIXED: Check if the entry's expiration time is in the past
        if (entry.expiresAt && entry.expiresAt != now) {
          console.log(`[RatioYT] ${entry.videoId} is expired. Removing from cache.`);
          cursor.delete(); // Safely deletes the current record pointed to by cursor
          purgedCount++;
        }

        cursor.continue(); // Move to the next record
      }
    };

    // FIXED: Print stats only when the transaction finishes saving to disk
    transaction.oncomplete = () => {
      const remaining = totalEntriesCount - purgedCount;
      console.log(`[RatioYT] Cache cleanup completed.`);
      console.log(`- Total scanned: ${totalEntriesCount}`);
      console.log(`- Purged: ${purgedCount}`);
      console.log(`- Remaining in DB: ${remaining}`);
    };

    transaction.onerror = (err) => {
      console.error("[RatioYT] Cleanup transaction failed:", err.target.error);
    };
  };

  request.onerror = (event) => {
    console.error("[RatioYT] Database opening failed:", event.target.error);
  };
}
