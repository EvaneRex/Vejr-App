const apiKey = "add43568d915b7b4e55a7c1f8b67d198";

// ------------------------------------------------------
// Hjælpefunktioner
// ------------------------------------------------------

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function degToCardinalDa(deg) {
    const dirs = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
    const idx = Math.floor(((deg + 22.5) % 360) / 45);
    return dirs[idx];
}

function updateWind(wind) {
    const speed = wind.speed;
    const deg = wind.deg;
    const rotation = deg + 180;

    const arrow = document.getElementById("windArrow");
    if (arrow) {
        arrow.style.transform = `rotate(${rotation}deg)`;
    }

    const dirText = degToCardinalDa(deg);
    document.getElementById("windText").textContent =
        `${speed.toFixed(1)} m/s (${dirText}, ${Math.round(deg)}°)`;
}

function getCustomIcon(iconCode) {
    switch (iconCode) {
        case "01d":
        case "01n": return "./assets/img/sun.svg";
        case "02d":
        case "02n": return "./assets/img/letskyet.svg";
        case "03d":
        case "03n":
        case "04d":
        case "04n": return "./assets/img/skyet.svg";
        case "09d":
        case "09n":
        case "10d":
        case "10n": return "./assets/img/rain.svg";
        case "11d":
        case "11n": return "./assets/img/thunder.svg";
        case "13d":
        case "13n": return "./assets/img/snow.svg";
        case "50d":
        case "50n": return "./assets/img/fog.svg";
        default: return "./assets/icons/unknown.svg";
    }
}

// ------------------------------------------------------
// Hent og vis vejrdata (fælles funktion)
// ------------------------------------------------------

function showWeatherData({ lat, lon, city }) {
    let currentUrl, forecastUrl;

    if (city) {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=da`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=da`;
    } else if (lat && lon) {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=da`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=da`;
    } else {
        console.error("showWeatherData kaldt uden gyldig by eller koordinater");
        return;
    }

    // --- Aktuelt vejr ---
    fetch(currentUrl)
        .then(res => res.json())
        .then(data => {
            document.getElementById("city").textContent = `${data.name}, ${data.sys.country}`;
            document.getElementById("temp").textContent = `${data.main.temp.toFixed(1)} °C`;
            updateWind(data.wind);
            document.getElementById("icon").src = getCustomIcon(data.weather[0].icon);
        })
        .catch(err => console.error("Fejl i current weather:", err));

    // --- Dagens forecast ---
    fetch(forecastUrl)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("forecast");
            container.innerHTML = "";

            const today = new Date().getDate();
            const todayForecast = data.list.filter(item => {
                const date = new Date(item.dt * 1000);
                return date.getDate() === today;
            });

            if (todayForecast.length === 0) {
                container.innerHTML = "<p>Ingen data for i dag 🌤️</p>";
                return;
            }

            todayForecast.forEach(item => {
                const time = new Date(item.dt * 1000).toLocaleTimeString("da-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                });
                const temp = item.main.temp.toFixed(1);
                const rain = item.rain ? item.rain["3h"] || 0 : 0;
                const desc = capitalize(item.weather[0].description);
                const icon = getCustomIcon(item.weather[0].icon);
                const windSpeed = item.wind.speed.toFixed(1);
                const windDeg = item.wind.deg;
                const windDir = degToCardinalDa(windDeg);
                const rotation = windDeg + 180;

                const card = `
                  <div class="day smallDay">
                    <h3>${time}</h3>
                    <div class="weather-header">
                      <img class="data-image-small" src="${icon}" alt="${desc}">
                      <p>${desc}</p>
                    </div>
                    <div class="data-container">
                      <div class="dataWrapper">
                        <img class="data-image" src="./assets/img/sun.svg" alt="Temp">
                        <p class="smallData">${temp} °C</p>
                      </div>
                      <div class="dataWrapper">
                        <img class="data-image" src="./assets/img/rain.svg" alt="Nedbør">
                        <p class="smallData">${rain} mm</p>
                      </div>
                      <div class="dataWrapper windWrapper">
                        <svg class="windArrowSmall" viewBox="0 0 24 24" width="12" height="12"
                             style="transform: rotate(${rotation}deg);">
                          <path d="M12 2 L16 10 H13 V22 H11 V10 H8 Z"></path>
                        </svg>
                        <p class="smallData">${windSpeed} m/s ${windDir}</p>
                      </div>
                    </div>
                  </div>
                `;
                container.insertAdjacentHTML("beforeend", card);
            });
        })
        .catch(err => console.error("Fejl i forecast:", err));
}

// ------------------------------------------------------
// Fejl-håndtering
// ------------------------------------------------------

function showError(error) {
    console.error("Kunne ikke hente lokation:", error);
    alert("Vi kunne ikke hente din placering 😕");
}

// ------------------------------------------------------
// Onboarding & brugerdata
// ------------------------------------------------------

const slides = document.querySelectorAll(".slide");
const nextButtons = document.querySelectorAll(".next");
const skipButtons = document.querySelectorAll(".skip");
const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressBarContainer");
let currentSlide = 0;

if (localStorage.getItem("pawCast_user")) {
    showApp();
} else {
    showSlide(currentSlide);
    updateProgressBar();
}

nextButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        if (currentSlide < slides.length - 1) {
            slides[currentSlide].classList.remove("active");
            currentSlide++;
            showSlide(currentSlide);
            updateProgressBar();
        }
    });
});

skipButtons.forEach(btn => btn.addEventListener("click", skipOnboarding));

document.getElementById("finish").addEventListener("click", () => {
    const name = document.getElementById("userName").value.trim();
    const gender = document.getElementById("userGender").value;
    const city = document.getElementById("userCity").value.trim();
    const userData = { name, gender, city };
    localStorage.setItem("pawCast_user", JSON.stringify(userData));
    showApp();
});

function showSlide(index) {
    slides.forEach((slide, i) => {
        slide.style.display = i === index ? "flex" : "none";
    });
    progressContainer.style.visibility = index === 0 ? "hidden" : "visible";
}

function updateProgressBar() {
    const visibleSlides = slides.length - 1;
    const progress = (currentSlide / visibleSlides) * 100;
    progressBar.style.width = `${progress}%`;
}

function skipOnboarding() {
    localStorage.setItem("pawCast_user", JSON.stringify({ skipped: true }));
    showApp();
}

function showApp() {
    document.getElementById("onboarding").style.display = "none";
    document.getElementById("app").style.display = "block";
    const user = JSON.parse(localStorage.getItem("pawCast_user"));

    // Når app vises, start med geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => showWeatherData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            showError
        );
    }
}

// ------------------------------------------------------
// Toggle mellem Aktuel lokation & Favoritby
// ------------------------------------------------------

const geoBtn = document.getElementById("geoMode");
const cityBtn = document.getElementById("cityMode");

geoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveButton(geoBtn);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => showWeatherData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            showError
        );
    } else {
        alert("Din browser understøtter ikke geolocation 😢");
    }
});

cityBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveButton(cityBtn);

    const user = JSON.parse(localStorage.getItem("pawCast_user"));
    if (user && user.city) {
        showWeatherData({ city: user.city });
    } else {
        alert("Du har ikke angivet en by endnu 🌆");
    }
});

function setActiveButton(activeBtn) {
    document.querySelectorAll(".board-shuffle-wrapper a").forEach(a => a.classList.remove("active"));
    activeBtn.classList.add("active");
}
