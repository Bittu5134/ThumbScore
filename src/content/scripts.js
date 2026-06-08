let index = 0;

const observer = new MutationObserver(() => {
  const elements = document.querySelectorAll("yt-content-metadata-view-model");

  elements.forEach((el) => {
    if (el.dataset.ytRatioDone) return;
    el.dataset.ytRatioDone = "true";

    // 1. Correctly grab the rows inside this specific element
    const rows = el.getElementsByClassName(
      "ytContentMetadataViewModelMetadataRow",
    );

    // 2. Ensure the row containing views & date exists
    if (rows.length >= 2) {
      const targetRow = rows[1];

      // Print the views string to console as requested earlier
      console.log("Views:", targetRow.textContent.split("•")[0].trim());

      // 3. Create and append the separator " • "
      const delimiter = document.createElement("span");
      delimiter.className = "ytContentMetadataViewModelDelimiter";
      delimiter.textContent = " • ";
      targetRow.appendChild(delimiter);

      // 4. Create and append your 57% placeholder
      const percentageSpan = document.createElement("span");
      percentageSpan.className =
        "ytAttributedStringHost ytContentMetadataViewModelMetadataText";
      percentageSpan.style.color = "#2ba640"; // Optional green color styling
      percentageSpan.textContent = "57%";
      targetRow.appendChild(percentageSpan);
    }

    index++;
    console.log("Processed videos count:", index);
  });
});

// Watch the entire page for any HTML changes
observer.observe(document.body, { childList: true, subtree: true });
