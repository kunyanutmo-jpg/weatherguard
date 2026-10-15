<?php

namespace App\Console\Commands;

use App\Models\HazardEvent;
use App\Models\RiskArea;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use JsonException;

class ImportHazardsCommand extends Command
{
    protected $signature = 'hazards:import {file : JSON file from a trusted source}';

    protected $description = 'Import trusted hazard events and risk areas from a JSON feed';

    public function handle(): int
    {
        $path = realpath($this->argument('file'));
        if (!$path || !is_file($path) || !is_readable($path)) {
            $this->error('The feed file does not exist or cannot be read.');

            return self::FAILURE;
        }

        try {
            $feed = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $this->error('The feed file must contain valid JSON.');

            return self::FAILURE;
        }

        if (!is_array($feed) || array_is_list($feed)) {
            $this->error('The feed root must be a JSON object.');

            return self::FAILURE;
        }

        $validated = Validator::make($feed, [
            'events' => ['sometimes', 'array'],
            'events.*.source_key' => ['required', 'string', 'max:255'],
            'events.*.hazard_type' => ['required', 'string', 'max:50'],
            'events.*.title' => ['required', 'string', 'max:160'],
            'events.*.description' => ['nullable', 'string'],
            'events.*.severity' => ['required', Rule::in(['low', 'watch', 'medium', 'high', 'critical'])],
            'events.*.country' => ['nullable', 'string', 'max:100'],
            'events.*.province' => ['nullable', 'string', 'max:100'],
            'events.*.latitude' => ['required', 'numeric', 'between:-90,90'],
            'events.*.longitude' => ['required', 'numeric', 'between:-180,180'],
            'events.*.radius_km' => ['required', 'integer', 'between:1,60000'],
            'events.*.source_name' => ['required', 'string', 'max:120'],
            'events.*.source_url' => ['nullable', 'url', 'max:2048'],
            'events.*.status' => ['sometimes', Rule::in(['active', 'resolved', 'cancelled'])],
            'events.*.starts_at' => ['required', 'date'],
            'events.*.ends_at' => ['nullable', 'date', 'after:events.*.starts_at'],
            'risk_areas' => ['sometimes', 'array'],
            'risk_areas.*.source_key' => ['required', 'string', 'max:255'],
            'risk_areas.*.hazard_type' => ['required', 'string', 'max:50'],
            'risk_areas.*.name' => ['required', 'string', 'max:160'],
            'risk_areas.*.country' => ['nullable', 'string', 'max:100'],
            'risk_areas.*.province' => ['nullable', 'string', 'max:100'],
            'risk_areas.*.district' => ['nullable', 'string', 'max:100'],
            'risk_areas.*.latitude' => ['required', 'numeric', 'between:-90,90'],
            'risk_areas.*.longitude' => ['required', 'numeric', 'between:-180,180'],
            'risk_areas.*.radius_km' => ['required', 'integer', 'between:1,60000'],
            'risk_areas.*.risk_level' => ['required', Rule::in(['low', 'watch', 'medium', 'high', 'critical'])],
            'risk_areas.*.source_name' => ['required', 'string', 'max:120'],
            'risk_areas.*.source_url' => ['nullable', 'url', 'max:2048'],
            'risk_areas.*.valid_from' => ['nullable', 'date'],
            'risk_areas.*.valid_until' => ['nullable', 'date'],
        ])->validate();

        $events = $validated['events'] ?? [];
        $riskAreas = $validated['risk_areas'] ?? [];
        DB::transaction(function () use ($events, $riskAreas): void {
            foreach ($events as $event) {
                HazardEvent::updateOrCreate(
                    ['source_key' => $event['source_key']],
                    Arr::except($event, ['source_key']),
                );
            }

            foreach ($riskAreas as $riskArea) {
                RiskArea::updateOrCreate(
                    ['source_key' => $riskArea['source_key']],
                    Arr::except($riskArea, ['source_key']),
                );
            }
        });

        $this->info(sprintf('Imported %d hazard events and %d risk areas.', count($events), count($riskAreas)));

        return self::SUCCESS;
    }
}