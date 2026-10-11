# WeatherGuard

แดชบอร์ดติดตามสภาพอากาศและประกาศภัยธรรมชาติ สร้างด้วย Laravel 12 และ PHP 8.2 ขึ้นไป หน้า `/map` ใช้อุณหภูมิปัจจุบันจาก Open-Meteo และข้อมูลจังหวัด/อำเภอแบบ MIT; อำเภอที่ไม่มีพิกัดเฉพาะใช้จุดพยากรณ์ระดับจังหวัดและแสดงเครื่องหมาย `~` ส่วนการ์ดอากาศและเหตุการณ์บนหน้าภาพรวมยังเป็นข้อมูลสาธิต และยังไม่ได้เชื่อมระบบส่งแจ้งเตือนจริง

## ข้อกำหนด

- PHP 8.2 ขึ้นไป พร้อม extensions: cURL, Fileinfo, Mbstring, OpenSSL, PDO MySQL และ ZIP
- Composer 2
- Node.js 18 ขึ้นไป และ npm

### Laragon บน Windows

เลือก PHP 8.4.26 ได้จาก Laragon > PHP > Version > `php-8.4.26-Win32-vs17-x64` แล้วเปิด terminal ใหม่และตรวจด้วย `php -v` โปรเจกต์เดิมยังใช้ PHP 8.1 ได้ แต่ Laravel 12 ต้องใช้ PHP 8.2 ขึ้นไป

## เริ่มใช้งาน

```powershell
composer install
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
npm run build
php artisan serve
```

กำหนดค่าฐานข้อมูลใน `.env` ก่อนใช้งานฟีเจอร์ที่ต้องบันทึกข้อมูล จากนั้นเปิด `http://127.0.0.1:8000`

## API

ทุก endpoint ส่งและรับ JSON โดย `POST /api/register` สร้างบัญชีและออก Bearer token, `POST /api/login` ออก token สำหรับบัญชีเดิม และ `POST /api/logout` เพิกถอน token ปัจจุบัน ส่วน `GET /api/user` ใช้ตรวจสอบผู้ใช้ที่ล็อกอินอยู่

จัดการพื้นที่ติดตามโดยส่ง `Authorization: Bearer <token>`:

- `GET /api/tracked-locations` อ่านพื้นที่ของผู้ใช้ปัจจุบันทั้งหมด
- `GET /api/tracked-locations/{id}` อ่านพื้นที่ตาม ID (ต้องเป็นเจ้าของ)
- `POST /api/tracked-locations` เพิ่มพื้นที่
- `PUT/PATCH /api/tracked-locations/{id}` แก้ข้อมูลพื้นที่
- `DELETE /api/tracked-locations/{id}` ลบพื้นที่

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
