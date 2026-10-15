<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hazard_events', function (Blueprint $table) {
            $table->id();
            $table->string('source_key')->unique();
            $table->string('hazard_type', 50);
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->string('severity', 20);
            $table->string('country', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedSmallInteger('radius_km');
            $table->string('source_name', 120);
            $table->string('source_url', 2048)->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'starts_at', 'ends_at']);
        });

        Schema::create('risk_areas', function (Blueprint $table) {
            $table->id();
            $table->string('source_key')->unique();
            $table->string('hazard_type', 50);
            $table->string('name', 160);
            $table->string('country', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('district', 100)->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedSmallInteger('radius_km');
            $table->string('risk_level', 20);
            $table->string('source_name', 120);
            $table->string('source_url', 2048)->nullable();
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->timestamps();
            $table->index(['risk_level', 'valid_from', 'valid_until']);
        });

        Schema::create('hazard_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tracked_location_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hazard_event_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('risk_area_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('dedupe_key')->unique();
            $table->string('severity', 20);
            $table->string('title', 160);
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hazard_alerts');
        Schema::dropIfExists('risk_areas');
        Schema::dropIfExists('hazard_events');
    }
};