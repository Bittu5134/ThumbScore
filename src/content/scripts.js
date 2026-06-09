let index = 0;

const observer = new MutationObserver(() => {
  const elements = document.querySelectorAll(
    "yt-content-metadata-view-model, ytm-shorts-lockup-view-model, ytd-video-renderer, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer",
  );

  elements.forEach((el) => {
    if (el.dataset.ytRatioDone) return;
    el.dataset.ytRatioDone = "true";

    let videoId = null;
    let targetRow = null;

    const tagName = el.tagName.toLowerCase();
    const isSearch = tagName === "ytd-video-renderer";
    const isPlaylist = tagName === "ytd-playlist-video-renderer";
    const isPanelQueue = tagName === "ytd-playlist-panel-video-renderer";

    // --- CASE 1: YOUTUBE SEARCH RESULTS ---
    if (isSearch) {
      const linkElement = el.querySelector("a#thumbnail");
      if (!linkElement) return;

      videoId = new URLSearchParams(
        linkElement.getAttribute("href").split("?")[1],
      ).get("v");
      targetRow = el.querySelector("#metadata-line");

      const nativeSeparator = targetRow?.querySelector("#separator");
      if (nativeSeparator) nativeSeparator.removeAttribute("hidden");
    }

    // --- CASE 2: WATCH PAGE PLAYLIST PANELS / QUEUES ---
    else if (isPanelQueue) {
      const linkElement = el.querySelector("a#thumbnail");
      // Fallback selector check if anchor shape shifts
      const linkHref = linkElement
        ? linkElement.getAttribute("href")
        : el.querySelector("a[href*='watch?v=']")?.getAttribute("href");
      if (!linkHref) return;

      videoId = new URLSearchParams(linkHref.split("?")[1]).get("v");

      // Target the precise native author tag container label block
      targetRow = el.querySelector("span#byline");
    }

    // --- CASE 3: YOUTUBE PLAYLIST VIDEO LISTS ---
    else if (isPlaylist) {
      const linkElement = el.querySelector("a#thumbnail");
      if (!linkElement) return;

      videoId = new URLSearchParams(
        linkElement.getAttribute("href").split("?")[1],
      ).get("v");
      targetRow = el.querySelector("#video-info");
    }

    // --- CASE 4: YOUTUBE SHORTS ---
    else if (tagName === "ytm-shorts-lockup-view-model") {
      const linkElement = el.querySelector("a[href*='/shorts/']");
      if (!linkElement) return;

      videoId = linkElement
        .getAttribute("href")
        .split("/shorts/")[1]
        ?.split("?")[0];
      targetRow = el.querySelector(
        ".shortsLockupViewModelHostOutsideMetadataSubhead",
      );
    }

    // --- CASE 5: HOMEPAGE, SIDEBAR, AND CHANNEL VIDEOS ---
    else {
      const componentWrapper = el.closest(".ytLockupViewModelHost");
      const linkElement = componentWrapper
        ? componentWrapper.querySelector("a[href*='watch?v=']")
        : null;
      if (!linkElement) return;

      videoId = new URLSearchParams(
        linkElement.getAttribute("href").split("?")[1],
      ).get("v");

      const rows = el.getElementsByClassName(
        "ytContentMetadataViewModelMetadataRow",
      );
      if (rows.length > 0) {
        targetRow = rows.length >= 2 ? rows[1] : rows[0];
      }
    }

    // Append items if valid target is built
    if (videoId && targetRow) {
      console.log(`Target Found (${tagName}) #${index + 1} ID:`, videoId);

      // Skip custom delimiter creation for search results (handled natively)
      if (!isSearch) {
        const delimiter = document.createElement("span");
        delimiter.className =
          isPlaylist || isPanelQueue
            ? "style-scope yt-formatted-string"
            : "ytContentMetadataViewModelDelimiter";
        delimiter.textContent = " • ";
        targetRow.appendChild(delimiter);
      }

      const percentageSpan = document.createElement("span");

      if (isSearch) {
        percentageSpan.className =
          "inline-metadata-item style-scope ytd-video-meta-block";
      } else if (isPlaylist || isPanelQueue) {
        percentageSpan.className = "style-scope yt-formatted-string";
      } else {
        percentageSpan.className =
          "ytAttributedStringHost ytContentMetadataViewModelMetadataText";
      }

      percentageSpan.style.color = "#2ba640";
      percentageSpan.textContent = `${index}%`;
      targetRow.appendChild(percentageSpan);

      index++;
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });
