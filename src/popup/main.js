document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("clickMe");

  button.addEventListener("click", function () {
    alert("Button inside the popup was clicked!");
  });
});
