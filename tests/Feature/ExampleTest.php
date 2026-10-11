<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_the_weather_map_page_is_available(): void
    {
        $this->get('/map')
            ->assertOk()
            ->assertSee('แผนที่สภาพอากาศ');
    }

    public function test_login_page_is_available_and_old_service_url_redirects(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertSee('เข้าสู่ระบบ');

        $this->get('/service')->assertRedirect('/login');
    }
}
