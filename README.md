# WeatherGuard

WeatherGuard เป็นเว็บแอปติดตามสภาพอากาศและเฝ้าระวังภัยธรรมชาติ สร้างด้วย Laravel 12 และ PHP 8.2 ขึ้นไป หน้า `/map` ใช้ Open-Meteo และข้อมูลภูมิศาสตร์ไทยแบบ MIT; พื้นที่ที่ติดตามและ inbox แจ้งเตือนสำหรับบัญชีที่เข้าสู่ระบบอ่านจากฐานข้อมูล ส่วนผู้เยี่ยมชมยังเห็นข้อมูลตัวอย่างบน Dashboard

## ข้อกำหนด

- PHP 8.2 ขึ้นไป พร้อม extensions: cURL, Fileinfo, Mbstring, OpenSSL, PDO MySQL และ ZIP
- Composer 2
- Node.js 18 ขึ้นไป และ npm

### Laragon บน Windows

เลือก PHP 8.4.26 ได้จาก Laragon > PHP > Version > `php-8.4.26-Win32-vs17-x64` แล้วเปิด terminal ใหม่และตรวจด้วย `php -v` โปรเจกต์เดิมยังใช้ PHP 8.1 ได้ แต่ Laravel 12 ต้องใช้ PHP 8.2 ขึ้นไป

## เริ่มใช้งาน

```powershell
composer install
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
npm.cmd run build
php artisan serve
```

กำหนดค่าฐานข้อมูลใน `.env` ก่อนใช้งานฟีเจอร์ที่ต้องบันทึกข้อมูล จากนั้นเปิด `http://127.0.0.1:8000`
หลังตั้งค่าฐานข้อมูลให้รัน `php artisan migrate` ด้วย สำหรับส่งอีเมลรีเซ็ตรหัสผ่านให้ตั้ง `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` และ `MAIL_FROM_ADDRESS` ใน `.env` (ในเครื่องพัฒนาสามารถใช้ `MAIL_MAILER=log` เพื่อดู reset link ใน Laravel log)

## API

หน้า `/login` มีฟอร์มสมัครสมาชิกและเข้าสู่ระบบ เมื่อสมัครสำเร็จจะกลับมาหน้า login เพื่อให้ผู้ใช้เข้าสู่ระบบเอง โดย `POST /api/register` สร้างบัญชีแต่ไม่ออก token; `POST /api/login` ตรวจสอบบัญชีและออก Bearer token; `POST /api/logout` เพิกถอน token ปัจจุบัน และ `GET /api/user` ใช้ตรวจสอบผู้ใช้ที่ล็อกอินอยู่ หน้า `/forgot-password` ส่งลิงก์ reset ผ่าน Laravel password broker และหน้า `/reset-password/{token}` เปลี่ยนรหัสผ่านหลังตรวจ token

จัดการพื้นที่ติดตามโดยส่ง `Authorization: Bearer <token>`:

- `GET /api/tracked-locations` อ่านพื้นที่ของผู้ใช้ปัจจุบันทั้งหมด
- `GET /api/tracked-locations/{id}` อ่านพื้นที่ตาม ID (ต้องเป็นเจ้าของ)
- `POST /api/tracked-locations` เพิ่มพื้นที่
- `PUT/PATCH /api/tracked-locations/{id}` แก้ข้อมูลพื้นที่
- `DELETE /api/tracked-locations/{id}` ลบพื้นที่

หน้า `/locations` ใช้ token จากการเข้าสู่ระบบเพื่ออ่านรายการ, อ่านตาม ID, เพิ่ม, แก้ไข และลบตำแหน่งติดตามได้ ข้อมูลใน Dashboard ของผู้ใช้ที่เข้าสู่ระบบจะอ่านจากตำแหน่งเหล่านี้ ส่วนผู้เยี่ยมชมยังเห็น Dashboard ตัวอย่าง

ระบบติดตามภัยใช้ `hazard_events` สำหรับเหตุการณ์ที่มีพิกัด รัศมี ระดับความรุนแรง ช่วงเวลา และแหล่งข้อมูล และ `risk_areas` สำหรับพื้นที่เฝ้าระวังที่มีวันหมดอายุ ทั้งสองชุดเป็นข้อมูลจากแหล่งที่เชื่อถือได้และมี `source_key` สำหรับป้องกันรายการซ้ำ API อ่านข้อมูลเหล่านี้ได้เมื่อเข้าสู่ระบบแล้ว:

- `GET /api/hazards` อ่านเหตุการณ์ที่ยังมีผล
- `GET /api/risk-areas` อ่านพื้นที่เสี่ยงที่ยังมีผล
- `GET /api/alerts` ประเมินเหตุการณ์และพื้นที่เสี่ยงกับรัศมีของตำแหน่งติดตามที่เปิด `alert_enabled` แล้วสร้าง inbox เตือนแบบไม่ซ้ำ พร้อมจำนวนที่ยังไม่อ่าน
- `PATCH /api/alerts/{id}/read` อ่านการเตือนหนึ่งรายการ
- `POST /api/alerts/read-all` อ่านการเตือนทั้งหมด

การเตือนคำนวณจากระยะทางเส้นตรงระหว่างพิกัดจุดกับวงรัศมี ไม่ใช่การวิเคราะห์แนวเขตภูมิศาสตร์หรือการยืนยันผลกระทบจริง ไม่มีการสร้างข้อมูลภัยปลอมในระบบ; ให้นำเข้ารายการจากแหล่งที่ตรวจสอบแล้วด้วยคำสั่ง `php artisan hazards:import path/to/feed.json` รูปแบบ JSON มี `events` และ/หรือ `risk_areas`; แต่ละรายการต้องมี `source_key`, พิกัด, รัศมี และชื่อแหล่งข้อมูล โดย `source_key` ใช้สำหรับอัปเดตข้อมูลเดิมเมื่อ import ซ้ำ แนวโน้มฝน Open-Meteo ไม่ใช่ประกาศเตือนภัยทางการ

ระบบดึงแผ่นดินไหวรอบประเทศไทยจาก USGS โดยใช้ `php artisan hazards:sync-earthquakes` (ดึงย้อนหลัง 7 วัน; ปรับได้ด้วย `--days=1` ถึง `--days=7`) และตั้งเวลาให้อัปเดตทุก 15 นาทีผ่าน Laravel Scheduler ให้เปิด `php artisan schedule:work` ระหว่างพัฒนา รัศมีและระดับแจ้งเตือนคำนวณจากขนาดแผ่นดินไหวเพื่อคัดกรองเบื้องต้นเท่านั้น ไม่ใช่ระยะการรับรู้แรงสั่นสะเทือนหรือประกาศเตือนภัยอย่างเป็นทางการ

ระบบดึงเหตุการณ์น้ำท่วมและพายุหมุนเขตร้อนที่เกี่ยวข้องกับประเทศไทยจาก GDACS ด้วย `php artisan hazards:sync-flood-storms` โดยเลือกเหตุระดับ Yellow ขึ้นไปที่ระบุประเทศไทยเป็นพื้นที่ได้รับผลหรืออยู่ในระยะภูมิภาคที่กำหนด และตั้งให้อัปเดตทุก 15 นาทีเช่นกัน รัศมีเป็นเกณฑ์คัดกรองเบื้องต้นจากระดับเตือนของ GDACS ไม่ใช่ขอบเขตน้ำท่วมหรือแนวพายุจริง

ตัวอย่างโครงสร้าง feed:

```json
{
	"events": [{
		"source_key": "agency:event-123",
		"hazard_type": "flood",
		"title": "น้ำท่วมในพื้นที่ชายแดน",
		"severity": "high",
		"country": "เมียนมา",
		"province": "เชียงราย",
		"latitude": 20.45,
		"longitude": 99.88,
		"radius_km": 30,
		"source_name": "ชื่อหน่วยงาน",
		"source_url": "https://example.org/notice/123",
		"starts_at": "2026-10-12T08:00:00+07:00",
		"ends_at": "2026-10-12T20:00:00+07:00"
	}],
	"risk_areas": []
}
```

ตัวอย่างเพิ่มพื้นที่:

```json
{
	"name": "บ้าน",
	"province": "กรุงเทพมหานคร",
	"district": "พระนคร",
	"latitude": 13.7563,
	"longitude": 100.5018,
	"alert_enabled": true,
	"temperature_threshold": 38
}
```

## ตรวจสอบ

```powershell
php artisan test
composer audit --locked
```

<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

You may also try the [Laravel Bootcamp](https://bootcamp.laravel.com), where you will be guided through building a modern Laravel application from scratch.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com/)**
- **[Tighten Co.](https://tighten.co)**
- **[WebReinvent](https://webreinvent.com/)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel/)**
- **[Cyber-Duck](https://cyber-duck.co.uk)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Jump24](https://jump24.co.uk)**
- **[Redberry](https://redberry.international/laravel/)**
- **[Active Logic](https://activelogic.com)**
- **[byte5](https://byte5.de)**
- **[OP.GG](https://op.gg)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
