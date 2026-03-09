const API_KEY = "e001fe3797eb4bc2997132440262102";

let myChart = null;
let cachedHours = [];
let lightningInterval = null;

const searchInput = document.getElementById("citySearch");
const suggestionBox = document.getElementById("suggestionBox");
const metricSelect = document.getElementById("metricSelect");

/* ---------- Metric Change ---------- */

metricSelect?.addEventListener("change", () => {
    if (cachedHours.length) {
        renderChart(cachedHours, metricSelect.value);
    }
});

/* ---------- Load Location ---------- */

window.onload = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            p => fetchWeather(`${p.coords.latitude},${p.coords.longitude}`),
            () => fetchWeather("London")
        );
    } else {
        fetchWeather("London");
    }
};

/* ---------- Weather Fetch ---------- */

async function fetchWeather(query) {
    try {
        if (!query) return;

        const res = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${query}&days=1`
        );

        if (!res.ok) throw new Error("Weather fetch failed");

        const data = await res.json();

        if (!data.forecast?.forecastday?.length) return;

        updateInterface(data);

    } catch (err) {
        console.error(err);
    }
}

/* ---------- Update UI ---------- */

function updateInterface(data) {

    document.getElementById("cityName").innerText =
        data.location?.name || "Unknown";

    document.getElementById("currTemp").innerText =
        Math.round(data.current?.temp_c ?? 0) + "°";

    document.getElementById("currDesc").innerText =
        data.current?.condition?.text || "";

    document.getElementById("windVal").innerText =
        (data.current?.wind_kph ?? 0) + " km/h";

    document.getElementById("humidVal").innerText =
        (data.current?.humidity ?? 0) + "%";

    cachedHours = data.forecast.forecastday[0].hour || [];

    renderHourly(cachedHours);
    renderChart(cachedHours, metricSelect?.value || "temp_c");
    applyEnvironment(data);   // ✅ RESTORED
}

/* ---------- Hourly Cards ---------- */

function renderHourly(hours) {
    const wrap = document.getElementById("hourlyWrapper");
    if (!wrap) return;

    wrap.innerHTML = "";

    hours.filter((_, i) => i % 3 === 0).forEach(h => {
        const div = document.createElement("div");
        div.className = "hour-card";

        div.innerHTML = `
            <div style="font-size:11px;opacity:.7">
                ${h.time.split(" ")[1]}
            </div>
            <img src="https:${h.condition.icon}" width="35">
            <div style="font-weight:600">
                ${Math.round(h.temp_c)}°
            </div>
        `;

        wrap.appendChild(div);
    });
}

/* ---------- Chart ---------- */

function renderChart(hours, metric = "temp_c") {

    const canvas = document.getElementById("weatherChart");
    if (!canvas || !hours || !hours.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (myChart) myChart.destroy();

    const filtered = hours.filter(h => h && h.time && h[metric] !== undefined);
    if (!filtered.length) return;

    const labels = filtered.map(h => h.time.split(" ")[1]);
    const dataPoints = filtered.map(h => Number(h[metric]));

    const units = {
        temp_c: "°C",
        humidity: "%",
        wind_kph: " km/h"
    };

    myChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data: dataPoints,
                borderColor: "#ffffff",
                borderWidth: 2,
                tension: 0.4,
                fill: false,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.parsed.y + (units[metric] || "")
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#ccc", font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: "#ccc" },
                    grid: { color: "rgba(255,255,255,0.1)" }
                }
            }
        }
    });
}

/* ---------- Environment (RESTORED & CLEANED) ---------- */

function applyEnvironment(data) {

    document.querySelectorAll(".celestial,.particle")
        .forEach(el => el.remove());

    if (lightningInterval) clearInterval(lightningInterval);

    const isDay = data.current?.is_day;
    const condition = (data.current?.condition?.text || "").toLowerCase();

    const localTime = new Date(data.location.localtime);
    const hour = localTime.getHours();

    /* Background */

    if (isDay) {
        document.body.style.background =
            "linear-gradient(180deg,#4facfe,#00c6ff,#1a1a1a)";
    } else {
        document.body.style.background =
            "linear-gradient(135deg,#020111,#191d30,#000)";
    }

    /* Sun / Moon */

    const celestial = document.createElement("div");
    celestial.className = `celestial ${isDay ? "sun" : "moon"}`;
    celestial.style.top = "80px";
    celestial.style.right = "60px";
    document.body.appendChild(celestial);

    /* Weather Effects */

    if (condition.includes("rain")) createParticles("rain");
    if (condition.includes("snow")) createParticles("snow");
    if (condition.includes("thunder")) triggerLightning();
    if (!isDay) createStars();
}

/* ---------- Effects ---------- */

function createParticles(type) {

    for (let i = 0; i < 40; i++) {
        const p = document.createElement("div");
        p.className = "particle";

        const isRain = type === "rain";

        p.style.width = isRain ? "1px" : "3px";
        p.style.height = isRain ? "15px" : "3px";
        p.style.left = Math.random() * 100 + "vw";
        p.style.top = "-20px";

        document.body.appendChild(p);

        p.animate([
            { transform: "translateY(0)" },
            { transform: "translateY(110vh)" }
        ], {
            duration: isRain ? 1200 : 4000,
            iterations: Infinity,
            delay: Math.random() * 2000
        });
    }
}

function triggerLightning() {
    lightningInterval = setInterval(() => {
        if (Math.random() > 0.96) {
            document.body.classList.add("lightning-flash");
            setTimeout(() => {
                document.body.classList.remove("lightning-flash");
            }, 200);
        }
    }, 3000);
}

function createStars() {
    for (let i = 0; i < 60; i++) {
        const s = document.createElement("div");
        s.className = "particle";
        s.style.width = "2px";
        s.style.height = "2px";
        s.style.borderRadius = "50%";
        s.style.background = "white";
        s.style.top = Math.random() * 100 + "vh";
        s.style.left = Math.random() * 100 + "vw";
        document.body.appendChild(s);
    }
}
