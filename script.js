document.addEventListener("DOMContentLoaded", function () {
  // Theme Toggle
  const themeToggle = document.getElementById("themeSwitch");
  if (themeToggle) {
    themeToggle.addEventListener("change", function () {
      if (this.checked) {
        document.body.classList.add("dark");
      } else {
        document.body.classList.remove("dark");
      }
    });
  } else {
    console.error("themeSwitch element not found");
  }

  // Hamburger Menu
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  if (hamburgerMenu) {
    hamburgerMenu.addEventListener("click", function () {
      const navMenu = document.getElementById("navMenu");
      if (navMenu) {
        navMenu.classList.toggle("open");
      } else {
        console.error("navMenu element not found");
      }
    });
  } else {
    console.error("hamburgerMenu element not found");
  }

  // Close Modals if clicked outside content
  const loginModal = document.getElementById("loginModal");
  if (loginModal) {
    loginModal.addEventListener("click", function (e) {
      if (e.target === loginModal) {
        loginModal.style.display = "none";
      }
    });
  }
  const signupModal = document.getElementById("signupModal");
  if (signupModal) {
    signupModal.addEventListener("click", function (e) {
      if (e.target === signupModal) {
        signupModal.style.display = "none";
      }
    });
  }
});

/**********************
 * Global Variables
 **********************/
let portraitImages = [];   // Array for portrait images: { original, display, orientation }
let landscapeImages = [];  // Array for landscape images: { original, display, orientation }
let allImages = [];        // Combined array for all loaded images (order of loading)
let renderedImages = [];   // Array for images rendered (in display order)
let imagesPerRow = 5;      // Will be computed dynamically
let currentImageIndex = -1; // Index in renderedImages for popup carousel
const batchSize = 20;      // Number of images to load per batch
let slideshowInterval = null; // For slideshow auto-advance

// For localStorage-based authentication & favorites
let favoriteImages = [];   // Array to store favorite image URLs (original)
let currentUser = null;    // Logged-in username

// Base image URLs – add more as needed
const baseLinks = [
  "https://i.imx.to/i/2025/02/10/5x0999.jpg",
  "https://i.imx.to/i/2025/02/22/5y8s3x.jpg",
  "https://i004.imx.to/i/2023/11/28/4f8p5h.jpg",
  "https://i.imx.to/i/2025/02/25/5yi4uv.jpg",
  "https://i.imx.to/i/2025/02/25/5yjoua.jpg",
  "https://i.imx.to/i/2025/02/22/5y7zew.jpg",
  "https://i.imx.to/i/2025/02/22/5yaq3u.jpg",
  "https://i006.imx.to/i/2024/07/02/59v2iw.jpg",
  "https://i004.imx.to/i/2024/02/14/4ortlj.jpg",
  "https://i006.imx.to/i/2025/01/02/5t2x1g.jpg",
  "https://i.imx.to/i/2025/02/23/5ycbbi.jpg",
  "https://i004.imx.to/i/2024/03/18/4u0sjf.jpg",
  "https://i006.imx.to/i/2024/06/07/56s6xi.jpg",
  "https://i006.imx.to/i/2024/08/20/5f36v9.jpg",
  "https://i006.imx.to/i/2024/11/20/5o27t5.jpg",
  "https://i004.imx.to/i/2024/01/31/4mvi0a.jpg",
  "https://i004.imx.to/i/2024/02/02/4n2a7w.jpg",
  "https://i.imx.to/i/2025/02/24/5ygir6.jpg",
  "https://i004.imx.to/i/2024/04/02/4waca4.jpg",
  "https://i.imx.to/i/2025/02/23/5ycemp.jpg",
  "https://i003.imx.to/i/2022/07/22/39yo5m.jpg",
  "https://i006.imx.to/i/2024/11/01/5ljhe3.jpg",
  "https://i004.imx.to/i/2023/11/28/4f8p5h.jpg",
  "https://i.imx.to/i/2025/02/10/5x0999.jpg",
  "https://i.imx.to/i/2025/02/22/5y8s3x.jpg"
];

const allowedChars = "abcdefghijklmnopqrstuvwxyz0123456789";

/**********************
 * Utility Functions
 **********************/
function debounce(func, delay) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), delay);
  };
}

function computeImagesPerRow() {
  const container = document.getElementById("imagesGrid");
  const count = Math.floor(container.offsetWidth / 220);
  return count > 0 ? count : 1;
}

function generateRandomString(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * allowedChars.length);
    result += allowedChars[randomIndex];
  }
  return result;
}

function modifyLink(link) {
  const jpgIndex = link.lastIndexOf(".jpg");
  if (jpgIndex === -1) return link;
  const basePart = link.substring(0, jpgIndex);
  const newBase = basePart.slice(0, -3);
  const randomSuffix = generateRandomString(3);
  return newBase + randomSuffix + ".jpg";
}

/**********************
 * Image Generation & Grouping
 **********************/
function loadNextBatch() {
  imagesPerRow = computeImagesPerRow();
  for (let i = 0; i < batchSize; i++) {
    const randomBase = baseLinks[Math.floor(Math.random() * baseLinks.length)];
    const original = modifyLink(randomBase);
    const display = original.replace("/i/", "/t/");
    
    const tempImg = new Image();
    tempImg.src = display;
    tempImg.dataset.original = original;
    tempImg.dataset.display = display;
    
    tempImg.onload = function() {
      const orientation = (tempImg.naturalWidth >= tempImg.naturalHeight) ? "landscape" : "portrait";
      const imgData = { original, display, orientation };
      if (orientation === "landscape") {
        landscapeImages.push(imgData);
      } else {
        portraitImages.push(imgData);
      }
      allImages.push(imgData);
      renderGallery();
    };
  }
}

function renderGallery() {
  const gallery = document.getElementById("imagesGrid");
  // Render complete rows from portrait images.
  while (portraitImages.length - renderedImages.filter(img => img.orientation === "portrait").length >= imagesPerRow) {
    const startIdx = renderedImages.filter(img => img.orientation === "portrait").length;
    const rowImages = portraitImages.slice(startIdx, startIdx + imagesPerRow);
    appendRow(rowImages);
  }
  // Render complete rows from landscape images.
  while (landscapeImages.length - renderedImages.filter(img => img.orientation === "landscape").length >= imagesPerRow) {
    const startIdx = renderedImages.filter(img => img.orientation === "landscape").length;
    const rowImages = landscapeImages.slice(startIdx, startIdx + imagesPerRow);
    appendRow(rowImages);
  }
}

function appendRow(imagesArray) {
  const rowDiv = document.createElement("div");
  rowDiv.className = "gallery-row";
  imagesArray.forEach((imgData) => {
    const container = createImageContainer(imgData);
    rowDiv.appendChild(container);
    renderedImages.push(imgData);
  });
  document.getElementById("imagesGrid").appendChild(rowDiv);
}

function createImageContainer(imgData) {
  const container = document.createElement("div");
  container.className = "image-container";
  
  const img = document.createElement("img");
  img.src = imgData.display;
  img.alt = "Generated Image";
  img.dataset.display = imgData.display;
  img.dataset.original = imgData.original;
  img.dataset.orientation = imgData.orientation;
  
  let hoverTimeout;
  img.addEventListener("mouseenter", () => {
    hoverTimeout = setTimeout(() => {
      img.src = img.dataset.original;
    }, 2000);
  });
  img.addEventListener("mouseleave", () => {
    clearTimeout(hoverTimeout);
    img.src = img.dataset.display;
  });
  
  img.addEventListener("click", () => {
    currentImageIndex = renderedImages.findIndex(obj => obj.original === img.dataset.original);
    openPopup(currentImageIndex);
  });
  
  const favBtn = document.createElement("span");
  favBtn.className = "favorite-btn";
  favBtn.innerHTML = "&#9829;";
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(img.dataset.original, favBtn);
  });
  
  container.appendChild(img);
  container.appendChild(favBtn);
  return container;
}

/**********************
 * Popup & Carousel Functions
 **********************/
function openPopup(index) {
  const popupOverlay = document.getElementById("popupOverlay");
  const popupImage = document.getElementById("popupImage");
  popupImage.src = allImages[index].original;
  popupOverlay.style.display = "flex";
  document.getElementById("slideshowBtn").innerHTML = "►";
  clearInterval(slideshowInterval);
  slideshowInterval = null;
}

function closePopup() {
  document.getElementById("popupOverlay").style.display = "none";
}

function downloadCurrentImage() {
  const link = document.createElement("a");
  link.href = allImages[currentImageIndex].original;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showPrevImage() {
  if (allImages.length === 0) return;
  currentImageIndex = (currentImageIndex > 0) ? currentImageIndex - 1 : allImages.length - 1;
  document.getElementById("popupImage").src = allImages[currentImageIndex].original;
}

function showNextImage() {
  if (allImages.length === 0) return;
  currentImageIndex = (currentImageIndex < allImages.length - 1) ? currentImageIndex + 1 : 0;
  document.getElementById("popupImage").src = allImages[currentImageIndex].original;
}

function toggleSlideshow() {
  const btn = document.getElementById("slideshowBtn");
  if (!slideshowInterval) {
    slideshowInterval = setInterval(showNextImage, 3000);
    btn.innerHTML = "❚❚";
  } else {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    btn.innerHTML = "►";
  }
}

/**********************
 * Favorites Functions
 **********************/
async function toggleFavorite(url, favBtn) {
  if (!currentUser) {
    alert("Please log in to save favorites.");
    return;
  }
  const idx = favoriteImages.indexOf(url);
  if (idx === -1) {
    favoriteImages.push(url);
    favBtn.classList.add("favorite");
  } else {
    favoriteImages.splice(idx, 1);
    favBtn.classList.remove("favorite");
  }
  // Update localStorage for current user.
  let userKey = "user_" + currentUser;
  let userData = JSON.parse(localStorage.getItem(userKey));
  if (userData) {
    userData.favorites = favoriteImages;
    localStorage.setItem(userKey, JSON.stringify(userData));
  }
}

function renderFavoritesGallery() {
  const container = document.getElementById("favoritesGrid");
  container.innerHTML = "";
  let favData = [];
  let loadedCount = 0;
  favoriteImages.forEach((url) => {
    const img = new Image();
    img.src = url.replace("/i/", "/t/");
    img.onload = () => {
      const orient = (img.naturalWidth >= img.naturalHeight) ? "landscape" : "portrait";
      favData.push({ url, orientation: orient });
      loadedCount++;
      if (loadedCount === favoriteImages.length) {
        groupAndRenderFavorites(favData);
      }
    };
    img.onerror = () => {
      loadedCount++;
      if (loadedCount === favoriteImages.length) {
        groupAndRenderFavorites(favData);
      }
    };
  });
}

function groupAndRenderFavorites(favData) {
  const container = document.getElementById("favoritesGrid");
  container.innerHTML = "";
  const imgsPerRow = computeImagesPerRow();
  let row = document.createElement("div");
  row.className = "gallery-row";
  
  for (let i = 0; i < favData.length; i++) {
    const imgContainer = document.createElement("div");
    imgContainer.className = "image-container";
    const imgElem = document.createElement("img");
    imgElem.src = favData[i].url.replace("/i/", "/t/");
    imgElem.alt = "Favorite Image";
    imgContainer.appendChild(imgElem);
    row.appendChild(imgContainer);
    if ((i + 1) % imgsPerRow === 0) {
      container.appendChild(row);
      row = document.createElement("div");
      row.className = "gallery-row";
    }
  }
  if (row.childElementCount > 0) {
    container.appendChild(row);
  }
}

/**********************
 * Authentication Functions (LocalStorage)
 **********************/
async function signupUser(username, password) {
  let userKey = "user_" + username;
  if (localStorage.getItem(userKey)) {
    alert("Username already exists.");
    return false;
  }
  const userData = { password: password, favorites: [] };
  localStorage.setItem(userKey, JSON.stringify(userData));
  alert("Signup successful! Please log in.");
  return true;
}

async function loginUser(username, password) {
  let userKey = "user_" + username;
  const userDataStr = localStorage.getItem(userKey);
  if (!userDataStr) {
    alert("User not found. Please sign up.");
    return false;
  }
  let userData = JSON.parse(userDataStr);
  if (userData.password !== password) {
    alert("Incorrect password.");
    return false;
  }
  currentUser = username;
  document.getElementById("authArea").style.display = "none";
  document.getElementById("logoutBtn").style.display = "inline-block";
  favoriteImages = userData.favorites;
  if (document.getElementById("favoritesGrid")) {
    renderFavoritesGallery();
  }
  return true;
}

function logoutUser() {
  currentUser = null;
  document.getElementById("authArea").style.display = "inline-block";
  document.getElementById("logoutBtn").style.display = "none";
  favoriteImages = [];
}

/**********************
 * UI Event Listeners
 **********************/
// Main Page: Generate Button
if (document.getElementById("generateButton")) {
  document.getElementById("generateButton").addEventListener("click", () => {
    portraitImages = [];
    landscapeImages = [];
    allImages = [];
    renderedImages = [];
    document.getElementById("imagesGrid").innerHTML = "";
    loadNextBatch();
  });
}

// Infinite Scrolling on Main Page (debounced)
window.addEventListener("scroll", debounce(() => {
  if (document.getElementById("imagesGrid") &&
      window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 100) {
    loadNextBatch();
  }
}, 200));

// Popup Controls
document.getElementById("downloadBtn").addEventListener("click", downloadCurrentImage);
document.getElementById("prevBtn").addEventListener("click", showPrevImage);
document.getElementById("nextBtn").addEventListener("click", showNextImage);
document.getElementById("slideshowBtn").addEventListener("click", toggleSlideshow);
document.getElementById("popupOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("popupOverlay")) {
    closePopup();
  }
});

// Hamburger Menu Toggle
document.getElementById("hamburgerMenu").addEventListener("click", () => {
  const navMenu = document.getElementById("navMenu");
  navMenu.classList.toggle("open");
});

// Theme Toggle
document.getElementById("themeSwitch").addEventListener("change", (e) => {
  if (e.target.checked) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
});

// Authentication Modal Events
document.getElementById("loginBtn").addEventListener("click", () => {
  document.getElementById("loginModal").style.display = "flex";
});
document.getElementById("signupBtn").addEventListener("click", () => {
  document.getElementById("signupModal").style.display = "flex";
});
document.getElementById("closeLoginModal").addEventListener("click", () => {
  document.getElementById("loginModal").style.display = "none";
});
document.getElementById("closeSignupModal").addEventListener("click", () => {
  document.getElementById("signupModal").style.display = "none";
});

// Handle Login Form Submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (await loginUser(username, password)) {
    document.getElementById("loginModal").style.display = "none";
  }
});

// Handle Signup Form Submission
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;
  if (await signupUser(username, password)) {
    document.getElementById("signupModal").style.display = "none";
  }
});

// Logout Event
document.getElementById("logoutBtn").addEventListener("click", logoutUser);

// If on Favorites Page, render favorites gallery on load
if (document.getElementById("favoritesGrid")) {
  renderFavoritesGallery();
}
