<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}