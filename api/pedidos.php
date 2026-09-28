<?php

declare(strict_types=1);
require __DIR__ . '/_catalogo.php';

solo_post();
iniciar_sesion();
verificar_origen();
verificar_csrf();

$d = entrada();

if (!empty($d['sitio_web'])) {

    error_json(400, 'No pudimos procesar el pedido.');
}
if (time() - (int) ($_SESSION['ultimo_pedido'] ?? 0) < 20) {
    error_json(429, 'Espera unos segundos antes de enviar otro pedido.');
}
if (!limitar_por_ip('pedidos', 10, 3600)) {
    error_json(429, 'Demasiados pedidos desde esta conexión. Escríbenos a hola@linaza.shop.');
}

$c = is_array($d['cliente'] ?? null) ? $d['cliente'] : [];
$cliente = [
    'nombre'    => limpiar($c['nombre'] ?? '', 60),
    'correo'    => limpiar($c['correo'] ?? '', 120),
    'telefono'  => limpiar($c['telefono'] ?? '', 20),
    'direccion' => limpiar($c['direccion'] ?? '', 160),
    'ciudad'    => limpiar($c['ciudad'] ?? '', 60),
];
$pago  = (string) ($d['pago'] ?? '');
$notas = limpiar($d['notas'] ?? '', 200);

$errores = [];
if (!preg_match("/^[\p{L}\s'.-]{2,60}$/u", $cliente['nombre']))  $errores[] = 'nombre';
if (!filter_var($cliente['correo'], FILTER_VALIDATE_EMAIL))      $errores[] = 'correo';
if (!preg_match('/^[0-9 +()-]{7,20}$/', $cliente['telefono']))    $errores[] = 'teléfono';
if (mb_strlen($cliente['direccion']) < 5)                         $errores[] = 'dirección';
if (mb_strlen($cliente['ciudad']) < 2)                            $errores[] = 'ciudad';
if (!in_array($pago, ['contra_entrega', 'transferencia'], true))  $errores[] = 'forma de pago';
if ($errores) {
    error_json(422, 'Revisa: ' . implode(', ', $errores) . '.');
}

$pedidoItems = [];
foreach (is_array($d['items'] ?? null) ? array_slice($d['items'], 0, 20) : [] as $it) {
    $id    = is_string($it['id'] ?? null) ? $it['id'] : '';
    $talla = is_string($it['talla'] ?? null) ? $it['talla'] : '';
    $cant  = (int) ($it['cantidad'] ?? 0);
    if (!preg_match('/^[a-z0-9-]{2,60}$/', $id) || !in_array($talla, TALLAS, true) || $cant < 1 || $cant > 5) {
        error_json(422, 'Hay un producto no válido en la bolsa.');
    }
    $clave = $id . '|' . $talla;
    $pedidoItems[$clave] = min(5, ($pedidoItems[$clave] ?? 0) + $cant);
}
if (!$pedidoItems) {
    error_json(422, 'Tu bolsa está vacía.');
}

$resultado = con_bloqueo(function () use ($pedidoItems, $cliente, $pago, $notas) {
    $config    = config();
    $productos = leer_json('productos', []);
    $indice    = mapa_por_id($productos);
    $items     = [];
    $agotados  = [];

    foreach ($pedidoItems as $clave => $cant) {
        [$id, $talla] = explode('|', $clave);
        if (!isset($indice[$id]) || empty($productos[$indice[$id]]['activo'])) {
            $agotados[] = $id;
            continue;
        }
        $p = $productos[$indice[$id]];
        if ((int) ($p['stock'][$talla] ?? 0) < $cant) {
            $agotados[] = $p['nombre'] . ' ' . $talla;
            continue;
        }
        $items[] = [
            'id'       => $id,
            'nombre'   => $p['nombre'],
            'talla'    => $talla,
            'cantidad' => $cant,
            'precio'   => precio_actual($p),
            'sku'      => strtoupper(substr(str_replace('-', '', $id), 0, 8)) . '-' . $talla,
        ];
    }
    if ($agotados) {
        return ['error' => 'Sin stock suficiente: ' . implode(', ', $agotados) . '. Actualizamos la tienda.'];
    }

    foreach ($items as $it) {
        $productos[$indice[$it['id']]]['stock'][$it['talla']] -= $it['cantidad'];
    }

    $subtotal = array_sum(array_map(fn($i) => $i['precio'] * $i['cantidad'], $items));
    $envio    = $subtotal >= $config['envio_gratis_desde'] ? 0 : (float) $config['costo_envio'];
    $pedidos  = leer_json('pedidos', []);
    $mayor    = 1000;
    foreach ($pedidos as $pe) {
        $mayor = max($mayor, (int) substr($pe['numero'], 4));
    }

    $pedido = [
        'numero'   => 'LNZ-' . ($mayor + 1),
        'fecha'    => date('c'),
        'cliente'  => $cliente,
        'items'    => $items,
        'subtotal' => $subtotal,
        'envio'    => $envio,
        'total'    => $subtotal + $envio,
        'pago'     => $pago,
        'notas'    => $notas,
        'estado'   => 'nuevo',
    ];
    $pedidos[] = $pedido;

    guardar_json('productos', $productos);
    guardar_json('pedidos', $pedidos);
    return ['pedido' => $pedido];
});

if (isset($resultado['error'])) {
    error_json(409, $resultado['error'], ['agotados' => true]);
}

$_SESSION['ultimo_pedido'] = time();
responder(200, [
    'ok'     => true,
    'numero' => $resultado['pedido']['numero'],
    'total'  => $resultado['pedido']['total'],
]);
