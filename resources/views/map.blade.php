<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f4f5f0">
    <title>แผนที่สภาพอากาศ | WeatherGuard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
    @vite('resources/js/map.js')
</head>
<body class="weather-map-page">
    <header class="map-topbar">
        <a class="map-brand" href="{{ route('home') }}" aria-label="กลับหน้าภาพรวม">
            <span class="map-brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/></svg></span>
            <span>weather<span>guard</span><small>WEATHER INTELLIGENCE</small></span>
        </a>
        <div class="map-heading"><span class="map-eyebrow">THAILAND WEATHER</span><h1>แผนที่สภาพอากาศ</h1></div>
        <div class="map-top-actions"><span class="data-status" id="data-status"><i></i><span>กำลังโหลดข้อมูล</span></span><a class="back-link" href="{{ request()->query('pick') === '1' ? route('locations.index') : route('home') }}"><span aria-hidden="true">←</span> {{ request()->query('pick') === '1' ? 'ยกเลิก' : 'ภาพรวม' }}</a></div>
    </header>

    <main class="map-workspace">
        <section class="map-stage" aria-label="แผนที่อุณหภูมิประเทศไทย">
            <div class="map-layer-switch" role="group" aria-label="ข้อมูลที่แสดงบนแผนที่">
                <button class="layer-button active" data-layer="temperature">อุณหภูมิ</button>
                <button class="layer-button" data-layer="precipitation">ฝน</button>
                <button class="layer-button" data-layer="wind">ลม</button>
            </div>
            <div id="weather-map" role="application" aria-label="แผนที่ประเทศไทย กดหมุดจังหวัดเพื่อดูอำเภอ"></div>
            <div class="map-legend" id="map-legend"><span id="legend-title">อุณหภูมิ °C</span><div class="legend-gradient temperature-gradient"></div><div class="legend-endpoints"><span>เย็น</span><span>ร้อน</span></div></div>
            <div class="map-status-overlay" id="map-status-overlay"><span class="loading-ring"></span><strong>กำลังเตรียมแผนที่</strong><small>โหลดพิกัดและข้อมูลสภาพอากาศ</small></div>
            <button class="map-home-button" id="map-home" aria-label="แสดงประเทศไทยทั้งประเทศ" title="แสดงประเทศไทยทั้งประเทศ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9.5 19v-5h5v5"/></svg></button>
            <button class="map-pick-confirm" id="map-pick-confirm" type="button" hidden>ใช้ตำแหน่งนี้</button>
        </section>

        <aside class="weather-sidebar">
            <section class="province-browser" id="province-browser">
                <div class="sidebar-heading-row"><div><span class="panel-kicker">CURRENT CONDITIONS</span><h2>อุณหภูมิรายจังหวัด <span id="province-count">77</span></h2></div><button class="icon-only-button" id="refresh-weather" aria-label="อัปเดตสภาพอากาศ" title="อัปเดตสภาพอากาศ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></svg></button></div>
                <label class="province-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="province-search" type="search" placeholder="ค้นหาจังหวัด" autocomplete="off"><kbd>/</kbd></label>
                <section class="border-weather-panel" aria-labelledby="border-weather-title">
                    <div class="border-weather-heading"><div><span class="panel-kicker">BORDER OUTLOOK · 6 HRS</span><h3 id="border-weather-title">ประเทศเพื่อนบ้าน</h3></div><span class="border-weather-status" id="border-weather-status">กำลังโหลด</span></div>
                    <p class="border-weather-disclaimer">ประเมินแนวโน้มฝนใกล้ชายแดน ไม่ใช่ประกาศเตือนภัยทางการ</p>
                    <div class="border-weather-list" id="border-weather-list" aria-label="สภาพอากาศและพื้นที่ชายแดนที่ควรติดตาม">
                        <div class="border-weather-loading">กำลังตรวจพยากรณ์บริเวณชายแดน</div>
                    </div>
                </section>
                <div class="sort-row"><span>แสดงอุณหภูมิปัจจุบัน</span><span id="weather-updated">--:--</span></div>
                <div class="province-list" id="province-list" aria-label="รายชื่อจังหวัด"></div>
            </section>

            <section class="district-browser" id="district-browser" hidden>
                <button class="back-to-provinces" id="back-to-provinces"><span aria-hidden="true">←</span> จังหวัดทั้งหมด</button>
                <div class="district-summary">
                    <span class="panel-kicker">DISTRICT CONDITIONS</span>
                    <h2 id="selected-province-name">จังหวัด</h2>
                    <div class="province-temperature"><strong id="selected-province-temperature">--°</strong><span>อุณหภูมิปัจจุบัน</span></div>
                    <p id="district-source-note">อุณหภูมิจากจุดพยากรณ์ใกล้เคียง</p>
                </div>
                <div class="district-list-heading"><strong>อุณหภูมิรายอำเภอ</strong><span id="district-count">--</span></div>
                <div class="district-list" id="district-list" aria-label="รายชื่ออำเภอ"></div>
            </section>

            <footer class="map-data-note">
                <p>อุณหภูมิจาก Open-Meteo · พิกัดพื้นที่จากชุดข้อมูลภูมิศาสตร์ไทย (MIT)</p>
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a><span>·</span><a href="https://github.com/kongvut/thai-province-data" target="_blank" rel="noreferrer">ข้อมูลจังหวัด</a><span>·</span><span>แผนที่ © OpenStreetMap</span>
            </footer>
        </aside>
    </main>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
</body>
</html>