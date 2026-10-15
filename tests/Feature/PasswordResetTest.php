<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_and_use_a_password_reset_link(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'reset@example.test']);

        $this->get('/forgot-password')->assertOk();
        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect()
            ->assertSessionHas('status');

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });
        $this->assertNotNull($token);

        $this->get(route('password.reset', ['token' => $token, 'email' => $user->email]))->assertOk();
        $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertRedirect(route('login'))
            ->assertSessionHas('status');

        $this->assertTrue(Hash::check('new-secure-password', $user->refresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'new-secure-password',
        ])->assertOk();
    }
}