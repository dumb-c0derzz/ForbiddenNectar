document.addEventListener("DOMContentLoaded", function() {
  // Theme Toggle
  const themeToggle = document.getElementById("themeSwitch");
  if (themeToggle) {
    themeToggle.addEventListener("change", function() {
      if (this.checked) {
        document.body.classList.add("dark");
      } else {
        document.body.classList.remove("dark");
      }
    });
  } else {
    console.error("themeSwitch element not found");
  }

  const hamburgerMenu = document.getElementById("hamburgerMenu");
  if (hamburgerMenu) {
    hamburgerMenu.addEventListener("click", function() {
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

})

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

// For authentication & favorites (unchanged)
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

// Allowed characters for random string generation
const allowedChars = "abcdefghijklmnopqrstuvwxyz0123456789";

/**********************
 * Utility Functions
 **********************/
// Debounce to limit rapid calls
function debounce(func, delay) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), delay);
  };
}

// Compute images per row based on container width.
function computeImagesPerRow() {
  const container = document.getElementById("imagesGrid");
  const count = Math.floor(container.offsetWidth / 220);
  return count > 0 ? count : 1;
}

// Generate a random string of specified length.
function generateRandomString(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * allowedChars.length);
    result += allowedChars[randomIndex];
  }
  return result;
}

// Modify a URL: remove last 3 characters before ".jpg" and append 3 random characters.
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
// Load a new batch of images.
function loadNextBatch() {
  imagesPerRow = computeImagesPerRow();
  for (let i = 0; i < batchSize; i++) {
    const randomBase = baseLinks[Math.floor(Math.random() * baseLinks.length)];
    const original = modifyLink(randomBase);
    const display = original.replace("/i/", "/t/");
    
    // Create a temporary image to detect orientation.
    const tempImg = new Image();
    tempImg.src = display;
    tempImg.dataset.original = original;
    tempImg.dataset.display = display;
    
    tempImg.onload = function() {
      const orientation = (tempImg.naturalWidth >= tempImg.naturalHeight) ? "landscape" : "portrait";
      const imgData = { original, display, orientation };
      
      // Add to respective arrays.
      if (orientation === "landscape") {
        landscapeImages.push(imgData);
      } else {
        portraitImages.push(imgData);
      }
      
      // Also push to combined global array.
      allImages.push(imgData);
      
      // Try to render new complete rows.
      renderGallery();
    };
  }
}

// Render new complete rows without clearing already rendered rows.
function renderGallery() {
  const gallery = document.getElementById("imagesGrid");
  // We'll try to render complete rows from both portrait and landscape arrays.
  
  // Render portrait rows.
  while (portraitImages.length - renderedImages.filter(img => img.orientation === "portrait").length >= imagesPerRow) {
    const startIdx = renderedImages.filter(img => img.orientation === "portrait").length;
    const rowImages = portraitImages.slice(startIdx, startIdx + imagesPerRow);
    appendRow(rowImages);
  }
  
  // Render landscape rows.
  while (landscapeImages.length - renderedImages.filter(img => img.orientation === "landscape").length >= imagesPerRow) {
    const startIdx = renderedImages.filter(img => img.orientation === "landscape").length;
    const rowImages = landscapeImages.slice(startIdx, startIdx + imagesPerRow);
    appendRow(rowImages);
  }
}

// Append a row to the gallery and update renderedImages order.
function appendRow(imagesArray) {
  const rowDiv = document.createElement("div");
  rowDiv.className = "gallery-row";
  imagesArray.forEach((imgData) => {
    const container = createImageContainer(imgData);
    rowDiv.appendChild(container);
    // Record the image in renderedImages in the order of appearance.
    renderedImages.push(imgData);
  });
  document.getElementById("imagesGrid").appendChild(rowDiv);
}

// Create an image container element.
function createImageContainer(imgData) {
  const container = document.createElement("div");
  container.className = "image-container";
  
  const img = document.createElement("img");
  img.src = imgData.display;
  img.alt = "Generated Image";
  img.dataset.display = imgData.display;
  img.dataset.original = imgData.original;
  img.dataset.orientation = imgData.orientation;
  
  // Hover: after 2 sec, switch to original; revert on mouseleave.
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
  
  // Click: determine index in renderedImages and open popup.
  img.addEventListener("click", () => {
    currentImageIndex = renderedImages.findIndex(obj => obj.original === img.dataset.original);
    openPopup(currentImageIndex);
  });
  
  // Favorite icon overlay.
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
  popupImage.src = renderedImages[index].original;
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
  link.href = renderedImages[currentImageIndex].original;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showPrevImage() {
  if (renderedImages.length === 0) return;
  currentImageIndex = (currentImageIndex > 0) ? currentImageIndex - 1 : renderedImages.length - 1;
  document.getElementById("popupImage").src = renderedImages[currentImageIndex].original;
}

function showNextImage() {
  if (renderedImages.length === 0) return;
  currentImageIndex = (currentImageIndex < renderedImages.length - 1) ? currentImageIndex + 1 : 0;
  document.getElementById("popupImage").src = renderedImages[currentImageIndex].original;
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
  try {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorites: favoriteImages })
    });
  } catch (error) {
    console.error("Error updating favorites:", error);
  }
}

// For Favorites Page: Render favorites gallery with grouping logic.
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
 * Authentication Functions (Backend API)
 **********************/
async function signupUser(username, password) {
  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      alert(data.message);
      return true;
    } else {
      alert(data.error);
      return false;
    }
  } catch (error) {
    console.error("Signup error:", error);
    alert("Error during signup.");
    return false;
  }
}

async function loginUser(username, password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      currentUser = username;
      document.getElementById("authArea").style.display = "none";
      document.getElementById("logoutBtn").style.display = "inline-block";
      loadUserFavoritesFromServer();
      return true;
    } else {
      alert(data.error);
      return false;
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Error during login.");
    return false;
  }
}

async function loadUserFavoritesFromServer() {
  try {
    const response = await fetch('/api/user');
    if (response.ok) {
      const data = await response.json();
      favoriteImages = data.favorites;
      if (document.getElementById("favoritesGrid")) {
        renderFavoritesGallery();
      }
    }
  } catch (error) {
    console.error("Error loading favorites:", error);
  }
}

function logoutUser() {
  fetch('/api/logout')
    .then(() => {
      currentUser = null;
      document.getElementById("authArea").style.display = "inline-block";
      document.getElementById("logoutBtn").style.display = "none";
      favoriteImages = [];
    })
    .catch(err => console.error("Logout error:", err));
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
    renderedPortraitCount = 0;
    renderedLandscapeCount = 0;
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

// Hamburger Menu Toggle (for mobile)
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

// If on Favorites Page, render favorites gallery on load.
if (document.getElementById("favoritesGrid")) {
  renderFavoritesGallery();
}

document.addEventListener("DOMContentLoaded", function () {
  // Close Login Modal if click outside modal content
  const loginModal = document.getElementById("loginModal");
  if (loginModal) {
    loginModal.addEventListener("click", function (e) {
      if (e.target === loginModal) {
        loginModal.style.display = "none";
      }
    });
  }

  // Close Signup Modal if click outside modal content
  const signupModal = document.getElementById("signupModal");
  if (signupModal) {
    signupModal.addEventListener("click", function (e) {
      if (e.target === signupModal) {
        signupModal.style.display = "none";
      }
    });
  }

  // Close Hamburger Navigation if click outside it
  document.addEventListener("click", function (e) {
    const navMenu = document.getElementById("navMenu");
    const hamburger = document.getElementById("hamburgerMenu");
    if (navMenu && navMenu.classList.contains("open") &&
        !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
      navMenu.classList.remove("open");
    }
  });
});
