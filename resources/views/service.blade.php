<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f4f5f0">
    <title>สมาชิกและพื้นที่ติดตาม | WeatherGuard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite('resources/js/service.js')
</head>
<body class="service-page">
    <header class="service-topbar">
        <a class="service-brand" href="{{ route('home') }}" aria-label="กลับหน้าภาพรวม">
            <span class="service-brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/></svg></span>
            <span>weather<span>guard</span><small>WEATHER INTELLIGENCE</small></span>
        </a>
        <div class="service-title"><span>ACCOUNT &amp; API</span><h1>สมาชิกและพื้นที่ติดตาม</h1></div>
        <a class="service-back" href="{{ route('home') }}"><span aria-hidden="true">←</span> ภาพรวม</a>
    </header>

    <main class="service-main">
        <section class="auth-layout" id="auth-panel">
            <div class="auth-intro">
                <span class="service-eyebrow">WEATHERGUARD ACCOUNT</span>
                <h2>พื้นที่ของคุณ<br>ในที่เดียว</h2>
                <p>เข้าสู่ระบบเพื่อจัดการจังหวัดและอำเภอที่ติดตาม</p>
                <div class="auth-rule"><span>01</span><div><strong>พื้นที่ติดตาม</strong><small>เก็บพิกัดและเงื่อนไขเตือนภัย</small></div></div>
                <div class="auth-rule"><span>02</span><div><strong>ข้อมูลส่วนตัว</strong><small>ข้อมูลแต่ละบัญชีแยกจากกัน</small></div></div>
            </div>
            <section class="auth-form-panel">
                <span class="service-eyebrow" id="auth-kicker">SIGN IN</span>
                <h2 id="auth-heading">เข้าสู่ระบบ</h2>
                <form id="auth-form">
                    <label id="name-field" hidden>ชื่อที่แสดง<input name="name" autocomplete="name" maxlength="255"></label>
                    <label>อีเมล<input name="email" type="email" autocomplete="email" required maxlength="255"></label>
                    <label>รหัสผ่าน<input name="password" type="password" autocomplete="current-password" required minlength="8"></label>
                    <p class="form-error" id="auth-error" role="alert" hidden></p>
                    <button class="primary-button" id="auth-submit" type="submit">เข้าสู่ระบบ</button>
                </form>
                <p class="auth-switch"><span id="auth-switch-copy">ยังไม่มีบัญชี?</span> <button id="auth-mode-toggle" type="button">สมัครสมาชิก</button></p>
            </section>
        </section>

        <section class="account-workspace" id="account-workspace" hidden>
            <header class="account-header">
                <div><span class="service-eyebrow">YOUR WEATHERGUARD</span><h2>พื้นที่ที่ติดตาม</h2><p>เพิ่มจังหวัดและกำหนดเกณฑ์แจ้งเตือนของคุณ</p></div>
                <div class="account-actions"><span class="signed-in-user" id="signed-in-user"></span><button class="quiet-button" id="logout-button" type="button">ออกจากระบบ</button></div>
            </header>
            <div class="location-workspace">
                <section class="location-list-panel">
                    <div class="location-list-heading"><div><span class="service-eyebrow">SAVED LOCATIONS</span><h3>รายการพื้นที่ <span id="location-count">0</span></h3></div><button class="icon-action" id="add-location" type="button" aria-label="เพิ่มพื้นที่" title="เพิ่มพื้นที่"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-7-7h14"/></svg></button></div>
                    <label class="location-filter"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="location-filter" type="search" placeholder="ค้นหาพื้นที่"></label>
                    <div class="saved-location-list" id="saved-location-list" aria-label="รายการพื้นที่ติดตาม"></div>
                    <div class="list-empty" id="list-empty" hidden><strong>ยังไม่มีพื้นที่ติดตาม</strong><span>เพิ่มจังหวัดแรกของคุณ</span></div>
                </section>

                <section class="location-detail-panel">
                    <div class="detail-empty" id="detail-empty"><span class="empty-pin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><h3>เลือกพื้นที่ติดตาม</h3><p>ดูและแก้ไขข้อมูลพื้นที่ของคุณ</p></div>
                    <form class="location-form" id="location-form" hidden>
                        <div class="detail-heading"><div><span class="service-eyebrow" id="detail-kicker">NEW LOCATION</span><h3 id="detail-title">เพิ่มพื้นที่ติดตาม</h3></div><div class="detail-menu"><button class="quiet-button" id="edit-location" type="button" hidden>แก้ไข</button><button class="danger-button" id="delete-location" type="button" hidden>ลบ</button></div></div>
                        <div class="form-grid">
                            <label class="form-wide">ชื่อเรียก<input name="name" required maxlength="100" placeholder="เช่น บ้าน, ที่ทำงาน"></label>
                            <label>จังหวัด<input name="province" required maxlength="100" placeholder="กรุงเทพมหานคร"></label>
                            <label>อำเภอ / เขต<input name="district" maxlength="100" placeholder="พระนคร"></label>
                            <label>ละติจูด<input name="latitude" type="number" min="-90" max="90" step="any" required placeholder="13.7563"></label>
                            <label>ลองจิจูด<input name="longitude" type="number" min="-180" max="180" step="any" required placeholder="100.5018"></label>
                            <label class="form-wide">แจ้งเตือนเมื่ออุณหภูมิสูงกว่า (°C)<input name="temperature_threshold" type="number" min="-50" max="60" step="0.1" placeholder="ไม่กำหนด"></label>
                            <label class="checkbox-row form-wide"><input name="alert_enabled" type="checkbox" checked><span>เปิดการแจ้งเตือนสำหรับพื้นที่นี้</span></label>
                        </div>
                        <p class="form-error" id="location-error" role="alert" hidden></p>
                        <div class="form-actions"><button class="quiet-button" id="cancel-edit" type="button" hidden>ยกเลิก</button><button class="primary-button" id="save-location" type="submit">บันทึกพื้นที่</button></div>
                    </form>
                </section>
            </div>
        </section>
        <div class="service-toast" id="service-toast" role="status" aria-live="polite"></div>
    </main>
</body>
</html>