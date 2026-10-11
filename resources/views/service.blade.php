<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f4f5f0">
    <title>เข้าสู่ระบบ | WeatherGuard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite('resources/js/auth.js')
</head>
<body class="auth-page">
    <header class="service-topbar">
        <a class="service-brand" href="{{ route('home') }}" aria-label="กลับหน้าภาพรวม">
            <span class="service-brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/></svg></span>
            <span>weather<span>guard</span><small>WEATHER INTELLIGENCE</small></span>
        </a>
        <div class="service-title"><span>WEATHERGUARD ACCOUNT</span><h1>เข้าสู่ระบบ</h1></div>
        <a class="service-back" href="{{ route('home') }}"><span aria-hidden="true">←</span> ภาพรวม</a>
    </header>

    <main class="service-main">
        <section class="auth-layout" id="auth-panel">
            <div class="auth-intro">
                <span class="service-eyebrow">WEATHERGUARD ACCOUNT</span>
                <h2>ติดตามอากาศ<br>ในแบบของคุณ</h2>
                <p>เข้าสู่ระบบเพื่อใช้บริการ WeatherGuard และรับ Token สำหรับ API</p>
                <div class="auth-rule"><span>01</span><div><strong>ข้อมูลส่วนตัว</strong><small>ยืนยันตัวตนผ่าน API</small></div></div>
                <div class="auth-rule"><span>02</span><div><strong>พื้นที่ติดตาม</strong><small>จัดการข้อมูลผ่าน WeatherGuard API</small></div></div>
            </div>
            <section class="auth-form-panel">
                <span class="service-eyebrow" id="auth-kicker">SIGN IN</span>
                <h2 id="auth-heading">เข้าสู่ระบบ</h2>
                <p class="auth-notice" id="auth-notice" role="status" hidden></p>
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

    </main>
</body>
</html>