let index = 0;

const observer = new MutationObserver(() => {
  const elements = document.querySelectorAll(
    "yt-content-metadata-view-model, ytm-shorts-lockup-view-model, ytd-video-renderer",
  );

  elements.forEach((el) => {
    if (el.dataset.ytRatioDone) return;
    el.dataset.ytRatioDone = "true";

    let videoId = null;
    let targetRow = null;
    const isSearch = el.tagName.toLowerCase() === "ytd-video-renderer";

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

    // --- CASE 2: YOUTUBE SHORTS ---
    else if (el.tagName.toLowerCase() === "ytm-shorts-lockup-view-model") {
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

    // --- CASE 3: HOMEPAGE, SIDEBAR, AND CHANNEL VIDEOS ---
    else {
      // FIX: Find the nearest common wrapper component to look up the link safely
      const componentWrapper = el.closest(".ytLockupViewModelHost");
      const linkElement = componentWrapper
        ? componentWrapper.querySelector("a[href*='watch?v=']")
        : null;
      if (!linkElement) return;

      videoId = new URLSearchParams(
        linkElement.getAttribute("href").split("?")[1],
      ).get("v");

      // Target the first metadata row if it's a channel list (rows.length === 1)
      const rows = el.getElementsByClassName(
        "ytContentMetadataViewModelMetadataRow",
      );
      if (rows.length > 0) {
        targetRow = rows.length >= 2 ? rows[1] : rows[0];
      }
    }

    // Append items if valid target is built
    if (videoId && targetRow) {
      console.log(
        `Target Found (${el.tagName.toLowerCase()}) #${index + 1} ID:`,
        videoId,
      );

      if (!isSearch) {
        const delimiter = document.createElement("span");
        delimiter.className = "ytContentMetadataViewModelDelimiter";
        delimiter.textContent = " • ";
        targetRow.appendChild(delimiter);
      }

      const percentageSpan = document.createElement("span");
      percentageSpan.className = isSearch
        ? "inline-metadata-item style-scope ytd-video-meta-block"
        : "ytAttributedStringHost ytContentMetadataViewModelMetadataText";
      percentageSpan.style.color = "#2ba640";
      percentageSpan.textContent = "69%";
      targetRow.appendChild(percentageSpan);

      index++;
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });
