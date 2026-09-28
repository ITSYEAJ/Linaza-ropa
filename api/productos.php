<?php

declare(strict_types=1);
require __DIR__ . '/_catalogo.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    error_json(405, 'Método no permitido.');
}

$config   = config();
$ajustes  = ajustes_talla(leer_json('devoluciones', []), $config);
$publicos = [];

foreach (leer_json('productos', []) as $p) {
    if (!empty($p['activo'])) {
        $publicos[] = producto_publico($p, $config, $ajustes);
    }
}

responder(200, [
    'ok'        => true,
    'productos' => $publicos,
    'envio'     => [
        'gratis_desde' => (float) $config['envio_gratis_desde'],
        'costo'        => (float) $config['costo_envio'],
    ],
]);
