import './bootstrap';

const cities = {
	'กรุงเทพมหานคร': { lat: 13.7563, lon: 100.5018, temp: 31, condition: 'มีเมฆและฝนบางแห่ง', feels: 36, high: 33, low: 27, humidity: 78, wind: 14, rain: 65, sky: 'ฝนฟ้าคะนอง' },
	'เชียงใหม่': { lat: 18.7883, lon: 98.9853, temp: 29, condition: 'มีเมฆบางส่วน', feels: 32, high: 31, low: 22, humidity: 64, wind: 9, rain: 25, sky: 'มีเมฆบางส่วน' },
	'ภูเก็ต': { lat: 7.8804, lon: 98.3923, temp: 33, condition: 'แดดออกเป็นส่วนใหญ่', feels: 38, high: 34, low: 26, humidity: 72, wind: 18, rain: 10, sky: 'แดดออก' },
	'ขอนแก่น': { lat: 16.4419, lon: 102.835, temp: 32, condition: 'เมฆมาก มีโอกาสฝน', feels: 36, high: 34, low: 25, humidity: 69, wind: 12, rain: 48, sky: 'เมฆมาก' },
	'ชลบุรี': { lat: 13.3611, lon: 100.9847, temp: 32, condition: 'มีเมฆและฝนบางแห่ง', feels: 37, high: 34, low: 27, humidity: 76, wind: 16, rain: 55, sky: 'ฝนบางแห่ง' },
};

const toast = document.querySelector('#toast');
let toastTimer;
let activeCity = 'กรุงเทพมหานคร';
let map;
let weatherLayer;
let cityMarker;
let markers = [];

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
	document.querySelector('.active-city').innerHTML = `${cityName} <svg class="icon"><use href="#i-pin"/></svg>`;
	document.querySelector('.local-time').textContent = 'ประเทศไทย · 10:24 น.';
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

function renderTrackedCities(cityNames) {
	const list = document.querySelector('#location-list');
	const weatherList = document.querySelector('#tracked-weather');
	const iconFor = (city) => city.rain > 50 ? 'rain' : city.rain > 20 ? 'cloud' : 'sun';
	const iconLabel = { rain: 'ฝน', cloud: 'เมฆ', sun: 'แดด' };

	list.innerHTML = '';
	weatherList.innerHTML = '';

	cityNames.forEach((name) => {
		const city = cities[name];
		if (!city) return;
		const icon = iconFor(city);
		const sidebarButton = document.createElement('button');
		sidebarButton.className = `location-item${name === activeCity ? ' selected' : ''}`;
		sidebarButton.dataset.city = name;
		sidebarButton.innerHTML = `<span class="location-dot ${icon === 'rain' ? 'dot-orange' : icon === 'cloud' ? 'dot-blue' : 'dot-green'}"></span><span>${name}<small>${city.sky}</small></span><b>${city.temp}°</b>`;
		sidebarButton.addEventListener('click', () => selectCity(name));
		list.append(sidebarButton);

		const trackedButton = document.createElement('button');
		trackedButton.className = `tracked-city${name === activeCity ? ' active' : ''}`;
		trackedButton.dataset.city = name;
		trackedButton.innerHTML = `<span class="tracked-icon tracked-${icon}"><svg class="icon"><use href="#i-${icon}"/></svg></span><span><strong>${name}</strong><small>${city.sky}</small></span><b>${city.temp}°</b><small class="tracked-range">${city.low}° / ${city.high}°</small>`;
		trackedButton.addEventListener('click', () => selectCity(name));
		weatherList.append(trackedButton);
	});
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
		const days = [
			['วันนี้', 'rain', 31, '65%'], ['ศ.', 'cloud', 32, '30%'], ['ส.', 'sun', 33, '15%'],
			['อา.', 'rain', 30, '55%'], ['จ.', 'rain', 29, '70%'], ['อ.', 'cloud', 31, '35%'], ['พ.', 'sun', 32, '20%'],
		];
		forecast.classList.add('weekly-forecast');
		forecast.innerHTML = days.map(([day, icon, temp, chance]) => `<div class="forecast-item"><span>${day}</span><svg class="weather-mini ${icon}-mini"><use href="#i-${icon === 'cloud' ? 'cloud' : icon}"/></svg><strong>${temp}°</strong><small>${chance}</small></div>`).join('');
	} else {
		forecast.classList.remove('weekly-forecast');
		forecast.innerHTML = '<div class="forecast-item"><span>ตอนนี้</span><svg class="weather-mini sun-cloud"><use href="#i-cloud"/></svg><strong>31°</strong><small>65%</small></div><div class="forecast-item"><span>12:00</span><svg class="weather-mini sun-mini"><use href="#i-sun"/></svg><strong>33°</strong><small>35%</small></div><div class="forecast-item"><span>14:00</span><svg class="weather-mini rain-mini"><use href="#i-rain"/></svg><strong>32°</strong><small>70%</small></div><div class="forecast-item"><span>16:00</span><svg class="weather-mini rain-mini"><use href="#i-rain"/></svg><strong>30°</strong><small>80%</small></div><div class="forecast-item"><span>18:00</span><svg class="weather-mini cloud-mini"><use href="#i-cloud"/></svg><strong>29°</strong><small>40%</small></div><div class="forecast-item"><span>20:00</span><svg class="weather-mini moon-mini"><use href="#i-sun"/></svg><strong>28°</strong><small>20%</small></div>';
	}
}

initializeMap();

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

const locationsDialog = document.querySelector('#locations-dialog');
const openLocations = () => locationsDialog.showModal();
document.querySelector('#open-locations').addEventListener('click', openLocations);
document.querySelector('#manage-locations').addEventListener('click', openLocations);
document.querySelector('#location-input').addEventListener('input', (event) => {
	const query = event.target.value.trim();
	document.querySelectorAll('#province-options label').forEach((label) => {
		label.hidden = query !== '' && !label.textContent.includes(query);
	});
});
document.querySelector('#locations-form').addEventListener('submit', (event) => {
	if (event.submitter?.id !== 'save-locations') return;
	const selectedCities = [...document.querySelectorAll('#province-options input:checked')].map((input) => input.value);
	if (!selectedCities.length) {
		event.preventDefault();
		showToast('เลือกอย่างน้อยหนึ่งพื้นที่เพื่อติดตาม');
		return;
	}
	renderTrackedCities(selectedCities);
	if (!selectedCities.includes(activeCity)) selectCity(selectedCities[0]);
	showToast(`บันทึก ${selectedCities.length} พื้นที่ติดตามแล้ว`);
});

document.querySelectorAll('[data-scroll]').forEach((button) => {
	button.addEventListener('click', () => document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
});
document.querySelector('#configure-alerts').addEventListener('click', openLocations);
document.querySelector('#notification-settings').addEventListener('click', openLocations);
document.querySelector('#notification-button').addEventListener('click', () => showToast('คุณมีประกาศเฝ้าระวัง 3 รายการ'));
document.querySelector('#map-locate').addEventListener('click', () => selectCity(activeCity));
document.querySelector('#map-expand').addEventListener('click', () => {
	window.location.assign('/map');
});

const notificationToggle = document.querySelector('#notification-toggle');
notificationToggle.addEventListener('click', () => {
	const enabled = notificationToggle.getAttribute('aria-checked') !== 'true';
	notificationToggle.setAttribute('aria-checked', String(enabled));
	notificationToggle.classList.toggle('is-on', enabled);
	notificationToggle.setAttribute('aria-label', enabled ? 'เปิดการแจ้งเตือน' : 'ปิดการแจ้งเตือน');
	showToast(enabled ? 'เปิดการแจ้งเตือนบนเว็บไซต์แล้ว' : 'ปิดการแจ้งเตือนบนเว็บไซต์แล้ว');
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

locationsDialog.addEventListener('close', () => {
	document.querySelector('#location-input').value = '';
	document.querySelectorAll('#province-options label').forEach((label) => { label.hidden = false; });
});

const sessionLogout = document.querySelector('#session-logout');
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
			return;
		}
		const user = await response.json();
		setUserIdentity(user.name, user.email);
	} catch {
		setUserIdentity('', '');
	}
}

if (sessionLogout) {
	sessionLogout.hidden = !sessionToken;
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
