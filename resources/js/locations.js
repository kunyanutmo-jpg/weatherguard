import '../css/service.css';

const tokenKey = 'weatherguard_api_token';
const pendingLocationKey = 'weatherguard_pending_location';
const locationDraftKey = 'weatherguard_location_draft';
const token = sessionStorage.getItem(tokenKey);
const listElement = document.querySelector('#saved-location-list');
const form = document.querySelector('#location-form');
const emptyState = document.querySelector('#detail-empty');
const toast = document.querySelector('#locations-toast');
const thresholdField = document.querySelector('#location-threshold');
const mapPickerModal = document.querySelector('#map-picker-modal');
const mapPickerInput = document.querySelector('#map-picker-search');
const mapPickerResults = document.querySelector('#map-picker-results');
const pickerLatitude = document.querySelector('#picker-latitude');
const pickerLongitude = document.querySelector('#picker-longitude');
let locations = [];
let toastTimer;
let pickerMap;
let pickerMarker;
let pickerInitialized = false;

function ensureLeafletLoaded() {
	return new Promise((resolve, reject) => {
		if (window.L) {
			resolve();
			return;
		}

		const existingScript = document.querySelector('script[data-leaflet-loader="true"]');
		if (existingScript) {
			existingScript.addEventListener('load', resolve, { once: true });
			existingScript.addEventListener('error', reject, { once: true });
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
		script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
		script.crossOrigin = 'anonymous';
		script.dataset.leafletLoader = 'true';
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

if (!token) {
	window.location.replace('/login?next=%2Flocations');
}

function showToast(message) {
	toast.textContent = message;
	toast.classList.add('show');
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

async function api(path, options = {}) {
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
		window.location.replace('/login?next=%2Flocations');
		throw new Error('กรุณาเข้าสู่ระบบอีกครั้ง');
	}
	const result = response.status === 204 ? null : await response.json().catch(() => ({}));
	if (!response.ok) {
		const validationMessage = Object.values(result.errors ?? {}).flat()[0];
		throw new Error(validationMessage ?? result.message ?? 'บันทึกข้อมูลไม่สำเร็จ');
	}
	return result;
}

function setFormVisible(visible) {
	form.hidden = !visible;
	emptyState.hidden = visible;
}

function setPickerCoordinates(lat, lon) {
	const latitudeValue = Number.isFinite(Number(lat)) ? Number(lat) : null;
	const longitudeValue = Number.isFinite(Number(lon)) ? Number(lon) : null;
	pickerLatitude.textContent = latitudeValue === null ? '--' : latitudeValue.toFixed(5);
	pickerLongitude.textContent = longitudeValue === null ? '--' : longitudeValue.toFixed(5);
}

async function initPickerMap() {
	if (pickerInitialized) return;
	try {
		await ensureLeafletLoaded();
	} catch (error) {
		showToast('ไม่สามารถโหลดแผนที่ได้ในเวลานี้');
		return;
	}
	if (!window.L) {
		showToast('ไม่สามารถเปิดแผนที่ได้ในเวลานี้');
		return;
	}
	const mapContainer = document.querySelector('#location-map-picker');
	if (!mapContainer) {
		showToast('พื้นที่แผนที่ไม่พร้อมใช้งาน');
		return;
	}
	pickerMap = L.map(mapContainer, { zoomControl: true, minZoom: 4, maxZoom: 12 }).setView([15.2, 101.1], 5);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	}).addTo(pickerMap);
	pickerMarker = L.marker([15.2, 101.1], { draggable: true }).addTo(pickerMap);
	pickerMarker.on('dragend', () => {
		const position = pickerMarker.getLatLng();
		setPickerCoordinates(position.lat, position.lng);
	});
	pickerMap.on('click', (event) => {
		pickerMarker.setLatLng(event.latlng);
		setPickerCoordinates(event.latlng.lat, event.latlng.lng);
	});
	pickerInitialized = true;
	setPickerCoordinates(15.2, 101.1);
}

async function openMapPicker() {
	mapPickerModal.hidden = false;
	await initPickerMap();
	if (!pickerMap) return;
	window.setTimeout(() => {
		if (pickerMap) pickerMap.invalidateSize();
		if (pickerMarker) {
			const position = pickerMarker.getLatLng();
			setPickerCoordinates(position.lat, position.lng);
		}
	}, 80);
	const lat = document.querySelector('#location-latitude').value;
	const lon = document.querySelector('#location-longitude').value;
	if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
		const position = { lat: Number(lat), lng: Number(lon) };
		pickerMarker.setLatLng(position);
		pickerMap.flyTo(position, 9, { duration: 0.7 });
		setPickerCoordinates(position.lat, position.lng);
	}
}

function closeMapPicker() {
	mapPickerModal.hidden = true;
}

function renderMapPickerResults(results) {
	mapPickerResults.innerHTML = '';
	if (!results.length) {
		mapPickerResults.innerHTML = '<div class="list-empty"><strong>ไม่พบผลลัพธ์</strong><span>ลองค้นหาชื่อจังหวัดหรืออำเภอที่มีคนใช้มากกว่า</span></div>';
		return;
	}

	results.forEach((item) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'map-picker-result';
		button.innerHTML = `
			<div>
				<strong>${item.name}</strong>
				<small>${item.admin1 ?? ''}${item.admin2 ? ` · ${item.admin2}` : ''}${item.country ? ` · ${item.country}` : ''}</small>
			</div>
			<small>${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}</small>
		`;
		button.addEventListener('click', () => {
			const position = { lat: Number(item.latitude), lng: Number(item.longitude) };
			if (!pickerMarker || !pickerMap) return;
			pickerMarker.setLatLng(position);
			pickerMap.flyTo(position, 10, { duration: 0.8 });
			setPickerCoordinates(position.lat, position.lng);
			mapPickerResults.innerHTML = '';
			showToast(`เลือก ${item.name}`);
		});
		mapPickerResults.appendChild(button);
	});
}

async function searchLocationOnMap() {
	if (!pickerMap) {
		await initPickerMap();
	}
	if (!pickerMap) return;
	const query = mapPickerInput.value.trim();
	if (!query) {
		showToast('กรอกชื่อสถานที่หรือจังหวัดก่อนค้นหา');
		return;
	}
	try {
		const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&countryCode=TH`);
		if (!response.ok) throw new Error('Lookup failed');
		const result = await response.json();
		const locations = result.results ?? [];
		if (!locations.length) {
			renderMapPickerResults([]);
			showToast('ไม่พบสถานที่ที่ค้นหา');
			return;
		}
		renderMapPickerResults(locations);
		const first = locations[0];
		const position = { lat: Number(first.latitude), lng: Number(first.longitude) };
		pickerMarker.setLatLng(position);
		pickerMap.flyTo(position, 8, { duration: 0.8 });
		setPickerCoordinates(position.lat, position.lng);
		showToast(`พบ ${locations.length} ผลลัพธ์`);
	} catch (error) {
		showToast('ค้นหาสถานที่ไม่สำเร็จ');
	}
}

function applyPendingLocationSelection() {
	const rawSelection = sessionStorage.getItem(pendingLocationKey);
	const rawDraft = sessionStorage.getItem(locationDraftKey);
	if (!rawSelection && !rawDraft) return;

	try {
		const selected = rawSelection ? JSON.parse(rawSelection) : {};
		const draft = rawDraft ? JSON.parse(rawDraft) : {};
		startNewLocation();
		if (draft.id) {
			document.querySelector('#location-id').value = draft.id;
			document.querySelector('#form-kicker').textContent = 'EDIT LOCATION';
			document.querySelector('#form-heading').textContent = draft.heading || 'แก้ไขพื้นที่ติดตาม';
			document.querySelector('#delete-location').hidden = false;
		}
		document.querySelector('#location-name').value = draft.name || selected.name || '';
		document.querySelector('#location-province').value = selected.province || draft.province || '';
		document.querySelector('#location-district').value = selected.district || draft.district || '';
		document.querySelector('#location-alert-enabled').checked = draft.alert_enabled ?? true;
		if (thresholdField) thresholdField.value = draft.temperature_threshold ?? '';
		if (Number.isFinite(Number(selected.lat)) && Number.isFinite(Number(selected.lon))) {
			document.querySelector('#location-latitude').value = Number(selected.lat);
			document.querySelector('#location-longitude').value = Number(selected.lon);
		} else {
			document.querySelector('#location-latitude').value = draft.latitude || '';
			document.querySelector('#location-longitude').value = draft.longitude || '';
		}
		sessionStorage.removeItem(pendingLocationKey);
		sessionStorage.removeItem(locationDraftKey);
		if (rawSelection) showToast('กรอกพิกัดจากแผนที่แล้ว');
	} catch (error) {
		sessionStorage.removeItem(pendingLocationKey);
		sessionStorage.removeItem(locationDraftKey);
	}
}

function renderLocations(filter = '') {
	const query = filter.trim().toLocaleLowerCase('th');
	const visible = locations.filter((location) => `${location.name} ${location.province} ${location.district ?? ''}`.toLocaleLowerCase('th').includes(query));
	document.querySelector('#location-count').textContent = locations.length;
	listElement.replaceChildren();
	if (!visible.length) {
		const empty = document.createElement('div');
		empty.className = 'list-empty';
		const title = document.createElement('strong');
		title.textContent = locations.length ? 'ไม่พบพื้นที่ที่ค้นหา' : 'ยังไม่มีพื้นที่ติดตาม';
		const detail = document.createElement('span');
		detail.textContent = locations.length ? 'ลองค้นหาด้วยชื่อจังหวัด' : 'เพิ่มพื้นที่เพื่อเริ่มรับการแจ้งเตือน';
		empty.append(title, detail);
		listElement.append(empty);
		return;
	}

	visible.forEach((location) => {
		const row = document.createElement('button');
		row.type = 'button';
		row.className = 'saved-location';
		row.dataset.locationId = location.id;
		const dot = document.createElement('i');
		dot.className = 'saved-location-dot';
		const copy = document.createElement('span');
		const name = document.createElement('strong');
		name.textContent = location.name;
		const detail = document.createElement('small');
		detail.textContent = [location.district, location.province].filter(Boolean).join(' · ');
		copy.append(name, detail);
		const state = document.createElement('b');
		state.textContent = location.alert_enabled ? 'แจ้งเตือน' : 'ปิดเตือน';
		row.append(dot, copy, state);
		row.addEventListener('click', () => selectLocation(location.id));
		listElement.append(row);
	});
}

async function loadLocations(selectedId = null) {
	const result = await api('/api/tracked-locations');
	locations = result.data;
	renderLocations(document.querySelector('#location-filter').value);
	if (selectedId) {
		await selectLocation(selectedId);
	} else {
		setFormVisible(false);
	}
}

async function selectLocation(id) {
	try {
		const result = await api(`/api/tracked-locations/${id}`);
		const location = result.data;
		document.querySelector('#location-id').value = location.id;
		document.querySelector('#location-name').value = location.name;
		document.querySelector('#location-province').value = location.province;
		document.querySelector('#location-district').value = location.district ?? '';
		document.querySelector('#location-latitude').value = location.latitude;
		document.querySelector('#location-longitude').value = location.longitude;
		if (thresholdField) thresholdField.value = location.temperature_threshold ?? '';
		document.querySelector('#location-alert-enabled').checked = location.alert_enabled;
		document.querySelector('#form-kicker').textContent = 'EDIT LOCATION';
		document.querySelector('#form-heading').textContent = location.name;
		document.querySelector('#delete-location').hidden = false;
		setFormVisible(true);
	} catch (error) {
		showToast(error.message);
	}
}

function startNewLocation() {
	form.reset();
	document.querySelector('#location-id').value = '';
	document.querySelector('#location-alert-enabled').checked = true;
	document.querySelector('#form-kicker').textContent = 'NEW LOCATION';
	document.querySelector('#form-heading').textContent = 'เพิ่มพื้นที่ติดตาม';
	document.querySelector('#delete-location').hidden = true;
	if (thresholdField) thresholdField.value = '';
	setFormVisible(true);
}

async function loadAccount() {
	try {
		const [user] = await Promise.all([
			api('/api/user'),
			loadLocations(),
		]);
		applyPendingLocationSelection();
		document.querySelector('#account-email').textContent = user.email;
	} catch (error) {
		showToast(error.message);
	}
}

document.querySelector('#location-filter').addEventListener('input', (event) => renderLocations(event.target.value));
document.querySelector('#add-location').addEventListener('click', startNewLocation);
function navigateToMapPicker() {
	sessionStorage.setItem(locationDraftKey, JSON.stringify({
		id: document.querySelector('#location-id').value,
		heading: document.querySelector('#form-heading').textContent,
		name: document.querySelector('#location-name').value,
		province: document.querySelector('#location-province').value,
		district: document.querySelector('#location-district').value,
		latitude: document.querySelector('#location-latitude').value,
		longitude: document.querySelector('#location-longitude').value,
		alert_enabled: document.querySelector('#location-alert-enabled').checked,
		temperature_threshold: thresholdField?.value ?? '',
	}));
	window.location.assign('/map?pick=1&return=%2Flocations');
}

document.querySelector('#select-from-map').addEventListener('click', navigateToMapPicker);
document.querySelector('#search-location').addEventListener('click', navigateToMapPicker);
document.querySelector('#map-picker-close').addEventListener('click', closeMapPicker);
document.querySelector('#map-picker-search-btn').addEventListener('click', searchLocationOnMap);
mapPickerInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') searchLocationOnMap();
});
mapPickerInput.addEventListener('input', () => {
	if (mapPickerInput.value.trim() === '') {
		mapPickerResults.innerHTML = '';
	}
});
document.querySelector('#map-picker-confirm').addEventListener('click', () => {
	const locationLat = Number(document.querySelector('#location-latitude').value);
	const locationLon = Number(document.querySelector('#location-longitude').value);
	if (!Number.isFinite(locationLat) || !Number.isFinite(locationLon)) {
		showToast('กรุณาเลือกตำแหน่งบนแผนที่ก่อน');
		return;
	}
	const selected = pickerMarker ? pickerMarker.getLatLng() : null;
	if (selected) {
		document.querySelector('#location-latitude').value = selected.lat.toFixed(5);
		document.querySelector('#location-longitude').value = selected.lng.toFixed(5);
	}
	closeMapPicker();
	showToast('เลือกตำแหน่งแล้ว');
});
document.querySelector('#cancel-edit').addEventListener('click', () => setFormVisible(false));
document.querySelector('#account-logout').addEventListener('click', async () => {
	try {
		await api('/api/logout', { method: 'POST' });
	} finally {
		sessionStorage.removeItem(tokenKey);
		window.location.assign('/login');
	}
});

form.addEventListener('submit', async (event) => {
	event.preventDefault();
	const id = document.querySelector('#location-id').value;
	const thresholdValue = thresholdField ? thresholdField.value : '';
	const payload = {
		name: document.querySelector('#location-name').value.trim(),
		province: document.querySelector('#location-province').value.trim(),
		district: document.querySelector('#location-district').value.trim() || null,
		latitude: Number(document.querySelector('#location-latitude').value),
		longitude: Number(document.querySelector('#location-longitude').value),
		alert_enabled: document.querySelector('#location-alert-enabled').checked,
		temperature_threshold: thresholdValue === '' ? null : Number(thresholdValue),
	};
	const submit = form.querySelector('[type="submit"]');
	submit.disabled = true;
	try {
		const result = await api(id ? `/api/tracked-locations/${id}` : '/api/tracked-locations', {
			method: id ? 'PATCH' : 'POST',
			body: JSON.stringify(payload),
		});
		await loadLocations(result.data.id);
		showToast(id ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มพื้นที่ติดตามแล้ว');
		sessionStorage.removeItem(pendingLocationKey);
	} catch (error) {
		showToast(error.message);
	} finally {
		submit.disabled = false;
	}
});

document.querySelector('#delete-location').addEventListener('click', async () => {
	const id = document.querySelector('#location-id').value;
	if (!id || !window.confirm('ลบพื้นที่ติดตามนี้หรือไม่?')) return;
	try {
		await api(`/api/tracked-locations/${id}`, { method: 'DELETE' });
		await loadLocations();
		showToast('ลบพื้นที่ติดตามแล้ว');
	} catch (error) {
		showToast(error.message);
	}
});

loadAccount();