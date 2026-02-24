const API_KEY = "e001fe3797eb4bc2997132440262102";
let myChart = null;
let cachedHours = []; 
const searchInput = document.getElementById('citySearch');
const suggestionBox = document.getElementById('suggestionBox');
const metricSelect = document.getElementById('metricSelect');

window.onload = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            p => fetchWeather(`${p.coords.latitude},${p.coords.longitude}`),
            () => fetchWeather("New York")
        );
    } else {
        fetchWeather("London");
    }
};

metricSelect.addEventListener('change', (e) => {
    if(cachedHours.length > 0) renderChart(cachedHours, e.target.value);
});

searchInput.addEventListener('input', async (e) => {
    const val = e.target.value;
    if (val.length < 3) { suggestionBox.style.display = 'none'; return; }

    try {
        const res = await fetch(`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${val}`);
        const matches = await res.json();
        
        if (matches.length > 0) {
            suggestionBox.innerHTML = matches.map(m => 
                `<div class="suggestion-item" onclick="selectCity('${m.name}')">${m.name}, ${m.country}</div>`
            ).join('');
            suggestionBox.style.display = 'block';
        } else {
            suggestionBox.style.display = 'none';
        }
    } catch (err) { console.error("Search failed"); }
});

function selectCity(name) {
    searchInput.value = name;
    suggestionBox.style.display = 'none';
    fetchWeather(name);
}

// Added global function to handle the onclick in suggestion items
window.selectCity = selectCity;

searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        fetchWeather(e.target.value);
        suggestionBox.style.display = 'none';
    }
});

async function fetchWeather(query) {
    try {
        const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${query}&days=1`);
        const data = await res.json();
        updateInterface(data);
    } catch (err) { console.error("Weather failure:", err); }
}

function updateInterface(data) {
    document.getElementById('cityName').innerText = data.location.name;
    document.getElementById('currTemp').innerText = Math.round(data.current.temp_c) + "°";
    document.getElementById('currDesc').innerText = data.current.condition.text;
    document.getElementById('windVal').innerText = data.current.wind_kph + " km/h";
    document.getElementById('humidVal').innerText = data.current.humidity + "%";

    cachedHours = data.forecast.forecastday[0].hour;
    renderHourly(cachedHours);
    renderChart(cachedHours, metricSelect.value);
    applyEnvironment(data);
}

function renderHourly(hours) {
    const wrap = document.getElementById('hourlyWrapper');
    wrap.innerHTML = "";
    hours.filter((_, i) => i % 3 === 0).forEach(h => {
        const div = document.createElement('div');
        div.className = 'hour-card';
        div.innerHTML = `
            <div style="font-size:11px; opacity:0.7">${h.time.split(" ")[1]}</div>
            <img src="https:${h.condition.icon}" width="35" style="margin:5px 0">
            <div style="font-weight:600">${Math.round(h.temp_c)}°</div>
        `;
        wrap.appendChild(div);
    });
}

function renderChart(hours, metric = 'temp_c') {
    const ctx = document.getElementById('weatherChart').getContext('2d');
    if (myChart) myChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    const labels = hours.map(h => h.time.split(" ")[1]);
    const dataPoints = hours.map(h => h[metric]);
    
    const units = {
        'temp_c': '°C',
        'humidity': '%',
        'wind_kph': ' km/h'
    };

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                borderColor: '#ffffff',
                borderWidth: 2,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: 'rgba(0,0,0,0.5)',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { family: 'Poppins', size: 10 },
                    bodyFont: { family: 'Poppins', size: 13, weight: '600' },
                    padding: 10,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `${context.parsed.y}${units[metric]}`
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255,255,255,0.4)',
                        font: { size: 9 },
                        maxTicksLimit: 8
                    }
                },
                y: {
                    display: false,
                    beginAtZero: false
                }
            }
        }
    });
}

function applyEnvironment(data) {
    document.querySelectorAll('.celestial, .particle').forEach(el => el.remove());
    const isDay = data.current.is_day;
    const condition = data.current.condition.text.toLowerCase();
    
    document.body.style.background = isDay 
        ? "linear-gradient(180deg, #4facfe, #00f2fe, #1a1a1a)" 
        : "linear-gradient(135deg, #020111, #191d30, #000000)";

    const localTime = new Date(data.location.localtime);
    const hour = localTime.getHours() + (localTime.getMinutes() / 60);
    
    const body = document.createElement('div');
    body.className = `celestial ${isDay ? 'sun' : 'moon'}`;
    
    let progress;
    if (isDay) {
        progress = ((hour - 6) / 12) * 100;
    } else {
        let nightHour = hour < 6 ? hour + 6 : hour - 18;
        progress = (nightHour / 12) * 100;
    }
    
    const xPos = Math.max(0, Math.min(100, progress));
    const yPos = 0.12 * Math.pow(xPos - 50, 2) + 15; 
    
    body.style.left = xPos + "vw";
    body.style.top = yPos + "vh";
    document.body.appendChild(body);

    if (condition.includes("rain")) createParticles("rain");
    if (condition.includes("snow")) createParticles("snow");
    if (condition.includes("thunder")) triggerLightning();
    if (!isDay) createStars();
}

function createParticles(type) {
    for (let i = 0; i < 80; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const isRain = type === "rain";
        p.style.width = isRain ? '1px' : '3px';
        p.style.height = isRain ? '15px' : '3px';
        p.style.left = Math.random() * 100 + "vw";
        p.style.top = "-20px";
        p.style.opacity = Math.random();
        document.body.appendChild(p);
        
        p.animate([
            { transform: 'translateY(0)' },
            { transform: `translateY(110vh)` }
        ], {
            duration: isRain ? 1000 : 4000,
            iterations: Infinity,
            delay: Math.random() * 2000
        });
    }
}

function triggerLightning() {
    setInterval(() => {
        if (Math.random() > 0.97) {
            document.body.classList.add('lightning-flash');
            setTimeout(() => document.body.classList.remove('lightning-flash'), 200);
        }
    }, 2000);
}

function createStars() {
    for (let i = 0; i < 100; i++) {
        const s = document.createElement('div');
        s.className = 'particle';
        s.style.width = '2px'; s.style.height = '2px';
        s.style.borderRadius = '50%';
        s.style.top = Math.random() * 100 + "vh";
        s.style.left = Math.random() * 100 + "vw";
        s.style.background = "white";
        document.body.appendChild(s);
    }
}