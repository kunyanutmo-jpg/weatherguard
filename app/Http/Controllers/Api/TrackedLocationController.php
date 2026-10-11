<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrackedLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrackedLocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->trackedLocations()->latest()->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'alert_enabled' => ['sometimes', 'boolean'],
            'temperature_threshold' => ['nullable', 'numeric', 'between:-50,60'],
        ]);

        $location = $request->user()->trackedLocations()->create($validated);

        return response()->json(['data' => $location], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->trackedLocations()->findOrFail($id),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $location = $request->user()->trackedLocations()->findOrFail($id);
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'province' => ['sometimes', 'required', 'string', 'max:100'],
            'district' => ['sometimes', 'nullable', 'string', 'max:100'],
            'latitude' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'alert_enabled' => ['sometimes', 'boolean'],
            'temperature_threshold' => ['sometimes', 'nullable', 'numeric', 'between:-50,60'],
        ]);

        $location->update($validated);

        return response()->json(['data' => $location->refresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $location = $request->user()->trackedLocations()->findOrFail($id);
        $location->delete();

        return response()->json(null, 204);
    }
}