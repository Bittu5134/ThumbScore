let index = 0;
let elementQueue = [];
let queueIntervalId = null;

// 1. CHOOSE: Scrape the Video ID based on the layout type
function getVideoId(el, tagName) {
  try {
    if (
      tagName === "ytd-video-renderer" ||
      tagName === "ytd-playlist-video-renderer"
    ) {
      const link = el.querySelector("a#thumbnail");
      return link
        ? new URLSearchParams(link.getAttribute("href").split("?")[1]).get("v")
        : null;
    }

    if (tagName === "ytd-playlist-panel-video-renderer") {
      const link =
        el.querySelector("a#thumbnail") ||
        el.querySelector("a[href*='watch?v=']");
      return link
        ? new URLSearchParams(link.getAttribute("href").split("?")[1]).get("v")
        : null;
    }

    if (tagName === "ytm-shorts-lockup-view-model") {
      const link = el.querySelector("a[href*='/shorts/']");
      return link
        ? link.getAttribute("href").split("/shorts/")[1]?.split("?")[0]
        : null;
    }

    const wrapper = el.closest(".ytLockupViewModelHost");
    const link = wrapper ? wrapper.querySelector("a[href*='watch?v=']") : null;
    return link
      ? new URLSearchParams(link.getAttribute("href").split("?")[1]).get("v")
      : null;
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
  return rows.length >= 2 ? rows[1] : rows[0];
}

// 3. INJECT EMPTY PLACEHOLDER: Returns the raw DOM reference to the placeholder span
function injectEmptyPlaceholder(targetRow, tagName) {
  const isSearch = tagName === "ytd-video-renderer";
  const isPlaylistOrQueue =
    tagName === "ytd-playlist-video-renderer" ||
    tagName === "ytd-playlist-panel-video-renderer";

  // Handle separating dots
  if (isSearch) {
    const nativeSeparator = targetRow.querySelector("#separator");
    if (nativeSeparator) nativeSeparator.removeAttribute("hidden");
  } else {
    const delimiter = document.createElement("span");
    delimiter.className = isPlaylistOrQueue
      ? "style-scope yt-formatted-string"
      : "ytContentMetadataViewModelDelimiter";
    delimiter.textContent = " • ";
    targetRow.appendChild(delimiter);
  }

  // Create industry-standard loading style placeholder node
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

  // Light gray colored placeholder indicating text is loading
  percentageSpan.style.color = "#888888";
  percentageSpan.textContent = "--%";

  targetRow.appendChild(percentageSpan);

  return percentageSpan; // Passing memory reference back to the queue
}

// 4. QUEUE WORKER: Executes your arbitrary async actions sequentially every 0.5s
function processQueue() {
  if (elementQueue.length === 0) {
    clearInterval(queueIntervalId);
    queueIntervalId = null;
    return;
  }

  const currentTask = elementQueue.shift();
  const { videoId, placeholderElement } = currentTask;

  // CRITICAL CHECK: Ensure the layout node hasn't been swept away by SPA tab navigation
  if (!placeholderElement || !document.body.contains(placeholderElement)) {
    console.log(
      `Skipping video ${videoId}: Placeholder element no longer exists in DOM.`,
    );
    // Tail call execution recursion bypass to immediately parse next item if skipped
    processQueue();
    return;
  }

  // --- ARBITRARY CODE EXECUTION SPACE ---
  console.log(
    `Processing Queue Item: Processing video data for ID: ${videoId}`,
  );

  // Update styling and replace placeholder with your computed value data
  placeholderElement.style.color = "#2ba640";
  placeholderElement.textContent = `${index}%`;

  index++;
}

// 5. ENGINE: Observers view changes and schedules background queue updates
const observer = new MutationObserver(() => {
  const elements = document.querySelectorAll(
    "yt-content-metadata-view-model, ytm-shorts-lockup-view-model, ytd-video-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer",
  );

  elements.forEach((el) => {
    if (el.dataset.ytRatioDone) return;
    el.dataset.ytRatioDone = "true";

    const tagName = el.tagName.toLowerCase();
    const videoId = getVideoId(el, tagName);
    const targetRow = getTargetRow(el, tagName);

    if (videoId && targetRow) {
      const placeholderElement = injectEmptyPlaceholder(targetRow, tagName);
      elementQueue.push({
        videoId: videoId,
        placeholderElement: placeholderElement,
      });
    }
  });

  // Turn on 0.5-second clock pulse execution intervals if unassigned
  if (elementQueue.length > 0 && !queueIntervalId) {
    queueIntervalId = setInterval(processQueue, 500);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// 6. CLEANER: Handle unexpected route modifications cleanly
window.addEventListener("yt-navigate-start", () => {
  elementQueue = [];
  if (queueIntervalId) {
    clearInterval(queueIntervalId);
    queueIntervalId = null;
  }
  console.log("Global reset: Queue arrays garbage collected.");
});
