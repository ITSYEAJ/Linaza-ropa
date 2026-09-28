<?php

declare(strict_types=1);
require __DIR__ . '/_catalogo.php';

solo_post();
iniciar_sesion();
verificar_origen();
verificar_csrf();

if (!empty($_POST['sitio_web'])) {
    responder(200, ['ok' => true, 'mensaje' => 'Listo. Te escribiremos cuando vuelva tu talla.']);
}
if (time() - (int) ($_SESSION['ultimo_aviso'] ?? 0) < 15) {
    error_json(429, 'Ya recibimos tu aviso. Espera unos segundos para enviar otro.');
}
if (!limitar_por_ip('avisos', 8, 3600)) {
    error_json(429, 'Demasiados envíos desde esta conexión. Intenta más tarde.');
}

$nombre   = limpiar($_POST['nombre'] ?? '', 60);
$correo   = limpiar($_POST['correo'] ?? '', 120);
$producto = (string) ($_POST['producto_id'] ?? '');
$talla    = (string) ($_POST['talla'] ?? '');

$errores = [];
if (!preg_match("/^[\p{L}\s'.-]{2,60}$/u", $nombre))  $errores[] = 'nombre';
if (!filter_var($correo, FILTER_VALIDATE_EMAIL))      $errores[] = 'correo';
if (!in_array($talla, TALLAS, true))                  $errores[] = 'talla';
if (empty($_POST['acepta']))                          $errores[] = 'consentimiento';
if ($errores) {
    error_json(422, 'Revisa: ' . implode(', ', $errores) . '.');
}

$productos = leer_json('productos', []);
$indice = mapa_por_id($productos);
if (!isset($indice[$producto])) {
    error_json(422, 'Ese producto ya no está disponible.');
}
$nombreProducto = $productos[$indice[$producto]]['nombre'];

$repetido = con_bloqueo(function () use ($nombre, $correo, $producto, $talla) {
    $avisos = leer_json('avisos', []);
    foreach ($avisos as $a) {
        if ($a['correo'] === $correo && $a['producto_id'] === $producto && $a['talla'] === $talla && $a['estado'] !== 'notificado') {
            return true;
        }
    }
    $avisos[] = [
        'id'          => nuevo_id('av_'),
        'fecha'       => date('c'),
        'nombre'      => $nombre,
        'correo'      => $correo,
        'producto_id' => $producto,
        'talla'       => $talla,
        'estado'      => 'pendiente',
    ];
    guardar_json('avisos', $avisos);
    return false;
});

$_SESSION['ultimo_aviso'] = time();
responder(200, [
    'ok' => true,
    'mensaje' => $repetido
        ? 'Ya tenías este aviso activo. Te escribiremos en cuanto vuelva.'
        : 'Listo, ' . $nombre . '. Te escribiremos cuando vuelva «' . $nombreProducto . '» en talla ' . $talla . '.',
]);
