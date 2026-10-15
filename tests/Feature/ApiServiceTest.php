<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\HazardEvent;
use App\Models\RiskArea;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ApiServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_login_and_logout_manage_bearer_tokens(): void
    {
        $registration = $this->postJson('/api/register', [
            'name' => 'Weather User',
            'email' => 'weather@example.test',
            'password' => 'secure-password',
        ]);

        $registration->assertCreated()
            ->assertJsonMissingPath('token')
            ->assertJsonPath('user.email', 'weather@example.test');

        $login = $this->postJson('/api/login', [
            'email' => 'weather@example.test',
            'password' => 'secure-password',
            'device_name' => 'feature-test-login',
        ]);
        $login->assertOk()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', 'weather@example.test');

        $token = $login->json('token');
        $this->withToken($token)->getJson('/api/user')->assertOk();
        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $tokenId = (int) explode('|', $token, 2)[0];
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);

        $this->postJson('/api/login', [
            'email' => 'weather@example.test',
            'password' => 'incorrect-password',
        ])->assertUnauthorized();
    }

    public function test_tracked_locations_support_owner_scoped_crud(): void
    {
        $owner = User::factory()->create();
        $token = $owner->createToken('feature-test')->plainTextToken;
        $payload = [
            'name' => 'บ้าน',
            'province' => 'กรุงเทพมหานคร',
            'district' => 'พระนคร',
            'latitude' => 13.7563,
            'longitude' => 100.5018,
            'alert_enabled' => true,
            'temperature_threshold' => 38,
        ];

        $this->getJson('/api/tracked-locations')->assertUnauthorized();

        $this->withToken($token)->getJson('/api/tracked-locations')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $created = $this->withToken($token)->postJson('/api/tracked-locations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.province', 'กรุงเทพมหานคร');
        $id = $created->json('data.id');

        $this->withToken($token)->getJson("/api/tracked-locations/{$id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'บ้าน');

        $this->withToken($token)->patchJson("/api/tracked-locations/{$id}", [
            'name' => 'บ้านใหม่',
            'alert_enabled' => false,
        ])->assertOk()
            ->assertJsonPath('data.name', 'บ้านใหม่')
            ->assertJsonPath('data.alert_enabled', false);

        $this->withToken($token)->deleteJson("/api/tracked-locations/{$id}")
            ->assertNoContent();
        $this->withToken($token)->getJson("/api/tracked-locations/{$id}")
            ->assertNotFound();
    }

    public function test_users_cannot_read_another_users_tracked_location(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $location = $owner->trackedLocations()->create([
            'name' => 'บ้าน',
            'province' => 'กรุงเทพมหานคร',
            'latitude' => 13.7563,
            'longitude' => 100.5018,
        ]);
        $token = $otherUser->createToken('other-user')->plainTextToken;

        $this->withToken($token)->getJson("/api/tracked-locations/{$location->id}")
            ->assertNotFound();
    }

    public function test_hazard_feeds_create_deduplicated_owner_scoped_alerts(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $token = $owner->createToken('hazard-test')->plainTextToken;
        $location = $owner->trackedLocations()->create([
            'name' => 'บ้านชายแดน',
            'province' => 'เชียงราย',
            'latitude' => 20.45,
            'longitude' => 99.88,
            'alert_enabled' => true,
        ]);
        $event = HazardEvent::create([
            'source_key' => 'test-flood-1',
            'hazard_type' => 'flood',
            'title' => 'น้ำท่วมใกล้ชายแดน',
            'severity' => 'high',
            'country' => 'เมียนมา',
            'province' => 'เชียงราย',
            'latitude' => 20.45,
            'longitude' => 99.88,
            'radius_km' => 30,
            'source_name' => 'หน่วยงานทดสอบ',
            'status' => 'active',
            'starts_at' => now()->subMinute(),
            'ends_at' => now()->addHour(),
        ]);
        RiskArea::create([
            'source_key' => 'test-risk-1',
            'hazard_type' => 'flood',
            'name' => 'ลุ่มน้ำชายแดน',
            'country' => 'ไทย',
            'province' => 'เชียงราย',
            'latitude' => 20.45,
            'longitude' => 99.88,
            'radius_km' => 15,
            'risk_level' => 'watch',
            'source_name' => 'หน่วยงานทดสอบ',
        ]);
        HazardEvent::create([
            'source_key' => 'test-resolved-1',
            'hazard_type' => 'flood',
            'title' => 'เหตุการณ์สิ้นสุดแล้ว',
            'severity' => 'low',
            'latitude' => 20.45,
            'longitude' => 99.88,
            'radius_km' => 30,
            'source_name' => 'หน่วยงานทดสอบ',
            'status' => 'resolved',
            'starts_at' => now()->subDay(),
        ]);

        $this->getJson('/api/hazards')->assertUnauthorized();
        $this->withToken($token)->getJson('/api/hazards')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $event->id);
        $this->withToken($token)->getJson('/api/risk-areas')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $alerts = $this->withToken($token)->getJson('/api/alerts')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('unread_count', 2);
        $firstAlertId = $alerts->json('data.0.id');

        $this->withToken($token)->getJson('/api/alerts')
            ->assertOk()
            ->assertJsonCount(2, 'data');
        $this->assertDatabaseHas('hazard_alerts', [
            'user_id' => $owner->id,
            'tracked_location_id' => $location->id,
            'hazard_event_id' => $event->id,
        ]);

        $otherToken = $otherUser->createToken('other-hazard-test')->plainTextToken;
        $this->withToken($otherToken)->getJson('/api/alerts')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->withToken($otherToken)->patchJson("/api/alerts/{$firstAlertId}/read")
            ->assertNotFound();
        $markedRead = $this->withToken($token)->patchJson("/api/alerts/{$firstAlertId}/read")
            ->assertOk();
        $this->assertNotNull($markedRead->json('data.read_at'));
        $this->withToken($token)->postJson('/api/alerts/read-all')
            ->assertOk()
            ->assertJsonPath('updated', 1);

        $event->update(['status' => 'resolved', 'ends_at' => now()]);
        $this->withToken($token)->getJson('/api/hazards')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('latest.id', $event->id);
    }

    public function test_usgs_earthquake_sync_imports_events_with_magnitude_based_alerts(): void
    {
        Http::fake([
            'earthquake.usgs.gov/*' => Http::response([
                'features' => [[
                    'id' => 'test-quake-1',
                    'properties' => [
                        'mag' => 4.8,
                        'place' => 'Near Chiang Rai, Thailand',
                        'time' => now()->subMinutes(5)->timestamp * 1000,
                        'url' => 'https://earthquake.usgs.gov/earthquakes/eventpage/test-quake-1',
                    ],
                    'geometry' => ['coordinates' => [99.9, 19.9, 10]],
                ]],
            ]),
        ]);

        $this->artisan('hazards:sync-earthquakes')->assertExitCode(0);

        $this->assertDatabaseHas('hazard_events', [
            'source_key' => 'usgs:test-quake-1',
            'hazard_type' => 'earthquake',
            'severity' => 'medium',
            'radius_km' => 150,
            'status' => 'active',
        ]);
    }

    public function test_gdacs_sync_imports_thailand_floods_and_nearby_storms_only(): void
    {
        Http::fake([
            'www.gdacs.org/*' => Http::response([
                'features' => [
                    [
                        'properties' => [
                            'eventtype' => 'FL', 'eventid' => 123, 'alertlevel' => 'Orange',
                            'name' => 'Flood in Thailand', 'description' => 'Flood warning',
                            'country' => 'Thailand', 'iscurrent' => 'true',
                            'fromdate' => now()->subHour()->toIso8601String(),
                            'todate' => now()->addDay()->toIso8601String(),
                            'source' => 'GLOFAS',
                            'url' => ['report' => 'https://www.gdacs.org/report.aspx?eventid=123'],
                            'affectedcountries' => [['iso3' => 'THA']],
                        ],
                        'geometry' => ['coordinates' => [100.5, 13.7]],
                    ],
                    [
                        'properties' => [
                            'eventtype' => 'TC', 'eventid' => 456, 'alertlevel' => 'Red',
                            'name' => 'Tropical Cyclone near Thailand', 'description' => 'Storm warning',
                            'country' => 'Myanmar', 'iscurrent' => 'true',
                            'fromdate' => now()->subHour()->toIso8601String(),
                            'todate' => now()->addDay()->toIso8601String(),
                            'source' => 'NOAA',
                            'affectedcountries' => [['iso3' => 'MMR']],
                        ],
                        'geometry' => ['coordinates' => [99, 18]],
                    ],
                    [
                        'properties' => [
                            'eventtype' => 'FL', 'eventid' => 789, 'alertlevel' => 'Orange',
                            'name' => 'Flood far from Thailand', 'country' => 'Mexico', 'iscurrent' => 'true',
                            'fromdate' => now()->subHour()->toIso8601String(),
                            'todate' => now()->addDay()->toIso8601String(),
                            'affectedcountries' => [['iso3' => 'MEX']],
                        ],
                        'geometry' => ['coordinates' => [-107.6, 20.1]],
                    ],
                ],
            ]),
        ]);

        $this->artisan('hazards:sync-flood-storms')->assertExitCode(0);

        $this->assertDatabaseHas('hazard_events', [
            'source_key' => 'gdacs:FL:123',
            'hazard_type' => 'flood',
            'severity' => 'high',
            'radius_km' => 200,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('hazard_events', [
            'source_key' => 'gdacs:TC:456',
            'hazard_type' => 'storm',
            'severity' => 'critical',
            'radius_km' => 800,
        ]);
        $this->assertDatabaseMissing('hazard_events', ['source_key' => 'gdacs:FL:789']);
    }
}