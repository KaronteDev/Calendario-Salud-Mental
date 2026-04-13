<?php

return [
    'app' => [
        'name' => 'WellFlow',
        'base_url' => 'https://wellflow.canarizame.com/',
        'session_name' => 'wellflow_php_session',
    ],
    'database' => [
        'host' => 'db5020191572.hosting-data.io',
        'port' => 3306,
        'name' => 'dbs15533581',
        'user' => 'dbu5555042',
        'password' => '55vcV6fPnwQM$2023%&Corsarios',
        'charset' => 'utf8mb4',
    ],
    'mail' => [
        'enabled' => false,
        'from' => 'no-reply@tu-dominio.com',
        'from_name' => 'WellFlow',
    ],
    'installer' => [
        'enabled' => true,
        'token' => 'wf-install-2026-4a7f',
    ],
    'debug' => [
        'enabled' => true,
        'token' => 'wf-debug-2026-a91c',
    ],
    'oauth' => [
        'google' => [
            'enabled' => false,
            'client_id' => '',
            'client_secret' => '',
            'redirect_uri' => 'https://tu-dominio.com/oauth/callback?provider=google',
        ],
        'facebook' => [
            'enabled' => false,
            'client_id' => '',
            'client_secret' => '',
            'redirect_uri' => 'https://tu-dominio.com/oauth/callback?provider=facebook',
        ],
        'linkedin' => [
            'enabled' => false,
            'client_id' => '',
            'client_secret' => '',
            'redirect_uri' => 'https://tu-dominio.com/oauth/callback?provider=linkedin',
        ],
        'instagram' => [
            'enabled' => false,
            'client_id' => '',
            'client_secret' => '',
            'redirect_uri' => 'https://tu-dominio.com/oauth/callback?provider=instagram',
        ],
    ],
];