<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f4f5f0">
    <title>WeatherGuard | ศูนย์ติดตามสภาพอากาศ</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <svg class="icon-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <symbol id="i-cloud" viewBox="0 0 24 24"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/><path d="M8 22v-2m5 2v-2m5 2v-2"/></symbol>
        <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></symbol>
        <symbol id="i-map" viewBox="0 0 24 24"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/></symbol>
        <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4"/></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
        <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M7 17 17 7M7 7h10v10"/></symbol>
        <symbol id="i-wind" viewBox="0 0 24 24"><path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h6a3 3 0 1 1-3 3"/></symbol>
        <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z"/></symbol>
        <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></symbol>
        <symbol id="i-rain" viewBox="0 0 24 24"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/><path d="m8 21 1-2m4 2 1-2m4 2 1-2"/></symbol>
        <symbol id="i-alert" viewBox="0 0 24 24"><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></symbol>
        <symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></symbol>
        <symbol id="i-pin" viewBox="0 0 24 24"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></symbol>
        <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6-.2.1a8 8 0 0 1-1.4.8l-.3.1-.3 1.8h-2.8l-.3-1.8-.3-.1a8 8 0 0 1-1.4-.8l-.2-.1-1.7.6-1.4-2.4 1.4-1.1.1-.3a8 8 0 0 1 0-1.6l-.1-.3-1.4-1.1 1.4-2.4 1.7.6.2-.1a8 8 0 0 1 1.4-.8l.3-.1.3-1.8h2.8l.3 1.8.3.1a8 8 0 0 1 1.4.8l.2.1 1.7-.6 1.4 2.4-1.4 1.1-.1.3a8 8 0 0 1 0 1.6Z" transform="translate(-1 -1) scale(.95)"/></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12"/></symbol>
        <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
    </svg>

    <div class="app-shell">
        <aside class="sidebar" id="sidebar">
            <a class="brand" href="#overview" aria-label="WeatherGuard หน้าหลัก">
                <span class="brand-mark"><svg class="icon"><use href="#i-cloud"/></svg><span></span></span>
                <span class="brand-name">weather<span>guard</span><small>WEATHER INTELLIGENCE</small></span>
            </a>

            <div class="workspace-label">WORKSPACE <button class="workspace-switch" aria-label="เปลี่ยน workspace">ทีมของฉัน <span>⌄</span></button></div>
            <nav class="main-nav" aria-label="เมนูหลัก">
                <a class="nav-link active" href="#overview"><svg class="icon"><use href="#i-grid"/></svg> ภาพรวม</a>
                <a class="nav-link" href="{{ route('weather.map') }}"><svg class="icon"><use href="#i-map"/></svg> แผนที่สภาพอากาศ</a>
                <a class="nav-link" href="#alerts-section"><svg class="icon"><use href="#i-bell"/></svg> การแจ้งเตือน <span class="nav-count">3</span></a>
                <a class="nav-link" href="#history-section"><svg class="icon"><use href="#i-clock"/></svg> ประวัติประกาศ</a>
            </nav>

            <div class="sidebar-heading">พื้นที่ที่ติดตาม <button class="icon-button sidebar-add" id="open-locations" aria-label="เพิ่มพื้นที่"><svg class="icon"><use href="#i-plus"/></svg></button></div>
            <div class="location-list" id="location-list">
                <button class="location-item selected" data-city="กรุงเทพมหานคร" data-lat="13.7563" data-lon="100.5018"><span class="location-dot dot-orange"></span><span>กรุงเทพมหานคร<small>ฝนฟ้าคะนอง</small></span><b>31°</b></button>
                <button class="location-item" data-city="เชียงใหม่" data-lat="18.7883" data-lon="98.9853"><span class="location-dot dot-blue"></span><span>เชียงใหม่<small>มีเมฆบางส่วน</small></span><b>29°</b></button>
                <button class="location-item" data-city="ภูเก็ต" data-lat="7.8804" data-lon="98.3923"><span class="location-dot dot-green"></span><span>ภูเก็ต<small>แดดออก</small></span><b>33°</b></button>
            </div>

            <div class="sidebar-bottom">
                <div class="plan-box"><span class="plan-icon"><svg class="icon"><use href="#i-bell"/></svg></span><strong>รับรู้ก่อนใคร</strong><p>ตั้งค่าพื้นที่และเงื่อนไขแจ้งเตือนของคุณ</p><button id="configure-alerts">ตั้งค่าการแจ้งเตือน <svg class="icon"><use href="#i-arrow"/></svg></button></div>
                <button class="profile-button"><span class="avatar" id="profile-avatar">ผ</span><span><span id="profile-name">ผู้เยี่ยมชม</span><small id="profile-email">กรุณาเข้าสู่ระบบ</small></span><span class="profile-more">···</span></button>
            </div>
        </aside>

        <main class="main-content" id="overview">
            <header class="topbar">
                <button class="icon-button mobile-menu" id="mobile-menu" aria-label="เปิดเมนู"><svg class="icon"><use href="#i-menu"/></svg></button>
                <div class="breadcrumb">ศูนย์ติดตาม <svg class="icon"><use href="#i-chevron"/></svg> <strong>ภาพรวม</strong></div>
                <div class="topbar-actions">
                    <label class="search-box"><svg class="icon"><use href="#i-search"/></svg><input id="city-search" type="search" placeholder="ค้นหาจังหวัด..." autocomplete="off"><kbd>⌘ K</kbd><span class="search-results" id="search-results"></span></label>
                    <span class="topbar-divider"></span>
                    <button class="icon-button notification-button" id="notification-button" aria-label="การแจ้งเตือน"><svg class="icon"><use href="#i-bell"/></svg><i></i></button>
                    <button class="avatar top-avatar" aria-label="บัญชีผู้ใช้">PK</button>
                    <button class="session-logout" id="session-logout" type="button" hidden>ออกจากระบบ</button>
                </div>
            </header>

            <div class="page-wrap">
                <section class="welcome-row">
                    <div><div class="eyebrow"><span class="live-pulse"></span> THAILAND WEATHER BRIEFING <span class="eyebrow-date">วันอาทิตย์ที่ 11 ตุลาคม 2569</span></div><h1>สวัสดี, <span id="greeting-name">ผู้เยี่ยมชม</span> <span>☀</span></h1><p>ภาพรวมสภาพอากาศและสถานการณ์สำคัญในพื้นที่ที่คุณติดตาม</p></div>
                    <button class="date-button"><svg class="icon"><use href="#i-clock"/></svg><span>อัปเดตล่าสุด<small>วันนี้ 10:24 น.</small></span><span class="fresh-dot"></span></button>
                </section>

                <section class="alert-strip" aria-label="ประกาศเตือนภัย">
                    <div class="alert-symbol"><svg class="icon"><use href="#i-alert"/></svg></div>
                    <div class="alert-copy"><div><span class="alert-kicker">ประกาศเตือนภัย</span><span class="severity-label">เฝ้าระวัง</span></div><strong>ฝนตกหนักถึงหนักมากบริเวณภาคกลาง</strong><p>กรุงเทพฯ นนทบุรี และปทุมธานี · มีผลถึง 20:00 น. วันนี้</p></div>
                    <button class="alert-link" data-scroll="#alerts-section">ดูรายละเอียด <svg class="icon"><use href="#i-chevron"/></svg></button>
                    <span class="alert-stripe"></span>
                </section>

                <section class="overview-grid" aria-label="สภาพอากาศปัจจุบัน">
                    <article class="current-card">
                        <div class="current-top"><div><span class="card-overline">สภาพอากาศตอนนี้</span><h2 class="active-city">กรุงเทพมหานคร <svg class="icon"><use href="#i-pin"/></svg></h2><span class="local-time">ประเทศไทย · 10:24 น.</span></div><button class="more-button" aria-label="ตัวเลือกเพิ่มเติม">···</button></div>
                        <div class="current-weather"><div class="sun-art"><span class="sun-disc"></span><span class="cloud-shape"></span></div><div class="temperature">31<span>°</span><small>มีเมฆและฝนบางแห่ง</small></div></div>
                        <div class="feels-like">รู้สึกเหมือน 36° <span>·</span> สูงสุด 33° / ต่ำสุด 27°</div>
                        <div class="weather-stats"><div><span><svg class="icon"><use href="#i-drop"/></svg> ความชื้น</span><strong>78<small>%</small></strong><div class="stat-meter"><i style="width:78%"></i></div></div><div><span><svg class="icon"><use href="#i-wind"/></svg> ลม</span><strong>14<small> กม./ชม.</small></strong><div class="stat-meter"><i style="width:42%"></i></div></div><div><span><svg class="icon"><use href="#i-rain"/></svg> โอกาสฝน</span><strong>65<small>%</small></strong><div class="stat-meter rain-meter"><i style="width:65%"></i></div></div></div>
                    </article>

                    <article class="forecast-card">
                        <div class="section-heading"><div><span class="card-overline">แนวโน้มอากาศ</span><h2>พยากรณ์อากาศ</h2></div><div class="segmented-control" role="group" aria-label="ช่วงเวลาพยากรณ์"><button class="forecast-tab active" data-period="today">24 ชั่วโมง</button><button class="forecast-tab" data-period="week">7 วัน</button></div></div>
                        <div class="hourly-forecast" id="forecast-list">
                            <div class="forecast-item"><span>ตอนนี้</span><svg class="weather-mini sun-cloud"><use href="#i-cloud"/></svg><strong>31°</strong><small>65%</small></div>
                            <div class="forecast-item"><span>12:00</span><svg class="weather-mini sun-mini"><use href="#i-sun"/></svg><strong>33°</strong><small>35%</small></div>
                            <div class="forecast-item"><span>14:00</span><svg class="weather-mini rain-mini"><use href="#i-rain"/></svg><strong>32°</strong><small>70%</small></div>
                            <div class="forecast-item"><span>16:00</span><svg class="weather-mini rain-mini"><use href="#i-rain"/></svg><strong>30°</strong><small>80%</small></div>
                            <div class="forecast-item"><span>18:00</span><svg class="weather-mini cloud-mini"><use href="#i-cloud"/></svg><strong>29°</strong><small>40%</small></div>
                            <div class="forecast-item"><span>20:00</span><svg class="weather-mini moon-mini"><use href="#i-sun"/></svg><strong>28°</strong><small>20%</small></div>
                        </div>
                        <div class="rain-chart"><div class="chart-label">ปริมาณฝน <span>มม.</span></div><div class="chart-bars" aria-label="กราฟปริมาณฝนรายชั่วโมง"><i style="--bar:14%"></i><i style="--bar:22%"></i><i style="--bar:38%"></i><i style="--bar:76%"></i><i style="--bar:92%"></i><i style="--bar:62%"></i><i style="--bar:34%"></i><i style="--bar:18%"></i><i style="--bar:8%"></i><i style="--bar:5%"></i><i style="--bar:4%"></i><i style="--bar:3%"></i></div><div class="chart-times"><span>10:00</span><span>14:00</span><span>18:00</span><span>22:00</span></div></div>
                    </article>
                </section>

                <section class="lower-grid">
                    <article class="map-card" id="map-section">
                        <div class="section-heading map-heading"><div><span class="card-overline">ภาพรวมประเทศไทย</span><h2>แผนที่สภาพอากาศ <span class="map-live"><i></i> DEMO</span></h2></div><a class="map-expand" id="map-expand" href="{{ route('weather.map') }}" aria-label="เปิดแผนที่ขนาดใหญ่">⤢</a></div>
                        <div class="map-toolbar"><div class="map-layers" role="group" aria-label="ชั้นข้อมูลแผนที่"><button class="map-layer active" data-layer="rain"><svg class="icon"><use href="#i-rain"/></svg> ฝน</button><button class="map-layer" data-layer="wind"><svg class="icon"><use href="#i-wind"/></svg> ลม</button><button class="map-layer" data-layer="alerts"><svg class="icon"><use href="#i-alert"/></svg> ภัยพิบัติ</button></div><button class="layer-menu" aria-label="ชั้นข้อมูล"><svg class="icon"><use href="#i-layers"/></svg></button></div>
                        <div class="map-frame"><div id="weather-map" role="img" aria-label="แผนที่สภาพอากาศประเทศไทย"></div><div class="map-legend"><span class="legend-title">ปริมาณฝน</span><div class="legend-scale"></div><div class="legend-values"><span>น้อย</span><span>มาก</span></div></div><button class="map-locate" id="map-locate" aria-label="กลับไปยังกรุงเทพมหานคร"><svg class="icon"><use href="#i-pin"/></svg></button></div>
                        <div class="map-footnote"><span><i class="source-dot"></i> ข้อมูลแผนที่ © OpenStreetMap</span><span>เพื่อการติดตามเบื้องต้น</span></div>
                    </article>

                    <article class="events-card" id="alerts-section">
                        <div class="section-heading"><div><span class="card-overline">ติดตามสถานการณ์</span><h2>เหตุการณ์สำคัญ <span class="event-count">3</span></h2></div><button class="text-link" data-scroll="#history-section">ดูทั้งหมด <svg class="icon"><use href="#i-chevron"/></svg></button></div>
                        <div class="event-list">
                            <div class="event-item event-high"><span class="event-icon"><svg class="icon"><use href="#i-rain"/></svg></span><div class="event-content"><div class="event-meta"><span class="event-type">ฝนตกหนัก</span><time>10:05 น.</time></div><strong>ฝนตกหนักในกรุงเทพฯ และปริมณฑล</strong><p>กรมอุตุนิยมวิทยา · คาดการณ์ฝนสะสม 60–80 มม.</p><div class="event-tags"><span>กรุงเทพฯ</span><span>นนทบุรี</span></div></div></div>
                            <div class="event-item event-medium"><span class="event-icon"><svg class="icon"><use href="#i-wind"/></svg></span><div class="event-content"><div class="event-meta"><span class="event-type">คลื่นลมแรง</span><time>08:30 น.</time></div><strong>คลื่นสูง 2–3 เมตรบริเวณอ่าวไทย</strong><p>กรมอุตุนิยมวิทยา · เรือเล็กควรงดออกจากฝั่ง</p></div></div>
                            <div class="event-item event-low"><span class="event-icon"><svg class="icon"><use href="#i-alert"/></svg></span><div class="event-content"><div class="event-meta"><span class="event-type">เฝ้าระวัง</span><time>เมื่อวาน</time></div><strong>ระดับน้ำเจ้าพระยาเพิ่มสูงขึ้น</strong><p>กรมชลประทาน · ติดตามระดับน้ำอย่างใกล้ชิด</p></div></div>
                        </div>
                        <div class="official-note"><svg class="icon"><use href="#i-alert"/></svg><span>ข้อมูลประกาศจากหน่วยงานที่เกี่ยวข้อง</span><button aria-label="ข้อมูลเพิ่มเติม">i</button></div>
                    </article>
                </section>

                <section class="bottom-grid" id="history-section">
                    <article class="tracked-card"><div class="section-heading"><div><span class="card-overline">พื้นที่ของคุณ</span><h2>สภาพอากาศพื้นที่ติดตาม</h2></div><button class="text-link" id="manage-locations">จัดการพื้นที่ <svg class="icon"><use href="#i-chevron"/></svg></button></div><div class="tracked-weather" id="tracked-weather"><button class="tracked-city active" data-city="กรุงเทพมหานคร"><span class="tracked-icon tracked-rain"><svg class="icon"><use href="#i-rain"/></svg></span><span><strong>กรุงเทพมหานคร</strong><small>ฝนฟ้าคะนอง</small></span><b>31°</b><small class="tracked-range">27° / 33°</small></button><button class="tracked-city" data-city="เชียงใหม่"><span class="tracked-icon tracked-cloud"><svg class="icon"><use href="#i-cloud"/></svg></span><span><strong>เชียงใหม่</strong><small>มีเมฆบางส่วน</small></span><b>29°</b><small class="tracked-range">22° / 31°</small></button><button class="tracked-city" data-city="ภูเก็ต"><span class="tracked-icon tracked-sun"><svg class="icon"><use href="#i-sun"/></svg></span><span><strong>ภูเก็ต</strong><small>แดดออก</small></span><b>33°</b><small class="tracked-range">26° / 34°</small></button></div></article>
                    <article class="subscription-card"><div class="subscription-icon"><svg class="icon"><use href="#i-bell"/></svg></div><div><span class="card-overline">ไม่พลาดทุกสถานการณ์</span><h2>การแจ้งเตือนของฉัน</h2><p>รับข่าวสารสภาพอากาศในพื้นที่ที่คุณสนใจ</p></div><button class="toggle-switch is-on" id="notification-toggle" role="switch" aria-checked="true" aria-label="เปิดการแจ้งเตือน"><span></span></button><div class="subscription-footer"><span><i class="fresh-dot"></i> แจ้งเตือนผ่านเว็บไซต์</span><button id="notification-settings">ตั้งค่า <svg class="icon"><use href="#i-arrow"/></svg></button></div></article>
                </section>

                <footer class="page-footer"><span>WeatherGuard <b>·</b> ติดตามอากาศอย่างเข้าใจ พร้อมรับมือทุกสถานการณ์</span><span>ข้อมูลตัวอย่างสำหรับสาธิตระบบ <b>·</b> ตรวจสอบประกาศจากหน่วยงานทางการ</span></footer>
            </div>
        </main>
    </div>

    <dialog class="locations-dialog" id="locations-dialog">
        <form method="dialog" id="locations-form">
            <div class="dialog-heading"><div><span class="card-overline">PERSONALIZE YOUR DASHBOARD</span><h2>จัดการพื้นที่ติดตาม</h2></div><button class="icon-button" value="cancel" aria-label="ปิด"><svg class="icon"><use href="#i-close"/></svg></button></div>
            <p>เลือกจังหวัดที่ต้องการดูสภาพอากาศและรับการแจ้งเตือน</p>
            <label class="dialog-search"><svg class="icon"><use href="#i-search"/></svg><input id="location-input" type="search" placeholder="ค้นหาจังหวัด เช่น ขอนแก่น"></label>
            <div class="province-options" id="province-options"><label><input type="checkbox" value="กรุงเทพมหานคร" checked><span>กรุงเทพมหานคร</span><small>ภาคกลาง</small></label><label><input type="checkbox" value="เชียงใหม่" checked><span>เชียงใหม่</span><small>ภาคเหนือ</small></label><label><input type="checkbox" value="ภูเก็ต" checked><span>ภูเก็ต</span><small>ภาคใต้</small></label><label><input type="checkbox" value="ขอนแก่น"><span>ขอนแก่น</span><small>ภาคตะวันออกเฉียงเหนือ</small></label><label><input type="checkbox" value="ชลบุรี"><span>ชลบุรี</span><small>ภาคตะวันออก</small></label></div>
            <div class="dialog-actions"><button class="cancel-button" value="cancel">ยกเลิก</button><button class="save-button" id="save-locations" value="default">บันทึกพื้นที่</button></div>
        </form>
    </dialog>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
</body>
</html>