// ------------------------------------------------------
// PawCast – Hovedscript (main.js)
// ------------------------------------------------------

const apiKey = "add43568d915b7b4e55a7c1f8b67d198";

// ------------------------------------------------------
// Globale DOM-elementer: Ingen gentagne lookups i hele scriptet
// ------------------------------------------------------
const cityEl = document.getElementById("city");
const tempEl = document.getElementById("temp");
const rainEl = document.getElementById("rain");
const iconEl = document.getElementById("icon");
const windArrowEl = document.getElementById("windArrow");
const windTextEl = document.getElementById("windText");
const forecastEl = document.getElementById("forecast");
const messageCenterEl = document.getElementById("messageCenter");

const onboardingEl = document.getElementById("onboarding");
const appEl = document.getElementById("app");
const progressBar = document.getElementById("progressBar");
const progressContainer = document.getElementById("progressBarContainer");
const slides = document.querySelectorAll(".slide");
const nextButtons = document.querySelectorAll(".next");
const skipButtons = document.querySelectorAll(".skip");
const finishBtn = document.getElementById("finish");

const geoBtn = document.getElementById("geoMode");
const cityBtn = document.getElementById("cityMode");
const searchBtn = document.getElementById("searchMode");
const searchBtntwo = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");

let currentSlide = 0;

// ------------------------------------------------------
// Hjælpefunktioner
// ------------------------------------------------------

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

function degToCardinalDa(deg) {
    const dirs = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
    return dirs[Math.floor(((deg + 22.5) % 360) / 45)];
}

function updateWind(wind) {
    if (!windArrowEl || !windTextEl) return;
    const { speed, deg } = wind;
    windArrowEl.style.transform = `rotate(${deg + 180}deg)`;
    const dirText = degToCardinalDa(deg);
    windTextEl.textContent = `${speed.toFixed(1)} m/s (${dirText}, ${Math.round(deg)}°)`;
}

function getCustomIcon(code) {
    const icons = {
        "01d": "sun.svg", "01n": "sun.svg",
        "02d": "letskyet.svg", "02n": "letskyet.svg",
        "03d": "skyet.svg", "03n": "skyet.svg",
        "04d": "skyet.svg", "04n": "skyet.svg",
        "09d": "rain.svg", "09n": "rain.svg",
        "10d": "rain.svg", "10n": "rain.svg",
        "11d": "thunder.svg", "11n": "thunder.svg",
        "13d": "snow.svg", "13n": "snow.svg",
        "50d": "fog.svg", "50n": "fog.svg"
    };
    return `./assets/img/${icons[code] || "unknown.svg"}`;
}

// ------------------------------------------------------
// Tøjforslag
// ------------------------------------------------------
function getClothingSuggestion(temp, weatherCode, rain = 0) {
    // Hent køn fra localStorage
    const user = JSON.parse(localStorage.getItem("pawCast_user")) || {};
    const gender = user.gender || "andet";

    // Tøjikoner og tekster pr. køn
    const clothingIcons = {
        mand: {
            raincoat: "./assets/img/clothes/male/raincoat.svg",
            winter: "./assets/img/clothes/male/winter.svg",
            summer: "./assets/img/clothes/male/summer.svg",
            jacket: "./assets/img/clothes/male/jacket.svg",
            coat: "./assets/img/clothes/male/coat.svg"
        },
        kvinde: {
            raincoat: "./assets/img/clothes/female/raincoat.svg",
            winter: "./assets/img/clothes/female/winter.svg",
            summer: "./assets/img/clothes/female/summer.svg",
            jacket: "./assets/img/clothes/female/jacket.svg",
            coat: "./assets/img/clothes/female/coat.svg"
        },
        andet: {
            raincoat: "./assets/img/clothes/unisex/raincoat.svg",
            winter: "./assets/img/clothes/unisex/winter.svg",
            summer: "./assets/img/clothes/unisex/summer.svg",
            jacket: "./assets/img/clothes/unisex/jacket.svg",
            coat: "./assets/img/clothes/unisex/coat.svg"
        }
    };

    const iconSet = clothingIcons[gender] || clothingIcons.andet;
    let icon = iconSet.jacket;
    let text = "Tag en jakke";

    // Regnvejr
    if (rain > 0.5 || weatherCode.startsWith("09") || weatherCode.startsWith("10")) {
        icon = iconSet.raincoat;
        text = "Tag en regnjakke";
    }
    // Sne
    else if (weatherCode.startsWith("13")) {
        icon = iconSet.winter;
        text = "Det er snevejr - tag varmt tøj";
    }
    // Varmt
    else if (temp >= 20) {
        icon = iconSet.summer;
        text = "Sommer vejr";
    }
    // Mildt
    else if (temp >= 10) {
        icon = iconSet.jacket;
        text = "En let jakke er perfekt";
    }
    // Køligt
    else if (temp >= 0) {
        icon = iconSet.coat;
        text = "Tag en varm frakke";
    }
    // Frost
    else {
        icon = iconSet.winter;
        text = "På med handsker og vinterjakke";
    }

    return { icon, text };
}


// ------------------------------------------------------
// Hundetips (flere beskeder)
// ------------------------------------------------------
function getDogTips(temp, weatherCode, rain = 0) {
    const tips = [];

    if (temp >= 25) {
        tips.push({
            text: "Asfalten kan være meget varm",
            icon: "./assets/img/dog/poteDanger.svg"
        });
    }

    if (temp >= 20 || rain > 0) {
        tips.push({
            text: "Husk vand til hunden",
            icon: "./assets/img/dog/bowl.svg"
        });
    }

    if (temp <= 0) {
        tips.push({
            text: "Pas på salt og is under poterne",
            icon: "./assets/img/dog/PawIce.svg"
        });
        tips.push({
            text: "Overvej varmt tøj til hunden",
            icon: "./assets/img/dog/dogclothes.svg"
        });
    }

    if (rain > 0.5 || weatherCode.startsWith("09") || weatherCode.startsWith("10")) {
        tips.push({
            text: "Husk håndklæde til pelsen",
            icon: "./assets/img/dog/wet.svg"
        });
    }

    if (tips.length === 0) {
        tips.push({
            text: "Perfekt vejr til en gåtur",
            icon: "./assets/img/dog/walk.svg"
        });
    }

    return tips;
}

// ------------------------------------------------------
// Hent og vis vejrdata
// ------------------------------------------------------
async function showWeatherData({ lat, lon, city }) {
    let currentUrl, forecastUrl;
    // OpenWeather bruger HTTP-requests med forskellige parametre. Kun GET er understøttet. Serveren svarer med JSON (et objekt med temperatur, vind osv.). Vores JavaScript-kode omdanner svaret med .then(r => r.json()).
    if (city) {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=da`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=da`;
    } else if (lat && lon) {
        currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=da`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=da`;
    } else return;

    try {
        // async/await + Promise.all: Begge fetches starter samtidigt → browseren åbner to forbindelser med det samme.
        // De kører parallelt, ikke sekventielt.
        // Browseren udnytter netværket maksimalt, og CPU’en venter kun én gang på begge resultater.
        // Ingen kæder af .then() — JS-motoren kan planlægge afviklingen mere direkte.
        const [current, forecast] = await Promise.all([
            fetch(currentUrl).then(r => r.json()),
            fetch(forecastUrl).then(r => r.json())
        ]);

        // Aktuelt vejr
        cityEl.textContent = `${current.name}, ${current.sys.country}`;
        const feelsLike = current.main.feels_like.toFixed(1);
        tempEl.textContent = `${current.main.temp.toFixed(1)} °C`;

        // Sæt tooltip på hele temperaturblokken
        const tempWrapper = tempEl.closest(".dataWrapper");
        if (tempWrapper) {
            tempWrapper.setAttribute("title", `Føles som ${feelsLike} °C`);
        }
        updateWind(current.wind);
        rainEl.textContent = current.rain ? `${current.rain["1h"] || 0} mm` : "0 mm";
        iconEl.src = getCustomIcon(current.weather[0].icon);

        // Beskeder (hundetips + tøjforslag)
        const windSpeed = current.wind.speed;
        const weatherIcon = current.weather[0].icon;
        const rainNow = current.rain ? current.rain["1h"] || 0 : 0;

        const dogTips = getDogTips(current.main.temp, weatherIcon, rainNow, windSpeed);
        const clothing = getClothingSuggestion(current.main.temp, weatherIcon, rainNow);

        messageCenterEl.innerHTML = "";
        const fragment = document.createDocumentFragment();

        dogTips.forEach(tip => {
            const div = document.createElement("div");
            div.className = "message-wrapper";
            div.innerHTML = `
        <img class="data-image-small" src="${tip.icon}" alt="">
        <p>${tip.text}</p>
      `;
            fragment.appendChild(div);
        });

        const clothesDiv = document.createElement("div");
        clothesDiv.className = "message-wrapper";
        clothesDiv.innerHTML = `
      <img class="data-image-small" src="${clothing.icon}" alt="Tøjforslag">
      <p>${clothing.text}</p>
    `;
        fragment.appendChild(clothesDiv);

        messageCenterEl.appendChild(fragment);

        // Dagens prognose
        const today = new Date().getDate();
        const todayForecast = forecast.list.filter(item =>
            // Fra Unix-tid til lokal tid (Sekunder siden 1970). Js Date skal bruge millisekunder. Derfor *1000.
            new Date(item.dt * 1000).getDate() === today
        );

        forecastEl.textContent = "";
        if (!todayForecast.length) {
            forecastEl.textContent = "Ingen data for i dag";
            return;
        }

        // DocumentFragment: effektiv opbygning af DOM før indsættelse i én operation uden gentagne renderinger. 
        const forecastFrag = document.createDocumentFragment();

        todayForecast.forEach(item => {
            const div = document.createElement("div");
            div.className = "day smallDay";

            // Fra Unix-tid til lokal tid (Sekunder siden 1970). Js Date skal bruge millisekunder. Derfor *1000. Formatér til dansk tid og vis kun timer og minutter.
            const time = new Date(item.dt * 1000).toLocaleTimeString("da-DK", {
                hour: "2-digit", minute: "2-digit"
            });
            const temp = item.main.temp.toFixed(1);
            const rain = item.rain ? item.rain["3h"] || 0 : 0;
            const desc = capitalize(item.weather[0].description);
            const icon = getCustomIcon(item.weather[0].icon);
            const windSpeed = item.wind.speed.toFixed(1);
            const windDeg = item.wind.deg;
            const windDir = degToCardinalDa(windDeg);
            const clothing = getClothingSuggestion(item.main.temp, item.weather[0].icon, rain);

            div.innerHTML = `
      <h3>${time}</h3>

      <div class="weather-header">
        <img class="data-image-small" src="${icon}" alt="${desc}">
        <p>${desc}</p>
      </div>

      <div class="weather-header clothing-header">
        <img class="data-image-small" src="${clothing.icon}" alt="Tøjforslag">
        <p>${clothing.text}</p>
      </div>

      <div class="data-container">
        <div class="dataWrapper tempWrapper">
          <img class="data-image" src="./assets/img/termometer.svg" alt="Temp">
          <p class="smallData">${temp} °C</p>
        </div>
        <div class="dataWrapper rainWrapper">
          <img class="data-image" src="./assets/img/water.svg" alt="Nedbør">
          <p class="smallData">${rain} mm</p>
        </div>
        <div class="dataWrapper windWrapper">
          <svg class="windArrowSmall" viewBox="0 0 24 24" width="24" height="24"
               style="transform: rotate(${windDeg + 180}deg);">
            <path d="M12 2 L16 10 H13 V22 H11 V10 H8 Z"></path>
          </svg>
          <p class="smallData">${windSpeed} m/s ${windDir}</p>
        </div>
      </div>
    `;

            forecastFrag.appendChild(div);
        });

        forecastEl.appendChild(forecastFrag);

    } catch (err) {
        console.error("Fejl i vejrdata:", err);
    }
}

// ------------------------------------------------------
// Fejl-håndtering
// ------------------------------------------------------
function showError(error) {
    console.error("Kunne ikke hente lokation:", error);
    alert("Vi kunne ikke hente din placering");
}

// ------------------------------------------------------
// Onboarding og brugerdata
// ------------------------------------------------------
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

finishBtn.addEventListener("click", () => {
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
    onboardingEl.style.display = "none";
    appEl.style.display = "block";
    // Tjekker, om browseren understøtter geolocation (GPS-funktion)
    if (navigator.geolocation) {

        // Hvis geolocation er tilgængelig, hentes brugerens nuværende position
        navigator.geolocation.getCurrentPosition(

            // Callback-funktion ved succes:
            // Sender brugerens koordinater (latitude og longitude) videre til funktionen,
            pos => showWeatherData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),

            // Callback-funktion ved fejl:
            showError
        );
    }
}

// ------------------------------------------------------
// Toggle mellem Lokation, Favoritby & Søgning
// ------------------------------------------------------
geoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveButton(geoBtn);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => showWeatherData({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            showError
        );
    } else alert("Din browser understøtter ikke geolocation");
});

cityBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setActiveButton(cityBtn);
    const user = JSON.parse(localStorage.getItem("pawCast_user"));
    if (user && user.city) {
        showWeatherData({ city: user.city });
    } else {
        alert("Du har ikke angivet en by endnu");
    }
});

[searchBtn, searchBtntwo].forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveButton(searchBtn);
        const query = cityInput.value.trim();
        if (query) {
            showWeatherData({ city: query });
            cityInput.value = "";
        } else {
            alert("Indtast en by for at søge");
        }
    });
});

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        searchBtn.click();
        cityInput.value = "";
    }
});

function setActiveButton(activeBtn) {
    document.querySelectorAll(".board-shuffle-wrapper a").forEach(a => a.classList.remove("active"));
    activeBtn.classList.add("active");
}
