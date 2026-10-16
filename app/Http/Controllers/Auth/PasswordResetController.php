<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\View\View;

class PasswordResetController extends Controller
{
    public function requestForm(): View
    {
        return view('passwords.email');
    }

    public function sendLink(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:255']]);
        $redirect = back()->with('status', 'หากอีเมลนี้ลงทะเบียนไว้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้');

        if (app()->environment('local') && config('mail.default') === 'log') {
            $resetUrl = null;
            Password::sendResetLink($request->only('email'), function (CanResetPassword $user, string $token) use (&$resetUrl): void {
                $resetUrl = route('password.reset', [
                    'token' => $token,
                    'email' => $user->getEmailForPasswordReset(),
                ]);
            });

            if ($resetUrl) {
                $redirect->with('reset_url', $resetUrl);
            }
        } else {
            Password::sendResetLink($request->only('email'));
        }

        return $redirect;
    }

    public function resetForm(Request $request, string $token): View
    {
        return view('passwords.reset', [
            'token' => $token,
            'email' => $request->query('email'),
        ]);
    }

    public function reset(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($credentials, function (User $user, string $password): void {
            $user->forceFill([
                'password' => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();
            $user->tokens()->delete();

            event(new PasswordReset($user));
        });

        if ($status === Password::PASSWORD_RESET) {
            return redirect()->route('login')->with('status', 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบได้เลย');
        }

        return back()->withInput($request->only('email'))->withErrors([
            'email' => 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่',
        ]);
    }
}