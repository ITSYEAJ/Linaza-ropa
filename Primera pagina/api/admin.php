<?php

declare(strict_types=1);
require __DIR__ . '/_catalogo.php';

header('X-Robots-Tag: noindex, nofollow');
solo_post();
iniciar_sesion();
verificar_origen();
verificar_csrf();

$d = entrada();
$accion = (string) ($d['accion'] ?? '');
$credenciales = leer_json('admin', []);

$publicas = [

    'estado' => function () use ($credenciales) {
        responder(200, [
            'ok'          => true,
            'configurado' => !empty($credenciales['hash']),
            'sesion'      => !empty($_SESSION['admin']) && time() - (int) ($_SESSION['admin_actividad'] ?? 0) <= 7200,
            'local'       => es_local(),
        ]);
    },

    'setup' => function () use ($d, $credenciales) {
        if (!empty($credenciales['hash'])) {
            error_json(409, 'La cuenta de administrador ya existe.');
        }
        if (!es_local()) {
            error_json(403, 'La cuenta solo se puede crear desde el mismo equipo del servidor.');
        }
        $usuario = (string) ($d['usuario'] ?? '');
        $clave   = (string) ($d['clave'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9_.-]{3,30}$/', $usuario)) {
            error_json(422, 'El usuario debe tener de 3 a 30 letras, números, punto o guion.');
        }
        if (strlen($clave) < 10 || strlen($clave) > 200) {
            error_json(422, 'La contraseña debe tener al menos 10 caracteres.');
        }
        guardar_json('admin', [
            'usuario' => $usuario,
            'hash'    => password_hash($clave, PASSWORD_DEFAULT),
            'creado'  => date('c'),
        ]);
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['admin_actividad'] = time();
        responder(200, ['ok' => true]);
    },

    'login' => function () use ($d, $credenciales) {
        if (empty($credenciales['hash'])) {
            error_json(409, 'Primero crea la cuenta de administrador.');
        }
        if (!limitar_por_ip('login', 5, 900)) {
            error_json(429, 'Demasiados intentos. Espera 15 minutos.');
        }
        $usuario = (string) ($d['usuario'] ?? '');
        $clave   = (string) ($d['clave'] ?? '');
        $valido  = hash_equals($credenciales['usuario'], $usuario) && password_verify($clave, $credenciales['hash']);
        if (!$valido) {
            usleep(400000);
            error_json(401, 'Usuario o contraseña incorrectos.');
        }
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['admin_actividad'] = time();
        responder(200, ['ok' => true]);
    },

    'logout' => function () {
        unset($_SESSION['admin'], $_SESSION['admin_actividad']);
        session_regenerate_id(true);
        responder(200, ['ok' => true]);
    },
];

if (isset($publicas[$accion])) {
    $publicas[$accion]();
}

if (empty($credenciales['hash'])) {
    unset($_SESSION['admin']);
    error_json(401, 'Primero crea la cuenta de administrador.', ['sesion' => false]);
}
requerir_admin();

function producto_admin(array $p, array $config, array $ajustes, array $vendidas30): array
{
    $total   = stock_total($p);
    $vend    = $vendidas30[$p['id']] ?? 0;
    $porDia  = $vend / 30;
    $p['stock_total']   = $total;
    $p['vendidas_30']   = $vend;
    $p['dias_restantes'] = $porDia > 0 ? (int) floor($total / $porDia) : null;
    $p['en_rebaja']     = en_rebaja($p);
    $p['precio_actual'] = precio_actual($p);
    $p['nuevo']         = es_nuevo($p, $config);
    $p['ajuste_talla']  = $ajustes[$p['id']]['ajuste'] ?? 0;
    $p['devoluciones']  = $ajustes[$p['id']]['conteo'] ?? null;
    return $p;
}

function slug(string $texto): string
{
    $t = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto) ?: $texto;
    $t = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $t) ?? '');
    return trim(substr($t, 0, 50), '-') ?: 'producto';
}

function guardar_imagen(array $archivo): string
{
    if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        error_json(422, 'No se pudo subir la imagen.');
    }
    if ($archivo['size'] > 3 * 1024 * 1024) {
        error_json(422, 'La imagen pesa más de 3 MB.');
    }
    $info = @getimagesize($archivo['tmp_name']);
    $extensiones = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $ext = $info ? ($extensiones[$info['mime']] ?? null) : null;
    if (!$ext) {
        error_json(422, 'La imagen debe ser JPG, PNG o WEBP.');
    }
    if (!is_dir(RUTA_SUBIDAS)) {
        mkdir(RUTA_SUBIDAS, 0755, true);
    }
    $nombre = bin2hex(random_bytes(10)) . '.' . $ext;
    if (!move_uploaded_file($archivo['tmp_name'], RUTA_SUBIDAS . '/' . $nombre)) {
        error_json(500, 'No se pudo guardar la imagen.');
    }
    return 'uploads/productos/' . $nombre;
}

function borrar_imagen(string $ruta): void
{
    if (preg_match('/^uploads\/productos\/([a-f0-9]{20}\.(jpg|png|webp))$/', $ruta, $m)) {
        $archivo = RUTA_SUBIDAS . '/' . $m[1];
        if (is_file($archivo)) {
            unlink($archivo);
        }
    }
}

function fecha_valida(string $f): bool
{
    $dt = DateTime::createFromFormat('Y-m-d', $f);
    return $dt && $dt->format('Y-m-d') === $f;
}

$acciones = [

    'resumen' => function () {
        $config       = config();
        $productos    = leer_json('productos', []);
        $pedidos      = leer_json('pedidos', []);
        $devoluciones = leer_json('devoluciones', []);
        $avisos       = leer_json('avisos', []);
        $ajustes      = ajustes_talla($devoluciones, $config);
        $vendidas30   = ventas_por_producto($pedidos, 30);
        $indice       = mapa_por_id($productos);

        $desde30 = time() - 30 * 86400;
        $ventas30 = 0;
        $pedidos30 = 0;
        $unidadesVendidas = 0;
        $serie = [];
        for ($i = 13; $i >= 0; $i--) {
            $serie[date('Y-m-d', strtotime("-$i days"))] = 0;
        }
        foreach ($pedidos as $pe) {
            if ($pe['estado'] === 'cancelado') {
                continue;
            }
            $t = strtotime($pe['fecha']);
            foreach ($pe['items'] as $it) {
                $unidadesVendidas += (int) $it['cantidad'];
            }
            if ($t >= $desde30) {
                $ventas30 += $pe['total'];
                $pedidos30++;
            }
            $dia = date('Y-m-d', $t);
            if (isset($serie[$dia])) {
                $serie[$dia] += $pe['total'];
            }
        }
        $devTalla = count(array_filter($devoluciones, fn($x) => in_array($x['motivo'], ['pequena', 'grande'], true)));

        $alertas = [];

        foreach ($pedidos as $pe) {
            $horas = (time() - strtotime($pe['fecha'])) / 3600;
            if ($pe['estado'] === 'nuevo' && $horas > $config['horas_pedido_pendiente']) {
                $alertas[] = ['nivel' => 'urgente', 'vista' => 'pedidos',
                    'texto' => "Pedido {$pe['numero']} lleva " . floor($horas) . ' h sin prepararse',
                    'detalle' => $pe['cliente']['nombre'] . ' · $' . $pe['total']];
            }
        }

        $listos = array_filter($avisos, fn($a) => $a['estado'] === 'listo');
        if ($listos) {
            $alertas[] = ['nivel' => 'aviso', 'vista' => 'avisos',
                'texto' => count($listos) . ' clientes esperan el aviso de reposición',
                'detalle' => 'Su talla ya tiene stock. Envíales el correo.'];
        }

        foreach ($productos as $p) {
            if (empty($p['activo'])) {
                continue;
            }
            $bajas = [];
            $agotadas = [];
            foreach (TALLAS as $t) {
                $n = (int) ($p['stock'][$t] ?? 0);
                if ($n === 0) {
                    $agotadas[] = $t;
                } elseif ($n <= $config['umbral_stock']) {
                    $bajas[] = "$t ($n)";
                }
            }
            $esperando = count(array_filter($avisos, fn($a) => $a['producto_id'] === $p['id'] && $a['estado'] === 'pendiente'));
            if ($agotadas || $bajas) {
                $partes = [];
                if ($agotadas) $partes[] = 'agotado en ' . implode(', ', $agotadas);
                if ($bajas)    $partes[] = 'pocas en ' . implode(', ', $bajas);
                $alertas[] = ['nivel' => $esperando ? 'urgente' : 'aviso', 'vista' => 'productos',
                    'texto' => "{$p['nombre']}: " . implode(' · ', $partes),
                    'detalle' => $esperando
                        ? ($esperando === 1 ? '1 persona espera' : "$esperando personas esperan") . ' aviso de reposición'
                        : 'Umbral de stock bajo: ' . $config['umbral_stock'] . ' unidades'];
            }
            $vend = $vendidas30[$p['id']] ?? 0;
            $total = stock_total($p);
            if ($vend > 0 && $total > 0) {
                $dias = (int) floor($total / ($vend / 30));
                if ($dias < $config['dias_reposicion']) {
                    $alertas[] = ['nivel' => 'aviso', 'vista' => 'productos',
                        'texto' => "Reponer {$p['nombre']}: el stock alcanza para ~$dias días",
                        'detalle' => "$vend vendidas en 30 días · quedan $total"];
                }
            }
            $aj = $ajustes[$p['id']]['ajuste'] ?? 0;
            if ($aj !== 0) {
                $alertas[] = ['nivel' => 'ok', 'vista' => 'devoluciones',
                    'texto' => "{$p['nombre']}: la tienda ya recomienda una talla " . ($aj > 0 ? 'más' : 'menos'),
                    'detalle' => 'Ajuste automático por devoluciones de talla'];
            }
            if (en_rebaja($p) && !empty($p['rebaja']['fin'])) {
                $restan = (int) round((strtotime($p['rebaja']['fin']) - strtotime(hoy())) / 86400);
                if ($restan <= 3) {
                    $cuando = $restan === 0 ? 'hoy' : ($restan === 1 ? 'mañana' : "en $restan días");
                    $alertas[] = ['nivel' => 'aviso', 'vista' => 'productos',
                        'texto' => "La rebaja de {$p['nombre']} termina $cuando",
                        'detalle' => 'El precio vuelve solo a $' . $p['precio']];
                }
            }
        }

        $orden = ['urgente' => 0, 'aviso' => 1, 'ok' => 2];
        usort($alertas, fn($a, $b) => $orden[$a['nivel']] <=> $orden[$b['nivel']]);

        arsort($vendidas30);
        $top = [];
        foreach (array_slice($vendidas30, 0, 5, true) as $id => $n) {
            if (isset($indice[$id])) {
                $top[] = ['nombre' => $productos[$indice[$id]]['nombre'], 'unidades' => $n];
            }
        }

        responder(200, [
            'ok' => true,
            'kpis' => [
                'ventas_30'        => round($ventas30, 2),
                'pedidos_30'       => $pedidos30,
                'ticket_promedio'  => $pedidos30 ? round($ventas30 / $pedidos30, 2) : 0,
                'pedidos_nuevos'   => count(array_filter($pedidos, fn($x) => $x['estado'] === 'nuevo')),
                'unidades_stock'   => array_sum(array_map('stock_total', $productos)),
                'tasa_devolucion'  => $unidadesVendidas ? round(count($devoluciones) / $unidadesVendidas * 100, 1) : 0,
                'devolucion_talla' => count($devoluciones) ? round($devTalla / count($devoluciones) * 100) : 0,
            ],
            'serie'   => array_map(fn($f, $v) => ['fecha' => $f, 'total' => round($v, 2)], array_keys($serie), $serie),
            'alertas' => $alertas,
            'top'     => $top,
            'contadores' => [
                'pedidos' => count(array_filter($pedidos, fn($x) => $x['estado'] === 'nuevo')),
                'avisos'  => count($listos),
            ],
            'demo' => (bool) array_filter(array_merge($pedidos, $devoluciones, $avisos), fn($x) => !empty($x['demo'])),
        ]);
    },

    'productos' => function () {
        $config  = config();
        $pedidos = leer_json('pedidos', []);
        $ajustes = ajustes_talla(leer_json('devoluciones', []), $config);
        $vend    = ventas_por_producto($pedidos, 30);
        $lista   = array_map(fn($p) => producto_admin($p, $config, $ajustes, $vend), leer_json('productos', []));
        usort($lista, fn($a, $b) => ($a['orden'] ?? 99) <=> ($b['orden'] ?? 99));
        responder(200, ['ok' => true, 'productos' => $lista, 'config' => $config]);
    },

    'guardar_producto' => function () use ($d) {
        $id        = (string) ($d['id'] ?? '');
        $nombre    = limpiar($d['nombre'] ?? '', 60);
        $categoria = (string) ($d['categoria'] ?? '');
        $precio    = round((float) ($d['precio'] ?? 0), 2);
        $colorHex  = (string) ($d['color_hex'] ?? '');
        $holgura   = (int) ($d['holgura'] ?? 0);

        $errores = [];
        if (mb_strlen($nombre) < 3)                                $errores[] = 'nombre';
        if (!isset(CATEGORIAS[$categoria]))                        $errores[] = 'categoría';
        if ($precio <= 0 || $precio > 10000)                       $errores[] = 'precio';
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $colorHex))         $errores[] = 'color';
        if (!in_array($holgura, [-1, 0], true))                    $errores[] = 'corte';

        $stock = [];
        foreach (TALLAS as $t) {
            $n = (int) ($d['stock_' . $t] ?? 0);
            if ($n < 0 || $n > 999) {
                $errores[] = "stock $t";
            }
            $stock[$t] = max(0, min(999, $n));
        }

        $rebaja = null;
        $rp = (float) ($d['rebaja_precio'] ?? 0);
        if ($rp > 0) {
            $ri = (string) ($d['rebaja_inicio'] ?? '');
            $rf = (string) ($d['rebaja_fin'] ?? '');
            if ($rp >= $precio)                           $errores[] = 'el precio de rebaja debe ser menor';
            if ($ri !== '' && !fecha_valida($ri))         $errores[] = 'inicio de rebaja';
            if ($rf !== '' && !fecha_valida($rf))         $errores[] = 'fin de rebaja';
            if ($ri && $rf && $rf < $ri)                  $errores[] = 'la rebaja termina antes de empezar';
            $rebaja = ['precio' => round($rp, 2), 'inicio' => $ri, 'fin' => $rf];
        }
        if ($errores) {
            error_json(422, 'Revisa: ' . implode(', ', $errores) . '.');
        }

        $nuevaImagen = !empty($_FILES['imagen']['name']) ? guardar_imagen($_FILES['imagen']) : null;

        $resultado = con_bloqueo(function () use ($id, $nombre, $categoria, $precio, $colorHex, $holgura, $stock, $rebaja, $nuevaImagen, $d) {
            $productos = leer_json('productos', []);
            $indice = mapa_por_id($productos);

            if ($id !== '') {
                if (!isset($indice[$id])) {
                    return ['error' => 'El producto ya no existe.'];
                }
                $p = $productos[$indice[$id]];
            } else {
                $base = slug($nombre);
                $nuevoId = $base;
                for ($n = 2; isset($indice[$nuevoId]); $n++) {
                    $nuevoId = $base . '-' . $n;
                }
                $p = ['id' => $nuevoId, 'creado' => date('c'), 'imagen' => '',
                      'orden' => count($productos) + 1];
            }

            $imagenAnterior = $p['imagen'] ?? '';
            if ($nuevaImagen) {
                $p['imagen'] = $nuevaImagen;
            } elseif (!empty($d['quitar_imagen'])) {
                $p['imagen'] = '';
            }
            if ($imagenAnterior && $imagenAnterior !== $p['imagen']) {
                borrar_imagen($imagenAnterior);
            }

            $p['nombre']      = $nombre;
            $p['categoria']   = $categoria;
            $p['descripcion'] = limpiar($d['descripcion'] ?? '', 240);
            $p['precio']      = $precio;
            $p['color']       = ['nombre' => limpiar($d['color_nombre'] ?? '', 30) ?: 'Natural', 'hex' => strtoupper($colorHex)];
            $p['holgura']     = $holgura;
            $p['stock']       = $stock;
            $p['rebaja']      = $rebaja;
            $p['activo']      = !empty($d['activo']) && $d['activo'] !== '0' && $d['activo'] !== 'false';

            if ($id !== '') {
                $productos[$indice[$id]] = $p;
            } else {
                $productos[] = $p;
            }
            guardar_json('productos', $productos);
            return ['producto' => $p, 'avisos' => procesar_avisos($productos)];
        });

        if (isset($resultado['error'])) {
            error_json(404, $resultado['error']);
        }
        responder(200, ['ok' => true, 'id' => $resultado['producto']['id'], 'avisos_listos' => $resultado['avisos']]);
    },

    'eliminar_producto' => function () use ($d) {
        $id = (string) ($d['id'] ?? '');
        $ok = con_bloqueo(function () use ($id) {
            $productos = leer_json('productos', []);
            $indice = mapa_por_id($productos);
            if (!isset($indice[$id])) {
                return false;
            }
            borrar_imagen($productos[$indice[$id]]['imagen'] ?? '');
            array_splice($productos, $indice[$id], 1);
            guardar_json('productos', $productos);
            return true;
        });
        $ok ? responder(200, ['ok' => true]) : error_json(404, 'El producto ya no existe.');
    },

    'stock' => function () use ($d) {
        $id    = (string) ($d['id'] ?? '');
        $talla = (string) ($d['talla'] ?? '');
        $valor = (int) ($d['valor'] ?? -1);
        if (!in_array($talla, TALLAS, true) || $valor < 0 || $valor > 999) {
            error_json(422, 'Cantidad no válida.');
        }
        $res = con_bloqueo(function () use ($id, $talla, $valor) {
            $productos = leer_json('productos', []);
            $indice = mapa_por_id($productos);
            if (!isset($indice[$id])) {
                return null;
            }
            $productos[$indice[$id]]['stock'][$talla] = $valor;
            guardar_json('productos', $productos);
            return procesar_avisos($productos);
        });
        if ($res === null) {
            error_json(404, 'El producto ya no existe.');
        }
        responder(200, ['ok' => true, 'avisos_listos' => $res]);
    },

    'pedidos' => function () {
        $pedidos = leer_json('pedidos', []);
        usort($pedidos, fn($a, $b) => strcmp($b['fecha'], $a['fecha']));
        responder(200, ['ok' => true, 'pedidos' => $pedidos]);
    },

    'estado_pedido' => function () use ($d) {
        $numero = (string) ($d['numero'] ?? '');
        $nuevo  = (string) ($d['estado'] ?? '');
        if (!in_array($nuevo, ESTADOS_PEDIDO, true)) {
            error_json(422, 'Estado no válido.');
        }
        $res = con_bloqueo(function () use ($numero, $nuevo) {
            $pedidos = leer_json('pedidos', []);
            $pos = null;
            foreach ($pedidos as $i => $pe) {
                if ($pe['numero'] === $numero) {
                    $pos = $i;
                }
            }
            if ($pos === null) {
                return ['error' => 'El pedido no existe.'];
            }
            $anterior = $pedidos[$pos]['estado'];
            if ($anterior === 'cancelado' && $nuevo !== 'cancelado') {
                return ['error' => 'Un pedido cancelado no se puede reabrir. Crea uno nuevo.'];
            }
            $pedidos[$pos]['estado'] = $nuevo;
            $pedidos[$pos]['historial'][] = ['estado' => $nuevo, 'fecha' => date('c')];

            $repuestas = 0;
            $avisos = 0;
            if ($nuevo === 'cancelado' && $anterior !== 'cancelado') {
                $productos = leer_json('productos', []);
                $indice = mapa_por_id($productos);
                foreach ($pedidos[$pos]['items'] as $it) {
                    if (isset($indice[$it['id']])) {
                        $productos[$indice[$it['id']]]['stock'][$it['talla']] += (int) $it['cantidad'];
                        $repuestas += (int) $it['cantidad'];
                    }
                }
                guardar_json('productos', $productos);
                $avisos = procesar_avisos($productos);
            }
            guardar_json('pedidos', $pedidos);
            return ['repuestas' => $repuestas, 'avisos' => $avisos];
        });
        if (isset($res['error'])) {
            error_json(409, $res['error']);
        }
        responder(200, ['ok' => true, 'unidades_repuestas' => $res['repuestas'], 'avisos_listos' => $res['avisos']]);
    },

    'avisos' => function () {
        $productos = leer_json('productos', []);
        $indice = mapa_por_id($productos);
        $avisos = array_map(function ($a) use ($productos, $indice) {
            $a['producto'] = isset($indice[$a['producto_id']]) ? $productos[$indice[$a['producto_id']]]['nombre'] : '(eliminado)';
            return $a;
        }, leer_json('avisos', []));
        $orden = ['listo' => 0, 'pendiente' => 1, 'notificado' => 2];
        usort($avisos, fn($a, $b) => ($orden[$a['estado']] <=> $orden[$b['estado']]) ?: strcmp($b['fecha'], $a['fecha']));
        responder(200, ['ok' => true, 'avisos' => $avisos]);
    },

    'marcar_notificados' => function () use ($d) {
        $ids = array_filter((array) ($d['ids'] ?? []), 'is_string');
        $n = con_bloqueo(function () use ($ids) {
            $avisos = leer_json('avisos', []);
            $n = 0;
            foreach ($avisos as &$a) {
                if (in_array($a['id'], $ids, true) && $a['estado'] !== 'notificado') {
                    $a['estado'] = 'notificado';
                    $a['fecha_notificado'] = date('c');
                    $n++;
                }
            }
            unset($a);
            guardar_json('avisos', $avisos);
            return $n;
        });
        responder(200, ['ok' => true, 'marcados' => $n]);
    },

    'devoluciones' => function () {
        $config = config();
        $productos = leer_json('productos', []);
        $indice = mapa_por_id($productos);
        $devoluciones = leer_json('devoluciones', []);
        $ajustes = ajustes_talla($devoluciones, $config);

        $resumen = [];
        foreach ($ajustes as $id => $a) {
            $resumen[] = [
                'id'     => $id,
                'nombre' => isset($indice[$id]) ? $productos[$indice[$id]]['nombre'] : '(eliminado)',
                'conteo' => $a['conteo'],
                'total'  => $a['total'],
                'ajuste' => $a['ajuste'],
            ];
        }
        usort($resumen, fn($a, $b) => $b['total'] <=> $a['total']);
        usort($devoluciones, fn($a, $b) => strcmp($b['fecha'], $a['fecha']));
        foreach ($devoluciones as &$dv) {
            $dv['producto'] = isset($indice[$dv['producto_id']]) ? $productos[$indice[$dv['producto_id']]]['nombre'] : '(eliminado)';
        }
        unset($dv);
        responder(200, ['ok' => true, 'devoluciones' => $devoluciones, 'resumen' => $resumen, 'umbral' => $config['umbral_devoluciones']]);
    },

    'registrar_devolucion' => function () use ($d) {
        $producto = (string) ($d['producto_id'] ?? '');
        $talla    = (string) ($d['talla'] ?? '');
        $motivo   = (string) ($d['motivo'] ?? '');
        $pedido   = limpiar($d['pedido'] ?? '', 12);
        $nota     = limpiar($d['nota'] ?? '', 200);
        $reingresar = !empty($d['reingresar']);

        if (!in_array($talla, TALLAS, true) || !in_array($motivo, MOTIVOS_DEVOLUCION, true)) {
            error_json(422, 'Revisa la talla y el motivo.');
        }
        if ($pedido !== '' && !preg_match('/^LNZ-\d{4,6}$/', $pedido)) {
            error_json(422, 'El número de pedido tiene el formato LNZ-1234.');
        }
        $res = con_bloqueo(function () use ($producto, $talla, $motivo, $pedido, $nota, $reingresar) {
            $productos = leer_json('productos', []);
            $indice = mapa_por_id($productos);
            if (!isset($indice[$producto])) {
                return null;
            }
            $devoluciones = leer_json('devoluciones', []);
            $devoluciones[] = [
                'id' => nuevo_id('dv_'), 'fecha' => date('c'), 'producto_id' => $producto,
                'talla' => $talla, 'motivo' => $motivo, 'pedido' => $pedido, 'nota' => $nota,
            ];
            guardar_json('devoluciones', $devoluciones);

            $avisos = 0;

            if ($reingresar && $motivo !== 'defecto') {
                $productos[$indice[$producto]]['stock'][$talla] = (int) ($productos[$indice[$producto]]['stock'][$talla] ?? 0) + 1;
                guardar_json('productos', $productos);
                $avisos = procesar_avisos($productos);
            }
            $aj = ajustes_talla($devoluciones, config())[$producto]['ajuste'] ?? 0;
            return ['ajuste' => $aj, 'avisos' => $avisos];
        });
        if ($res === null) {
            error_json(404, 'El producto no existe.');
        }
        responder(200, ['ok' => true, 'ajuste' => $res['ajuste'], 'avisos_listos' => $res['avisos']]);
    },

    'eliminar_devolucion' => function () use ($d) {
        $id = (string) ($d['id'] ?? '');
        con_bloqueo(function () use ($id) {
            $lista = array_values(array_filter(leer_json('devoluciones', []), fn($x) => $x['id'] !== $id));
            guardar_json('devoluciones', $lista);
        });
        responder(200, ['ok' => true]);
    },

    'config' => function () {
        responder(200, ['ok' => true, 'config' => config()]);
    },

    'guardar_config' => function () use ($d) {
        $rangos = [
            'umbral_stock'           => [0, 50],
            'dias_nuevo'             => [0, 120],
            'envio_gratis_desde'     => [0, 10000],
            'costo_envio'            => [0, 500],
            'umbral_devoluciones'    => [1, 50],
            'dias_reposicion'        => [1, 120],
            'horas_pedido_pendiente' => [1, 720],
        ];
        $nueva = [];
        foreach ($rangos as $clave => [$min, $max]) {
            $v = $d[$clave] ?? null;
            if (!is_numeric($v) || $v < $min || $v > $max) {
                error_json(422, "Valor fuera de rango: $clave ($min a $max).");
            }
            $nueva[$clave] = $v + 0;
        }
        $nueva['ajuste_automatico'] = !empty($d['ajuste_automatico']);
        guardar_json('config', $nueva);
        responder(200, ['ok' => true, 'config' => config()]);
    },

    'patrocinadores' => function () {
        $lista = leer_json('patrocinadores', []);
        usort($lista, fn($a, $b) => ($a['orden'] ?? 99) <=> ($b['orden'] ?? 99));
        responder(200, ['ok' => true, 'patrocinadores' => $lista]);
    },

    'guardar_patrocinador' => function () use ($d) {
        $nombre  = limpiar($d['nombre'] ?? '', 40);
        $simbolo = (string) ($d['simbolo'] ?? '');
        $url     = trim((string) ($d['url'] ?? ''));
        if (mb_strlen($nombre) < 2) {
            error_json(422, 'Escribe el nombre de la marca.');
        }
        if (!in_array($simbolo, SIMBOLOS, true)) {
            error_json(422, 'Elige un símbolo.');
        }
        if ($url !== '' && (!preg_match('#^https?://[^\s"\'<>]+$#i', $url) || strlen($url) > 200 || !filter_var($url, FILTER_VALIDATE_URL))) {
            error_json(422, 'El enlace debe empezar con https://');
        }
        $nuevo = con_bloqueo(function () use ($nombre, $simbolo, $url) {
            $lista = leer_json('patrocinadores', []);
            $orden = 0;
            foreach ($lista as $m) {
                $orden = max($orden, (int) ($m['orden'] ?? 0));
            }
            $m = ['id' => nuevo_id('pt_'), 'nombre' => $nombre, 'simbolo' => $simbolo, 'url' => $url,
                  'activo' => true, 'orden' => $orden + 1];
            $lista[] = $m;
            guardar_json('patrocinadores', $lista);
            return $m;
        });
        responder(200, ['ok' => true, 'patrocinador' => $nuevo]);
    },

    'alternar_patrocinador' => function () use ($d) {
        $id = (string) ($d['id'] ?? '');
        $ok = con_bloqueo(function () use ($id) {
            $lista = leer_json('patrocinadores', []);
            foreach ($lista as &$m) {
                if ($m['id'] === $id) {
                    $m['activo'] = empty($m['activo']);
                    guardar_json('patrocinadores', $lista);
                    return true;
                }
            }
            return false;
        });
        $ok ? responder(200, ['ok' => true]) : error_json(404, 'La marca ya no existe.');
    },

    'mover_patrocinador' => function () use ($d) {
        $id = (string) ($d['id'] ?? '');
        $paso = (int) ($d['paso'] ?? 0) < 0 ? -1 : 1;
        con_bloqueo(function () use ($id, $paso) {
            $lista = leer_json('patrocinadores', []);
            usort($lista, fn($a, $b) => ($a['orden'] ?? 99) <=> ($b['orden'] ?? 99));
            foreach ($lista as $i => $m) {
                $j = $i + $paso;
                if ($m['id'] === $id && isset($lista[$j])) {
                    [$lista[$i], $lista[$j]] = [$lista[$j], $lista[$i]];
                    break;
                }
            }
            foreach ($lista as $i => &$m) {
                $m['orden'] = $i + 1;
            }
            guardar_json('patrocinadores', $lista);
        });
        responder(200, ['ok' => true]);
    },

    'eliminar_patrocinador' => function () use ($d) {
        $id = (string) ($d['id'] ?? '');
        con_bloqueo(function () use ($id) {
            $lista = array_values(array_filter(leer_json('patrocinadores', []), fn($m) => $m['id'] !== $id));
            guardar_json('patrocinadores', $lista);
        });
        responder(200, ['ok' => true]);
    },

    'borrar_demo' => function () {
        con_bloqueo(function () {
            foreach (['pedidos', 'avisos', 'devoluciones'] as $nombre) {
                $lista = array_values(array_filter(leer_json($nombre, []), fn($x) => empty($x['demo'])));
                guardar_json($nombre, $lista);
            }
        });
        responder(200, ['ok' => true]);
    },
];

if (!isset($acciones[$accion])) {
    error_json(400, 'Acción desconocida.');
}
$acciones[$accion]();
