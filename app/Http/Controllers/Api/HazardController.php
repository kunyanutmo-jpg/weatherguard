<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HazardEvent;
use App\Models\RiskArea;
use Illuminate\Http\JsonResponse;

class HazardController extends Controller
{
    public function events(): JsonResponse
    {
        return response()->json([
            'data' => HazardEvent::active()->latest('starts_at')->limit(500)->get(),
            'latest' => HazardEvent::where('starts_at', '<=', now())->latest('starts_at')->first(),
        ]);
    }

    public function riskAreas(): JsonResponse
    {
        return response()->json([
            'data' => RiskArea::active()->orderByDesc('risk_level')->limit(500)->get(),
        ]);
    }
}