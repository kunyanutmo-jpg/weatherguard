<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#eef4f4">
    <title>ตั้งรหัสผ่านใหม่ | WeatherGuard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite('resources/js/password-reset.js')
</head>
<body class="auth-page password-recovery-page">
    <header class="service-topbar">
        <a class="service-brand" href="{{ route('home') }}" aria-label="กลับหน้าภาพรวม">
            <span class="service-brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/></svg></span>
            <span>weather<span>guard</span><small>WEATHER INTELLIGENCE</small></span>
        </a>
        <div class="service-title"><span>WEATHERGUARD ACCOUNT</span><h1>ตั้งรหัสผ่านใหม่</h1></div>
        <a class="service-back" href="{{ route('login') }}"><span aria-hidden="true">←</span> เข้าสู่ระบบ</a>
    </header>
    <main class="service-main">
        <section class="auth-layout recovery-layout">
            <div class="auth-intro password-recovery-intro">
                <span class="service-eyebrow">ACCOUNT RECOVERY</span>
                <h2>กู้คืนการเข้าใช้<br>WeatherGuard</h2>
                <p>ยืนยันอีเมลที่ใช้สมัคร แล้วตั้งรหัสผ่านใหม่เพื่อกลับไปติดตามสภาพอากาศและพื้นที่ของคุณ</p>
                <div class="auth-rule"><span>01</span><div><strong>ขอลิงก์รีเซ็ตรหัสผ่าน</strong><small>ระบบจะส่งไปยังอีเมลที่ลงทะเบียนไว้</small></div></div>
                <div class="auth-rule"><span>02</span><div><strong>ตั้งรหัสผ่านใหม่</strong><small>เปิดลิงก์ในอีเมลภายในเวลาที่กำหนด</small></div></div>
            </div>
            <section class="auth-form-panel recovery-form-panel">
                <span class="service-eyebrow">PASSWORD RECOVERY</span>
                <h2>ขอลิงก์ตั้งรหัสผ่าน</h2>
                <p class="recovery-description">กรอกอีเมลของบัญชี WeatherGuard แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้</p>
                @if (session('status'))
                    <p class="auth-notice" role="status">{{ session('status') }}</p>
                @endif
                @if ($errors->any())
                    <p class="form-error" role="alert">{{ $errors->first() }}</p>
                @endif
                <form method="POST" action="{{ route('password.email') }}">
                    @csrf
                    <label for="recovery-email">อีเมลที่ใช้สมัคร</label>
                    <input id="recovery-email" name="email" type="email" value="{{ old('email') }}" placeholder="name@example.com" autocomplete="email" required maxlength="255">
                    <button class="primary-button recovery-submit" type="submit">ส่งลิงก์รีเซ็ตรหัสผ่าน</button>
                </form>
                <p class="auth-switch"><a href="{{ route('login') }}"><span aria-hidden="true">←</span> กลับไปเข้าสู่ระบบ</a></p>
            </section>
        </section>
    </main>
</body>
</html>