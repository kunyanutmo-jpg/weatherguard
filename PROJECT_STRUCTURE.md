# Project Structure

WeatherGuard follows the Laravel MVC layout from class where it fits. The application uses Laravel 12, Blade, Vite, Sanctum, and API controllers. It does not install Jetstream or Livewire, so those feature-specific folders and components are not used.

```text
weatherguard/
├── app/
│   ├── Console/
│   │   ├── Commands/             # Hazard feed import and sync commands
│   │   └── Kernel.php            # Scheduled hazard sync
│   ├── Exceptions/Handler.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/              # Auth, locations, hazards, alerts APIs
│   │   │   ├── Auth/             # Password reset controller
│   │   │   ├── Frontend/         # Controllers for Blade pages
│   │   │   └── Controller.php
│   │   ├── Middleware/
│   │   └── Kernel.php
│   ├── Models/                   # User, tracked locations, hazard records
│   ├── Providers/
│   ├── Services/                 # Alert matching and domain services
│   └── View/Components/
├── bootstrap/app.php
├── config/                       # Laravel, auth, database, mail, etc.
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/DatabaseSeeder.php
├── public/
│   ├── index.php
│   ├── build/                    # Vite production assets
│   └── storage/
├── resources/
│   ├── css/                      # App, map, and service styles
│   ├── js/                       # Dashboard, map, auth, and API behavior
│   └── views/
│       ├── passwords/            # Password reset views
│       ├── locations.blade.php
│       ├── map.blade.php
│       ├── service.blade.php      # Login and registration interface
│       └── welcome.blade.php     # Main dashboard
├── routes/
│   ├── api.php
│   ├── channels.php
│   ├── console.php
│   └── web.php
├── tests/
├── artisan
├── composer.json
├── package.json
├── phpunit.xml
└── vite.config.js
```

## Mapping to the Class Example

- `app/Http/Controllers/Frontend/PageController.php` serves the home, map, locations, and login pages; API actions remain under `Controllers/Api`.
- The instructor's Livewire user-table components are not present because this project manages tracked locations through authenticated JSON API calls instead.
- Fortify and Jetstream actions are not present because authentication uses custom API endpoints with Sanctum.
- AdminLTE, Newsbit, and their source template folders are not included; the current pages use the project's own Blade and Vite assets.
- Empty placeholder folders are omitted from this tree. Add a feature package only when the project actually uses it.