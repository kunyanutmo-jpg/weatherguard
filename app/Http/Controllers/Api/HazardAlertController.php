<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HazardAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HazardAlertController extends Controller
{
    public function index(Request $request, HazardAlertService $alertService): JsonResponse
    {
        $user = $request->user();
        $alertService->syncForUser($user);
        $alerts = $user->hazardAlerts()->with(['trackedLocation:id,name,province', 'hazardEvent', 'riskArea'])
            ->latest()->limit(100)->get();

        return response()->json([
            'data' => $alerts,
            'unread_count' => $user->hazardAlerts()->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Request $request, int $alert): JsonResponse
    {
        $record = $request->user()->hazardAlerts()->findOrFail($alert);
        $record->update(['read_at' => now()]);

        return response()->json(['data' => $record->refresh()]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = $request->user()->hazardAlerts()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['updated' => $updated]);
    }
}