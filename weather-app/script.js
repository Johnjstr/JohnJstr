"use strict";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const form = document.getElementById("search-form");
const cityInput = document.getElementById("city");
const regionInput = document.getElementById("region");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const unitButtons = document.querySelectorAll(".unit-toggle__btn");

let temperatureUnit = "fahrenheit";
let lastPlace = null;

// WMO weather interpretation codes -> label + emoji.
const WEATHER_CODES = {
    0: ["Clear sky", "\u2600\uFE0F"],
    1: ["Mainly clear", "\uD83C\uDF24\uFE0F"],
    2: ["Partly cloudy", "\u26C5"],
    3: ["Overcast", "\u2601\uFE0F"],
    45: ["Fog", "\uD83C\uDF2B\uFE0F"],
    48: ["Depositing rime fog", "\uD83C\uDF2B\uFE0F"],
    51: ["Light drizzle", "\uD83C\uDF26\uFE0F"],
    53: ["Moderate drizzle", "\uD83C\uDF26\uFE0F"],
    55: ["Dense drizzle", "\uD83C\uDF26\uFE0F"],
    56: ["Freezing drizzle", "\uD83C\uDF28\uFE0F"],
    57: ["Freezing drizzle", "\uD83C\uDF28\uFE0F"],
    61: ["Slight rain", "\uD83C\uDF27\uFE0F"],
    63: ["Moderate rain", "\uD83C\uDF27\uFE0F"],
    65: ["Heavy rain", "\uD83C\uDF27\uFE0F"],
    66: ["Freezing rain", "\uD83C\uDF28\uFE0F"],
    67: ["Freezing rain", "\uD83C\uDF28\uFE0F"],
    71: ["Slight snow", "\uD83C\uDF28\uFE0F"],
    73: ["Moderate snow", "\uD83C\uDF28\uFE0F"],
    75: ["Heavy snow", "\u2744\uFE0F"],
    77: ["Snow grains", "\u2744\uFE0F"],
    80: ["Rain showers", "\uD83C\uDF26\uFE0F"],
    81: ["Rain showers", "\uD83C\uDF26\uFE0F"],
    82: ["Violent rain showers", "\u26C8\uFE0F"],
    85: ["Snow showers", "\uD83C\uDF28\uFE0F"],
    86: ["Snow showers", "\uD83C\uDF28\uFE0F"],
    95: ["Thunderstorm", "\u26C8\uFE0F"],
    96: ["Thunderstorm w/ hail", "\u26C8\uFE0F"],
    99: ["Thunderstorm w/ hail", "\u26C8\uFE0F"],
};

// US AQI category -> label + color (EPA breakpoints).
function aqiCategory(aqi) {
    if (aqi == null) return null;
    if (aqi <= 50) return { label: "Good", color: "#94ffaf" };
    if (aqi <= 100) return { label: "Moderate", color: "#fff275" };
    if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "#ffb454" };
    if (aqi <= 200) return { label: "Unhealthy", color: "#ff7a7a" };
    if (aqi <= 300) return { label: "Very Unhealthy", color: "#d3a4ff" };
    return { label: "Hazardous", color: "#e79aa2" };
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function degreesToCompass(deg) {
    if (deg == null) return "";
    return COMPASS[Math.round(deg / 22.5) % 16];
}

function showStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("status--error", Boolean(isError));
    statusEl.hidden = false;
    if (isError) resultEl.hidden = true;
}

function clearStatus() {
    statusEl.hidden = true;
    statusEl.textContent = "";
    statusEl.classList.remove("status--error");
}

async function fetchJson(url, params) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${url}?${query}`);
    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }
    return response.json();
}

async function geocode(city, region) {
    const data = await fetchJson(GEOCODE_URL, {
        name: city,
        count: 10,
        language: "en",
        format: "json",
    });
    const results = data.results || [];
    if (results.length === 0) return null;

    if (region) {
        const needle = region.trim().toLowerCase();
        const match = results.find((r) => {
            const admin1 = (r.admin1 || "").toLowerCase();
            const country = (r.country || "").toLowerCase();
            const code = (r.country_code || "").toLowerCase();
            return admin1.includes(needle) || country.includes(needle) || code === needle;
        });
        if (match) return match;
    }
    return results[0];
}

function formatPlace(place) {
    return [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(", ");
}

async function loadWeather(place) {
    const [forecast, air] = await Promise.all([
        fetchJson(FORECAST_URL, {
            latitude: place.latitude,
            longitude: place.longitude,
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
            temperature_unit: temperatureUnit,
            wind_speed_unit: "mph",
            timezone: "auto",
        }),
        fetchJson(AIR_QUALITY_URL, {
            latitude: place.latitude,
            longitude: place.longitude,
            current: "us_aqi",
            timezone: "auto",
        }).catch(() => null),
    ]);

    renderResult(place, forecast, air);
}

function renderResult(place, forecast, air) {
    const current = forecast.current || {};
    const units = forecast.current_units || {};
    const tempSymbol = temperatureUnit === "celsius" ? "\u00B0C" : "\u00B0F";

    const [desc, icon] = WEATHER_CODES[current.weather_code] || ["Unknown", "\uD83C\uDF10"];

    document.getElementById("location-name").textContent = formatPlace(place);
    document.getElementById("observed-at").textContent =
        current.time ? `Observed ${new Date(current.time).toLocaleString()}` : "";
    document.getElementById("weather-icon").textContent = icon;
    document.getElementById("temperature").textContent =
        `${Math.round(current.temperature_2m)}${tempSymbol}`;
    document.getElementById("weather-desc").textContent = desc;

    document.getElementById("feels-like").textContent =
        `${Math.round(current.apparent_temperature)}${tempSymbol}`;
    document.getElementById("humidity").textContent =
        `${current.relative_humidity_2m}${units.relative_humidity_2m || "%"}`;

    const compass = degreesToCompass(current.wind_direction_10m);
    document.getElementById("wind").textContent =
        `${Math.round(current.wind_speed_10m)} mph ${compass}`.trim();
    document.getElementById("precipitation").textContent =
        `${current.precipitation ?? 0} ${units.precipitation || "mm"}`;

    const aqiEl = document.getElementById("aqi");
    const aqiValue = air && air.current ? air.current.us_aqi : null;
    const category = aqiCategory(aqiValue);
    if (category) {
        aqiEl.innerHTML =
            `${aqiValue} <span class="aqi-pill" style="background:${category.color}">${category.label}</span>`;
    } else {
        aqiEl.textContent = "Unavailable";
    }

    resultEl.hidden = false;
}

async function runSearch() {
    const city = cityInput.value.trim();
    if (!city) {
        showStatus("Please enter a city.", true);
        return;
    }
    const region = regionInput.value.trim();

    clearStatus();
    showStatus("Searching\u2026", false);

    try {
        const place = await geocode(city, region);
        if (!place) {
            showStatus(`No location found for "${city}". Try a different spelling.`, true);
            return;
        }
        lastPlace = place;
        showStatus(`Loading weather for ${formatPlace(place)}\u2026`, false);
        await loadWeather(place);
        clearStatus();
    } catch (err) {
        console.error(err);
        showStatus("Something went wrong fetching the weather. Please try again.", true);
    }
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch();
});

unitButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
        if (btn.classList.contains("is-active")) return;
        unitButtons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        temperatureUnit = btn.dataset.unit;
        if (lastPlace) {
            showStatus("Updating units\u2026", false);
            try {
                await loadWeather(lastPlace);
                clearStatus();
            } catch (err) {
                console.error(err);
                showStatus("Could not update units. Please try again.", true);
            }
        }
    });
});
