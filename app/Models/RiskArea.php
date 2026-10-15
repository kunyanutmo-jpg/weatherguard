<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class RiskArea extends Model
{
    protected $fillable = [
        'source_key', 'hazard_type', 'name', 'country', 'province', 'district',
        'latitude', 'longitude', 'radius_km', 'risk_level', 'source_name',
        'source_url', 'valid_from', 'valid_until',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'radius_km' => 'integer',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
        ];
    }

    public function scopeActive(Builder $query): void
    {
        $query->where(fn (Builder $query) => $query->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('valid_until')->orWhere('valid_until', '>', now()));
    }
}