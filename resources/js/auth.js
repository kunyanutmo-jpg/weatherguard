import './bootstrap';
import '../css/service.css';

const tokenKey = 'weatherguard_api_token';
const authForm = document.querySelector('#auth-form');
const authError = document.querySelector('#auth-error');
const authNotice = document.querySelector('#auth-notice');
let authMode = 'login';

function safeNextPath() {
	const next = new URLSearchParams(window.location.search).get('next');
	if (!next) return '/';

	try {
		const target = new URL(next, window.location.origin);
		return target.origin === window.location.origin
			? `${target.pathname}${target.search}${target.hash}`
			: '/';
	} catch {
		return '/';
	}
}

function setAuthMode(mode) {
	authMode = mode;
	const registering = mode === 'register';
	document.querySelector('#name-field').hidden = !registering;
	document.querySelector('#name-field input').required = registering;
	document.querySelector('#auth-kicker').textContent = registering ? 'CREATE ACCOUNT' : 'SIGN IN';
	document.querySelector('#auth-heading').textContent = registering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
	document.querySelector('.service-title h1').textContent = registering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
	document.querySelector('#auth-submit').textContent = registering ? 'สร้างบัญชี' : 'เข้าสู่ระบบ';
	document.querySelector('#auth-switch-copy').textContent = registering ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?';
	document.querySelector('#auth-mode-toggle').textContent = registering ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
	document.querySelector('#auth-forgot-link').hidden = registering;
	document.querySelector('#auth-form [name="password"]').autocomplete = registering ? 'new-password' : 'current-password';
	authError.hidden = true;
}

if (new URLSearchParams(window.location.search).has('registered')) {
	authNotice.textContent = 'สมัครสมาชิกสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีที่สร้างไว้';
	authNotice.hidden = false;
}

document.querySelector('#auth-mode-toggle').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));

authForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	const button = document.querySelector('#auth-submit');
	button.disabled = true;
	authError.hidden = true;
	const formData = new FormData(authForm);
	const registering = authMode === 'register';
	const payload = {
		email: formData.get('email'),
		password: formData.get('password'),
	};
	if (registering) payload.name = formData.get('name');

	try {
		const response = await fetch(`/api/${registering ? 'register' : 'login'}`, {
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const result = await response.json();
		if (!response.ok) {
			const validationMessages = Object.values(result.errors ?? {}).flat();
			throw new Error(validationMessages[0] ?? result.message ?? 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
		}

		if (registering) {
			sessionStorage.removeItem(tokenKey);
			window.location.assign('/login?registered=1');
			return;
		}

		sessionStorage.setItem(tokenKey, result.token);
		window.location.assign(safeNextPath());
	} catch (error) {
		authError.textContent = error.message;
		authError.hidden = false;
	} finally {
		button.disabled = false;
	}
});

const existingToken = sessionStorage.getItem(tokenKey);
if (existingToken) {
	fetch('/api/user', { headers: { Accept: 'application/json', Authorization: `Bearer ${existingToken}` } })
		.then((response) => {
			if (response.ok) {
				window.location.replace(safeNextPath());
			}
			else sessionStorage.removeItem(tokenKey);
		})
		.catch(() => sessionStorage.removeItem(tokenKey));
}