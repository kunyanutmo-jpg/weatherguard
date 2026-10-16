<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HazardController;
use App\Http\Controllers\Api\HazardAlertController;
use App\Http\Controllers\Api\TrackedLocationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user(); ///ds
    });

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::apiResource('tracked-locations', TrackedLocationController::class);
    Route::get('/hazards', [HazardController::class, 'events']); //พื้นที่เสี่ยงภัย
    Route::get('/risk-areas', [HazardController::class, 'riskAreas']); //ภัยพิบัติ
    Route::get('/alerts', [HazardAlertController::class, 'index']); //แจ้งเตือน
    Route::patch('/alerts/{alert}/read', [HazardAlertController::class, 'markRead']); //อ่านแจ้งทีละรายการ
    Route::post('/alerts/read-all', [HazardAlertController::class, 'markAllRead']); //อ่านทั้งหมด
});
