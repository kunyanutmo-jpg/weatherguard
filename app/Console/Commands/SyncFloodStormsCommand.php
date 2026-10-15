<?php

namespace App\Console\Commands;

use App\Models\HazardEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

class SyncFloodStormsCommand extends Command
{
    protected $signature = 'hazards:sync-flood-storms {--days=7 : Number of past days to sync (1-7)}';

    protected $description = 'Sync Thailand-relevant floods and tropical cyclones from GDACS';

    public function handle(): int
    {
        $days = filter_var($this->option('days'), FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1, 'max_range' => 7],
        ]);
        if ($days === false) {
            $this->error('The --days option must be between 1 and 7.');

            return self::INVALID;
        }

        try {
            $feed = Http::acceptJson()->timeout(20)->get(
                'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH',
                [
                    'eventlist' => 'FL,TC',
                    'fromdate' => now('UTC')->subDays($days)->toDateString(),
                    'todate' => now('UTC')->toDateString(),
                ],
            )->throw()->json();
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Could not retrieve flood and storm data from GDACS.');

            return self::FAILURE;
        }

        $features = $feed['features'] ?? [];
        $imported = 0;
        DB::transaction(function () use ($features, &$imported): void {
            foreach ($features as $feature) {
                $properties = $feature['properties'] ?? [];
                $coordinates = $feature['geometry']['coordinates'] ?? [];
                $eventType = $properties['eventtype'] ?? null;
                $eventId = $properties['eventid'] ?? null;
                $alertLevel = strtolower((string) ($properties['alertlevel'] ?? ''));

                if (!in_array($eventType, ['FL', 'TC'], true) || !is_numeric($eventId)
                    || !in_array($alertLevel, ['yellow', 'orange', 'red'], true)
                    || count($coordinates) < 2 || !is_numeric($coordinates[0]) || !is_numeric($coordinates[1])
                    || !$this->affectsThailand($properties, (float) $coordinates[1], (float) $coordinates[0], $eventType)) {
                    continue;
                }

                try {
                    $startsAt = Carbon::parse($properties['fromdate'] ?? null, 'UTC');
                    $endsAt = filled($properties['todate'] ?? null)
                        ? Carbon::parse($properties['todate'], 'UTC')
                        : $startsAt->copy()->addDay();
                } catch (Throwable) {
                    continue;
                }

                $isCurrent = filter_var($properties['iscurrent'] ?? false, FILTER_VALIDATE_BOOLEAN);
                $hazardType = $eventType === 'FL' ? 'flood' : 'storm';
                $severity = $this->severityForAlertLevel($alertLevel);
                $name = trim((string) ($properties['name'] ?? $properties['description'] ?? ''));
                $title = $name !== '' ? $name : ($hazardType === 'flood' ? 'น้ำท่วม' : 'พายุหมุนเขตร้อน');
                $severityText = $properties['severitydata']['severitytext'] ?? null;
                $description = implode(' · ', array_filter([
                    $properties['description'] ?? null,
                    $severityText,
                    'พื้นที่และรัศมีเป็นการประเมินจาก GDACS ไม่ใช่ประกาศเตือนภัยทางการ',
                ]));
                $url = $properties['url']['report'] ?? $properties['url']['details'] ?? null;

                HazardEvent::updateOrCreate(
                    ['source_key' => "gdacs:{$eventType}:{$eventId}"],
                    [
                        'hazard_type' => $hazardType,
                        'title' => mb_substr($title, 0, 160),
                        'description' => $description,
                        'severity' => $severity,
                        'country' => $properties['country'] ?? null,
                        'province' => null,
                        'latitude' => (float) $coordinates[1],
                        'longitude' => (float) $coordinates[0],
                        'radius_km' => $this->alertRadius($eventType, $alertLevel),
                        'source_name' => 'GDACS'.(empty($properties['source']) ? '' : ' · '.$properties['source']),
                        'source_url' => $url,
                        'status' => $isCurrent && $endsAt->isFuture() ? 'active' : 'resolved',
                        'starts_at' => $startsAt,
                        'ends_at' => $endsAt,
                    ],
                );
                $imported++;
            }
        });

        $this->info(sprintf('Synced %d Thailand-relevant flood and storm events from GDACS.', $imported));

        return self::SUCCESS;
    }

    private function affectsThailand(array $properties, float $latitude, float $longitude, string $eventType): bool
    {
        foreach ($properties['affectedcountries'] ?? [] as $country) {
            if (($country['iso3'] ?? null) === 'THA') {
                return true;
            }
        }

        if (strtolower((string) ($properties['country'] ?? '')) === 'thailand') {
            return true;
        }

        $radiusKm = $eventType === 'TC' ? 1500 : 800;

        return $this->distanceKm(15.5, 101, $latitude, $longitude) <= $radiusKm;
    }

    private function distanceKm(float $latitude, float $longitude, float $otherLatitude, float $otherLongitude): float
    {
        $latitudeDelta = deg2rad($otherLatitude - $latitude);
        $longitudeDelta = deg2rad($otherLongitude - $longitude);
        $a = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($latitude)) * cos(deg2rad($otherLatitude)) * sin($longitudeDelta / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function severityForAlertLevel(string $alertLevel): string
    {
        return match ($alertLevel) {
            'red' => 'critical',
            'orange' => 'high',
            default => 'watch',
        };
    }

    private function alertRadius(string $eventType, string $alertLevel): int
    {
        if ($eventType === 'TC') {
            return match ($alertLevel) {
                'red' => 800,
                'orange' => 500,
                default => 300,
            };
        }

        return match ($alertLevel) {
            'red' => 300,
            'orange' => 200,
            default => 100,
        };
    }
}