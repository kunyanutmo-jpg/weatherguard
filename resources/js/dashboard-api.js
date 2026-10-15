const tokenKey = 'weatherguard_api_token';
const seenAlertsKey = 'weatherguard_seen_hazard_alerts';
const browserNotificationKey = 'weatherguard_browser_notifications';
const weatherRoot = 'https://api.open-meteo.com/v1/forecast';
const eventList = document.querySelector('#alerts-section .event-list');
const locationList = document.querySelector('#location-list');
const trackedWeather = document.querySelector('#tracked-weather');
const toast = document.querySelector('#toast');
let trackedLocations = [];
let toastTimer;
let simulatedHazard = null;
let simulationTargets = [];
let hazardData = { alerts: [], hazards: [], riskAreas: [], latestEvent: null };
let alertAudioContext;

function showToast(message) {
	toast.textContent = message;
	toast.classList.add('show');
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function notificationStorageKey(key) {
	const tokenId = sessionStorage.getItem(tokenKey)?.split('|', 1)[0] ?? 'guest';
	return `${key}_${tokenId}`;
}

function browserNotificationsEnabled() {
	return localStorage.getItem(notificationStorageKey(browserNotificationKey)) === 'enabled';
}

function updateBrowserNotificationControl() {
	const button = document.querySelector('#browser-notification-setup');
	const status = document.querySelector('#browser-notification-status');
	if (!button || !status) return;
	const supported = 'Notification' in window;
	const permitted = supported && Notification.permission === 'granted';
	const enabled = browserNotificationsEnabled();
	button.textContent = enabled ? 'ทดสอบเสียง/แจ้งเตือน' : supported && Notification.permission === 'denied' ? 'สิทธิ์ popup ถูกบล็อก' : 'เปิดเสียงและ popup';
	status.textContent = enabled && permitted ? 'popup และเสียงเปิดอยู่' : enabled ? 'เสียงเปิด · popup ไม่พร้อม' : 'แจ้งเตือนในหน้านี้';
}

async function playAlertSound() {
	const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
	if (!AudioContextClass) return false;
	try {
		alertAudioContext ??= new AudioContextClass();
		await alertAudioContext.resume();
		const start = alertAudioContext.currentTime;
		[0, 0.24].forEach((offset) => {
			const oscillator = alertAudioContext.createOscillator();
			const volume = alertAudioContext.createGain();
			const noteStart = start + offset;
			oscillator.type = 'sine';
			oscillator.frequency.setValueAtTime(880, noteStart);
			volume.gain.setValueAtTime(0.0001, noteStart);
			volume.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025);
			volume.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.18);
			oscillator.connect(volume);
			volume.connect(alertAudioContext.destination);
			oscillator.start(noteStart);
			oscillator.stop(noteStart + 0.19);
		});
		return true;
	} catch {
		return false;
	}
}

function sendBrowserAlert(title, body) {
	if (!browserNotificationsEnabled()) return;
	void playAlertSound();
	if (!('Notification' in window) || Notification.permission !== 'granted') return;
	const notification = new Notification(title, { body, tag: 'weatherguard-hazard' });
	window.setTimeout(() => notification.close(), 10000);
}

function notifyNewAlerts(alerts) {
	const key = notificationStorageKey(seenAlertsKey);
	const ids = alerts.map((alert) => String(alert.id)).filter(Boolean);
	let seenIds;
	try {
		const saved = localStorage.getItem(key);
		if (saved === null) {
			localStorage.setItem(key, JSON.stringify(ids.slice(-300)));
			return;
		}
		seenIds = new Set(JSON.parse(saved));
	} catch {
		return;
	}

	const newAlerts = alerts.filter((alert) => alert.id && !alert.read_at && !seenIds.has(String(alert.id)));
	try {
		localStorage.setItem(key, JSON.stringify([...new Set([...seenIds, ...ids])].slice(-300)));
	} catch {
		return;
	}
	if (!newAlerts.length || !browserNotificationsEnabled()) return;
	const latest = newAlerts[0];
	const extraCount = newAlerts.length - 1;
	sendBrowserAlert(
		extraCount ? `มีการแจ้งเตือนภัยใหม่ ${newAlerts.length} รายการ` : latest.title,
		extraCount ? `${latest.message} และอีก ${extraCount} รายการ` : latest.message,
	);
}

async function enableBrowserNotifications() {
	const soundPromise = playAlertSound();
	let permission = 'unsupported';
	if ('Notification' in window) {
		try {
			permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
		} catch {
			permission = Notification.permission;
		}
	}
	const soundReady = await soundPromise;
	if (permission === 'granted' || soundReady) {
		localStorage.setItem(notificationStorageKey(browserNotificationKey), 'enabled');
	}
	updateBrowserNotificationControl();
	if (permission === 'granted') {
		const notification = new Notification('WeatherGuard เปิดการแจ้งเตือนแล้ว', { body: 'นี่คือข้อความทดสอบเสียงและ popup' });
		window.setTimeout(() => notification.close(), 7000);
		showToast('เปิด popup และทดสอบเสียงแล้ว');
	} else if (soundReady) {
		showToast('เปิดเสียงแล้ว แต่ popup ถูกปิดกั้นโดยเบราว์เซอร์');
	} else {
		showToast('เบราว์เซอร์นี้ไม่รองรับ popup หรือเสียงแจ้งเตือน');
	}
}

function setNotificationState(enabled) {
	const toggle = document.querySelector('#notification-toggle');
	toggle.setAttribute('aria-checked', String(enabled));
	toggle.classList.toggle('is-on', enabled);
	toggle.setAttribute('aria-label', enabled ? 'เปิดการแจ้งเตือน' : 'ปิดการแจ้งเตือน');
}

function showLocationMessage(message) {
	locationList.replaceChildren();
	const empty = document.createElement('div');
	empty.className = 'location-list-empty';
	empty.textContent = message;
	locationList.append(empty);
}

async function api(path, options = {}) {
	const token = sessionStorage.getItem(tokenKey);
	const response = await fetch(path, {
		...options,
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			...options.headers,
		},
	});
	if (response.status === 401) {
		sessionStorage.removeItem(tokenKey);
		window.location.assign('/login');
		throw new Error('กรุณาเข้าสู่ระบบอีกครั้ง');
	}
	const result = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(result.message ?? 'โหลดข้อมูลไม่สำเร็จ');
	return result;
}

async function loadCurrentWeather(location) {
	const query = new URLSearchParams({
		latitude: location.latitude,
		longitude: location.longitude,
		current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,weather_code',
		timezone: 'Asia/Bangkok',
	});
	try {
		const response = await fetch(`${weatherRoot}?${query}`, { signal: AbortSignal.timeout(10000) });
		if (!response.ok) return null;
		return (await response.json()).current ?? null;
	} catch {
		return null;
	}
}

function makeLocationButton(location, current) {
	const item = document.createElement('button');
	item.type = 'button';
	item.className = 'location-item';
	item.dataset.locationId = location.id;
	const dot = document.createElement('span');
	dot.className = 'location-dot dot-green';
	const title = document.createElement('span');
	const name = document.createElement('span');
	name.textContent = location.name;
	const detail = document.createElement('small');
	detail.textContent = location.province;
	title.append(name, detail);
	const temperature = document.createElement('b');
	temperature.textContent = Number.isFinite(current?.temperature_2m) ? `${Math.round(current.temperature_2m)}°` : '--°';
	item.append(dot, title, temperature);
	item.addEventListener('click', async () => {
		item.disabled = true;
		const currentWeather = await loadCurrentWeather(location);
		item.disabled = false;
		locationList.querySelectorAll('.location-item').forEach((button) => {
			button.classList.toggle('selected', button === item);
		});
		window.dispatchEvent(new CustomEvent('weatherguard:tracked-location-selected', {
			detail: { location, current: currentWeather },
		}));
	});
	return item;
}

function makeTrackedCard(location, current) {
	const item = document.createElement('article');
	item.className = 'tracked-city';
	const icon = document.createElement('span');
	icon.className = 'tracked-icon tracked-cloud';
	icon.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-cloud"/></svg>';
	const title = document.createElement('span');
	const name = document.createElement('strong');
	name.textContent = location.name;
	const province = document.createElement('small');
	province.textContent = [location.district, location.province].filter(Boolean).join(' · ');
	title.append(name, province);
	const temperature = document.createElement('b');
	temperature.textContent = Number.isFinite(current?.temperature_2m) ? `${Math.round(current.temperature_2m)}°` : '--°';
	const range = document.createElement('small');
	range.className = 'tracked-range';
	range.textContent = Number.isFinite(current?.apparent_temperature) ? `รู้สึก ${Math.round(current.apparent_temperature)}°` : 'รอข้อมูลอากาศ';
	item.append(icon, title, temperature, range);
	return item;
}

async function renderTrackedLocations(locations) {
	trackedLocations = locations;
	populateSimulationTargets(locations);
	locationList.replaceChildren();
	trackedWeather.replaceChildren();
	if (!locations.length) {
		const empty = document.createElement('div');
		empty.className = 'empty-list';
		empty.textContent = 'ยังไม่มีพื้นที่ติดตาม · เพิ่มพื้นที่เพื่อเริ่มต้น';
		showLocationMessage('ยังไม่มีพื้นที่ติดตาม');
		trackedWeather.append(empty);
		return;
	}

	const visible = locations.slice(0, 12);
	const locationButtons = visible.map((location) => {
		const button = makeLocationButton(location, null);
		locationList.append(button);
		return button;
	});
	const weatherCards = visible.map((location) => {
		const card = makeTrackedCard(location, null);
		trackedWeather.append(card);
		return card;
	});
	const weather = await Promise.all(visible.map(loadCurrentWeather));
	visible.forEach((location, index) => {
		const current = weather[index];
		locationButtons[index].querySelector('b').textContent = Number.isFinite(current?.temperature_2m) ? `${Math.round(current.temperature_2m)}°` : '--°';
		weatherCards[index].querySelector('b').textContent = Number.isFinite(current?.temperature_2m) ? `${Math.round(current.temperature_2m)}°` : '--°';
		weatherCards[index].querySelector('.tracked-range').textContent = Number.isFinite(current?.apparent_temperature) ? `รู้สึก ${Math.round(current.apparent_temperature)}°` : 'รอข้อมูลอากาศ';
	});
}

function severityClass(severity) {
	if (['critical', 'high', 'severe'].includes(String(severity).toLowerCase())) return 'event-high';
	if (['medium', 'watch', 'moderate'].includes(String(severity).toLowerCase())) return 'event-medium';
	return 'event-low';
}

function hazardLabel(type) {
	return ({ flood: 'น้ำท่วม', storm: 'พายุ', wildfire: 'ไฟป่า', earthquake: 'แผ่นดินไหว', landslide: 'ดินถล่ม', drought: 'ภัยแล้ง' })[type] ?? type ?? 'เฝ้าระวัง';
}

function populateSimulationTargets(locations) {
	const select = document.querySelector('#simulation-location');
	if (!select) return;
	const targets = locations.length ? locations : [
		{ id: 'sample-bangkok', name: 'พื้นที่ตัวอย่าง', province: 'กรุงเทพมหานคร', latitude: 13.7563, longitude: 100.5018 },
	];
	simulationTargets = targets.map((location) => ({
		...location,
		value: String(location.id),
	}));
	select.replaceChildren(...simulationTargets.map((location) => {
		const option = document.createElement('option');
		option.value = location.value;
		option.textContent = `${location.name} · ${location.province}`;
		return option;
	}));
}

function addEventCard(item) {
	const severity = severityClass(item.severity ?? item.risk_level);
	const wrapper = document.createElement('div');
	wrapper.className = `event-item ${severity}`;
	const icon = document.createElement('span');
	icon.className = 'event-icon';
	icon.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>';
	const content = document.createElement('div');
	content.className = 'event-content';
	const meta = document.createElement('div');
	meta.className = 'event-meta';
	const type = document.createElement('span');
	type.className = 'event-type';
	type.textContent = item.is_simulation
		? `จำลองสถานการณ์ · ${hazardLabel(item.hazard_type)}`
		: item.is_latest_fallback ? `เหตุการณ์ล่าสุด · ${hazardLabel(item.hazard_type)}` : hazardLabel(item.hazard_type);
	const time = document.createElement('time');
	const eventDate = item.starts_at ?? item.valid_from ?? item.created_at;
	const parsedEventDate = eventDate ? new Date(eventDate) : null;
	const validEventDate = parsedEventDate && !Number.isNaN(parsedEventDate.getTime());
	if (validEventDate) time.dateTime = parsedEventDate.toISOString();
	time.textContent = validEventDate
		? `${parsedEventDate.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} น.`
		: 'วันที่ไม่ระบุ';
	meta.append(type, time);
	const title = document.createElement('strong');
	title.textContent = item.title ?? item.name ?? 'พื้นที่เสี่ยง';
	const description = document.createElement('p');
	const place = [item.country ?? item.hazardEvent?.country ?? item.riskArea?.country, item.province ?? item.hazardEvent?.province ?? item.riskArea?.province, item.trackedLocation?.name].filter(Boolean).join(' · ');
	const source = item.source_name ?? item.hazardEvent?.source_name ?? item.riskArea?.source_name;
	description.textContent = [item.message ?? item.description, source, place].filter(Boolean).join(' · ');
	content.append(meta, title, description);
	if (item.unread && item.id) {
		const readButton = document.createElement('button');
		readButton.type = 'button';
		readButton.className = 'alert-read-action';
		readButton.dataset.alertId = item.id;
		readButton.textContent = 'ทำเครื่องหมายว่าอ่านแล้ว';
		content.append(readButton);
	}
	wrapper.append(icon, content);
	eventList.append(wrapper);
}

function renderHazards(alerts, hazards, riskAreas, latestEvent) {
	hazardData = { alerts, hazards, riskAreas, latestEvent };
	eventList.replaceChildren();
	const representedEvents = new Set(alerts.map((alert) => alert.hazard_event_id).filter(Boolean));
	const representedAreas = new Set(alerts.map((alert) => alert.risk_area_id).filter(Boolean));
	const entries = [
		...alerts.map((alert) => ({ ...alert, unread: !alert.read_at })),
		...hazards.filter((event) => !representedEvents.has(event.id)),
		...riskAreas.filter((area) => !representedAreas.has(area.id)).map((area) => ({ ...area, title: area.name, severity: area.risk_level })),
	];
	const displayEntries = [
		...(simulatedHazard ? [simulatedHazard] : []),
		...(entries.length ? entries : latestEvent ? [{ ...latestEvent, is_latest_fallback: true }] : []),
	];
	if (!displayEntries.length) {
		const empty = document.createElement('div');
		empty.className = 'empty-list';
		empty.textContent = 'ไม่มีประกาศภัยหรือพื้นที่เสี่ยงที่ยังมีผล';
		eventList.append(empty);
	}
	displayEntries.forEach(addEventCard);
	document.querySelector('.event-count').textContent = entries.length + Number(Boolean(simulatedHazard));
	document.querySelectorAll('.nav-count').forEach((badge) => {
		badge.textContent = alerts.filter((alert) => !alert.read_at).length;
		badge.hidden = alerts.every((alert) => alert.read_at);
	});
	const alertStrip = document.querySelector('.alert-strip');
	if (displayEntries.length) {
		const firstEntry = displayEntries[0];
		alertStrip.hidden = false;
		document.querySelector('.alert-kicker').textContent = firstEntry.is_simulation ? 'จำลองสถานการณ์' : 'ประกาศเตือนภัย';
		document.querySelector('.alert-copy strong').textContent = firstEntry.title ?? firstEntry.name;
		document.querySelector('.alert-copy p').textContent = [firstEntry.message ?? firstEntry.description, firstEntry.source_name, firstEntry.province, firstEntry.country].filter(Boolean).join(' · ');
		document.querySelector('.severity-label').textContent = firstEntry.is_simulation ? 'ตัวอย่าง' : hazardLabel(firstEntry.hazard_type);
	} else {
		document.querySelector('.alert-kicker').textContent = 'ประกาศเตือนภัย';
		alertStrip.hidden = true;
	}
}

function clearHazardSimulation() {
	simulatedHazard = null;
	document.querySelector('#clear-hazard-simulation').hidden = true;
	renderHazards(hazardData.alerts, hazardData.hazards, hazardData.riskAreas, hazardData.latestEvent);
}

function runHazardSimulation(event) {
	event.preventDefault();
	const location = simulationTargets.find((target) => target.value === document.querySelector('#simulation-location').value);
	if (!location) {
		showToast('เลือกพื้นที่สำหรับจำลองก่อน');
		return;
	}
	const type = document.querySelector('#simulation-hazard-type').value;
	const severity = document.querySelector('#simulation-severity').value;
	const severityLabels = { watch: 'เฝ้าระวัง', high: 'สูง', critical: 'วิกฤต' };
	const label = hazardLabel(type);
	const time = new Date();
	simulatedHazard = {
		id: `simulation-${time.getTime()}`,
		is_simulation: true,
		hazard_type: type,
		severity,
		title: `จำลอง${label} · ${location.province}`,
		message: `ส่งการแจ้งเตือนจำลองไปยังพื้นที่ ${location.name}`,
		source_name: 'WeatherGuard Scenario Simulator',
		province: location.province,
		starts_at: time.toISOString(),
	};
	document.querySelector('#clear-hazard-simulation').hidden = false;
	renderHazards(hazardData.alerts, hazardData.hazards, hazardData.riskAreas, hazardData.latestEvent);
	document.querySelector('#hazard-simulation-dialog').close();
	showToast(`ส่งแจ้งเตือนจำลอง${label} ระดับ${severityLabels[severity]}แล้ว`);
	sendBrowserAlert(simulatedHazard.title, simulatedHazard.message);
}

async function loadDashboardData() {
	if (!sessionStorage.getItem(tokenKey)) {
		showLocationMessage('เข้าสู่ระบบเพื่อดูพื้นที่ติดตาม');
		return;
	}

	try {
		const locationResult = await api('/api/tracked-locations');
		await renderTrackedLocations(locationResult.data);
		setNotificationState(locationResult.data.length > 0 && locationResult.data.every((location) => location.alert_enabled));
	} catch (error) {
		showLocationMessage('โหลดพื้นที่ติดตามไม่สำเร็จ');
		if (sessionStorage.getItem(tokenKey)) showToast(error.message);
		return;
	}

	await refreshHazards();
}

async function refreshHazards() {
	if (!sessionStorage.getItem(tokenKey)) return;
	try {
		const [alertResult, hazardResult, riskResult] = await Promise.all([
			api('/api/alerts'),
			api('/api/hazards'),
			api('/api/risk-areas'),
		]);
		notifyNewAlerts(alertResult.data);
		renderHazards(alertResult.data, hazardResult.data, riskResult.data, hazardResult.latest);
	} catch (error) {
		if (sessionStorage.getItem(tokenKey)) showToast(error.message);
	}
}

document.querySelector('#configure-alerts').addEventListener('click', () => window.location.assign('/locations'));
document.querySelector('#notification-settings').addEventListener('click', () => window.location.assign('/locations'));
document.querySelector('#notification-button').addEventListener('click', () => document.querySelector('#alerts-section').scrollIntoView({ behavior: 'smooth', block: 'center' }));
const profileMenuButton = document.querySelector('#profile-menu-button');
const profileMenu = document.querySelector('#profile-menu');
const hazardSimulationDialog = document.querySelector('#hazard-simulation-dialog');
profileMenuButton.addEventListener('click', () => {
	profileMenu.hidden = !profileMenu.hidden;
	profileMenuButton.setAttribute('aria-expanded', String(!profileMenu.hidden));
});
document.querySelector('#open-hazard-simulation').addEventListener('click', () => {
	profileMenu.hidden = true;
	profileMenuButton.setAttribute('aria-expanded', 'false');
	hazardSimulationDialog.showModal();
});
document.addEventListener('click', (event) => {
	if (!event.target.closest('.profile-control')) {
		profileMenu.hidden = true;
		profileMenuButton.setAttribute('aria-expanded', 'false');
	}
});
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		profileMenu.hidden = true;
		profileMenuButton.setAttribute('aria-expanded', 'false');
	}
});
document.querySelector('#close-hazard-simulation').addEventListener('click', () => hazardSimulationDialog.close());
hazardSimulationDialog.addEventListener('click', (event) => {
	if (event.target === hazardSimulationDialog) hazardSimulationDialog.close();
});
document.querySelector('#hazard-simulator').addEventListener('submit', runHazardSimulation);
document.querySelector('#clear-hazard-simulation').addEventListener('click', clearHazardSimulation);
document.querySelector('#browser-notification-setup').addEventListener('click', enableBrowserNotifications);
document.querySelector('#mark-all-alerts').addEventListener('click', async () => {
	if (!sessionStorage.getItem(tokenKey)) return window.location.assign('/login');
	try {
		await api('/api/alerts/read-all', { method: 'POST' });
		await loadDashboardData();
		showToast('ทำเครื่องหมายว่าอ่านแล้ว');
	} catch (error) {
		showToast(error.message);
	}
});
eventList.addEventListener('click', async (event) => {
	const button = event.target.closest('[data-alert-id]');
	if (!button) return;
	try {
		await api(`/api/alerts/${button.dataset.alertId}/read`, { method: 'PATCH' });
		await loadDashboardData();
	} catch (error) {
		showToast(error.message);
	}
});
populateSimulationTargets([]);
updateBrowserNotificationControl();
document.querySelector('#notification-toggle').addEventListener('click', async (event) => {
	if (!sessionStorage.getItem(tokenKey)) return window.location.assign('/login');
	if (!trackedLocations.length) return window.location.assign('/locations');
	const enabled = event.currentTarget.getAttribute('aria-checked') !== 'true';
	event.currentTarget.disabled = true;
	try {
		await Promise.all(trackedLocations.map((location) => api(`/api/tracked-locations/${location.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ alert_enabled: enabled }),
		})));
		trackedLocations = trackedLocations.map((location) => ({ ...location, alert_enabled: enabled }));
		setNotificationState(enabled);
		showToast(enabled ? 'เปิดการแจ้งเตือนทุกพื้นที่แล้ว' : 'ปิดการแจ้งเตือนทุกพื้นที่แล้ว');
	} catch (error) {
		showToast(error.message);
	} finally {
		event.currentTarget.disabled = false;
	}
});

window.addEventListener('weatherguard:user-ready', loadDashboardData);
window.setInterval(refreshHazards, 60_000);
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible') refreshHazards();
});

if (!sessionStorage.getItem(tokenKey)) {
	showLocationMessage('เข้าสู่ระบบเพื่อดูพื้นที่ติดตาม');
}