// State Management
let currentLang = "ar";
let translations = {};
let sdgData = []; // NEW: Store SDG data globally

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize Leaflet Map
  const map = L.map("map").setView([33.8547, 35.8623], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // 2. Fetch Data (Parallel Loading)
  try {
    const [contentRes, regimentRes, sdgRes] = await Promise.all([
      fetch("data/content.json"),
      fetch("data/regiments.json"),
      fetch("data/sdgs.json"),
    ]);

    if (!contentRes.ok || !regimentRes.ok || !sdgRes.ok)
      throw new Error("Failed to load data");

    // Process Content
    translations = await contentRes.json();

    // Process SDGs
    sdgData = await sdgRes.json();

    // Initial Render
    updatePageContent();

    // Process Map Data
    const regimentData = await regimentRes.json();
    renderMap(regimentData, map);
  } catch (error) {
    console.error("Error loading JSON data:", error);
  }

  // 3. Language Switch Logic
  const langBtn = document.getElementById("lang-switch");
  if (langBtn) {
    langBtn.addEventListener("click", (e) => {
      e.preventDefault();
      currentLang = currentLang === "ar" ? "en" : "ar";
      langBtn.textContent = currentLang === "ar" ? "English" : "العربية";
      updatePageContent(); // This now triggers SDG re-render too
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
      // Dynamic Path Construction based on Language
      // Structure: images/sdgs/ar/goal-02.png OR images/sdgs/en/goal-02.png
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
    // Simple localization for Legend Title
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
