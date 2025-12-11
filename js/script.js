// State Management
let currentLang = localStorage.getItem("scout_lang") || "ar";
let translations = {};
let sdgData = [];

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize Leaflet Map
  const map = L.map("map").setView([33.8547, 35.8623], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // 2. Fetch Data (Parallel Loading)
  try {
    const [contentRes, regimentRes, sdgRes, newsRes] = await Promise.all([
      fetch("data/content.json"),
      fetch("data/regiments.json"),
      fetch("data/sdgs.json"),
      fetch("data/news.json"),
    ]);

    if (!contentRes.ok || !regimentRes.ok || !sdgRes.ok)
      throw new Error("Failed to load data");

    // Process Content
    translations = await contentRes.json();

    // Process SDGs
    sdgData = await sdgRes.json();

    // Process News
    const newsData = await newsRes.json();
    renderNews(newsData);

    // Initial Render
    updatePageContent();

    // Process Map Data
    const regimentData = await regimentRes.json();
    renderMap(regimentData, map);
  } catch (error) {
    console.error("Error loading JSON data:", error);
  }

  /// 3. Language Switch Logic (Desktop & Mobile)
  const langBtns = [
    document.getElementById("lang-switch"),
    document.getElementById("lang-switch-mobile"),
  ];

  langBtns.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // Toggle Language
        currentLang = currentLang === "ar" ? "en" : "ar";
        localStorage.setItem("scout_lang", currentLang);

        // Update Text on ALL buttons
        const newText = currentLang === "ar" ? "English" : "العربية";
        langBtns.forEach((b) => {
          if (b) b.textContent = newText;
        });

        updatePageContent();
      });
    }
  });

  // --- Mobile Menu Logic ---
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    // Toggle Menu
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("active");
      document.body.style.overflow = navLinks.classList.contains("active")
        ? "hidden"
        : "auto";
    });

    // Close Menu when clicking a regular link
    document.querySelectorAll(".nav-links a:not(.dropbtn)").forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
        document.body.style.overflow = "auto";
      });
    });

    // Mobile Dropdown Toggle
    const dropdowns = document.querySelectorAll(".dropdown");
    dropdowns.forEach((drop) => {
      const btn = drop.querySelector(".dropbtn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          // Only prevent default on mobile width
          if (window.innerWidth <= 992) {
            e.preventDefault();
            drop.classList.toggle("open");
          }
        });
      }
    });
  }
});

// Helper: Update Text & Images on Page
function updatePageContent() {
  // 1. Text Translations
  if (translations[currentLang]) {
    const data = translations[currentLang];
    document.documentElement.lang = currentLang;
    document.documentElement.dir = data.dir;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (data[key]) {
        element.textContent = data[key];
      }
    });
  }

  // 2. Re-render SDGs (To swap images between /ar/ and /en/)
  if (sdgData.length > 0) {
    renderSDGs(sdgData);
  }
}

// Helper: Render SDGs
function renderSDGs(data) {
  const container = document.querySelector(".sdg-container");
  if (!container) return;

  container.innerHTML = data
    .map((item) => {
      const imagePath = `images/sdgs/${currentLang}/${item.filename}`;

      return `
        <div class="sdg-card">
            <div class="sdg-inner">
                <div class="sdg-front">
                    <img 
                        src="${imagePath}" 
                        alt="${item.title_en}" 
                        loading="lazy" 
                        width="220" 
                        height="220"
                    >
                </div>
                
                <div class="sdg-back">
                    <p>
                        ${currentLang === "ar" ? item.desc_ar : item.desc_en}
                    </p>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

// Helper: Render Map Markers
function renderMap(data, map) {
  const commissions = data.commissions;
  const locations = data.locations;

  locations.forEach((loc) => {
    const commData = commissions[loc.type] || commissions.general;

    const customIcon = L.divIcon({
      className: "custom-pin",
      html: `<div class="pin-inner" style="background-color: ${commData.color};"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    L.marker([loc.lat, loc.lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(
        `<b>${loc.name}</b><br><span style="color:${commData.color}">${commData.label}</span>`
      );
  });

  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "map-legend");
    div.innerHTML = `<h4>${
      currentLang === "ar" ? "المفوضيات" : "Districts"
    }</h4>`;
    for (const key in commissions) {
      const comm = commissions[key];
      div.innerHTML += `
                <div class="legend-item">
                    <span class="legend-color" style="background:${comm.color}"></span>
                    <span>${comm.label}</span>
                </div>
            `;
    }
    return div;
  };
  legend.addTo(map);
}

// Helper: Render News
function renderNews(data) {
  const container = document.getElementById("news-grid");
  if (!container) return;

  container.innerHTML = data
    .map(
      (item) => `
        <a href="${
          item.link
        }" target="_blank" class="news-card" style="text-decoration:none; display:block;">
            <img src="${item.image}" alt="News" class="news-img" loading="lazy">
            <div class="news-content">
                <span class="news-date">${
                  currentLang === "ar" ? item.date_ar : item.date_en
                }</span>
                <h3>${currentLang === "ar" ? item.title_ar : item.title_en}</h3>
                <p>${
                  currentLang === "ar" ? item.excerpt_ar : item.excerpt_en
                }</p>
                <span class="btn-link" style="color:var(--primary); font-weight:bold;">
                    ${translations[currentLang].news_btn} &rarr;
                </span>
            </div>
        </a>
    `
    )
    .join("");
}

window.scrollSDG = function (direction) {
  const container = document.getElementById("sdg-scroll");

  const scrollAmount = 250;

  const isRTL = document.documentElement.dir === "rtl";

  const physicalDirection = isRTL ? -direction : direction;

  container.scrollBy({
    left: physicalDirection * scrollAmount,
    behavior: "smooth",
  });
};
