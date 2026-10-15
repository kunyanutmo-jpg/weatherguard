<!doctype html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#a3201c">
    <title>กำหนดรหัสผ่านใหม่ | WeatherGuard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite('resources/js/password-reset.js')
</head>
<body class="auth-page">
    <header class="service-topbar">
        <a class="service-brand" href="{{ route('home') }}" aria-label="กลับหน้าภาพรวม">
            <span class="service-brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 16.2A4.8 4.8 0 0 0 16.5 8a6.5 6.5 0 0 0-12.2 2.4A4.3 4.3 0 0 0 5 18.9h10.7A4.8 4.8 0 0 0 20 16.2Z"/></svg></span>
            <span>weather<span>guard</span><small>WEATHER INTELLIGENCE</small></span>
        </a>
        <div class="service-title"><span>WEATHERGUARD ACCOUNT</span><h1>กำหนดรหัสผ่านใหม่</h1></div>
        <a class="service-back" href="{{ route('login') }}"><span aria-hidden="true">←</span> เข้าสู่ระบบ</a>
    </header>
    <main class="service-main">
        <section class="auth-layout">
            <div class="auth-intro">
                <span class="service-eyebrow">SECURE YOUR ACCOUNT</span>
                <h2>ตั้งรหัสผ่าน<br>ที่ปลอดภัย</h2>
                <p>ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุตามนโยบายของระบบ</p>
                <div class="auth-rule"><span>02</span><div><strong>ยืนยันตัวตน</strong><small>ระบบตรวจสอบ token ก่อนบันทึกรหัสใหม่</small></div></div>
            </div>
            <section class="auth-form-panel">
                <span class="service-eyebrow">NEW PASSWORD</span>
                <h2>กำหนดรหัสผ่านใหม่</h2>
                @if ($errors->any())
                    <p class="form-error" role="alert">{{ $errors->first() }}</p>
                @endif
                <form method="POST" action="{{ route('password.update') }}">
                    @csrf
                    <input type="hidden" name="token" value="{{ $token }}">
                    <label>อีเมล<input name="email" type="email" value="{{ old('email', $email) }}" autocomplete="email" required maxlength="255"></label>
                    <label>รหัสผ่านใหม่<input name="password" type="password" autocomplete="new-password" required minlength="8"></label>
                    <label>ยืนยันรหัสผ่าน<input name="password_confirmation" type="password" autocomplete="new-password" required minlength="8"></label>
                    <button class="primary-button" type="submit">บันทึกรหัสผ่านใหม่</button>
                </form>
            </section>
        </section>
    </main>
</body>
</html>