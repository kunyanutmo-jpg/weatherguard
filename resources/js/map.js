import './bootstrap';
import '../css/map.css';
import { loadBorderWeather } from './border-weather';

const apiRoot = 'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest';
const weatherRoot = 'https://api.open-meteo.com/v1/forecast';
const geocodingRoot = 'https://geocoding-api.open-meteo.com/v1/search';
const reverseGeocodingRoot = 'https://nominatim.openstreetmap.org/reverse';
const provinceCenterFallbacks = {
	'Nong Bua Lam Phu': { lat: 17.20406, lon: 102.44068 },
	'Phangnga': { lat: 8.45091, lon: 98.5985 },
};
const mapElement = document.querySelector('#weather-map');
const provinceList = document.querySelector('#province-list');
const districtList = document.querySelector('#district-list');
const overlay = document.querySelector('#map-status-overlay');
const statusElement = document.querySelector('#data-status');
const provinceBrowser = document.querySelector('#province-browser');
const districtBrowser = document.querySelector('#district-browser');
const temperatureByLocation = new Map();
const districtWeatherByProvince = new Map();
let provinces = [];
let districts = [];
let map;
let locationMarkers = [];
let selectedProvince;
let selectedDistrict;
let activeLayer = 'temperature';
let provinceCoordinates = [];
let mapSelectionMarker;
let mapSelectionPosition;

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function setStatus(message, state = 'loading') {
	statusElement.className = `data-status${state === 'ready' ? ' is-ready' : state === 'error' ? ' is-error' : ''}`;
	statusElement.querySelector('span').textContent = message;
}

function setOverlay(title, detail, visible = true, error = false) {
	overlay.hidden = !visible;
	overlay.querySelector('strong').textContent = title;
	overlay.querySelector('small').textContent = detail;
	overlay.classList.toggle('is-error', error);
}

function temperatureValue(item) {
	const value = temperatureByLocation.get(item.key)?.temperature;
	return Number.isFinite(value) ? `${Math.round(value)}°` : '--°';
}

function temperatureClass(value) {
	if (!Number.isFinite(value)) return 'mild';
	if (value < 24) return 'cool';
	if (value < 29) return 'mild';
	if (value < 34) return 'warm';
	return 'hot';
}

function temperatureColor(value) {
	if (!Number.isFinite(value)) return '#a5b0a8';
	if (value < 24) return '#78adb8';
	if (value < 29) return '#91aa78';
	if (value < 34) return '#e4b763';
	return '#d87355';
}

function markerValue(item) {
	const weather = temperatureByLocation.get(item.key);
	if (!weather) return '--°';
	const prefix = item.approximate ? '~' : '';
	if (activeLayer === 'precipitation') return `${prefix}${Math.round(weather.precipitation ?? 0)} mm`;
	if (activeLayer === 'wind') return `${prefix}${Math.round(weather.wind ?? 0)}`;
	return `${prefix}${Math.round(weather.temperature)}°`;
}

function updateMarkerLabels() {
	const occupied = [];
	const prioritized = [...locationMarkers].sort((first, second) => {
		const firstSelected = first.item.id === selectedProvince?.id || first.item.id === selectedDistrict?.id;
		const secondSelected = second.item.id === selectedProvince?.id || second.item.id === selectedDistrict?.id;
		return Number(secondSelected) - Number(firstSelected);
	});
	prioritized.forEach(({ marker, item }) => {
		const selected = (item.kind === 'province' && item.id === selectedProvince?.id)
			|| (item.kind === 'district' && item.id === selectedDistrict?.id);
		const point = map.latLngToContainerPoint(marker.getLatLng());
		const compact = !selected && occupied.some((other) => Math.abs(point.x - other.x) < 33 && Math.abs(point.y - other.y) < 24);
		if (!compact) occupied.push(point);
		const weather = temperatureByLocation.get(item.key);
		const fill = temperatureColor(weather?.temperature);
		const iconSize = compact ? [14, 14] : [36, 24];
		marker.setIcon(L.divIcon({
			className: 'temperature-marker-wrap',
			html: `<span class="temperature-marker${selected ? ' selected' : ''}${compact ? ' compact' : ''}" style="--marker-fill:${fill}" aria-label="${escapeHtml(item.name)} ${markerValue(item)}">${markerValue(item)}</span>`,
			iconSize,
			iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
		}));
		marker.setZIndexOffset(selected ? 1000 : compact ? 500 : 0);
		marker.setPopupContent(`<strong>${escapeHtml(item.name)}</strong><br>${markerValue(item)}${item.approximate ? '<br><small>ค่าประมาณจากจุดพยากรณ์ระดับจังหวัด</small>' : ''}`);
	});
	const titles = { temperature: 'อุณหภูมิ °C', precipitation: 'ฝน มม.', wind: 'ลม กม./ชม.' };
	document.querySelector('#legend-title').textContent = titles[activeLayer];
	const gradient = document.querySelector('.legend-gradient');
	gradient.className = `legend-gradient ${activeLayer}-gradient`;
}

function clearMarkers() {
	locationMarkers.forEach(({ marker }) => map.removeLayer(marker));
	locationMarkers = [];
}

function addMarker(item) {
	if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon)) return null;
	const marker = L.marker([item.lat, item.lon], {
		icon: L.divIcon({ className: 'temperature-marker-wrap', html: '<span class="temperature-marker">--°</span>', iconSize: [36, 24], iconAnchor: [18, 12] }),
		title: item.name,
	}).addTo(map);
	marker.bindTooltip(escapeHtml(item.name), { className: 'province-tooltip', direction: 'top', offset: [0, -11] });
	marker.bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>${markerValue(item)}`);
	locationMarkers.push({ marker, item });
	return marker;
}

function averageCoordinates(records) {
	const points = records.filter((record) => record.lat !== null && record.long !== null
		&& record.lat !== undefined && record.long !== undefined
		&& Number.isFinite(Number(record.lat)) && Number.isFinite(Number(record.long)));
	if (!points.length) return null;
	return {
		lat: points.reduce((sum, point) => sum + Number(point.lat), 0) / points.length,
		lon: points.reduce((sum, point) => sum + Number(point.long), 0) / points.length,
	};
}

function makeDistrictName(district) {
	return `${district.prefix?.th ?? ''}${district.name.th}`;
}

function makeProvinceName(province) {
	return province.name.th;
}

function normalizePlaceName(value) {
	return String(value ?? '')
		.toLocaleLowerCase('th')
		.replace(/^(จังหวัด|จ\.?|chang wat|province of|province)\s*/i, '')
		.replace(/\s+/g, '');
}

async function reverseGeocodeProvince(lat, lon) {
	const query = new URLSearchParams({
		format: 'jsonv2',
		lat: String(lat),
		lon: String(lon),
		zoom: '10',
		addressdetails: '1',
		'accept-language': 'th',
	});
	try {
		const response = await fetch(`${reverseGeocodingRoot}?${query}`, { signal: AbortSignal.timeout(8000) });
		if (!response.ok) return null;
		const address = (await response.json()).address ?? {};
		const addressNames = [address.province, address.state, address.region, address.city, address.state_district]
			.map(normalizePlaceName)
			.filter(Boolean);
		return provinces.find((province) => {
			const names = [normalizePlaceName(province.name.th), normalizePlaceName(province.name.en)];
			return names.some((name) => addressNames.includes(name));
		}) ?? null;
	} catch {
		return null;
	}
}

function findNearestProvince(lat, lon) {
	const latitudeScale = Math.cos((lat * Math.PI) / 180);
	let nearestDistrict;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const district of districts) {
		if (!district.coordinate) continue;
		const latitudeDifference = district.coordinate.lat - lat;
		const longitudeDifference = (district.coordinate.lon - lon) * latitudeScale;
		const distance = latitudeDifference ** 2 + longitudeDifference ** 2;
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestDistrict = district;
		}
	}
	return provinces.find((province) => province.id === nearestDistrict?.province_id) ?? null;
}

function returnLocationSelection(name, province, district, lat, lon) {
	const params = new URLSearchParams(window.location.search);
	const returnPath = params.get('return') || params.get('next');
	if (!returnPath) return;

	const payload = {
		name: name ?? '',
		province: province ?? '',
		district: district ?? '',
		lat: Number(lat),
		lon: Number(lon),
	};

	sessionStorage.setItem('weatherguard_pending_location', JSON.stringify(payload));
	window.location.href = returnPath.startsWith('/') ? returnPath : '/locations';
}

async function fetchJson(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${response.status})`);
	return response.json();
}

async function geocode(name, provinceName = '') {
	const query = new URLSearchParams({
		name: provinceName ? `${name}, ${provinceName}` : name,
		count: '1',
		language: 'en',
		countryCode: 'TH',
	});
	try {
		const result = await fetchJson(`${geocodingRoot}?${query}`);
		const location = result.results?.[0];
		return location ? { lat: location.latitude, lon: location.longitude } : null;
	} catch {
		return null;
	}
}

async function mapWithLimit(items, limit, callback) {
	for (let index = 0; index < items.length; index += limit) {
		await Promise.all(items.slice(index, index + limit).map(callback));
	}
}

async function fetchWeather(locations, onBatchLoaded = null) {
	const usable = locations.filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lon));
	const batches = [];
	for (let index = 0; index < usable.length; index += 2) {
		batches.push(usable.slice(index, index + 2));
	}
	await mapWithLimit(batches, 5, async (batch) => {
		const query = new URLSearchParams({
			latitude: batch.map((location) => location.lat.toFixed(5)).join(','),
			longitude: batch.map((location) => location.lon.toFixed(5)).join(','),
			current: 'temperature_2m,precipitation,wind_speed_10m',
			timezone: 'Asia/Bangkok',
		});
		let results;
		try {
			const response = await fetch(`${weatherRoot}?${query}`, { signal: AbortSignal.timeout(12000) });
			if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
			results = await response.json();
		} catch (error) {
			if (batch.length === 1) throw error;
			results = await Promise.all(batch.map((location) => fetchWeather([location])));
			onBatchLoaded?.();
			return;
		}
		const weatherList = Array.isArray(results) ? results : [results];
		batch.forEach((location, itemIndex) => {
			const current = weatherList[itemIndex]?.current;
			if (!current) return;
			temperatureByLocation.set(location.key, {
				temperature: current.temperature_2m,
				precipitation: current.precipitation,
				wind: current.wind_speed_10m,
				time: current.time,
			});
		});
		onBatchLoaded?.();
	});
}

function renderProvinceList(filter = '') {
	const query = filter.trim().toLocaleLowerCase('th');
	const visible = provinces.filter((province) => makeProvinceName(province).toLocaleLowerCase('th').includes(query));
	if (!visible.length) {
		provinceList.innerHTML = '<div class="empty-list">ไม่พบจังหวัดที่ค้นหา</div>';
		return;
	}
	provinceList.innerHTML = visible.map((province) => {
		const weather = temperatureByLocation.get(`province:${province.id}`);
		return `<button class="province-row${province.id === selectedProvince?.id ? ' active' : ''}" type="button" data-province-id="${province.id}"><i class="province-dot ${temperatureClass(weather?.temperature)}"></i><span><strong>${escapeHtml(makeProvinceName(province))}</strong><small>${weather?.time ? `อัปเดต ${weather.time.slice(11, 16)} น.` : 'รอข้อมูลสภาพอากาศ'}</small></span><b>${temperatureValue({ key: `province:${province.id}` })}</b></button>`;
	}).join('');
	provinceList.querySelectorAll('[data-province-id]').forEach((button) => {
		button.addEventListener('click', () => selectProvince(Number(button.dataset.provinceId)));
	});
}

function renderDistrictList(province, districtWeather) {
	const provinceDistricts = districts.filter((district) => district.province_id === province.id);
	document.querySelector('#district-count').textContent = `${provinceDistricts.length} อำเภอ`;
	document.querySelector('#selected-province-name').textContent = makeProvinceName(province);
	document.querySelector('#selected-province-temperature').textContent = temperatureValue({ key: `province:${province.id}` });
	districtList.innerHTML = provinceDistricts.map((district) => {
		const weather = districtWeather.get(`district:${district.id}`);
		const coordinate = district.coordinate;
		const temperature = weather ? `${district.coordinateFallback ? '~' : ''}${Math.round(weather.temperature)}°` : '--';
		const locationNote = district.coordinateFallback ? 'ค่าประมาณจากจุดพยากรณ์ระดับจังหวัด' : coordinate ? 'แตะเพื่อดูตำแหน่งบนแผนที่' : 'ไม่มีพิกัดสำหรับแสดงบนแผนที่';
		return `<button class="district-row${district.id === selectedDistrict?.id ? ' active' : ''}" type="button" data-district-id="${district.id}" ${coordinate ? '' : 'disabled'}><span><strong>${escapeHtml(makeDistrictName(district))}</strong><small>${locationNote}</small></span><b class="${weather ? '' : 'unavailable'}">${temperature}</b></button>`;
	}).join('');
	districtList.querySelectorAll('[data-district-id]:not(:disabled)').forEach((button) => {
		button.addEventListener('click', () => selectDistrict(Number(button.dataset.districtId)));
	});
}

async function loadDistricts(province) {
	if (districtWeatherByProvince.has(province.id)) return districtWeatherByProvince.get(province.id);
	const provinceDistricts = districts.filter((district) => district.province_id === province.id);
	const missing = provinceDistricts.filter((district) => !district.coordinate);
	if (missing.length) {
		setStatus(`หาพิกัด ${missing.length} อำเภอ`, 'loading');
		await mapWithLimit(missing, 5, async (district) => {
			const point = await geocode(district.name.en, province.name.en);
			if (point) district.coordinate = point;
		});
	}
	provinceDistricts.filter((district) => !district.coordinate).forEach((district) => {
		district.coordinate = province.coordinate;
		district.coordinateFallback = true;
	});
	const locations = provinceDistricts.filter((district) => district.coordinate).map((district) => ({
		key: `district:${district.id}`,
		lat: district.coordinate.lat,
		lon: district.coordinate.lon,
	}));
	await fetchWeather(locations);
	const weather = new Map(locations.map((location) => [location.key, temperatureByLocation.get(location.key)]));
	districtWeatherByProvince.set(province.id, weather);
	return weather;
}

async function selectProvince(provinceId) {
	const province = provinces.find((item) => item.id === provinceId);
	if (!province) return;
	const params = new URLSearchParams(window.location.search);
	const returnPath = params.get('return') || params.get('next');
	if (returnPath && params.get('pick') !== '1') {
		returnLocationSelection('', makeProvinceName(province), '', province.coordinate?.lat, province.coordinate?.lon);
		return;
	}
	selectedProvince = province;
	selectedDistrict = null;
	provinceBrowser.hidden = true;
	districtBrowser.hidden = false;
	document.querySelector('#selected-province-name').textContent = makeProvinceName(province);
	document.querySelector('#selected-province-temperature').textContent = temperatureValue({ key: `province:${province.id}` });
	document.querySelector('#district-count').textContent = 'กำลังโหลด';
	districtList.innerHTML = '<div class="empty-list">กำลังโหลดอุณหภูมิรายอำเภอ</div>';
	setStatus(`กำลังโหลด ${makeProvinceName(province)}`, 'loading');

	const provinceDistricts = districts.filter((district) => district.province_id === province.id);
	try {
		const weather = await loadDistricts(province);
		clearMarkers();
		provinceDistricts.forEach((district) => {
			if (!district.coordinate) return;
			addMarker({
				id: district.id,
				kind: 'district',
				key: `district:${district.id}`,
				name: makeDistrictName(district),
				lat: district.coordinate.lat,
				lon: district.coordinate.lon,
				approximate: district.coordinateFallback,
			});
		});
		const points = provinceDistricts.filter((district) => district.coordinate).map((district) => [district.coordinate.lat, district.coordinate.lon]);
		if (points.length > 1) map.fitBounds(points, { padding: [45, 45], maxZoom: 9, animate: true });
		else if (province.coordinate) map.flyTo([province.coordinate.lat, province.coordinate.lon], 8, { duration: 0.7 });
		updateMarkerLabels();
		renderDistrictList(province, weather);
		setStatus('ข้อมูลปัจจุบัน', 'ready');
	} catch {
		clearMarkers();
		provinceDistricts.forEach((district) => {
			if (district.coordinate) addMarker({ id: district.id, kind: 'district', key: `district:${district.id}`, name: makeDistrictName(district), ...district.coordinate });
		});
		updateMarkerLabels();
		renderDistrictList(province, new Map());
		setStatus('โหลดสภาพอากาศไม่สำเร็จ', 'error');
	}
}

function selectDistrict(districtId) {
	const district = districts.find((item) => item.id === districtId);
	if (!district?.coordinate) return;
	const params = new URLSearchParams(window.location.search);
	const returnPath = params.get('return') || params.get('next');
	if (returnPath) {
		const province = provinces.find((item) => item.id === district.province_id);
		returnLocationSelection(makeDistrictName(district), province ? makeProvinceName(province) : '', makeDistrictName(district), district.coordinate.lat, district.coordinate.lon);
		return;
	}
	selectedDistrict = district;
	updateMarkerLabels();
	const markerItem = locationMarkers.find(({ item }) => item.id === district.id)?.marker;
	map.flyTo([district.coordinate.lat, district.coordinate.lon], Math.max(map.getZoom(), 9), { duration: 0.65 });
	markerItem?.openTooltip();
	districtList.querySelectorAll('.district-row').forEach((button) => button.classList.toggle('active', Number(button.dataset.districtId) === districtId));
}

async function showProvinceMarkers() {
	selectedProvince = null;
	selectedDistrict = null;
	districtBrowser.hidden = true;
	provinceBrowser.hidden = false;
	clearMarkers();
	provinceCoordinates.forEach((province) => {
		const marker = addMarker({
			id: province.id,
			kind: 'province',
			key: `province:${province.id}`,
			name: makeProvinceName(province),
			lat: province.coordinate.lat,
			lon: province.coordinate.lon,
		});
		marker?.on('click', () => selectProvince(province.id));
	});
	updateMarkerLabels();
	if (provinceCoordinates.length) map.fitBounds(provinceCoordinates.map((province) => [province.coordinate.lat, province.coordinate.lon]), { padding: [42, 42], maxZoom: 5.5 });
	else map.setView([15.2, 101.1], 5);
}

async function refreshProvinceWeather() {
	setStatus('อัปเดตอุณหภูมิ', 'loading');
	try {
		await fetchWeather(provinceCoordinates.map((province) => ({
			key: `province:${province.id}`,
			lat: province.coordinate.lat,
			lon: province.coordinate.lon,
		})), () => {
			renderProvinceList(document.querySelector('#province-search').value);
			updateMarkerLabels();
			const available = provinceCoordinates.filter((province) => temperatureByLocation.has(`province:${province.id}`)).length;
			setStatus(`อัปเดตอุณหภูมิ ${available}/${provinceCoordinates.length}`, 'loading');
		});
		renderProvinceList(document.querySelector('#province-search').value);
		updateMarkerLabels();
		const firstWeather = temperatureByLocation.get(`province:${provinces[0]?.id}`);
		document.querySelector('#weather-updated').textContent = firstWeather?.time ? `${firstWeather.time.slice(11, 16)} น.` : 'ล่าสุด';
		setStatus('ข้อมูลปัจจุบัน', 'ready');
	} catch {
		setStatus('โหลดอุณหภูมิไม่สำเร็จ', 'error');
		document.querySelector('#weather-updated').textContent = 'ตรวจการเชื่อมต่อ';
		renderProvinceList(document.querySelector('#province-search').value);
		updateMarkerLabels();
	}
}

async function loadGeography() {
	const [provinceData, districtData, subdistrictData] = await Promise.all([
		fetchJson(`${apiRoot}/province.json`),
		fetchJson(`${apiRoot}/district.json`),
		fetchJson(`${apiRoot}/sub_district.json`),
	]);
	provinces = provinceData;
	districts = districtData.map((district) => ({ ...district, coordinate: null }));
	const districtsById = new Map(districts.map((district) => [district.id, district]));
	const provincePoints = new Map();
	const districtPoints = new Map();
	subdistrictData.forEach((subdistrict) => {
		if (subdistrict.lat === null || subdistrict.long === null
			|| !Number.isFinite(Number(subdistrict.lat)) || !Number.isFinite(Number(subdistrict.long))) return;
		const point = { lat: Number(subdistrict.lat), lon: Number(subdistrict.long) };
		const district = districtsById.get(subdistrict.district_id);
		if (!district) return;
		if (!districtPoints.has(district.id)) districtPoints.set(district.id, []);
		districtPoints.get(district.id).push(point);
		if (!provincePoints.has(district.province_id)) provincePoints.set(district.province_id, []);
		provincePoints.get(district.province_id).push(point);
	});
	districts.forEach((district) => {
		district.coordinate = averageCoordinates(districtPoints.get(district.id) ?? []);
	});
	provinces.forEach((province) => {
		province.coordinate = averageCoordinates(provincePoints.get(province.id) ?? []);
	});
	const missingProvinces = provinces.filter((province) => !province.coordinate);
	await mapWithLimit(missingProvinces, 5, async (province) => {
		province.coordinate = await geocode(province.name.en);
	});
	provinces.forEach((province) => {
		const fallback = provinceCenterFallbacks[province.name.en];
		if (fallback) province.coordinate = fallback;
	});
	provinceCoordinates = provinces.filter((province) => province.coordinate);
	document.querySelector('#province-count').textContent = provinceCoordinates.length;
}

async function initializeMap() {
	if (!window.L) {
		setOverlay('เปิดแผนที่ไม่ได้', 'โหลด Leaflet ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อ', true, true);
		setStatus('แผนที่ไม่พร้อม', 'error');
		return;
	}
	map = L.map(mapElement, { zoomControl: true, minZoom: 4, maxZoom: 12 }).setView([15.2, 101.1], 5);
	map.on('zoomend moveend', updateMarkerLabels);
	const pickerMode = new URLSearchParams(window.location.search).get('pick') === '1';
	const confirmSelectionButton = document.querySelector('#map-pick-confirm');
	if (pickerMode) {
		map.on('click', (event) => {
			mapSelectionPosition = event.latlng;
			if (!mapSelectionMarker) {
				mapSelectionMarker = L.marker(event.latlng, { draggable: true }).addTo(map);
				mapSelectionMarker.on('dragend', () => {
					mapSelectionPosition = mapSelectionMarker.getLatLng();
				});
			} else {
				mapSelectionMarker.setLatLng(event.latlng);
			}
			confirmSelectionButton.hidden = false;
		});
		confirmSelectionButton.addEventListener('click', async () => {
			if (!mapSelectionPosition) return;
			confirmSelectionButton.disabled = true;
			const originalText = confirmSelectionButton.textContent;
			confirmSelectionButton.textContent = 'กำลังระบุจังหวัด...';
			const position = mapSelectionPosition;
			const detectedProvince = await reverseGeocodeProvince(position.lat, position.lng)
				?? findNearestProvince(position.lat, position.lng)
				?? selectedProvince;
			const province = detectedProvince ? makeProvinceName(detectedProvince) : '';
			const district = selectedDistrict ? makeDistrictName(selectedDistrict) : '';
			const name = district || province || 'ตำแหน่งที่เลือก';
			returnLocationSelection(name, province, district, position.lat, position.lng);
			confirmSelectionButton.disabled = false;
			confirmSelectionButton.textContent = originalText;
		});
	}
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	}).addTo(map);
	setOverlay('กำลังเตรียมแผนที่', 'โหลดพิกัดจังหวัดและอำเภอจากชุดข้อมูลภูมิศาสตร์ไทย');
	try {
		await loadGeography();
		await showProvinceMarkers();
		renderProvinceList();
		setOverlay('', '', false);
		window.setTimeout(() => map.invalidateSize(), 100);
		refreshProvinceWeather();
		loadBorderWeather({
			list: document.querySelector('#border-weather-list'),
			status: document.querySelector('#border-weather-status'),
			getProvinceCoordinate: (region) => provinces.find((province) => province.name.th === region.thaiProvince)?.coordinate,
		});
	} catch (error) {
		setOverlay('โหลดข้อมูลแผนที่ไม่สำเร็จ', 'ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วกดอัปเดตอีกครั้ง', true, true);
		setStatus('โหลดข้อมูลไม่สำเร็จ', 'error');
		console.error(error);
	}
}

document.querySelector('#province-search').addEventListener('input', (event) => renderProvinceList(event.target.value));
document.querySelector('#province-search').addEventListener('keydown', (event) => {
	if (event.key === 'Enter') provinceList.querySelector('.province-row')?.click();
});
document.querySelector('#back-to-provinces').addEventListener('click', showProvinceMarkers);
document.querySelector('#refresh-weather').addEventListener('click', refreshProvinceWeather);
document.querySelector('#map-home').addEventListener('click', showProvinceMarkers);
document.querySelectorAll('.layer-button').forEach((button) => {
	button.addEventListener('click', () => {
		activeLayer = button.dataset.layer;
		document.querySelectorAll('.layer-button').forEach((layer) => layer.classList.toggle('active', layer === button));
		updateMarkerLabels();
		renderProvinceList(document.querySelector('#province-search').value);
		if (selectedProvince) renderDistrictList(selectedProvince, districtWeatherByProvince.get(selectedProvince.id) ?? new Map());
	});
});

initializeMap();