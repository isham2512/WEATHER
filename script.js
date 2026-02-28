const API_KEY = "e001fe3797eb4bc2997132440262102";

let myChart = null;
let cachedHours = [];
let lightningInterval = null;

const searchInput = document.getElementById("citySearch");
const suggestionBox = document.getElementById("suggestionBox");
const metricSelect = document.getElementById("metricSelect");


window.onload = () => {
try{
if(navigator.geolocation){
navigator.geolocation.getCurrentPosition(
p=>fetchWeather(`${p.coords.latitude},${p.coords.longitude}`),
()=>fetchWeather("New York")
);
}else fetchWeather("London");
}catch(err){ console.error(err); }
};



let searchTimeout;

searchInput?.addEventListener("input",e=>{
clearTimeout(searchTimeout);

const val=e.target.value;
if(val.length<3){
suggestionBox.style.display="none";
return;
}

searchTimeout=setTimeout(()=>fetchCitySuggestions(val),400);
});

async function fetchCitySuggestions(query){
try{
const res=await fetch(
`https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${query}`
);

if(!res.ok) return;

const matches=await res.json();

suggestionBox.innerHTML=matches.map(m=>
`<div class="suggestion-item" onclick="selectCity('${m.name}')">
${m.name}, ${m.country}
</div>`
).join("");

suggestionBox.style.display=
matches.length ? "block":"none";

}catch(err){ console.error(err); }
}

window.selectCity=function(name){
searchInput.value=name;
suggestionBox.style.display="none";
fetchWeather(name);
};

searchInput?.addEventListener("keypress",e=>{
if(e.key==="Enter"){
fetchWeather(e.target.value);
suggestionBox.style.display="none";
}
});


async function fetchWeather(query){
try{
if(!query) return;

const res=await fetch(
`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${query}&days=1`
);

if(!res.ok) throw new Error("Weather fetch failed");

const data=await res.json();
updateInterface(data);

}catch(err){
console.error(err);
}
}


function updateInterface(data){
try{

document.getElementById("cityName").innerText=
data.location?.name || "Unknown";

document.getElementById("currTemp").innerText=
Math.round(data.current?.temp_c ?? 0)+"°";

document.getElementById("currDesc").innerText=
data.current?.condition?.text || "";

document.getElementById("windVal").innerText=
(data.current?.wind_kph ?? 0)+" km/h";

document.getElementById("humidVal").innerText=
(data.current?.humidity ?? 0)+"%";

cachedHours=data.forecast?.forecastday?.[0]?.hour || [];

renderHourly(cachedHours);
renderChart(cachedHours,metricSelect.value);
applyEnvironment(data);

}catch(err){ console.error(err); }
}



function renderHourly(hours){
const wrap=document.getElementById("hourlyWrapper");
if(!wrap) return;

wrap.innerHTML="";

hours.filter((_,i)=>i%3===0).forEach(h=>{
const div=document.createElement("div");
div.className="hour-card";

div.innerHTML=`
<div style="font-size:11px;opacity:.7">
${h.time?.split(" ")[1] || ""}
</div>
<img src="https:${h.condition.icon}" width="35">
<div style="font-weight:600">
${Math.round(h.temp_c)}°
</div>
`;

wrap.appendChild(div);
});
}



function renderChart(hours,metric="temp_c"){
const canvas=document.getElementById("weatherChart");
if(!canvas) return;

const ctx=canvas.getContext("2d");
if(myChart) myChart.destroy();

const filtered=(hours||[]).filter(h=>h && h.time && h[metric]!=null);
if(!filtered.length) return;

const labels=filtered.map(h=>h.time.split(" ")[1]);
const dataPoints=filtered.map(h=>Number(h[metric])||0);

const units={
temp_c:"°C",
humidity:"%",
wind_kph:" km/h"
};

const gradient=ctx.createLinearGradient(0,0,0,150);
gradient.addColorStop(0,"rgba(255,255,255,.5)");
gradient.addColorStop(1,"rgba(255,255,255,0)");

myChart=new Chart(ctx,{
type:"line",
data:{
labels,
datasets:[{
data:dataPoints,
borderColor:"#fff",
borderWidth:2,
fill:true,
backgroundColor:gradient,
tension:0.4,
pointRadius:0
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
plugins:{
legend:{display:false},
tooltip:{
backgroundColor:"rgba(0,0,0,.85)",
displayColors:false,
callbacks:{
label:(ctx)=>`${ctx.parsed.y}${units[metric]||""}`
}
}
},
scales:{
x:{grid:{display:false},
ticks:{color:"rgba(255,255,255,.4)",font:{size:9}}},
y:{display:false}
}
}
});
}



function applyEnvironment(data){

document.querySelectorAll(".celestial,.particle")
.forEach(el=>el.remove());

const isDay=data.current?.is_day;
const condition=(data.current?.condition?.text||"").toLowerCase();

const card=document.getElementById("mainCard");
if(!card) return;

const rect=card.getBoundingClientRect();

const localTime=new Date(data.location.localtime);
const hour=localTime.getHours()+localTime.getMinutes()/60;



let bg;

if(hour>=6 && hour<11){
bg="linear-gradient(180deg,#74b9ff,#a6dcef,#1a1a1a)";
}
else if(isDay){
bg="linear-gradient(180deg,#4facfe,#00c6ff,#1a1a1a)";
}
else{
bg="linear-gradient(135deg,#020111,#191d30,#000)";
}

document.body.style.background=bg;



let progress;

if(isDay){
progress=(hour-6)/12;
}else{
let nightHour=hour<6 ? hour+6 : hour-18;
progress=nightHour/12;
}

progress=Math.max(0,Math.min(1,progress));

const radius=rect.width/2.6;
const cx=rect.left+rect.width/2;
const cy=rect.top+rect.height/1.7;

const celestial=document.createElement("div");
celestial.className=`celestial ${isDay?"sun":"moon"}`;

const angle=progress*Math.PI;

const x=cx+radius*Math.cos(angle)-50;
const y=cy-radius*Math.sin(angle)-50;

celestial.style.left=x+"px";
celestial.style.top=y+"px";

document.body.appendChild(celestial);



if(condition.includes("rain")) createParticles("rain");
if(condition.includes("snow")) createParticles("snow");
if(condition.includes("thunder")) triggerLightning();
if(!isDay) createStars();

}



function createParticles(type){

for(let i=0;i<40;i++){
const p=document.createElement("div");
p.className="particle";

const isRain=type==="rain";

p.style.width=isRain?"1px":"3px";
p.style.height=isRain?"15px":"3px";
p.style.left=Math.random()*100+"vw";
p.style.top="-20px";

document.body.appendChild(p);

p.animate([
{transform:"translateY(0)"},
{transform:"translateY(110vh)"}
],{
duration:isRain?1200:4000,
iterations:Infinity,
delay:Math.random()*2000
});
}
}

function triggerLightning(){
if(lightningInterval) clearInterval(lightningInterval);

lightningInterval=setInterval(()=>{
if(Math.random()>0.97){
document.body.classList.add("lightning-flash");
setTimeout(()=>document.body.classList.remove("lightning-flash"),200);
}
},3000);
}

function createStars(){
for(let i=0;i<60;i++){
const s=document.createElement("div");
s.className="particle";
s.style.width="2px";
s.style.height="2px";
s.style.borderRadius="50%";
s.style.background="white";
s.style.top=Math.random()*100+"vh";
s.style.left=Math.random()*100+"vw";
document.body.appendChild(s);
}
}

