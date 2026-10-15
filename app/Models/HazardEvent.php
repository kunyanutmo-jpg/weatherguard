<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class HazardEvent extends Model
{
    protected $fillable = [
        'source_key', 'hazard_type', 'title', 'description', 'severity',
        'country', 'province', 'latitude', 'longitude', 'radius_km',
        'source_name', 'source_url', 'status', 'starts_at', 'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'radius_km' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }
}