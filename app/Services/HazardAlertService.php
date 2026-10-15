<?php

namespace App\Services;

use App\Models\HazardAlert;
use App\Models\HazardEvent;
use App\Models\RiskArea;
use App\Models\User;

class HazardAlertService
{
    public function syncForUser(User $user): void
    {
        $locations = $user->trackedLocations()->where('alert_enabled', true)->get();
        if ($locations->isEmpty()) {
            return;
        }

        foreach (HazardEvent::active()->get() as $event) {
            foreach ($locations as $location) {
                if ($this->distanceKm($location->latitude, $location->longitude, $event->latitude, $event->longitude) > $event->radius_km) {
                    continue;
                }

                $this->storeAlert($user->id, $location->id, 'event', $event->id, [
                    'hazard_event_id' => $event->id,
                    'severity' => $event->severity,
                    'title' => $event->title,
                    'message' => "{$location->name} อยู่ในรัศมี {$event->radius_km} กม. ของเหตุภัย",
                ]);
            }
        }

        foreach (RiskArea::active()->get() as $area) {
            foreach ($locations as $location) {
                if ($this->distanceKm($location->latitude, $location->longitude, $area->latitude, $area->longitude) > $area->radius_km) {
                    continue;
                }

                $this->storeAlert($user->id, $location->id, 'risk-area', $area->id, [
                    'risk_area_id' => $area->id,
                    'severity' => $area->risk_level,
                    'title' => "พื้นที่เสี่ยง: {$area->name}",
                    'message' => "{$location->name} อยู่ในพื้นที่เฝ้าระวังรัศมี {$area->radius_km} กม.",
                ]);
            }
        }
    }

    private function storeAlert(int $userId, int $locationId, string $sourceType, int $sourceId, array $attributes): void
    {
        $dedupeKey = hash('sha256', implode(':', [$userId, $locationId, $sourceType, $sourceId]));
        HazardAlert::firstOrCreate(
            ['dedupe_key' => $dedupeKey],
            ['user_id' => $userId, 'tracked_location_id' => $locationId] + $attributes,
        );
    }

    private function distanceKm(float $latitude, float $longitude, float $otherLatitude, float $otherLongitude): float
    {
        $latitudeDelta = deg2rad($otherLatitude - $latitude);
        $longitudeDelta = deg2rad($otherLongitude - $longitude);
        $a = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($latitude)) * cos(deg2rad($otherLatitude)) * sin($longitudeDelta / 2) ** 2;

        return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}