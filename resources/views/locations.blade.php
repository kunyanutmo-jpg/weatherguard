<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#eef4f4">
    <title>พื้นที่ติดตาม | WeatherGuard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
    @vite('resources/js/locations.js')
</head>
<body class="auth-page">
    <header class="service-topbar">
        <a class="service-brand" href="{{ route('home') }}" aria-label="กลับหน้าภาพรวม">
            <span class="service-brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/></svg></span>
            <span>weather<span>guard</span><small>WEATHER INTELLIGENCE</small></span>
        </a>
        <div class="service-title"><span>PERSONAL WEATHER</span><h1>พื้นที่ติดตาม</h1></div>
        <a class="service-back" href="{{ route('home') }}"><span aria-hidden="true">←</span> ภาพรวม</a>
    </header>
    <main class="service-main">
        <section class="account-workspace">
            <header class="account-header">
                <div><span class="service-eyebrow">YOUR WEATHERGUARD</span><h2>จัดการพื้นที่ติดตาม</h2><p>พื้นที่เหล่านี้ใช้ประเมินเหตุภัยและการแจ้งเตือนในบัญชีของคุณ</p></div>
                <div class="account-actions"><span class="signed-in-user" id="account-email"></span><button class="quiet-button" id="account-logout" type="button">ออกจากระบบ</button></div>
            </header>
            <div class="location-workspace">
                <section class="location-list-panel" aria-label="พื้นที่ที่บันทึกไว้">
                    <div class="location-list-heading"><div><span class="service-eyebrow">SAVED LOCATIONS</span><h3>รายการพื้นที่ <span id="location-count">0</span></h3></div><button class="icon-action" id="add-location" type="button" aria-label="เพิ่มพื้นที่" title="เพิ่มพื้นที่"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-7-7h14"/></svg></button></div>
                    <label class="location-filter"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="location-filter" type="search" placeholder="ค้นหาชื่อหรือจังหวัด" autocomplete="off"></label>
                    <div class="saved-location-list" id="saved-location-list" aria-live="polite"></div>
                </section>
                <section class="location-detail-panel" aria-label="รายละเอียดพื้นที่">
                    <div class="detail-empty" id="detail-empty"><span class="empty-pin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><h3>เลือกพื้นที่หรือเพิ่มรายการใหม่</h3><p>พิกัดใช้คำนวณระยะจากเหตุภัยและพื้นที่เสี่ยง</p></div>
                    <form class="location-form" id="location-form" hidden>
                        <input id="location-id" type="hidden">
                        <div class="detail-heading"><div><span class="service-eyebrow" id="form-kicker">NEW LOCATION</span><h3 id="form-heading">เพิ่มพื้นที่ติดตาม</h3></div><button class="danger-button" id="delete-location" type="button" hidden>ลบพื้นที่</button></div>
                        <div class="form-grid">
                            <label class="form-wide">ชื่อที่แสดง<input id="location-name" name="name" required maxlength="100" placeholder="เช่น บ้าน, ที่ทำงาน"></label>
                            <label>จังหวัด/พื้นที่<input id="location-province" name="province" required maxlength="100" placeholder="เช่น เชียงราย"></label>
                            <label>อำเภอ<input id="location-district" name="district" maxlength="100" placeholder="อำเภอ (ถ้ามี)"></label>

                            <div class="form-wide coordinate-picker-row">
                                <div class="coordinate-box">
                                    <label>ละติจูด<input id="location-latitude" name="latitude" type="number" step="any" min="-90" max="90" readonly placeholder="กรอกอัตโนมัติจากแผนที่"></label>
                                </div>
                                <div class="coordinate-box">
                                    <label>ลองจิจูด<input id="location-longitude" name="longitude" type="number" step="any" min="-180" max="180" readonly placeholder="กรอกอัตโนมัติจากแผนที่"></label>
                                </div>
                                <div class="coordinate-actions">
                                    <button class="quiet-button" id="select-from-map" type="button">เลือกจากแผนที่</button>
                                    <button class="quiet-button" id="search-location" type="button">ค้นหาสถานที่</button>
                                </div>
                            </div>

                            <div class="advanced-option hidden" id="threshold-wrapper" hidden>
                                <label>เกณฑ์อุณหภูมิ °C<input id="location-threshold" name="temperature_threshold" type="number" step="0.1" min="-50" max="60" placeholder="ไม่กำหนด"></label>
                            </div>

                            <label class="checkbox-row form-wide"><input id="location-alert-enabled" name="alert_enabled" type="checkbox" checked><span>เปิดการแจ้งเตือนสำหรับพื้นที่นี้</span></label>
                        </div>
                        <div class="form-actions"><button class="quiet-button" id="cancel-edit" type="button">ยกเลิก</button><button class="primary-button" type="submit">บันทึกพื้นที่</button></div>
                    </form>
                </section>
            </div>
        </section>
    </main>
    <div class="service-toast" id="locations-toast" role="status" aria-live="polite"></div>

    <div class="map-picker-modal" id="map-picker-modal" hidden>
        <div class="map-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="map-picker-title">
            <div class="map-picker-header">
                <div>
                    <span class="service-eyebrow">LOCATION PICKER</span>
                    <h3 id="map-picker-title">เลือกจากแผนที่</h3>
                </div>
                <button type="button" class="icon-action" id="map-picker-close" aria-label="ปิดแผนที่">✕</button>
            </div>

            <div class="map-picker-search">
                <input id="map-picker-search" type="text" placeholder="ค้นหาสถานที่ เช่น ชลบุรี, กรุงเทพฯ" autocomplete="off">
                <button type="button" class="primary-button" id="map-picker-search-btn">ค้นหา</button>
            </div>
            <div id="map-picker-results" class="map-picker-results" aria-live="polite"></div>

            <div id="location-map-picker" aria-label="แผนที่เลือกตำแหน่ง"></div>

            <div class="map-picker-footer">
                <div class="coordinate-readout">
                    <span>ละติจูด</span>
                    <strong id="picker-latitude">--</strong>
                </div>
                <div class="coordinate-readout">
                    <span>ลองจิจูด</span>
                    <strong id="picker-longitude">--</strong>
                </div>
                <button type="button" class="primary-button" id="map-picker-confirm">ใช้ตำแหน่งนี้</button>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
</body>
</html>