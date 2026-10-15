const weatherRoot = 'https://api.open-meteo.com/v1/forecast';
const borderRegions = [
	{ country: 'เมียนมา', borderTown: 'ท่าขี้เหล็ก', lat: 20.45, lon: 99.88, thaiProvince: 'เชียงราย', thaiPoint: { lat: 19.907, lon: 99.832 }, affectedProvinces: ['เชียงราย', 'เชียงใหม่', 'แม่ฮ่องสอน', 'ตาก'] },
	{ country: 'ลาว', borderTown: 'เวียงจันทน์', lat: 17.97, lon: 102.63, thaiProvince: 'หนองคาย', thaiPoint: { lat: 17.878, lon: 102.742 }, affectedProvinces: ['เชียงราย', 'เลย', 'หนองคาย', 'บึงกาฬ', 'นครพนม', 'มุกดาหาร', 'อุบลราชธานี'] },
	{ country: 'กัมพูชา', borderTown: 'ปอยเปต', lat: 13.66, lon: 102.56, thaiProvince: 'สระแก้ว', thaiPoint: { lat: 13.824, lon: 102.064 }, affectedProvinces: ['สระแก้ว', 'บุรีรัมย์', 'สุรินทร์', 'ศรีสะเกษ', 'อุบลราชธานี'] },
	{ country: 'มาเลเซีย', borderTown: 'ปาดังเบซาร์', lat: 6.66, lon: 100.32, thaiProvince: 'สงขลา', thaiPoint: { lat: 7.189, lon: 100.596 }, affectedProvinces: ['สงขลา', 'สตูล', 'ยะลา', 'ปัตตานี', 'นราธิวาส'] },
];

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function assessBorderRain(weather) {
	const hourly = weather?.hourly ?? {};
	const probability = Math.max(0, ...(hourly.precipitation_probability ?? []).slice(0, 6).map(Number));
	const rainTotal = (hourly.precipitation ?? []).slice(0, 6).reduce((total, value) => total + (Number(value) || 0), 0);
	const thunderstorm = (hourly.weather_code ?? []).slice(0, 6).some((code) => [95, 96, 99].includes(Number(code)));
	const level = thunderstorm || probability >= 70 || rainTotal >= 10
		? 'high'
		: probability >= 40 || rainTotal >= 3
			? 'watch'
			: 'low';

	return { level, probability };
}

function renderBorderWeather(list, results) {
	list.innerHTML = borderRegions.map((region) => {
		const result = results.get(region.country);
		if (!results.has(region.country)) {
			return `<article class="border-region-card border-region-loading"><div class="border-region-top"><strong>${escapeHtml(region.country)}</strong><b>--°</b></div><div class="border-region-place">บริเวณ ${escapeHtml(region.borderTown)}</div><span class="border-risk-badge border-risk-low">กำลังโหลด</span></article>`;
		}
		if (!result) {
			return `<article class="border-region-card border-region-error"><div class="border-region-top"><strong>${escapeHtml(region.country)}</strong><b>--°</b></div><div class="border-region-place">บริเวณ ${escapeHtml(region.borderTown)}</div><span class="border-risk-badge border-risk-low">โหลดข้อมูลไม่ได้</span></article>`;
		}

		const { neighborWeather, thailandWeather } = result;
		const neighborRisk = assessBorderRain(neighborWeather);
		const thailandRisk = assessBorderRain(thailandWeather);
		const riskLevel = neighborRisk.level === 'high' || thailandRisk.level === 'high'
			? 'high'
			: neighborRisk.level === 'watch' || thailandRisk.level === 'watch'
				? 'watch'
				: 'low';
		const riskText = { high: 'เสี่ยงฝนสูง', watch: 'เฝ้าระวังฝน', low: 'ความเสี่ยงต่ำ' }[riskLevel];
		const signalSource = neighborRisk.level === 'high' || neighborRisk.level === 'watch'
			? 'พบสัญญาณฝนฝั่งประเทศเพื่อนบ้าน'
			: thailandRisk.level === 'high' || thailandRisk.level === 'watch'
				? `พบสัญญาณฝนใกล้ ${region.thaiProvince}`
				: 'ยังไม่พบสัญญาณฝนเด่น';
		const temperature = Number.isFinite(neighborWeather?.current?.temperature_2m)
			? `${Math.round(neighborWeather.current.temperature_2m)}°`
			: '--°';
		const probability = Math.max(neighborRisk.probability, thailandRisk.probability);

		return `<article class="border-region-card"><div class="border-region-top"><strong>${escapeHtml(region.country)}</strong><b>${temperature}</b></div><div class="border-region-place">${escapeHtml(region.borderTown)} · ใกล้ ${escapeHtml(region.thaiProvince)}</div><span class="border-risk-badge border-risk-${riskLevel}">${riskText} · ${probability}%</span><p class="border-region-impact">${signalSource}<br><strong>ไทยใกล้เคียง:</strong> ${region.affectedProvinces.map(escapeHtml).join(' · ')}</p></article>`;
	}).join('');
}

export async function loadBorderWeather({ list, status, getProvinceCoordinate = () => null }) {
	if (!list || !status) return;

	const results = new Map();
	let completed = 0;
	for (let index = 0; index < borderRegions.length; index += 2) {
		await Promise.all(borderRegions.slice(index, index + 2).map(async (region) => {
			const thaiPoint = getProvinceCoordinate(region) ?? region.thaiPoint;
			const query = new URLSearchParams({
				latitude: `${region.lat},${thaiPoint.lat.toFixed(5)}`,
				longitude: `${region.lon},${thaiPoint.lon.toFixed(5)}`,
				current: 'temperature_2m,precipitation,wind_speed_10m',
				hourly: 'precipitation_probability,precipitation,weather_code',
				forecast_hours: '6',
				timezone: 'Asia/Bangkok',
			});
			try {
				const response = await fetch(`${weatherRoot}?${query}`, { signal: AbortSignal.timeout(12000) });
				if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
				const data = await response.json();
				const locations = Array.isArray(data) ? data : [data];
				results.set(region.country, { neighborWeather: locations[0], thailandWeather: locations[1] });
			} catch {
				results.set(region.country, null);
			}
			completed += 1;
			status.textContent = `ตรวจแล้ว ${completed}/${borderRegions.length}`;
			renderBorderWeather(list, results);
		}));
	}

	status.textContent = `พยากรณ์ 6 ชม. · ${new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
	renderBorderWeather(list, results);
}