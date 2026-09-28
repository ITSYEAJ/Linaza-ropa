(function () {
  "use strict";

  var L = window.Linaza;
  var token = "";
  var cache = { productos: [], pedidos: [], avisos: [] };

  function $(id) { return document.getElementById(id); }

  function el(etiqueta, clase, texto) {
    var n = document.createElement(etiqueta);
    if (clase) n.className = clase;
    if (texto !== undefined && texto !== null) n.textContent = texto;
    return n;
  }

  var temporizador;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { t.classList.remove("visible"); }, 3200);
  }

  function fecha(iso, conHora) {
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    var op = { day: "2-digit", month: "short" };
    if (conHora) { op.hour = "2-digit"; op.minute = "2-digit"; }
    return d.toLocaleString("es", op);
  }

  var RUTA_IMAGEN = /^uploads\/productos\/[a-f0-9]{20}\.(jpg|png|webp)$/;
  function miniatura(p, clase) {
    var caja = el("div", clase || "miniatura");
    if (p.imagen && RUTA_IMAGEN.test(p.imagen)) {
      var img = el("img");
      img.src = "../" + p.imagen;
      img.alt = "";
      caja.appendChild(img);
    } else {
      caja.insertAdjacentHTML("beforeend", L.svgPrenda(p.categoria, p.color && p.color.hex));
    }
    return caja;
  }

  function avisosListosTexto(n) {
    return n === 1 ? "1 aviso quedó listo para enviar" : n + " avisos quedaron listos para enviar";
  }

  function estadoChip(texto, tipo) {
    return el("span", "estado estado--" + tipo, texto);
  }

  function api(accion, datos) {
    var opciones = { method: "POST", credentials: "same-origin", headers: { "X-CSRF-Token": token } };
    if (datos instanceof FormData) {
      datos.append("accion", accion);
      opciones.body = datos;
    } else {
      opciones.headers["Content-Type"] = "application/json";
      opciones.body = JSON.stringify(Object.assign({ accion: accion }, datos || {}));
    }
    return fetch("../api/admin.php", opciones).then(function (r) {
      return r.json().catch(function () { return { ok: false, mensaje: "Respuesta inesperada del servidor." }; })
        .then(function (d) {
          if (r.status === 401 && d.sesion === false) mostrarAcceso(true);
          return d;
        });
    }).catch(function () {
      return { ok: false, mensaje: "Sin conexión con el servidor." };
    });
  }

  function copiar(texto, mensaje) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { toast(mensaje); }, function () { toast("No se pudo copiar."); });
    } else {
      toast("Tu navegador no permite copiar automáticamente.");
    }
  }

  var modoSetup = false;

  function mostrarAcceso(sesionVencida) {
    $("panel").hidden = true;
    $("pantallaAcceso").hidden = false;
    if (sesionVencida) $("errorAcceso").textContent = "Tu sesión terminó. Vuelve a entrar.";
    $("usuario").focus();
  }

  function configurarModoSetup(local) {
    modoSetup = true;
    $("accesoTexto").textContent = local
      ? "Primer uso: crea la cuenta de administrador."
      : "La cuenta de administrador se crea desde el mismo equipo donde corre el servidor (localhost).";
    $("campoClave2").hidden = false;
    $("clave").autocomplete = "new-password";
    $("botonAcceso").textContent = "Crear cuenta";
    $("botonAcceso").disabled = !local;
  }

  function mostrarPanel() {
    $("pantallaAcceso").hidden = true;
    $("panel").hidden = false;
    $("fechaHoy").textContent = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
    cambiarVista("resumen");
  }

  function iniciarAcceso() {
    $("formAcceso").addEventListener("submit", function (e) {
      e.preventDefault();
      var error = $("errorAcceso");
      var usuario = $("usuario").value.trim();
      var clave = $("clave").value;
      error.textContent = "";

      if (modoSetup) {
        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(usuario)) { error.textContent = "Usuario: 3 a 30 letras o números."; return; }
        if (clave.length < 10) { error.textContent = "La contraseña debe tener al menos 10 caracteres."; return; }
        if (clave !== $("clave2").value) { error.textContent = "Las contraseñas no coinciden."; return; }
      } else if (!usuario || !clave) {
        error.textContent = "Escribe usuario y contraseña.";
        return;
      }

      var boton = $("botonAcceso");
      boton.disabled = true;
      api(modoSetup ? "setup" : "login", { usuario: usuario, clave: clave }).then(function (r) {
        boton.disabled = false;
        $("clave").value = "";
        $("clave2").value = "";
        if (r.ok) {
          modoSetup = false;
          mostrarPanel();
        } else {
          error.textContent = r.mensaje || "No se pudo entrar.";
        }
      });
    });

    $("salir").addEventListener("click", function () {
      api("logout").then(function () {
        $("errorAcceso").textContent = "";
        mostrarAcceso(false);
      });
    });
  }

  var cargadores = {};

  function cambiarVista(nombre) {
    document.querySelectorAll(".lateral__nav button").forEach(function (b) {
      var activo = b.dataset.vista === nombre;
      b.classList.toggle("activo", activo);
      if (activo) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    document.querySelectorAll(".vista").forEach(function (v) {
      v.hidden = v.id !== "vista-" + nombre;
    });
    if (cargadores[nombre]) cargadores[nombre]();
    window.scrollTo(0, 0);
  }

  function actualizarContadores(c) {
    [["cPedidos", c.pedidos], ["cAvisos", c.avisos]].forEach(function (par) {
      $(par[0]).hidden = !par[1];
      $(par[0]).textContent = par[1] || "";
    });
  }

  cargadores.resumen = function () {
    api("resumen").then(function (r) {
      if (!r.ok) return;
      var k = r.kpis;
      var kpis = $("kpis");
      kpis.textContent = "";
      [
        ["Ventas · 30 días", L.dinero(k.ventas_30), k.pedidos_30 + " pedidos · ticket " + L.dinero(k.ticket_promedio)],
        ["Por preparar", String(k.pedidos_nuevos), "pedidos en estado nuevo"],
        ["Unidades en stock", String(k.unidades_stock), "todas las tallas"],
        ["Tasa de devolución", k.tasa_devolucion + "%", k.devolucion_talla + "% de ellas por talla"]
      ].forEach(function (d) {
        var c = el("div", "kpi");
        c.appendChild(el("p", "kpi__etiqueta", d[0]));
        c.appendChild(el("p", "kpi__valor", d[1]));
        c.appendChild(el("p", "kpi__nota", d[2]));
        kpis.appendChild(c);
      });

      dibujarGrafico(r.serie);

      var top = $("top");
      top.textContent = "";
      if (!r.top.length) top.appendChild(el("li", null, "Sin ventas todavía."));
      r.top.forEach(function (t) {
        var li = el("li");
        li.appendChild(el("span", null, t.nombre));
        li.appendChild(el("strong", null, t.unidades + " u."));
        top.appendChild(li);
      });

      var lista = $("alertas");
      lista.textContent = "";
      $("nAlertas").textContent = r.alertas.length ? r.alertas.length + " activas" : "";
      if (!r.alertas.length) {
        var ok = el("li", "alerta alerta--ok");
        ok.appendChild(el("span", null, "Todo en orden. No hay alertas."));
        lista.appendChild(ok);
      }
      r.alertas.forEach(function (a) {
        var li = el("li", "alerta alerta--" + a.nivel);
        var txt = el("span", null, a.texto);
        txt.appendChild(el("small", null, a.detalle));
        li.appendChild(txt);
        var b = el("button", "btn-mini", "Ver");
        b.type = "button";
        b.addEventListener("click", function () { cambiarVista(a.vista); });
        li.appendChild(b);
        lista.appendChild(li);
      });

      $("notaDemo").hidden = !r.demo;
      $("panelDemo").hidden = !r.demo;
      actualizarContadores(r.contadores);
    });
  };

  function dibujarGrafico(serie) {
    var canvas = $("grafico");
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var ancho = canvas.parentElement.clientWidth - 40;
    var alto = 220;
    canvas.width = ancho * dpr;
    canvas.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var css = getComputedStyle(document.body);
    var acento = css.getPropertyValue("--color-3").trim();
    var tinta = css.getPropertyValue("--color-1").trim();
    var max = Math.max.apply(null, serie.map(function (s) { return s.total; }).concat([1]));
    var total = serie.reduce(function (s, d) { return s + d.total; }, 0);
    $("totalSerie").textContent = L.dinero(total);

    var abajo = 24, arriba = 16, izq = 4;
    var paso = (ancho - izq) / serie.length;
    var barra = Math.max(6, paso * 0.56);
    var inicio = null;

    function cuadro(t) {
      if (inicio === null) inicio = t;
      var p = Math.min(1, (t - inicio) / 700);
      p = 1 - Math.pow(1 - p, 3);
      ctx.clearRect(0, 0, ancho, alto);

      ctx.strokeStyle = "rgba(27,27,25,0.08)";
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1].forEach(function (f) {
        var y = Math.round(alto - abajo - (alto - abajo - arriba) * f) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ancho, y); ctx.stroke();
      });

      ctx.font = "11px 'Cascadia Code', monospace";
      ctx.textAlign = "center";
      serie.forEach(function (d, i) {
        var h = (alto - abajo - arriba) * (d.total / max) * p;
        var x = izq + paso * i + (paso - barra) / 2;
        ctx.fillStyle = i === serie.length - 1 ? tinta : acento;
        ctx.fillRect(x, alto - abajo - h, barra, h);
        if (i % 2 === serie.length % 2 || paso > 44) {
          ctx.fillStyle = "rgba(27,27,25,0.55)";
          ctx.fillText(d.fecha.slice(8, 10) + "/" + d.fecha.slice(5, 7), x + barra / 2, alto - 6);
        }
      });
      if (p < 1) requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
  }

  cargadores.productos = function () {
    api("productos").then(function (r) {
      if (!r.ok) return;
      cache.productos = r.productos;
      cache.config = r.config;
      pintarProductos();
    });
  };

  function pintarProductos() {
    var texto = $("buscarProducto").value.trim().toLowerCase();
    var cat = $("filtroCategoria").value;
    var umbral = cache.config ? cache.config.umbral_stock : 2;
    var cuerpo = $("tablaProductos");
    cuerpo.textContent = "";

    var lista = cache.productos.filter(function (p) {
      return (!cat || p.categoria === cat) && (!texto || p.nombre.toLowerCase().indexOf(texto) !== -1);
    });
    if (!lista.length) {
      var tr0 = el("tr");
      var td0 = el("td", null, "No hay productos con ese filtro.");
      td0.colSpan = 6;
      tr0.appendChild(td0);
      cuerpo.appendChild(tr0);
    }

    lista.forEach(function (p) {
      var tr = el("tr");

      var tdP = el("td");
      var celda = el("div", "celda-producto");
      celda.appendChild(miniatura(p));
      var nom = el("div");
      nom.appendChild(el("strong", null, p.nombre));
      nom.appendChild(el("small", null, (L.CATEGORIAS[p.categoria] || {}).nombre + " · " + p.color.nombre));
      celda.appendChild(nom);
      tdP.appendChild(celda);
      tr.appendChild(tdP);

      var tdPrecio = el("td", null, L.dinero(p.precio_actual));
      if (p.en_rebaja) tdPrecio.appendChild(el("small", null, "antes " + L.dinero(p.precio)));
      else if (p.rebaja && p.rebaja.precio) tdPrecio.appendChild(el("small", null, "rebaja programada " + (p.rebaja.inicio || "")));
      tr.appendChild(tdPrecio);

      var tdStock = el("td");
      var fila = el("div", "stock-fila");
      L.TALLAS.forEach(function (t) {
        var n = Number(p.stock[t] || 0);
        var c = el("label", "stock-celda" + (n === 0 ? " stock-celda--cero" : n <= umbral ? " stock-celda--bajo" : ""));
        var inp = el("input");
        inp.type = "number";
        inp.min = 0;
        inp.max = 999;
        inp.value = n;
        inp.setAttribute("aria-label", "Stock de " + p.nombre + " talla " + t);
        inp.dataset.previo = n;
        inp.addEventListener("change", function () { guardarStock(p, t, inp, c, umbral); });
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") inp.blur(); });
        c.appendChild(inp);
        c.appendChild(document.createTextNode(t));
        fila.appendChild(c);
      });
      tdStock.appendChild(fila);
      tr.appendChild(tdStock);

      var tdV = el("td", null, p.vendidas_30 + " u.");
      tdV.appendChild(el("small", null, p.dias_restantes === null ? "sin ventas" : "stock para ~" + p.dias_restantes + " d"));
      tr.appendChild(tdV);

      var tdE = el("td");
      var chips = el("div", "chips-resumen");
      chips.appendChild(p.activo ? estadoChip("Visible", "entregado") : estadoChip("Oculto", "inactivo"));
      if (p.en_rebaja) chips.appendChild(estadoChip("Rebaja", "nuevo"));
      if (p.nuevo) chips.appendChild(estadoChip("Nuevo", "enviado"));
      if (p.ajuste_talla) chips.appendChild(estadoChip("Talla " + (p.ajuste_talla > 0 ? "+1" : "−1"), "preparando"));
      tdE.appendChild(chips);
      tr.appendChild(tdE);

      var tdA = el("td");
      var acciones = el("div", "acciones-fila");
      var editar = el("button", "btn-mini", "Editar");
      editar.type = "button";
      editar.addEventListener("click", function () { abrirEditor(p); });
      var borrar = el("button", "btn-mini btn-mini--peligro", "Eliminar");
      borrar.type = "button";
      borrar.addEventListener("click", function () { eliminarProducto(p); });
      acciones.appendChild(editar);
      acciones.appendChild(borrar);
      tdA.appendChild(acciones);
      tr.appendChild(tdA);

      cuerpo.appendChild(tr);
    });
  }

  function guardarStock(p, talla, input, celda, umbral) {
    var valor = parseInt(input.value, 10);
    if (isNaN(valor) || valor < 0 || valor > 999) {
      input.value = input.dataset.previo;
      toast("El stock debe estar entre 0 y 999.");
      return;
    }
    api("stock", { id: p.id, talla: talla, valor: valor }).then(function (r) {
      if (!r.ok) {
        input.value = input.dataset.previo;
        toast(r.mensaje || "No se guardó.");
        return;
      }
      input.dataset.previo = valor;
      p.stock[talla] = valor;
      celda.className = "stock-celda" + (valor === 0 ? " stock-celda--cero" : valor <= umbral ? " stock-celda--bajo" : "");
      celda.classList.add("guardado");
      if (r.avisos_listos) {
        toast(r.avisos_listos + (r.avisos_listos === 1 ? " cliente espera" : " clientes esperan") + " esta talla. Ve a «Avisos».");
        refrescarContadores();
      } else {
        toast("Stock de " + p.nombre + " " + talla + ": " + valor);
      }
    });
  }

  function refrescarContadores() {
    api("resumen").then(function (r) { if (r.ok) actualizarContadores(r.contadores); });
  }

  function eliminarProducto(p) {
    if (!window.confirm("¿Eliminar «" + p.nombre + "»? Esta acción no se puede deshacer.")) return;
    api("eliminar_producto", { id: p.id }).then(function (r) {
      if (!r.ok) { toast(r.mensaje || "No se pudo eliminar."); return; }
      if ($("dlgEditor").open) $("dlgEditor").close();
      toast("Producto eliminado.");
      cargadores.productos();
    });
  }

  var editando = null;
  var urlVista = null;

  function vistaPrevia() {
    var form = $("formProducto");
    var caja = $("editorMiniatura");
    caja.textContent = "";
    var archivo = form.elements.imagen.files[0];
    if (urlVista) { URL.revokeObjectURL(urlVista); urlVista = null; }
    if (archivo) {
      urlVista = URL.createObjectURL(archivo);
      var img = el("img");
      img.src = urlVista;
      img.alt = "";
      caja.appendChild(img);
    } else if (editando && RUTA_IMAGEN.test(editando.imagen || "") && !form.elements.quitar_imagen.checked) {
      var actual = el("img");
      actual.src = "../" + editando.imagen;
      actual.alt = "";
      caja.appendChild(actual);
    } else {
      caja.insertAdjacentHTML("beforeend", L.svgPrenda(form.elements.categoria.value, form.elements.color_hex.value));
    }
  }

  function abrirEditor(p) {
    var form = $("formProducto");
    form.reset();
    editando = p || null;
    $("editorTitulo").textContent = p ? "Editar producto" : "Nuevo producto";
    $("eliminarProducto").hidden = !p;
    $("quitarImagenFila").hidden = !(p && p.imagen);
    $("errorProducto").textContent = "";

    form.elements.id.value = p ? p.id : "";
    form.elements.nombre.value = p ? p.nombre : "";
    form.elements.categoria.value = p ? p.categoria : "camisa";
    form.elements.holgura.value = p ? String(p.holgura || 0) : "0";
    form.elements.descripcion.value = p ? p.descripcion || "" : "";
    form.elements.precio.value = p ? p.precio : "";
    form.elements.color_nombre.value = p ? p.color.nombre : "";
    form.elements.color_hex.value = p ? L.colorSeguro(p.color.hex) : "#D6C6AA";
    L.TALLAS.forEach(function (t) { form.elements["stock_" + t].value = p ? p.stock[t] || 0 : 0; });
    var r = p && p.rebaja;
    form.elements.rebaja_precio.value = r ? r.precio : "";
    form.elements.rebaja_inicio.value = r ? r.inicio || "" : "";
    form.elements.rebaja_fin.value = r ? r.fin || "" : "";
    form.elements.activo.checked = p ? !!p.activo : true;

    vistaPrevia();
    $("dlgEditor").showModal();
    form.elements.nombre.focus();
  }

  function iniciarProductos() {
    var sel = $("filtroCategoria");
    var selEditor = $("eCategoria");
    Object.keys(L.CATEGORIAS).forEach(function (k) {
      sel.appendChild(new Option(L.CATEGORIAS[k].nombre, k));
      selEditor.appendChild(new Option(L.CATEGORIAS[k].nombre + " · " + L.GRUPOS[L.CATEGORIAS[k].grupo], k));
    });

    var stock = $("editorStock");
    L.TALLAS.forEach(function (t) {
      var c = el("div", "campo");
      var lab = el("label", null, t);
      lab.htmlFor = "eStock" + t;
      var inp = el("input");
      inp.type = "number";
      inp.id = "eStock" + t;
      inp.name = "stock_" + t;
      inp.min = 0;
      inp.max = 999;
      inp.value = 0;
      c.appendChild(lab);
      c.appendChild(inp);
      stock.appendChild(c);
    });

    $("buscarProducto").addEventListener("input", pintarProductos);
    sel.addEventListener("change", pintarProductos);
    $("nuevoProducto").addEventListener("click", function () { abrirEditor(null); });

    var form = $("formProducto");
    ["categoria", "color_hex", "imagen", "quitar_imagen"].forEach(function (n) {
      form.elements[n].addEventListener("change", vistaPrevia);
    });
    form.elements.color_hex.addEventListener("input", vistaPrevia);

    $("eliminarProducto").addEventListener("click", function () { if (editando) eliminarProducto(editando); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var error = $("errorProducto");
      error.textContent = "";
      var nombre = form.elements.nombre.value.trim();
      var precio = Number(form.elements.precio.value);
      var rebaja = Number(form.elements.rebaja_precio.value || 0);
      if (nombre.length < 3) { error.textContent = "El nombre debe tener al menos 3 caracteres."; return; }
      if (!(precio > 0)) { error.textContent = "Escribe un precio válido."; return; }
      if (rebaja && rebaja >= precio) { error.textContent = "La rebaja debe ser menor que el precio."; return; }
      var archivo = form.elements.imagen.files[0];
      if (archivo && archivo.size > 3 * 1024 * 1024) { error.textContent = "La foto pesa más de 3 MB."; return; }

      var datos = new FormData(form);
      datos.set("activo", form.elements.activo.checked ? "1" : "0");
      datos.set("quitar_imagen", form.elements.quitar_imagen.checked ? "1" : "");
      if (!archivo) datos.delete("imagen");

      var boton = $("guardarProducto");
      boton.disabled = true;
      api("guardar_producto", datos).then(function (r) {
        boton.disabled = false;
        if (!r.ok) { error.textContent = r.mensaje || "No se pudo guardar."; return; }
        $("dlgEditor").close();
        toast(r.avisos_listos
          ? "Guardado. " + avisosListosTexto(r.avisos_listos) + "."
          : "Producto guardado.");
        cargadores.productos();
        refrescarContadores();
      });
    });
  }

  var ESTADOS = { nuevo: "Nuevo", preparando: "Preparando", enviado: "Enviado", entregado: "Entregado", cancelado: "Cancelado" };
  var filtroPedido = "todos";

  cargadores.pedidos = function () {
    api("pedidos").then(function (r) {
      if (!r.ok) return;
      cache.pedidos = r.pedidos;
      pintarFiltroPedidos();
      pintarPedidos();
    });
  };

  function pintarFiltroPedidos() {
    var cont = $("filtroPedidos");
    cont.textContent = "";
    var opciones = [["todos", "Todos"]].concat(Object.keys(ESTADOS).map(function (k) { return [k, ESTADOS[k]]; }));
    opciones.forEach(function (o) {
      var n = o[0] === "todos" ? cache.pedidos.length : cache.pedidos.filter(function (p) { return p.estado === o[0]; }).length;
      var b = el("button", "chip" + (filtroPedido === o[0] ? " activo" : ""), o[1] + " · " + n);
      b.type = "button";
      b.setAttribute("aria-pressed", String(filtroPedido === o[0]));
      b.addEventListener("click", function () { filtroPedido = o[0]; pintarFiltroPedidos(); pintarPedidos(); });
      cont.appendChild(b);
    });
  }

  function pintarPedidos() {
    var cuerpo = $("tablaPedidos");
    cuerpo.textContent = "";
    var lista = cache.pedidos.filter(function (p) { return filtroPedido === "todos" || p.estado === filtroPedido; });
    if (!lista.length) {
      var tr0 = el("tr");
      var td0 = el("td", null, "No hay pedidos en este estado.");
      td0.colSpan = 6;
      tr0.appendChild(td0);
      cuerpo.appendChild(tr0);
    }
    lista.forEach(function (p) {
      var tr = el("tr");
      var tdN = el("td");
      tdN.appendChild(el("strong", null, p.numero));
      tdN.appendChild(el("small", null, fecha(p.fecha, true)));
      tr.appendChild(tdN);

      var tdC = el("td", null, p.cliente.nombre);
      tdC.appendChild(el("small", null, p.cliente.correo));
      tdC.appendChild(el("small", null, p.cliente.direccion + ", " + p.cliente.ciudad));
      tr.appendChild(tdC);

      var tdI = el("td");
      p.items.forEach(function (it) {
        tdI.appendChild(el("small", null, it.cantidad + " × " + it.nombre + " · " + it.talla));
      });
      tr.appendChild(tdI);

      var tdT = el("td", "num", L.dinero(p.total));
      tdT.appendChild(el("small", null, p.envio ? "envío " + L.dinero(p.envio) : "envío gratis"));
      tr.appendChild(tdT);

      tr.appendChild(el("td", null, p.pago === "transferencia" ? "Transferencia" : "Contra entrega"));

      var tdE = el("td");
      if (p.estado === "cancelado") {
        tdE.appendChild(estadoChip("Cancelado", "cancelado"));
      } else {
        var sel = el("select");
        sel.setAttribute("aria-label", "Estado del pedido " + p.numero);
        Object.keys(ESTADOS).forEach(function (k) { sel.appendChild(new Option(ESTADOS[k], k, false, k === p.estado)); });
        sel.addEventListener("change", function () { cambiarEstadoPedido(p, sel); });
        tdE.appendChild(sel);
      }
      tr.appendChild(tdE);
      cuerpo.appendChild(tr);
    });
  }

  function cambiarEstadoPedido(p, sel) {
    var nuevo = sel.value;
    if (nuevo === "cancelado" && !window.confirm("¿Cancelar " + p.numero + "? Sus unidades vuelven al stock.")) {
      sel.value = p.estado;
      return;
    }
    api("estado_pedido", { numero: p.numero, estado: nuevo }).then(function (r) {
      if (!r.ok) { sel.value = p.estado; toast(r.mensaje || "No se pudo cambiar."); return; }
      p.estado = nuevo;
      var msg = p.numero + ": " + ESTADOS[nuevo];
      if (r.unidades_repuestas) msg += ". " + r.unidades_repuestas + " unidades volvieron al stock";
      if (r.avisos_listos) msg += " y " + avisosListosTexto(r.avisos_listos);
      toast(msg + ".");
      pintarFiltroPedidos();
      pintarPedidos();
      refrescarContadores();
    });
  }

  function celdaCsv(v) {
    var s = String(v === undefined || v === null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function exportarPedidos() {
    var filas = [["Pedido", "Fecha", "Estado", "Cliente", "Correo", "Teléfono", "Dirección", "Ciudad", "Productos", "Subtotal", "Envío", "Total", "Pago"]];
    cache.pedidos.forEach(function (p) {
      filas.push([p.numero, p.fecha, p.estado, p.cliente.nombre, p.cliente.correo, p.cliente.telefono,
        p.cliente.direccion, p.cliente.ciudad,
        p.items.map(function (i) { return i.cantidad + "x " + i.sku; }).join(" | "),
        p.subtotal, p.envio, p.total, p.pago]);
    });
    var csv = "﻿" + filas.map(function (f) { return f.map(celdaCsv).join(","); }).join("\r\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var a = el("a");
    a.href = url;
    a.download = "pedidos-linaza-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  var ESTADO_AVISO = { pendiente: "Esperando stock", listo: "Listo para avisar", notificado: "Notificado" };

  cargadores.avisos = function () {
    api("avisos").then(function (r) {
      if (!r.ok) return;
      cache.avisos = r.avisos;
      pintarAvisos();
    });
  };

  function avisosListos() {
    return cache.avisos.filter(function (a) { return a.estado === "listo"; });
  }

  function pintarAvisos() {
    var listos = avisosListos();
    $("nListos").textContent = listos.length + (listos.length === 1 ? " cliente" : " clientes");
    ["copiarCorreos", "copiarMensaje", "marcarNotificados"].forEach(function (id) { $(id).disabled = !listos.length; });

    var cuerpo = $("tablaAvisos");
    cuerpo.textContent = "";
    if (!cache.avisos.length) {
      var tr0 = el("tr");
      var td0 = el("td", null, "Aún no hay avisos.");
      td0.colSpan = 5;
      tr0.appendChild(td0);
      cuerpo.appendChild(tr0);
    }
    cache.avisos.forEach(function (a) {
      var tr = el("tr");
      var tdC = el("td", null, a.nombre);
      tdC.appendChild(el("small", null, a.correo));
      tr.appendChild(tdC);
      tr.appendChild(el("td", null, a.producto));
      tr.appendChild(el("td", null, a.talla));
      tr.appendChild(el("td", null, fecha(a.fecha)));
      var tdE = el("td");
      tdE.appendChild(estadoChip(ESTADO_AVISO[a.estado] || a.estado, a.estado));
      tr.appendChild(tdE);
      cuerpo.appendChild(tr);
    });
  }

  function iniciarAvisos() {
    $("copiarCorreos").addEventListener("click", function () {
      var correos = avisosListos().map(function (a) { return a.correo; });
      copiar(Array.from(new Set(correos)).join(", "), correos.length + " correos copiados. Pégalos en CCO.");
    });
    $("copiarMensaje").addEventListener("click", function () {
      var prendas = Array.from(new Set(avisosListos().map(function (a) { return a.producto + " (" + a.talla + ")"; })));
      var texto = "Hola:\n\nLa prenda que nos pediste ya está disponible otra vez en tu talla: " + prendas.join(", ") +
        ".\n\nLas unidades son pocas, así que te avisamos primero.\n\nGracias por esperar,\nLinaza";
      copiar(texto, "Mensaje copiado.");
    });
    $("marcarNotificados").addEventListener("click", function () {
      var ids = avisosListos().map(function (a) { return a.id; });
      if (!ids.length) return;
      api("marcar_notificados", { ids: ids }).then(function (r) {
        if (!r.ok) { toast(r.mensaje || "No se pudo actualizar."); return; }
        toast(r.marcados + " avisos marcados como notificados.");
        cargadores.avisos();
        refrescarContadores();
      });
    });
  }

  var MOTIVOS = { pequena: "Pequeño", grande: "Grande", defecto: "Defecto", otro: "Otro" };

  cargadores.devoluciones = function () {
    var pedirProductos = cache.productos.length ? Promise.resolve() :
      api("productos").then(function (r) { if (r.ok) cache.productos = r.productos; });
    pedirProductos.then(function () {
      var sel = $("dProducto");
      var elegido = sel.value;
      sel.textContent = "";
      cache.productos.forEach(function (p) { sel.appendChild(new Option(p.nombre, p.id, false, p.id === elegido)); });
      return api("devoluciones");
    }).then(function (r) {
      if (!r || !r.ok) return;
      $("umbralTexto").textContent = "Umbral: " + r.umbral;

      var res = $("tablaResumenDev");
      res.textContent = "";
      r.resumen.forEach(function (x) {
        var tr = el("tr");
        tr.appendChild(el("td", null, x.nombre));
        var tdM = el("td");
        var chips = el("div", "chips-resumen");
        Object.keys(MOTIVOS).forEach(function (m) {
          if (x.conteo[m]) chips.appendChild(el("span", "chip-dato" + (m === "pequena" || m === "grande" ? " chip-dato--alerta" : ""), MOTIVOS[m] + " " + x.conteo[m]));
        });
        tdM.appendChild(chips);
        tr.appendChild(tdM);
        var tdA = el("td");
        tdA.appendChild(x.ajuste ? estadoChip(x.ajuste > 0 ? "Una talla más" : "Una talla menos", "preparando") : estadoChip("Sin cambio", "inactivo"));
        tr.appendChild(tdA);
        res.appendChild(tr);
      });
      if (!r.resumen.length) {
        var v = el("tr");
        var tdv = el("td", null, "Sin devoluciones.");
        tdv.colSpan = 3;
        v.appendChild(tdv);
        res.appendChild(v);
      }

      var cuerpo = $("tablaDevoluciones");
      cuerpo.textContent = "";
      r.devoluciones.forEach(function (d) {
        var tr = el("tr");
        tr.appendChild(el("td", null, fecha(d.fecha)));
        var tdP = el("td", null, d.producto);
        if (d.nota) tdP.appendChild(el("small", null, d.nota));
        tr.appendChild(tdP);
        tr.appendChild(el("td", null, d.talla));
        tr.appendChild(el("td", null, MOTIVOS[d.motivo] || d.motivo));
        tr.appendChild(el("td", null, d.pedido || "—"));
        var tdA = el("td");
        var b = el("button", "btn-mini btn-mini--peligro", "Quitar");
        b.type = "button";
        b.addEventListener("click", function () {
          if (!window.confirm("¿Quitar este registro de devolución?")) return;
          api("eliminar_devolucion", { id: d.id }).then(function () { cargadores.devoluciones(); });
        });
        tdA.appendChild(b);
        tr.appendChild(tdA);
        cuerpo.appendChild(tr);
      });
    });
  };

  function iniciarDevoluciones() {
    var tallas = $("dTalla");
    L.TALLAS.forEach(function (t) { tallas.appendChild(new Option(t, t, false, t === "M")); });

    $("formDevolucion").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var error = $("errorDevolucion");
      error.textContent = "";
      var pedido = f.elements.pedido.value.trim().toUpperCase();
      if (pedido && !/^LNZ-\d{4,6}$/.test(pedido)) { error.textContent = "El pedido tiene el formato LNZ-1234."; return; }
      api("registrar_devolucion", {
        producto_id: f.elements.producto_id.value,
        talla: f.elements.talla.value,
        motivo: f.elements.motivo.value,
        pedido: pedido,
        nota: f.elements.nota.value.trim(),
        reingresar: f.elements.reingresar.checked
      }).then(function (r) {
        if (!r.ok) { error.textContent = r.mensaje || "No se pudo registrar."; return; }
        var msg = "Devolución registrada.";
        if (r.ajuste) msg += " La tienda ahora recomienda una talla " + (r.ajuste > 0 ? "más" : "menos") + " en este modelo.";
        if (r.avisos_listos) msg += " " + avisosListosTexto(r.avisos_listos) + ".";
        toast(msg);
        f.elements.pedido.value = "";
        f.elements.nota.value = "";
        cache.productos = [];
        cargadores.devoluciones();
      });
    });
  }

  cargadores.automatizaciones = function () {
    api("config").then(function (r) {
      if (!r.ok) return;
      var f = $("formConfig");
      Object.keys(r.config).forEach(function (k) {
        var campo = f.elements[k];
        if (!campo) return;
        if (campo.type === "checkbox") campo.checked = !!r.config[k];
        else campo.value = r.config[k];
      });
    });
    api("resumen").then(function (r) { if (r.ok) $("panelDemo").hidden = !r.demo; });
  };

  function iniciarAutomatizaciones() {
    var f = $("formConfig");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var datos = {};
      Array.prototype.forEach.call(f.elements, function (c) {
        if (!c.name) return;
        datos[c.name] = c.type === "checkbox" ? c.checked : Number(c.value);
      });
      api("guardar_config", datos).then(function (r) {
        $("errorConfig").textContent = r.ok ? "" : (r.mensaje || "No se pudo guardar.");
        if (r.ok) toast("Automatizaciones guardadas.");
      });
    });

    $("borrarDemo").addEventListener("click", function () {
      if (!window.confirm("¿Borrar los pedidos, avisos y devoluciones de ejemplo?")) return;
      api("borrar_demo").then(function (r) {
        if (!r.ok) { toast(r.mensaje || "No se pudo borrar."); return; }
        toast("Datos de ejemplo borrados.");
        $("panelDemo").hidden = true;
        refrescarContadores();
      });
    });
  }

  function logoAliado(m) {
    var caja = el("span", "celda-producto");
    var simbolo = el("span", L.esLogo(m.simbolo) ? "aliado__logo logo-tabla" : "aliado__simbolo");
    simbolo.insertAdjacentHTML("beforeend", L.esLogo(m.simbolo) ? L.svgLogo(m.simbolo, 20) : L.svgSimbolo(m.simbolo));
    caja.appendChild(simbolo);
    var texto = el("span");
    texto.appendChild(el("strong", null, m.nombre));
    if (m.url) texto.appendChild(el("small", null, m.url));
    caja.appendChild(texto);
    return caja;
  }

  cargadores.patrocinadores = function () {
    api("patrocinadores").then(function (r) {
      if (!r.ok) return;
      var lista = r.patrocinadores;
      var visibles = lista.filter(function (m) { return m.activo; }).length;
      $("nPatrocinadores").textContent = visibles + " visibles de " + lista.length;
      var cuerpo = $("tablaPatrocinadores");
      cuerpo.textContent = "";
      if (!lista.length) {
        var tr0 = el("tr");
        var td0 = el("td", null, "Aún no hay marcas. El carrusel no se muestra en la tienda.");
        td0.colSpan = 3;
        tr0.appendChild(td0);
        cuerpo.appendChild(tr0);
      }
      lista.forEach(function (m, i) {
        var tr = el("tr");
        var tdM = el("td");
        tdM.appendChild(logoAliado(m));
        tr.appendChild(tdM);

        var tdE = el("td");
        tdE.appendChild(m.activo ? estadoChip("Visible", "entregado") : estadoChip("Oculta", "inactivo"));
        tr.appendChild(tdE);

        var tdA = el("td");
        var acciones = el("div", "acciones-fila");
        [
          ["↑", "Subir", function () { return api("mover_patrocinador", { id: m.id, paso: -1 }); }, i === 0],
          ["↓", "Bajar", function () { return api("mover_patrocinador", { id: m.id, paso: 1 }); }, i === lista.length - 1],
          [m.activo ? "Ocultar" : "Mostrar", null, function () { return api("alternar_patrocinador", { id: m.id }); }, false],
          ["Eliminar", null, function () {
            if (!window.confirm("¿Eliminar «" + m.nombre + "» del carrusel?")) return Promise.resolve({ ok: false, cancelado: true });
            return api("eliminar_patrocinador", { id: m.id });
          }, false]
        ].forEach(function (a) {
          var b = el("button", "btn-mini" + (a[0] === "Eliminar" ? " btn-mini--peligro" : ""), a[0]);
          b.type = "button";
          b.disabled = a[3];
          if (a[1]) b.setAttribute("aria-label", a[1] + " " + m.nombre);
          b.addEventListener("click", function () {
            a[2]().then(function (res) {
              if (res.ok) cargadores.patrocinadores();
              else if (!res.cancelado) toast(res.mensaje || "No se pudo actualizar.");
            });
          });
          acciones.appendChild(b);
        });
        tdA.appendChild(acciones);
        tr.appendChild(tdA);
        cuerpo.appendChild(tr);
      });
    });
  };

  function iniciarPatrocinadores() {
    var f = $("formPatrocinador");
    var sel = $("mSimbolo");
    var grupoLogos = el("optgroup");
    grupoLogos.label = "Logos de marcas";
    Object.keys(L.LOGOS).forEach(function (k) { grupoLogos.appendChild(new Option(L.LOGOS[k].nombre, k)); });
    sel.appendChild(grupoLogos);
    var grupoSimbolos = el("optgroup");
    grupoSimbolos.label = "Otra marca (símbolo genérico)";
    Object.keys(L.SIMBOLOS).forEach(function (k) { grupoSimbolos.appendChild(new Option(L.SIMBOLOS[k].nombre, k)); });
    sel.appendChild(grupoSimbolos);

    var nombreAuto = "";
    function vista() {
      var caja = $("mVista");
      caja.textContent = "";
      if (L.esLogo(sel.value)) {
        var logo = el("span", "aliado__logo");
        logo.insertAdjacentHTML("beforeend", L.svgLogo(sel.value, 30));
        caja.appendChild(logo);
        return;
      }
      var simbolo = el("span", "aliado__simbolo");
      simbolo.insertAdjacentHTML("beforeend", L.svgSimbolo(sel.value));
      caja.appendChild(simbolo);
      caja.appendChild(el("span", "aliado__nombre", f.elements.nombre.value.trim() || "Nombre de la marca"));
    }
    f.elements.nombre.addEventListener("input", vista);
    sel.addEventListener("change", function () {
      var nombre = f.elements.nombre;
      if (L.esLogo(sel.value) && (!nombre.value.trim() || nombre.value === nombreAuto)) {
        nombreAuto = L.LOGOS[sel.value].nombre;
        nombre.value = nombreAuto;
      }
      vista();
    });
    f.addEventListener("reset", function () { setTimeout(function () { nombreAuto = ""; sel.dispatchEvent(new Event("change")); }, 0); });
    sel.dispatchEvent(new Event("change"));

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var error = $("errorPatrocinador");
      var nombre = f.elements.nombre.value.trim();
      var url = f.elements.url.value.trim();
      error.textContent = "";
      if (nombre.length < 2) { error.textContent = "Escribe el nombre de la marca."; return; }
      if (url && !/^https?:\/\/[^\s"'<>]+$/i.test(url)) { error.textContent = "El enlace debe empezar con https://"; return; }
      api("guardar_patrocinador", { nombre: nombre, simbolo: sel.value, url: url }).then(function (r) {
        if (!r.ok) { error.textContent = r.mensaje || "No se pudo agregar."; return; }
        toast(nombre + " ya aparece en el carrusel de la tienda.");
        f.reset();
        vista();
        cargadores.patrocinadores();
      });
    });
  }

  function iniciarDialogos() {
    document.querySelectorAll("dialog").forEach(function (d) {
      d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    });
    document.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cerrar]");
      if (c) c.closest("dialog").close();
    });
  }

  document.querySelectorAll(".lateral__nav button").forEach(function (b) {
    b.addEventListener("click", function () { cambiarVista(b.dataset.vista); });
  });
  $("exportarPedidos").addEventListener("click", exportarPedidos);

  iniciarDialogos();
  iniciarAcceso();
  iniciarProductos();
  iniciarAvisos();
  iniciarDevoluciones();
  iniciarAutomatizaciones();
  iniciarPatrocinadores();

  if (location.protocol !== "http:" && location.protocol !== "https:") {
    $("pantallaAcceso").hidden = false;
    $("accesoTexto").textContent = "El panel necesita PHP. Abre el sitio desde XAMPP (http://localhost/…).";
    $("formAcceso").hidden = true;
    return;
  }

  fetch("../api/token.php", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      token = d.token || "";
      return api("estado");
    })
    .then(function (r) {
      if (!r.ok) throw new Error("estado");
      if (!r.configurado) { configurarModoSetup(r.local); mostrarAcceso(false); }
      else if (r.sesion) mostrarPanel();
      else mostrarAcceso(false);
    })
    .catch(function () {
      $("pantallaAcceso").hidden = false;
      $("accesoTexto").textContent = "No hay conexión con el servidor PHP.";
      $("formAcceso").hidden = true;
    });
})();
