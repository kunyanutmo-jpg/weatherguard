<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HazardAlert extends Model
{
    protected $fillable = [
        'user_id', 'tracked_location_id', 'hazard_event_id', 'risk_area_id',
        'dedupe_key', 'severity', 'title', 'message', 'read_at',
    ];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    public function trackedLocation(): BelongsTo
    {
        return $this->belongsTo(TrackedLocation::class);
    }

    public function hazardEvent(): BelongsTo
    {
        return $this->belongsTo(HazardEvent::class);
    }

    public function riskArea(): BelongsTo
    {
        return $this->belongsTo(RiskArea::class);
    }
}