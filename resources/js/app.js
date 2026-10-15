import './bootstrap';
import './dashboard-api';
import { loadBorderWeather } from './border-weather';

const cities = {
	'กรุงเทพมหานคร': { lat: 13.7563, lon: 100.5018, temp: 31, condition: 'มีเมฆและฝนบางแห่ง', feels: 36, high: 33, low: 27, humidity: 78, wind: 14, rain: 65, sky: 'ฝนฟ้าคะนอง' },
	'เชียงใหม่': { lat: 18.7883, lon: 98.9853, temp: 29, condition: 'มีเมฆบางส่วน', feels: 32, high: 31, low: 22, humidity: 64, wind: 9, rain: 25, sky: 'มีเมฆบางส่วน' },
	'ภูเก็ต': { lat: 7.8804, lon: 98.3923, temp: 33, condition: 'แดดออกเป็นส่วนใหญ่', feels: 38, high: 34, low: 26, humidity: 72, wind: 18, rain: 10, sky: 'แดดออก' },
	'ขอนแก่น': { lat: 16.4419, lon: 102.835, temp: 32, condition: 'เมฆมาก มีโอกาสฝน', feels: 36, high: 34, low: 25, humidity: 69, wind: 12, rain: 48, sky: 'เมฆมาก' },
	'ชลบุรี': { lat: 13.3611, lon: 100.9847, temp: 32, condition: 'มีเมฆและฝนบางแห่ง', feels: 37, high: 34, low: 27, humidity: 76, wind: 16, rain: 55, sky: 'ฝนบางแห่ง' },
};

const bangkokTimeZone = 'Asia/Bangkok';
const bangkokDateFormatter = new Intl.DateTimeFormat('th-TH', {
	timeZone: bangkokTimeZone,
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});
const bangkokTimeFormatter = new Intl.DateTimeFormat('th-TH', {
	timeZone: bangkokTimeZone,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

const toast = document.querySelector('#toast');
let toastTimer;
let activeCity = 'กรุงเทพมหานคร';
let activeTrackedLocation;
let map;
let weatherLayer;
let cityMarker;
let markers = [];

function getBangkokHour(date = new Date()) {
	return Number(new Intl.DateTimeFormat('en-GB', {
		timeZone: bangkokTimeZone,
		hour: '2-digit',
		hourCycle: 'h23',
	}).format(date));
}

function getBangkokWeekdayLabels() {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: bangkokTimeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(new Date());
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	const today = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12));

	return Array.from({ length: 7 }, (_, index) => index === 0
		? 'วันนี้'
		: new Intl.DateTimeFormat('th-TH', { timeZone: bangkokTimeZone, weekday: 'short' })
			.format(new Date(today.getTime() + index * 24 * 60 * 60 * 1000)));
}

function updateDashboardClock() {
	const now = new Date();
	const hour = getBangkokHour(now);
	const time = bangkokTimeFormatter.format(now);
	document.querySelector('#dashboard-date').textContent = bangkokDateFormatter.format(now);
	document.querySelector('#dashboard-time').textContent = `วันนี้ ${time} น.`;
	document.querySelector('#local-time').textContent = `ประเทศไทย · ${time} น.`;

	const hourlyLabels = ['ตอนนี้', ...Array.from({ length: 5 }, (_, index) => `${String((hour + index + 1) % 24).padStart(2, '0')}:00`)];
	if (!document.querySelector('#forecast-list').classList.contains('weekly-forecast')) {
		document.querySelectorAll('#forecast-list .forecast-item > span').forEach((label, index) => {
			label.textContent = hourlyLabels[index] ?? '';
		});
	}
	document.querySelectorAll('.chart-times span').forEach((label, index) => {
		label.textContent = `${String((hour + index * 4) % 24).padStart(2, '0')}:00`;
	});
	document.querySelectorAll('time[data-minutes-ago]').forEach((label) => {
		const minutesAgo = Number(label.dataset.minutesAgo);
		const eventTime = bangkokTimeFormatter.format(new Date(now.getTime() - minutesAgo * 60 * 1000));
		label.textContent = minutesAgo >= 1440 ? `เมื่อวาน ${eventTime} น.` : `${eventTime} น.`;
	});
}

function showToast(message) {
	toast.textContent = message;
	toast.classList.add('show');
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function selectCity(cityName) {
	const city = cities[cityName];
	if (!city) return;

	activeCity = cityName;
	activeTrackedLocation = null;
	document.querySelector('.active-city').innerHTML = `${cityName} <svg class="icon"><use href="#i-pin"/></svg>`;
	document.querySelector('.local-time').textContent = `ประเทศไทย · ${bangkokTimeFormatter.format(new Date())} น.`;
	document.querySelector('.temperature').innerHTML = `${city.temp}<span>°</span><small>${city.condition}</small>`;
	document.querySelector('.feels-like').innerHTML = `รู้สึกเหมือน ${city.feels}° <span>·</span> สูงสุด ${city.high}° / ต่ำสุด ${city.low}°`;
	document.querySelectorAll('.weather-stats strong').forEach((item, index) => {
		const values = [`${city.humidity}<small>%</small>`, `${city.wind}<small> กม./ชม.</small>`, `${city.rain}<small>%</small>`];
		item.innerHTML = values[index];
		item.nextElementSibling.firstElementChild.style.width = `${[city.humidity, city.wind * 3, city.rain][index]}%`;
	});

	document.querySelectorAll('.location-item, .tracked-city').forEach((item) => {
		item.classList.toggle('selected', item.dataset.city === cityName);
		item.classList.toggle('active', item.dataset.city === cityName);
	});

	if (map) {
		map.flyTo([city.lat, city.lon], Math.max(map.getZoom(), 6), { duration: 0.8 });
		cityMarker.setLatLng([city.lat, city.lon]);
		cityMarker.setPopupContent(`<strong>${cityName}</strong><br>${city.temp}° · ${city.sky}<br><small>ข้อมูลตัวอย่าง</small>`);
	}
}

function updateTrackedLocationDashboard(location, current) {
	activeCity = location.name;
	activeTrackedLocation = { location, current };
	const activeCityTitle = document.querySelector('.active-city');
	const pinIcon = activeCityTitle.querySelector('.icon')?.cloneNode(true);
	activeCityTitle.replaceChildren(document.createTextNode(location.name), ...(pinIcon ? [pinIcon] : []));
	document.querySelector('.local-time').textContent = `ประเทศไทย · ${bangkokTimeFormatter.format(new Date())} น.`;

	const temperatureValue = Number.isFinite(current?.temperature_2m) ? Math.round(current.temperature_2m) : null;
	const feelsLikeValue = Number.isFinite(current?.apparent_temperature) ? Math.round(current.apparent_temperature) : null;
	const condition = weatherConditionLabel(current?.weather_code);
	const temperature = document.querySelector('.temperature');
	const degrees = document.createElement('span');
	degrees.textContent = '°';
	const conditionText = document.createElement('small');
	conditionText.textContent = condition;
	temperature.replaceChildren(document.createTextNode(temperatureValue === null ? '--' : String(temperatureValue)), degrees, conditionText);
	document.querySelector('.feels-like').textContent = feelsLikeValue === null
		? 'ข้อมูลความรู้สึกเหมือนยังไม่พร้อม'
		: `รู้สึกเหมือน ${feelsLikeValue}° · สภาพอากาศปัจจุบัน`;

	const humidity = Number.isFinite(current?.relative_humidity_2m) ? Math.round(current.relative_humidity_2m) : null;
	const wind = Number.isFinite(current?.wind_speed_10m) ? Math.round(current.wind_speed_10m) : null;
	const rainChance = Number.isFinite(current?.precipitation_probability) ? Math.round(current.precipitation_probability) : null;
	const values = [
		{ value: humidity, suffix: '%', width: humidity },
		{ value: wind, suffix: ' กม./ชม.', width: wind === null ? null : Math.min(100, wind * 3) },
		{ value: rainChance, suffix: '%', width: rainChance },
	];
	document.querySelectorAll('.weather-stats > div').forEach((stat, index) => {
		const metric = values[index];
		stat.querySelector('strong').innerHTML = `${metric.value === null ? '--' : metric.value}<small>${metric.value === null ? '' : metric.suffix}</small>`;
		stat.querySelector('.stat-meter i').style.width = `${metric.width ?? 0}%`;
	});

	if (map && cityMarker) {
		const position = [Number(location.latitude), Number(location.longitude)];
		map.flyTo(position, Math.max(map.getZoom(), 8), { duration: 0.8 });
		cityMarker.setLatLng(position);
		cityMarker.setPopupContent(`<strong>${escapeText(location.name)}</strong><br>${temperatureValue === null ? '--' : `${temperatureValue}°`} · ${escapeText(condition)}<br><small>${escapeText(location.province)}</small>`);
		cityMarker.openPopup();
	}
}

function weatherConditionLabel(code) {
	if (!Number.isFinite(Number(code))) return 'ข้อมูลสภาพอากาศไม่พร้อม';
	const weatherCode = Number(code);
	if (weatherCode === 0) return 'ท้องฟ้าแจ่มใส';
	if ([1, 2, 3].includes(weatherCode)) return 'มีเมฆบางส่วน';
	if ([45, 48].includes(weatherCode)) return 'มีหมอก';
	if ([51, 53, 55, 56, 57].includes(weatherCode)) return 'ฝนละออง';
	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'มีฝน';
	if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'มีหิมะ';
	if ([95, 96, 99].includes(weatherCode)) return 'ฝนฟ้าคะนอง';
	return 'สภาพอากาศแปรปรวน';
}

function escapeText(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function updateMapLayer(layerName) {
	if (!map || !weatherLayer) return;
	map.removeLayer(weatherLayer);
	weatherLayer = L.layerGroup();

	Object.entries(cities).forEach(([name, city], index) => {
		if (layerName === 'alerts') {
			if (index % 2 === 0) {
				L.circleMarker([city.lat, city.lon], {
					radius: name === 'กรุงเทพมหานคร' ? 8 : 6,
					color: '#a64c36',
					weight: 2,
					fillColor: '#ef9365',
					fillOpacity: 0.82,
				}).bindPopup(`<strong>${name}</strong><br>เฝ้าระวังสภาพอากาศ<br><small>ข้อมูลตัวอย่าง</small>`).addTo(weatherLayer);
			}
			return;
		}

		const radius = layerName === 'wind' ? 30000 : 42000;
		const color = layerName === 'wind' ? '#739daf' : '#5babb6';
		L.circle([city.lat, city.lon], {
			radius: radius + (index % 3) * 11000,
			color,
			weight: 1,
			fillColor: layerName === 'wind' ? '#82b7c2' : '#6eb7ac',
			fillOpacity: layerName === 'wind' ? 0.22 : Math.max(0.12, city.rain / 300),
		}).bindPopup(`<strong>${name}</strong><br>${layerName === 'wind' ? `${city.wind} กม./ชม.` : `โอกาสฝน ${city.rain}%`}<br><small>ข้อมูลตัวอย่าง</small>`).addTo(weatherLayer);
	});

	weatherLayer.addTo(map);
	const legendTitle = document.querySelector('.legend-title');
	legendTitle.textContent = layerName === 'wind' ? 'ความเร็วลม' : layerName === 'alerts' ? 'ระดับการเตือน' : 'ปริมาณฝน';
	document.querySelector('.legend-scale').style.background = layerName === 'alerts'
		? 'linear-gradient(90deg, #f3d37f, #e88c62, #ba5546)'
		: layerName === 'wind'
			? 'linear-gradient(90deg, #d7e7cc, #8fc6c2, #668daf)'
			: 'linear-gradient(90deg, #c7e3d1, #78b8bb, #eecc76, #e88a57)';
}

function initializeMap() {
	const mapElement = document.querySelector('#weather-map');
	if (!mapElement || !window.L) return;

	map = L.map(mapElement, { scrollWheelZoom: false, zoomControl: false }).setView([15.2, 101.1], 5.4);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	}).addTo(map);
	L.control.zoom({ position: 'topright' }).addTo(map);

	const cityIcon = L.divIcon({
		className: 'weather-map-marker',
		html: '<span style="display:block;width:13px;height:13px;border:3px solid white;border-radius:50%;background:#e87e57;box-shadow:0 1px 8px #614f3a"></span>',
		iconSize: [13, 13],
		iconAnchor: [7, 7],
	});
	cityMarker = L.marker([cities[activeCity].lat, cities[activeCity].lon], { icon: cityIcon })
		.bindPopup(`<strong>${activeCity}</strong><br>${cities[activeCity].temp}° · ${cities[activeCity].sky}<br><small>ข้อมูลตัวอย่าง</small>`)
		.addTo(map);

	markers = Object.values(cities).map((city) => [city.lat, city.lon]);
	weatherLayer = L.layerGroup().addTo(map);
	updateMapLayer('rain');
	window.setTimeout(() => map.invalidateSize(), 100);
}

function renderForecast(period) {
	const forecast = document.querySelector('#forecast-list');
	if (period === 'week') {
		const weekdays = getBangkokWeekdayLabels();
		const days = [
			[weekdays[0], 'rain', 31, '65%'], [weekdays[1], 'cloud', 32, '30%'], [weekdays[2], 'sun', 33, '15%'],
			[weekdays[3], 'rain', 30, '55%'], [weekdays[4], 'rain', 29, '70%'], [weekdays[5], 'cloud', 31, '35%'], [weekdays[6], 'sun', 32, '20%'],
		];
		forecast.classList.add('weekly-forecast');
		forecast.innerHTML = days.map(([day, icon, temp, chance]) => `<div class="forecast-item"><span>${day}</span><svg class="weather-mini ${icon}-mini"><use href="#i-${icon === 'cloud' ? 'cloud' : icon}"/></svg><strong>${temp}°</strong><small>${chance}</small></div>`).join('');
	} else {
		forecast.classList.remove('weekly-forecast');
		forecast.innerHTML = '<div class="forecast-item"><span>ตอนนี้</span><svg class="weather-mini sun-cloud"><use href="#i-cloud"/></svg><strong>31°</strong><small>65%</small></div><div class="forecast-item"><span></span><svg class="weather-mini sun-mini"><use href="#i-sun"/></svg><strong>33°</strong><small>35%</small></div><div class="forecast-item"><span></span><svg class="weather-mini rain-mini"><use href="#i-rain"/></svg><strong>32°</strong><small>70%</small></div><div class="forecast-item"><span></span><svg class="weather-mini rain-mini"><use href="#i-rain"/></svg><strong>30°</strong><small>80%</small></div><div class="forecast-item"><span></span><svg class="weather-mini cloud-mini"><use href="#i-cloud"/></svg><strong>29°</strong><small>40%</small></div><div class="forecast-item"><span></span><svg class="weather-mini moon-mini"><use href="#i-sun"/></svg><strong>28°</strong><small>20%</small></div>';
	}
	updateDashboardClock();
}

updateDashboardClock();
window.setInterval(updateDashboardClock, 60_000);
initializeMap();
window.addEventListener('weatherguard:tracked-location-selected', (event) => {
	updateTrackedLocationDashboard(event.detail.location, event.detail.current);
});
loadBorderWeather({
	list: document.querySelector('#dashboard-border-weather-list'),
	status: document.querySelector('#dashboard-border-weather-status'),
});

document.querySelectorAll('.location-item, .tracked-city').forEach((button) => {
	button.addEventListener('click', () => selectCity(button.dataset.city));
});

document.querySelectorAll('.forecast-tab').forEach((button) => {
	button.addEventListener('click', () => {
		document.querySelectorAll('.forecast-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
		renderForecast(button.dataset.period);
	});
});

document.querySelectorAll('.map-layer').forEach((button) => {
	button.addEventListener('click', () => {
		document.querySelectorAll('.map-layer').forEach((layer) => layer.classList.toggle('active', layer === button));
		updateMapLayer(button.dataset.layer);
	});
});

const searchInput = document.querySelector('#city-search');
const searchResults = document.querySelector('#search-results');
searchInput.addEventListener('input', () => {
	const query = searchInput.value.trim();
	if (!query) {
		searchResults.classList.remove('open');
		return;
	}
	const matches = Object.keys(cities).filter((name) => name.includes(query));
	searchResults.innerHTML = matches.length
		? matches.map((name) => `<button type="button" data-city="${name}">${name}</button>`).join('')
		: '<button type="button" disabled>ไม่พบจังหวัดนี้ในข้อมูลตัวอย่าง</button>';
	searchResults.classList.add('open');
	searchResults.querySelectorAll('[data-city]').forEach((button) => button.addEventListener('click', () => {
		selectCity(button.dataset.city);
		searchInput.value = '';
		searchResults.classList.remove('open');
	}));
});
searchInput.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') searchResults.classList.remove('open');
	if (event.key === 'Enter') searchResults.querySelector('button[data-city]')?.click();
});
document.addEventListener('click', (event) => {
	if (!event.target.closest('.search-box')) searchResults.classList.remove('open');
});
document.addEventListener('keydown', (event) => {
	if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
		event.preventDefault();
		searchInput.focus();
	}
});

document.querySelectorAll('[data-scroll]').forEach((button) => {
	button.addEventListener('click', () => document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
});
const openLocations = () => window.location.assign('/locations');
document.querySelector('#configure-alerts').addEventListener('click', openLocations);
document.querySelector('#notification-settings').addEventListener('click', openLocations);
document.querySelector('#notification-button').addEventListener('click', () => document.querySelector('#alerts-section').scrollIntoView({ behavior: 'smooth', block: 'center' }));
document.querySelector('#map-locate').addEventListener('click', () => {
	if (activeTrackedLocation) {
		updateTrackedLocationDashboard(activeTrackedLocation.location, activeTrackedLocation.current);
		return;
	}
	selectCity(activeCity);
});
document.querySelector('#map-expand').addEventListener('click', () => {
	window.location.assign('/map');
});

document.querySelectorAll('.nav-link').forEach((link) => {
	link.addEventListener('click', () => {
		document.querySelectorAll('.nav-link').forEach((item) => item.classList.toggle('active', item === link));
		document.querySelector('#sidebar').classList.remove('open');
	});
});
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.addEventListener('click', (event) => {
	if (window.innerWidth <= 680 && !event.target.closest('#sidebar') && !event.target.closest('#mobile-menu')) {
		document.querySelector('#sidebar').classList.remove('open');
	}
});

const sessionLogout = document.querySelector('#session-logout');
const sessionLogin = document.querySelector('#session-login');
const sessionToken = sessionStorage.getItem('weatherguard_api_token');

function setUserIdentity(name, email) {
	const displayName = name || 'ผู้เยี่ยมชม';
	document.querySelector('#greeting-name').textContent = displayName;
	document.querySelector('#profile-name').textContent = displayName;
	document.querySelector('#profile-email').textContent = email || 'กรุณาเข้าสู่ระบบ';
	document.querySelector('#profile-avatar').textContent = Array.from(displayName.trim())[0] ?? 'ผ';
}

async function loadUserIdentity() {
	if (!sessionToken) return;
	try {
		const response = await fetch('/api/user', {
			headers: { Accept: 'application/json', Authorization: `Bearer ${sessionToken}` },
		});
		if (!response.ok) {
			sessionStorage.removeItem('weatherguard_api_token');
			sessionLogout.hidden = true;
			sessionLogin.hidden = false;
			return;
		}
		const user = await response.json();
		setUserIdentity(user.name, user.email);
		window.dispatchEvent(new CustomEvent('weatherguard:user-ready', { detail: user }));
	} catch {
		setUserIdentity('', '');
	}
}

if (sessionLogout) {
	sessionLogout.hidden = !sessionToken;
	sessionLogin.hidden = Boolean(sessionToken);
	sessionLogout.addEventListener('click', async () => {
		try {
			if (sessionToken) {
				await fetch('/api/logout', {
					method: 'POST',
					headers: { Accept: 'application/json', Authorization: `Bearer ${sessionToken}` },
				});
			}
		} finally {
			sessionStorage.removeItem('weatherguard_api_token');
			window.location.assign('/login');
		}
	});
}

loadUserIdentity();
