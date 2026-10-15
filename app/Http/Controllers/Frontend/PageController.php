<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\View\View;

class PageController extends Controller
{
    public function home(): View
    {
        return view('welcome');
    }

    public function map(): View
    {
        return view('map');
    }

    public function locations(): View
    {
        return view('locations');
    }

    public function login(): View
    {
        return view('service');
    }
}