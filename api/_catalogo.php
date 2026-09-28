<?php

declare(strict_types=1);
require_once __DIR__ . '/_seguridad.php';

const CATEGORIAS = [
    'camisa'      => ['nombre' => 'Camisa',      'grupo' => 'superior', 'medida' => 'pecho'],
    'blusa'       => ['nombre' => 'Blusa',       'grupo' => 'superior', 'medida' => 'pecho'],
    'sobrecamisa' => ['nombre' => 'Sobrecamisa', 'grupo' => 'superior', 'medida' => 'pecho'],
    'pantalon'    => ['nombre' => 'Pantalón',    'grupo' => 'inferior', 'medida' => 'cintura'],
    'short'       => ['nombre' => 'Short',       'grupo' => 'inferior', 'medida' => 'cintura'],
    'falda'       => ['nombre' => 'Falda',       'grupo' => 'vestidos', 'medida' => 'cintura'],
    'vestido'     => ['nombre' => 'Vestido',     'grupo' => 'vestidos', 'medida' => 'pecho'],
];

const ESTADOS_PEDIDO = ['nuevo', 'preparando', 'enviado', 'entregado', 'cancelado'];
const MOTIVOS_DEVOLUCION = ['pequena', 'grande', 'defecto', 'otro'];
const SIMBOLOS = ['nike', 'adidas', 'gucci', 'puma', 'jordan', 'dior', 'newbalance', 'zara', 'underarmour', 'thenorthface', 'reebok', 'fila', 'uniqlo',
    'circulo', 'rombo', 'lineas', 'arco', 'cuadro', 'ondas', 'flecha', 'estrella'];

function patrocinador_publico(array $m): array
{
    $url = (string) ($m['url'] ?? '');
    return [
        'id'      => $m['id'],
        'nombre'  => $m['nombre'],
        'simbolo' => in_array($m['simbolo'] ?? '', SIMBOLOS, true) ? $m['simbolo'] : 'circulo',
        'url'     => preg_match('#^https?://[^\s"\'<>]+$#i', $url) ? $url : '',
    ];
}

function config(): array
{
    return array_merge([
        'umbral_stock'           => 2,
        'dias_nuevo'             => 21,
        'envio_gratis_desde'     => 80,
        'costo_envio'            => 6,
        'umbral_devoluciones'    => 3,
        'ajuste_automatico'      => true,
        'dias_reposicion'        => 14,
        'horas_pedido_pendiente' => 48,
    ], leer_json('config', []));
}

function hoy(): string
{
    return date('Y-m-d');
}

function en_rebaja(array $p): bool
{
    $r = $p['rebaja'] ?? null;
    if (!$r || empty($r['precio']) || (float) $r['precio'] >= (float) $p['precio']) {
        return false;
    }
    $hoy = hoy();
    return (empty($r['inicio']) || $r['inicio'] <= $hoy) && (empty($r['fin']) || $r['fin'] >= $hoy);
}

function precio_actual(array $p): float
{
    return en_rebaja($p) ? (float) $p['rebaja']['precio'] : (float) $p['precio'];
}

function es_nuevo(array $p, array $config): bool
{
    $creado = strtotime($p['creado'] ?? '') ?: 0;
    return $creado > time() - $config['dias_nuevo'] * 86400;
}

function stock_total(array $p): int
{
    return array_sum(array_map('intval', $p['stock'] ?? []));
}

function ajustes_talla(array $devoluciones, array $config): array
{
    $res = [];
    foreach ($devoluciones as $d) {
        $id = $d['producto_id'] ?? '';
        $res[$id] ??= ['conteo' => array_fill_keys(MOTIVOS_DEVOLUCION, 0), 'ajuste' => 0, 'total' => 0];
        if (isset($res[$id]['conteo'][$d['motivo'] ?? ''])) {
            $res[$id]['conteo'][$d['motivo']]++;
            $res[$id]['total']++;
        }
    }
    foreach ($res as $id => $r) {
        $neto = $r['conteo']['pequena'] - $r['conteo']['grande'];
        if ($config['ajuste_automatico'] && abs($neto) >= $config['umbral_devoluciones']) {
            $res[$id]['ajuste'] = $neto > 0 ? 1 : -1;
        }
    }
    return $res;
}

function producto_publico(array $p, array $config, array $ajustes): array
{
    $tallas = [];
    foreach (TALLAS as $t) {
        $n = (int) ($p['stock'][$t] ?? 0);
        $tallas[$t] = $n <= 0 ? 'agotada' : ($n <= $config['umbral_stock'] ? 'pocas' : 'ok');
    }
    $cat = CATEGORIAS[$p['categoria']] ?? CATEGORIAS['camisa'];
    return [
        'id'              => $p['id'],
        'nombre'          => $p['nombre'],
        'categoria'       => $p['categoria'],
        'grupo'           => $cat['grupo'],
        'medida'          => $cat['medida'],
        'descripcion'     => $p['descripcion'] ?? '',
        'precio'          => precio_actual($p),
        'precio_original' => en_rebaja($p) ? (float) $p['precio'] : null,
        'color'           => $p['color'] ?? ['nombre' => '', 'hex' => '#D6C6AA'],
        'imagen'          => $p['imagen'] ?? '',
        'holgura'         => (int) ($p['holgura'] ?? 0),
        'ajuste_talla'    => $ajustes[$p['id']]['ajuste'] ?? 0,
        'nuevo'           => es_nuevo($p, $config),
        'orden'           => (int) ($p['orden'] ?? 99),
        'tallas'          => $tallas,
    ];
}

function mapa_por_id(array $lista): array
{
    $mapa = [];
    foreach ($lista as $i => $item) {
        $mapa[$item['id']] = $i;
    }
    return $mapa;
}

function procesar_avisos(array $productos): int
{
    $avisos = leer_json('avisos', []);
    $indice = mapa_por_id($productos);
    $cambios = 0;
    foreach ($avisos as &$a) {
        if (($a['estado'] ?? '') !== 'pendiente' || !isset($indice[$a['producto_id']])) {
            continue;
        }
        $p = $productos[$indice[$a['producto_id']]];
        if ((int) ($p['stock'][$a['talla']] ?? 0) > 0) {
            $a['estado'] = 'listo';
            $a['fecha_listo'] = date('c');
            $cambios++;
        }
    }
    unset($a);
    if ($cambios) {
        guardar_json('avisos', $avisos);
    }
    return $cambios;
}

function ventas_por_producto(array $pedidos, int $dias): array
{
    $desde = time() - $dias * 86400;
    $res = [];
    foreach ($pedidos as $pe) {
        if ($pe['estado'] === 'cancelado' || strtotime($pe['fecha']) < $desde) {
            continue;
        }
        foreach ($pe['items'] as $it) {
            $res[$it['id']] = ($res[$it['id']] ?? 0) + (int) $it['cantidad'];
        }
    }
    return $res;
}
