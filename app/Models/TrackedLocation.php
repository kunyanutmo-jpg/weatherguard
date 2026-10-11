<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrackedLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'province',
        'district',
        'latitude',
        'longitude',
        'alert_enabled',
        'temperature_threshold',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'alert_enabled' => 'boolean',
            'temperature_threshold' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}