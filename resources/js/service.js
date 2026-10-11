import './bootstrap';
import '../css/service.css';

const tokenKey = 'weatherguard_api_token';
const authPanel = document.querySelector('#auth-panel');
const workspace = document.querySelector('#account-workspace');
const authForm = document.querySelector('#auth-form');
const locationForm = document.querySelector('#location-form');
const detailEmpty = document.querySelector('#detail-empty');
const locationList = document.querySelector('#saved-location-list');
const toast = document.querySelector('#service-toast');
let authMode = 'login';
let activeToken = sessionStorage.getItem(tokenKey);
let activeUser = null;
let selectedLocation = null;
let editing = false;
let toastTimeout;

function showToast(message) {
	toast.textContent = message;
	toast.classList.add('show');
	window.clearTimeout(toastTimeout);
	toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value) {
	return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

async function apiRequest(path, { method = 'GET', body } = {}) {
	const headers = { Accept: 'application/json' };
	if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
	if (body) headers['Content-Type'] = 'application/json';

	const response = await fetch(`/api${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});
	const result = response.status === 204 ? null : await response.json();
	if (!response.ok) {
		const validationMessages = Object.values(result.errors ?? {}).flat();
		throw new Error(validationMessages[0] ?? result.message ?? 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
	}
	return result;
}

function showAuth(error = '') {
	activeToken = null;
	activeUser = null;
	selectedLocation = null;
	sessionStorage.removeItem(tokenKey);
	workspace.hidden = true;
	authPanel.hidden = false;
	document.querySelector('#auth-error').textContent = error;
	document.querySelector('#auth-error').hidden = !error;
}

function setAuthMode(mode) {
	authMode = mode;
	const registering = mode === 'register';
	document.querySelector('#name-field').hidden = !registering;
	document.querySelector('#name-field input').required = registering;
	document.querySelector('#auth-kicker').textContent = registering ? 'CREATE ACCOUNT' : 'SIGN IN';
	document.querySelector('#auth-heading').textContent = registering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
	document.querySelector('#auth-submit').textContent = registering ? 'สร้างบัญชีและรับ Token' : 'เข้าสู่ระบบ';
	document.querySelector('#auth-switch-copy').textContent = registering ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?';
	document.querySelector('#auth-mode-toggle').textContent = registering ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
	document.querySelector('#auth-form [name="password"]').autocomplete = registering ? 'new-password' : 'current-password';
	document.querySelector('#auth-error').hidden = true;
}

function setFormEditable(isEditable) {
	locationForm.querySelectorAll('input').forEach((input) => { input.disabled = !isEditable; });
	document.querySelector('#edit-location').hidden = isEditable || !selectedLocation;
	document.querySelector('#delete-location').hidden = isEditable || !selectedLocation;
	document.querySelector('#save-location').hidden = !isEditable;
	document.querySelector('#cancel-edit').hidden = !isEditable;
}

function resetLocationForm() {
	locationForm.reset();
	locationForm.elements.alert_enabled.checked = true;
	document.querySelector('#location-error').hidden = true;
}

function renderLocationList(locations) {
	const query = document.querySelector('#location-filter').value.trim().toLocaleLowerCase('th');
	const filtered = locations.filter((location) => `${location.name} ${location.province} ${location.district ?? ''}`.toLocaleLowerCase('th').includes(query));
	document.querySelector('#location-count').textContent = locations.length;
	document.querySelector('#list-empty').hidden = locations.length > 0;
	locationList.innerHTML = filtered.map((location) => `<button class="saved-location${location.id === selectedLocation?.id ? ' active' : ''}" type="button" data-location-id="${location.id}"><i class="saved-location-dot"></i><span><strong>${escapeHtml(location.name)}</strong><small>${escapeHtml(location.district ? `${location.district}, ` : '')}${escapeHtml(location.province)}</small></span><b>${location.alert_enabled ? 'เตือนเปิด' : 'เตือนปิด'}</b></button>`).join('');
	locationList.querySelectorAll('[data-location-id]').forEach((button) => {
		button.addEventListener('click', () => selectLocation(Number(button.dataset.locationId)));
	});
	if (locations.length > 0 && filtered.length === 0) {
		locationList.innerHTML = '<div class="list-empty">ไม่พบพื้นที่ที่ค้นหา</div>';
	}
}

async function loadLocations() {
	const response = await apiRequest('/tracked-locations');
	const locations = response.data;
	renderLocationList(locations);
	return locations;
}

async function selectLocation(id) {
	try {
		const response = await apiRequest(`/tracked-locations/${id}`);
		selectedLocation = response.data;
		detailEmpty.hidden = true;
		locationForm.hidden = false;
		document.querySelector('#detail-kicker').textContent = `LOCATION #${selectedLocation.id}`;
		document.querySelector('#detail-title').textContent = selectedLocation.name;
		locationForm.elements.name.value = selectedLocation.name;
		locationForm.elements.province.value = selectedLocation.province;
		locationForm.elements.district.value = selectedLocation.district ?? '';
		locationForm.elements.latitude.value = selectedLocation.latitude;
		locationForm.elements.longitude.value = selectedLocation.longitude;
		locationForm.elements.temperature_threshold.value = selectedLocation.temperature_threshold ?? '';
		locationForm.elements.alert_enabled.checked = selectedLocation.alert_enabled;
		setFormEditable(false);
		renderLocationList((await apiRequest('/tracked-locations')).data);
	} catch (error) {
		showToast(error.message);
	}
}

function showWorkspace(user) {
	activeUser = user;
	document.querySelector('#signed-in-user').textContent = `${user.name} · ${user.email}`;
	authPanel.hidden = true;
	workspace.hidden = false;
	loadLocations().catch((error) => showToast(error.message));
}

function startNewLocation() {
	selectedLocation = null;
	detailEmpty.hidden = true;
	locationForm.hidden = false;
	document.querySelector('#detail-kicker').textContent = 'NEW LOCATION';
	document.querySelector('#detail-title').textContent = 'เพิ่มพื้นที่ติดตาม';
	resetLocationForm();
	setFormEditable(true);
	loadLocations().catch((error) => showToast(error.message));
}

authForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const button = document.querySelector('#auth-submit');
	button.disabled = true;
	document.querySelector('#auth-error').hidden = true;
	const formData = new FormData(authForm);
	const payload = {
		email: formData.get('email'),
		password: formData.get('password'),
		device_name: 'weatherguard-web',
	};
	if (authMode === 'register') payload.name = formData.get('name');
	try {
		const response = await apiRequest(authMode === 'register' ? '/register' : '/login', {
			method: 'POST',
			body: payload,
		});
		activeToken = response.token;
		sessionStorage.setItem(tokenKey, activeToken);
		showWorkspace(response.user);
	} catch (error) {
		document.querySelector('#auth-error').textContent = error.message;
		document.querySelector('#auth-error').hidden = false;
	} finally {
		button.disabled = false;
	}
});

document.querySelector('#auth-mode-toggle').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
document.querySelector('#logout-button').addEventListener('click', async () => {
	try {
		await apiRequest('/logout', { method: 'POST' });
	} catch {
		showAuth('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
		return;
	}
	showAuth();
	showToast('ออกจากระบบแล้ว');
});
document.querySelector('#add-location').addEventListener('click', startNewLocation);
document.querySelector('#edit-location').addEventListener('click', () => setFormEditable(true));
document.querySelector('#cancel-edit').addEventListener('click', () => {
	if (selectedLocation) selectLocation(selectedLocation.id);
	else {
		locationForm.hidden = true;
		detailEmpty.hidden = false;
	}
});
document.querySelector('#location-filter').addEventListener('input', () => loadLocations().catch((error) => showToast(error.message)));

locationForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const fields = locationForm.elements;
	const threshold = fields.temperature_threshold.value;
	const payload = {
		name: fields.name.value,
		province: fields.province.value,
		district: fields.district.value || null,
		latitude: Number(fields.latitude.value),
		longitude: Number(fields.longitude.value),
		alert_enabled: fields.alert_enabled.checked,
		temperature_threshold: threshold === '' ? null : Number(threshold),
	};
	const button = document.querySelector('#save-location');
	button.disabled = true;
	try {
		const response = await apiRequest(selectedLocation ? `/tracked-locations/${selectedLocation.id}` : '/tracked-locations', {
			method: selectedLocation ? 'PUT' : 'POST',
			body: payload,
		});
		selectedLocation = response.data;
		await loadLocations();
		await selectLocation(selectedLocation.id);
		showToast('บันทึกพื้นที่แล้ว');
	} catch (error) {
		document.querySelector('#location-error').textContent = error.message;
		document.querySelector('#location-error').hidden = false;
	} finally {
		button.disabled = false;
	}
});

document.querySelector('#delete-location').addEventListener('click', async () => {
	if (!selectedLocation || !window.confirm(`ลบพื้นที่ “${selectedLocation.name}” หรือไม่?`)) return;
	try {
		await apiRequest(`/tracked-locations/${selectedLocation.id}`, { method: 'DELETE' });
		selectedLocation = null;
		locationForm.hidden = true;
		detailEmpty.hidden = false;
		await loadLocations();
		showToast('ลบพื้นที่แล้ว');
	} catch (error) {
		showToast(error.message);
	}
});

document.querySelector('#location-form').elements.name.addEventListener('input', (event) => {
	if (!selectedLocation) document.querySelector('#detail-title').textContent = event.target.value || 'เพิ่มพื้นที่ติดตาม';
});

if (activeToken) {
	apiRequest('/user').then((response) => showWorkspace(response)).catch(() => showAuth('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'));
} else {
	showAuth();
}