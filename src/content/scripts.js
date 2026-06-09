let index = 0;
let elementQueue = [];
let queueIntervalId = null;

// Global fast-lookup memory map cache
let localScoresDatabase = {};

const DB_NAME = "RatioYT_Database";
const DB_VERSION = 1;
const STORE_NAME = "scores_cache";

// Explicit Tier Constants for internal tracking authority designation
const TIER_PERSONAL = 1; // Videos watched/fetched first-hand by this user
const TIER_VERIFIED = 2; // Scores verified via swarm ID collisions
const TIER_SWARM_POOL = 3; // Raw incoming unverified placeholder entries

// --- INITIALIZATION: Setup IndexedDB and populate local memory map ---
function initializeDatabase() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "videoId" });
    }
  };

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const allEntries = getAllRequest.result;

      allEntries.forEach((entry) => {
        localScoresDatabase[entry.videoId] = {
          score: entry.score,
          expiresAt: entry.expiresAt,
          tier: entry.tier || TIER_VERIFIED, // Fallback protection guard if field is missing
        };
      });

      console.log(
        `IndexedDB UI Cache Engine loaded. Active entries: ${allEntries.length}`,
      );
    };
  };

  request.onerror = (event) => {
    console.error("IndexedDB initialization failed:", event.target.error);
  };
}

initializeDatabase();

// --- PERSISTENCE: Write item to IndexedDB with Tier 1 (Personal Watch Authority) ---
function saveToPersistentStorage(videoId, scoreValue) {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Generate random expiration offset between 0 and 30 days
    const randomDaysOld = Math.floor(Math.random() * 31);
    const millisecondsInADay = 24 * 60 * 60 * 1000;
    const expirationTimestamp = Date.now() + randomDaysOld * millisecondsInADay;

    const newEntry = {
      videoId: videoId,
      score: scoreValue,
      expiresAt: expirationTimestamp,
      tier: TIER_PERSONAL, // Live API fetches always graduate directly to Tier 1
    };

    localScoresDatabase[videoId] = {
      score: scoreValue,
      expiresAt: newEntry.expirationTimestamp,
      tier: TIER_PERSONAL,
    };

    store.put(newEntry);
  };
}

// --- EVICTION: Deletes expired data instantly from both memory and disk ---
function deleteExpiredCacheEntry(videoId) {
  delete localScoresDatabase[videoId];

  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(videoId);
    console.log(
      `[Cache Expired - Housekeeping] Removed expired item from DB backend: ${videoId}`,
    );
  };
}

// 1. CHOOSE: Scrape the Video ID based on the layout type
function getVideoId(el, tagName) {
  try {
    if (
      tagName === "ytd-video-renderer" ||
      tagName === "ytd-playlist-video-renderer"
    ) {
      const link = el.querySelector("a#thumbnail");
      if (!link) return null;
      const href = link.getAttribute("href");
      const urlParams = new URLSearchParams(href.split("?")[1]);
      return urlParams.get("v");
    }

    if (tagName === "ytd-playlist-panel-video-renderer") {
      const link =
        el.querySelector("a#thumbnail") ||
        el.querySelector("a[href*='watch?v=']");
      if (!link) return null;
      const href = link.getAttribute("href");
      const urlParams = new URLSearchParams(href.split("?")[1]);
      return urlParams.get("v");
    }

    if (tagName === "ytm-shorts-lockup-view-model") {
      const link = el.querySelector("a[href*='/shorts/']");
      if (!link) return null;
      const href = link.getAttribute("href");
      const shortPath = href.split("/shorts/")[1];
      return shortPath.split("?")[0];
    }

    const wrapper = el.closest(".ytLockupViewModelHost");
    if (!wrapper) return null;
    const link = wrapper.querySelector("a[href*='watch?v=']");
    if (!link) return null;
    const href = link.getAttribute("href");
    const urlParams = new URLSearchParams(href.split("?")[1]);
    return urlParams.get("v");
  } catch (err) {
    return null;
  }
}

// 2. TARGET: Find the correct metadata text container line
function getTargetRow(el, tagName) {
  if (tagName === "ytd-video-renderer")
    return el.querySelector("#metadata-line");
  if (tagName === "ytd-playlist-panel-video-renderer")
    return el.querySelector("span#byline");
  if (tagName === "ytd-playlist-video-renderer")
    return el.querySelector("#video-info");
  if (tagName === "ytm-shorts-lockup-view-model")
    return el.querySelector(".shortsLockupViewModelHostOutsideMetadataSubhead");

  const rows = el.getElementsByClassName(
    "ytContentMetadataViewModelMetadataRow",
  );
  if (rows.length >= 2) {
    return rows[1];
  } else {
    return rows[0];
  }
}

// 3. INJECT EMPTY PLACEHOLDER: Returns the raw DOM reference to the placeholder span
function injectEmptyPlaceholder(targetRow, tagName) {
  const isSearch = tagName === "ytd-video-renderer";
  const isPlaylistOrQueue =
    tagName === "ytd-playlist-video-renderer" ||
    tagName === "ytd-playlist-panel-video-renderer";

  if (isSearch) {
    const nativeSeparator = targetRow.querySelector("#separator");
    if (nativeSeparator) {
      nativeSeparator.removeAttribute("hidden");
    }
  } else {
    const delimiter = document.createElement("span");
    if (isPlaylistOrQueue) {
      delimiter.className = "style-scope yt-formatted-string";
    } else {
      delimiter.className = "ytContentMetadataViewModelDelimiter";
    }
    delimiter.textContent = " • ";
    targetRow.appendChild(delimiter);
  }

  const percentageSpan = document.createElement("span");
  if (isSearch) {
    percentageSpan.className =
      "inline-metadata-item style-scope ytd-video-meta-block";
  } else if (isPlaylistOrQueue) {
    percentageSpan.className = "style-scope yt-formatted-string";
  } else {
    percentageSpan.className =
      "ytAttributedStringHost ytContentMetadataViewModelMetadataText";
  }

  percentageSpan.style.color = "#888888";
  percentageSpan.textContent = "--%";

  targetRow.appendChild(percentageSpan);
  return percentageSpan;
}

// 4. UPDATE VALUE: Applies permanent colors and sets final visual score text
function applyFinalScore(placeholderElement, scoreValue) {
  placeholderElement.style.color = "#2ba640";
  placeholderElement.textContent = `${scoreValue}%`;
}

// 5. QUEUE WORKER: Executes your arbitrary async actions sequentially every 0.5s
function processQueue() {
  if (elementQueue.length === 0) {
    clearInterval(queueIntervalId);
    queueIntervalId = null;
    return;
  }

  const currentTask = elementQueue.shift();
  const videoId = currentTask.videoId;
  const placeholderElement = currentTask.placeholderElement;

  if (!placeholderElement || !document.body.contains(placeholderElement)) {
    console.log(`Skipping video ${videoId}: Placeholder layout destroyed.`);
    processQueue();
    return;
  }

  // --- ARBITRARY CODE EXECUTION SPACE ---
  console.log(
    `[RYD API Simulation Request] Fetching metrics for ID: ${videoId}`,
  );

  const freshlyFetchedScore = Math.floor(Math.random() * 101);

  // Commit changes to storage. Internally marks entry as Tier 1 automatically.
  saveToPersistentStorage(videoId, freshlyFetchedScore);
  applyFinalScore(placeholderElement, freshlyFetchedScore);
  index++;
}

// 6. ENGINE: Synchronously handles valid cache hits, triggers eviction resets, or routes items to worker queue
const observer = new MutationObserver(() => {
  const elements = document.querySelectorAll(
    "yt-content-metadata-view-model, ytm-shorts-lockup-view-model, ytd-video-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer",
  );

  elements.forEach((el) => {
    if (el.dataset.ytRatioDone) {
      return;
    }
    el.dataset.ytRatioDone = "true";

    const tagName = el.tagName.toLowerCase();
    const videoId = getVideoId(el, tagName);
    const targetRow = getTargetRow(el, tagName);

    if (videoId && targetRow) {
      const placeholderElement = injectEmptyPlaceholder(targetRow, tagName);
      const cachedRecord = localScoresDatabase[videoId];

      if (cachedRecord !== undefined) {
        // UI Safety Rule: Use whatever valid cache score we have in memory immediately
        applyFinalScore(placeholderElement, cachedRecord.score);

        // Run expiration evaluation silently behind the scenes
        if (Date.now() >= cachedRecord.expiresAt) {
          deleteExpiredCacheEntry(videoId);
        }
      } else {
        // Cache Miss: Send item to the throttled rate-limiting queue loop
        elementQueue.push({
          videoId: videoId,
          placeholderElement: placeholderElement,
        });
      }
    }
  });

  if (elementQueue.length > 0 && !queueIntervalId) {
    queueIntervalId = setInterval(processQueue, 500);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// 7. CLEANER: Handle unexpected route modifications cleanly
window.addEventListener("yt-navigate-start", () => {
  elementQueue = [];
  if (queueIntervalId) {
    clearInterval(queueIntervalId);
    queueIntervalId = null;
  }
  console.log("Global reset: Staggered intervals cleared.");
});
