<?php

namespace App\Console\Commands;

use App\Models\HazardEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

class SyncEarthquakesCommand extends Command
{
    protected $signature = 'hazards:sync-earthquakes {--days=7 : Number of past days to sync (1-7)}';

    protected $description = 'Sync recent earthquakes near Thailand from the USGS GeoJSON feed';

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
                'https://earthquake.usgs.gov/fdsnws/event/1/query',
                [
                    'format' => 'geojson',
                    'starttime' => now('UTC')->subDays($days)->toIso8601String(),
                    'latitude' => 15.5,
                    'longitude' => 101,
                    'maxradiuskm' => 1500,
                    'minmagnitude' => 3.5,
                    'eventtype' => 'earthquake',
                    'orderby' => 'time',
                    'limit' => 2000,
                ],
            )->throw()->json();
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Could not retrieve earthquake data from USGS.');

            return self::FAILURE;
        }

        $features = $feed['features'] ?? [];
        $imported = 0;
        DB::transaction(function () use ($features, &$imported): void {
            foreach ($features as $feature) {
                $properties = $feature['properties'] ?? [];
                $coordinates = $feature['geometry']['coordinates'] ?? [];
                $sourceId = $feature['id'] ?? null;
                $magnitude = $properties['mag'] ?? null;
                $timestamp = $properties['time'] ?? null;

                if (!is_string($sourceId) || !is_numeric($magnitude) || (float) $magnitude < 3.5
                    || !is_numeric($timestamp) || count($coordinates) < 2
                    || !is_numeric($coordinates[0]) || !is_numeric($coordinates[1])) {
                    continue;
                }

                $magnitude = (float) $magnitude;
                $startsAt = Carbon::createFromTimestamp((int) floor((float) $timestamp / 1000), 'UTC');
                $endsAt = $startsAt->copy()->addHours(24);
                $place = trim((string) ($properties['place'] ?? 'ไม่ระบุพื้นที่'));
                $depth = isset($coordinates[2]) && is_numeric($coordinates[2]) ? (float) $coordinates[2] : null;
                $description = sprintf(
                    'แผ่นดินไหวขนาด M%.1f%s ที่ %s; รัศมีแจ้งเตือนเป็นการประเมินเบื้องต้น',
                    $magnitude,
                    $depth === null ? '' : sprintf(' ลึก %.1f กม.', $depth),
                    $place,
                );

                HazardEvent::updateOrCreate(
                    ['source_key' => "usgs:{$sourceId}"],
                    [
                        'hazard_type' => 'earthquake',
                        'title' => sprintf('แผ่นดินไหว M%.1f · %s', $magnitude, $place),
                        'description' => $description,
                        'severity' => $this->severityForMagnitude($magnitude),
                        'country' => null,
                        'province' => null,
                        'latitude' => (float) $coordinates[1],
                        'longitude' => (float) $coordinates[0],
                        'radius_km' => $this->alertRadiusForMagnitude($magnitude),
                        'source_name' => 'USGS Earthquake Hazards Program',
                        'source_url' => $properties['url'] ?? null,
                        'status' => $endsAt->isFuture() ? 'active' : 'resolved',
                        'starts_at' => $startsAt,
                        'ends_at' => $endsAt,
                    ],
                );
                $imported++;
            }
        });

        $this->info(sprintf('Synced %d earthquake events from USGS.', $imported));

        return self::SUCCESS;
    }

    private function severityForMagnitude(float $magnitude): string
    {
        return match (true) {
            $magnitude >= 6.5 => 'critical',
            $magnitude >= 5.5 => 'high',
            $magnitude >= 4.5 => 'medium',
            default => 'watch',
        };
    }

    private function alertRadiusForMagnitude(float $magnitude): int
    {
        return match (true) {
            $magnitude >= 7 => 600,
            $magnitude >= 6 => 400,
            $magnitude >= 5 => 250,
            $magnitude >= 4 => 150,
            default => 75,
        };
    }
}