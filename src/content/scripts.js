//  Queue Realted Stuff
let elementQueue = [];
let queueIntervalId = null;
let pendingVideos = new Set();

// Update Database namind and version here
let scoreDB = {};

const DB_NAME = "ThumbScoreDB";
const DB_STORE = "scores";
const DB_VERSION = 1;
let dbInstance = null;

// Cache Tiers
const TIER_PERSONAL = 1;
const TIER_VERIFIED = 2;
const TIER_PUBLIC = 3;

// STORAGE: Helper to get Object Store
function getStore(mode = "readonly") {
  if (!dbInstance) {
    console.warn("[ThumbScore] Database connection is not ready yet.");
    return null;
  }
  return dbInstance.transaction(DB_STORE, mode).objectStore(DB_STORE);
}

// STORAGE: Initialize IndexedDB and Load Cache into Memory
function initializeDatabase() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(DB_STORE)) {
      db.createObjectStore(DB_STORE, { keyPath: "videoId" });
    }
  };

  request.onsuccess = (event) => {
    dbInstance = event.target.result;

    const store = getStore();
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const allEntries = getAllRequest.result;

      allEntries.forEach((entry) => {
        scoreDB[entry.videoId] = {
          score: entry.score,
          expiresAt: entry.expiresAt,
          tier: entry.tier || TIER_VERIFIED,
        };
      });

      console.log("[ThumbScore] Cache loaded:", allEntries.length);
    };
  };

  request.onerror = (event) => {
    console.error("[ThumbScore] Initialization failed:", event.target.error);
  };
}

initializeDatabase();

// STORAGE: Write to Tier 1 cache
function saveToIndexDB(videoId, scoreValue, expiresAt) {
  const store = getStore("readwrite");
  if (!store) return;

  const newEntry = {
    videoId: videoId,
    score: scoreValue,
    expiresAt: expiresAt,
    tier: TIER_PERSONAL,
  };

  scoreDB[videoId] = { score: scoreValue, expiresAt: newEntry.expiresAt, tier: TIER_PERSONAL };

  store.put(newEntry);
}

// UI: Extracts Video From All UI types like, Homescreen, Serahc, Playlists etc etc
function getVideoId(el, tagName) {
  try {
    if (tagName === "ytd-video-renderer" || tagName === "ytd-playlist-video-renderer") {
      const link = el.querySelector("a#thumbnail");
      if (!link) return null;
      const href = link.getAttribute("href");
      const urlParams = new URLSearchParams(href.split("?")[1]);
      return urlParams.get("v");
    }

    if (tagName === "ytd-playlist-panel-video-renderer") {
      const link = el.querySelector("a#thumbnail") || el.querySelector("a[href*='watch?v=']");
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

// UI: Returns The row where the score will be added
function getTargetRow(el, tagName) {
  if (tagName === "ytd-video-renderer") return el.querySelector("#metadata-line");
  if (tagName === "ytd-playlist-panel-video-renderer") return el.querySelector("span#byline");
  if (tagName === "ytd-playlist-video-renderer") return el.querySelector("#video-info");
  if (tagName === "ytm-shorts-lockup-view-model")
    return el.querySelector(".shortsLockupViewModelHostOutsideMetadataSubhead");

  const rows = el.getElementsByClassName("ytContentMetadataViewModelMetadataRow");
  if (rows.length >= 2) {
    return rows[1];
  } else {
    return rows[0];
  }
}

// UI: Inject placeholder into youtube with deafult classes
function injectPlaceholder(targetRow, tagName) {
  const isSearch = tagName === "ytd-video-renderer";
  const isPlaylistOrQueue =
    tagName === "ytd-playlist-video-renderer" || tagName === "ytd-playlist-panel-video-renderer";

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
    percentageSpan.className = "inline-metadata-item style-scope ytd-video-meta-block";
  } else if (isPlaylistOrQueue) {
    percentageSpan.className = "style-scope yt-formatted-string";
  } else {
    percentageSpan.className = "ytAttributedStringHost ytContentMetadataViewModelMetadataText";
  }

  percentageSpan.style.color = "#888888";
  percentageSpan.textContent = "--%";

  targetRow.appendChild(percentageSpan);
  return percentageSpan;
}

// UI: Update Placeholder with Real Score
function applyFinalScore(placeholderElement, scoreValue) {
  // red to green is 0 degrees to 120 degrees
  placeholderElement.style.color = `hsl(${scoreValue * 1.2}, 100%, 45%)`;
  placeholderElement.textContent = `${scoreValue}%`;
}

// UI: Fetch Scores fro non Cached videos
function processQueue() {
  if (elementQueue.length === 0) {
    clearInterval(queueIntervalId);
    queueIntervalId = null;
    return;
  }
  
  const currentTask = elementQueue.shift();
  const videoID = currentTask.videoId;
  const placeholderElement = currentTask.placeholderElement;
  
  pendingVideos.delete(videoID);
  if (!placeholderElement || !document.body.contains(placeholderElement)) {
    console.log("[ThumbScore] Placeholder unavilable:", videoID);
    return;
  }

  // --- ARBITRARY CODE EXECUTION SPACE ---
  console.log("[ThumbScore] Fetching score:", videoID);
  const fetchedScore = Math.floor(Math.random() * 101);

  const randomDaysOld = Math.floor(Math.random() * 31);
  const millisecondsInADay = 24 * 60 * 60 * 1000;
  const expirationTimestamp = Date.now() + randomDaysOld * millisecondsInADay;

  // Save to storage
  saveToIndexDB(videoID, fetchedScore, expirationTimestamp);
  applyFinalScore(placeholderElement, fetchedScore);
}

// Main Loop
const observer = new MutationObserver(() => {
  const elements = document.querySelectorAll(
    "yt-content-metadata-view-model, ytm-shorts-lockup-view-model, ytd-video-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer",
  );

  elements.forEach((el) => {
    if (el.dataset.thumbScoreDone) return;
    el.dataset.thumbScoreDone = "true";

    const tagName = el.tagName.toLowerCase();
    const videoId = getVideoId(el, tagName);
    const targetRow = getTargetRow(el, tagName);
    

    if (videoId && targetRow) {
      const placeholderElement = injectPlaceholder(targetRow, tagName);
      const cachedRecord = scoreDB[videoId];

      //  Check Cache First
      if (cachedRecord !== undefined) {
        applyFinalScore(placeholderElement, cachedRecord.score);
      } else if (!pendingVideos.has(videoId)) {
        pendingVideos.add(videoId);
        elementQueue.push({ videoId: videoId, placeholderElement: placeholderElement });
      }
    }
  });

  if (elementQueue.length > 0 && !queueIntervalId) {
    queueIntervalId = setInterval(processQueue, 500);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// UI: Clear elements for the processQueue Function
window.addEventListener("yt-navigate-start", () => {
  elementQueue = [];
  pendingVideos.clear();
  if (queueIntervalId) {
    clearInterval(queueIntervalId);
    queueIntervalId = null;
  }
  console.log("[ThumbScore] UI Queue Cleared.");
});
