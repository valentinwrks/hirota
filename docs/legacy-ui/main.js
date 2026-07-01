// ----------------------------------------------------------- //
// ------------------ THEMES & OTHER CONFIG ------------------ //
// ----------------------------------------------------------- //

// THEME DOTS LOGIC
const body = document.body;

document.getElementById("theme-skyblue").addEventListener("click", () => {
  body.classList.remove("theme-red");
  body.classList.add("theme-skyblue");
});

document.getElementById("theme-red").addEventListener("click", () => {
  body.classList.remove("theme-skyblue");
  body.classList.add("theme-red");
});

// ACTIVE SHOP-NAV LINKS
const currentPage = location.pathname.split("/").pop();

document.querySelectorAll("#shop-nav a").forEach(link => {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active-link");
  }
});

// FOOTER DYNAMIC YEAR
document.getElementById("footerYear").textContent = new Date().getFullYear();




// ----------------------------------------------------------- //
// ---------------------- IMAGE PREVIEW ---------------------- //
// ----------------------------------------------------------- //

const previewContainer = document.getElementById("imagePreviewContainer");
const previewImage = document.getElementById("imagePreview");

// detectar hover en cualquier item con .previewable
document.querySelectorAll(".previewable").forEach(item => {

  item.addEventListener("mouseenter", () => {
    const imgPath = item.dataset.preview;
    previewImage.src = imgPath;
    previewContainer.classList.remove("hidden");
  });

  item.addEventListener("mouseleave", () => {
    previewContainer.classList.add("hidden");
    previewImage.src = "";
  });

});

// click → open image in a new tab
document.querySelectorAll('.previewable').forEach(el => {
  el.addEventListener('click', (e) => {
    const imgSrc = el.getAttribute('data-preview');

    if (imgSrc) {
      window.open(imgSrc, '_blank');
    }
  });
});
