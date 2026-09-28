(function () {
  "use strict";

  var L = window.Linaza;
  document.documentElement.classList.add("js");

  var reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hayServidor = location.protocol === "http:" || location.protocol === "https:";
  var css = getComputedStyle(document.body);
  var PALETA = {
    oscuro: css.getPropertyValue("--color-1").trim() || "#1B1B19",
    claro: css.getPropertyValue("--color-2").trim() || "#F4F1EB",
    acento: css.getPropertyValue("--color-3").trim() || "#B4532A"
  };

  function $(id) { return document.getElementById(id); }

  function el(etiqueta, clase, texto) {
    var nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined && texto !== null) nodo.textContent = texto;
    return nodo;
  }

  var almacen = {
    leer: function (clave) {
      try { return JSON.parse(localStorage.getItem(clave)); } catch (e) { return null; }
    },
    guardar: function (clave, valor) {
      try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {  }
    }
  };

  var estado = {
    productos: [],
    envio: { gratis_desde: 80, costo: 6 },
    medidas: almacen.leer("linaza_medidas"),
    bolsa: Array.isArray(almacen.leer("linaza_bolsa")) ? almacen.leer("linaza_bolsa") : [],
    filtro: { grupo: "todo", texto: "", soloMiTalla: false, orden: "destacados" },
    visibles: 8,
    token: ""
  };
  var POR_PAGINA = 8;

  function buscarProducto(id) {
    for (var i = 0; i < estado.productos.length; i++) {
      if (estado.productos[i].id === id) return estado.productos[i];
    }
    return null;
  }

  function agotado(p) {
    return L.TALLAS.every(function (t) { return p.tallas[t] === "agotada"; });
  }

  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  var RUTA_IMAGEN = /^uploads\/productos\/[a-f0-9]{20}\.(jpg|png|webp)$/;
  function pintarMedio(contenedor, p) {
    if (p.imagen && RUTA_IMAGEN.test(p.imagen)) {
      var img = el("img");
      img.src = "../" + p.imagen;
      img.alt = p.nombre;
      img.loading = "lazy";
      contenedor.appendChild(img);
    } else {
      contenedor.insertAdjacentHTML("beforeend", L.svgPrenda(p.categoria, p.color && p.color.hex));
    }
  }

  function crearPrecio(p) {
    var span = el("span", "precio" + (p.precio_original ? " precio--rebaja" : ""), L.dinero(p.precio));
    if (p.precio_original) span.appendChild(el("del", null, L.dinero(p.precio_original)));
    return span;
  }

  var temporizadorToast;
  function toast(mensaje) {
    var t = $("toast");
    t.textContent = mensaje;
    t.classList.add("visible");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(function () { t.classList.remove("visible"); }, 2600);
  }

  function irA(selector) {
    var destino = document.querySelector(selector);
    if (destino) destino.scrollIntoView({ behavior: reducirMovimiento ? "auto" : "smooth" });
  }

  function iniciarBanner() {
    var canvas = $("bannerCanvas");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var ancho = 0, alto = 0, movil = false;
    var inicio = null, cuadro = null, visible = true;

    var PRENDAS = [
      { cat: "camisa", color: PALETA.claro },
      { cat: "pantalon", color: PALETA.acento },
      { cat: "vestido", color: "#BDB7AC" }
    ];

    function medir() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = canvas.parentElement.clientWidth;
      movil = ancho < 640;
      alto = movil ? Math.round(ancho * 1.1) : Math.round(Math.min(Math.max(ancho * 0.42, 400), 620));
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function suave(t) { return 1 - Math.pow(1 - t, 3); }
    function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function textoEnLineas(texto, x, y, anchoMax, altoLinea) {
      var palabras = texto.split(" "), linea = "";
      palabras.forEach(function (palabra) {
        var prueba = linea ? linea + " " + palabra : palabra;
        if (ctx.measureText(prueba).width > anchoMax && linea) {
          ctx.fillText(linea, x, y);
          linea = palabra;
          y += altoLinea;
        } else {
          linea = prueba;
        }
      });
      ctx.fillText(linea, x, y);
    }

    function dibujarGancho(x, y, anchoHombros) {
      ctx.strokeStyle = "rgba(232, 230, 225, 0.85)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x, y + 7, 7, Math.PI * 1.05, Math.PI * 0.1, false);
      ctx.lineTo(x, y + 22);
      ctx.moveTo(x, y + 22);
      ctx.lineTo(x - anchoHombros / 2, y + 44);
      ctx.lineTo(x + anchoHombros / 2, y + 44);
      ctx.closePath();
      ctx.stroke();
    }

    function dibujar(ms) {
      var p = reducirMovimiento ? 1 : suave(limitar(ms / 1600, 0, 1));
      var margen = movil ? 20 : Math.max(24, (ancho - 1320) / 2);

      ctx.fillStyle = PALETA.oscuro;
      ctx.fillRect(0, 0, ancho, alto);

      var luz = ctx.createRadialGradient(ancho * (movil ? 0.5 : 0.73), alto * (movil ? 0.75 : 0.5), 0,
        ancho * (movil ? 0.5 : 0.73), alto * (movil ? 0.75 : 0.5), Math.max(ancho, alto) * 0.55);
      luz.addColorStop(0, "rgba(232, 230, 225, 0.09)");
      luz.addColorStop(1, "rgba(232, 230, 225, 0)");
      ctx.fillStyle = luz;
      ctx.fillRect(0, 0, ancho, alto);

      ctx.strokeStyle = "rgba(232, 230, 225, 0.035)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var y = 2; y < alto; y += 5) { ctx.moveTo(0, y); ctx.lineTo(ancho * p, y); }
      ctx.stroke();

      var tTexto = reducirMovimiento ? 1 : suave(limitar((ms - 200) / 1000, 0, 1));
      var sube = (1 - tTexto) * 16;
      ctx.globalAlpha = tTexto;
      ctx.fillStyle = PALETA.claro;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      var yEtiqueta = movil ? 30 : alto * 0.2;

      var tamTitulo = limitar(ancho * (movil ? 0.19 : 0.095), 54, 144);
      ctx.font = "600 " + tamTitulo + "px 'Cascadia Code', monospace";
      var yTitulo = yEtiqueta + tamTitulo * 1.05;
      ctx.fillText("Linaza", margen, yTitulo + sube);

      var tamFrase = limitar(ancho * 0.016, 15, 21);
      ctx.font = "400 " + tamFrase + "px 'Cascadia Code', monospace";
      textoEnLineas("Ropa de lino que te queda desde la primera vez.", margen, yTitulo + tamFrase * 2.2 + sube,
        movil ? ancho - margen * 2 : Math.min(ancho * 0.36, 460), tamFrase * 1.45);
      ctx.globalAlpha = 1;

      var zonaX = movil ? 0 : ancho * 0.5;
      var zonaAncho = movil ? ancho : ancho * 0.46;
      var rielY = movil ? alto * 0.55 : alto * 0.1;
      var altoPrenda = movil ? alto * 0.4 : alto * 0.72;
      var escala = altoPrenda / 360;

      ctx.strokeStyle = "rgba(232, 230, 225, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(zonaX + (movil ? 12 : 0), rielY);
      ctx.lineTo(zonaX + zonaAncho - (movil ? 12 : 0), rielY);
      ctx.stroke();

      PRENDAS.forEach(function (prenda, i) {
        var entrada = reducirMovimiento ? 1 : suave(limitar((ms - 300 - i * 180) / 1100, 0, 1));
        var cx = zonaX + zonaAncho * (i + 0.5) / PRENDAS.length;
        var vaiven = reducirMovimiento ? 0 : Math.sin(ms / 1500 + i * 1.3) * 0.018;

        ctx.save();
        ctx.globalAlpha = entrada;
        ctx.translate(cx, rielY - (1 - entrada) * 40);
        ctx.rotate(vaiven);
        dibujarGancho(0, -7, 170 * escala);
        ctx.shadowColor = "rgba(27, 27, 25, 0.25)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 14;
        L.dibujarPrenda(ctx, prenda.cat, prenda.color, -150 * escala, 36 - 50 * escala, escala);
        ctx.restore();
      });
    }

    function bucle(ahora) {
      if (inicio === null) inicio = ahora;
      dibujar(ahora - inicio);
      cuadro = (visible && !reducirMovimiento) ? requestAnimationFrame(bucle) : null;
    }

    function arrancar() {
      medir();
      if (reducirMovimiento) { dibujar(0); return; }
      cuadro = requestAnimationFrame(bucle);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && !cuadro && !reducirMovimiento) cuadro = requestAnimationFrame(bucle);
      }).observe(canvas);
    }

    var espera;
    window.addEventListener("resize", function () {
      clearTimeout(espera);
      espera = setTimeout(function () {
        medir();
        dibujar(inicio === null ? 0 : performance.now() - inicio);
      }, 120);
    });

    var fuente = document.fonts && document.fonts.load
      ? document.fonts.load("600 64px 'Cascadia Code'")
      : Promise.resolve();
    Promise.race([fuente, new Promise(function (r) { setTimeout(r, 1500); })]).then(arrancar, arrancar);
  }

  function iniciarNavegacion() {
    var encabezado = document.querySelector(".encabezado");
    var barra = document.querySelector(".barra");
    var boton = document.querySelector(".barra__toggle");
    var menu = $("menu");

    function cerrarMenu() {
      menu.classList.remove("abierto");
      boton.setAttribute("aria-expanded", "false");
    }
    boton.addEventListener("click", function () {
      boton.setAttribute("aria-expanded", String(menu.classList.toggle("abierto")));
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) cerrarMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarMenu(); });

    var altoBarra = barra.offsetHeight;
    var fija = false;
    function revisar() {
      var debe = window.scrollY > altoBarra + 120;
      if (debe !== fija) {
        fija = debe;
        barra.classList.toggle("barra--fija", fija);
        encabezado.style.paddingTop = fija ? altoBarra + "px" : "";
      }
    }
    window.addEventListener("scroll", revisar, { passive: true });
    revisar();

    $("abrirBusqueda").addEventListener("click", function () {
      irA("#tienda");
      setTimeout(function () { $("buscar").focus({ preventScroll: true }); }, reducirMovimiento ? 0 : 500);
    });
    $("abrirBolsa").addEventListener("click", abrirBolsa);

    if (!("IntersectionObserver" in window)) return;
    var enlaces = menu.querySelectorAll("a[href^='#']");
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        enlaces.forEach(function (a) {
          a.classList.toggle("activo", a.getAttribute("href") === "#" + en.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { obs.observe(s); });
  }

  function cargarCatalogo() {
    var respaldo = { productos: L.CATALOGO_LOCAL, envio: estado.envio };
    if (!hayServidor) return Promise.resolve(respaldo);
    return fetch("../api/productos.php", { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("catálogo"); return r.json(); })
      .then(function (d) { return Array.isArray(d.productos) ? d : respaldo; })
      .catch(function () { return respaldo; });
  }

  function aplicarCatalogo(datos) {
    estado.productos = datos.productos;
    if (datos.envio) estado.envio = datos.envio;
    estado.bolsa = estado.bolsa.filter(function (l) { return buscarProducto(l.id); });
    guardarBolsa();
    pintarProductos();
    pintarBolsa();
    if (estado.medidas) pintarResultadoTalla(false);
  }

  function disponibleEnMiTalla(p) {
    var t = L.recomendar(p, estado.medidas);
    return t && p.tallas[t] !== "agotada";
  }

  function productosFiltrados() {
    var f = estado.filtro;
    var texto = normalizar(f.texto.trim());
    var lista = estado.productos.filter(function (p) {
      if (f.grupo !== "todo" && p.grupo !== f.grupo) return false;
      if (texto) {
        var cat = (L.CATEGORIAS[p.categoria] || {}).nombre || "";
        if (normalizar(p.nombre + " " + (p.color && p.color.nombre) + " " + cat).indexOf(texto) === -1) return false;
      }
      if (f.soloMiTalla && !disponibleEnMiTalla(p)) return false;
      return true;
    });
    var orden = {
      destacados: function (a, b) { return (agotado(a) - agotado(b)) || (a.orden - b.orden); },
      nuevos: function (a, b) { return (b.nuevo - a.nuevo) || (a.orden - b.orden); },
      "precio-asc": function (a, b) { return a.precio - b.precio; },
      "precio-desc": function (a, b) { return b.precio - a.precio; }
    }[f.orden];
    return lista.sort(orden);
  }

  function crearTarjeta(p, i) {
    var rec = L.recomendar(p, estado.medidas);
    var art = el("article", "producto");
    art.style.setProperty("--retraso", Math.min(i, 8) * 0.05 + "s");

    var marco = el("div", "producto__marco");
    var media = el("button", "producto__media");
    media.type = "button";
    media.setAttribute("aria-label", "Ver " + p.nombre);
    pintarMedio(media, p);

    var insignias = el("div", "insignias");
    if (p.nuevo) insignias.appendChild(el("span", "insignia", "Nuevo"));
    if (p.precio_original) {
      insignias.appendChild(el("span", "insignia insignia--rebaja",
        "−" + Math.round((1 - p.precio / p.precio_original) * 100) + "%"));
    }
    if (agotado(p)) insignias.appendChild(el("span", "insignia insignia--agotado", "Agotado"));
    else if (p.ajuste_talla > 0) insignias.appendChild(el("span", "insignia", "Queda pequeño"));
    else if (p.ajuste_talla < 0) insignias.appendChild(el("span", "insignia", "Queda grande"));
    media.appendChild(insignias);
    media.addEventListener("click", function () { abrirFicha(p.id); });
    marco.appendChild(media);

    if (!agotado(p)) {
      var rapido = el("div", "rapido");
      rapido.appendChild(el("p", "rapido__titulo", "Añadir rápido"));
      var tallas = el("div", "rapido__tallas");
      L.TALLAS.forEach(function (t) {
        var b = el("button", t === rec ? "recomendada" : "", t);
        b.type = "button";
        b.disabled = p.tallas[t] === "agotada";
        b.setAttribute("aria-label", "Añadir " + p.nombre + " talla " + t + (b.disabled ? " (agotada)" : ""));
        b.addEventListener("click", function () { agregarABolsa(p.id, t); });
        tallas.appendChild(b);
      });
      rapido.appendChild(tallas);
      marco.appendChild(rapido);
    }
    art.appendChild(marco);

    var info = el("div", "producto__info");
    var fila = el("div", "producto__fila");
    var nombre = el("h3", "producto__nombre");
    var boton = el("button", null, p.nombre);
    boton.type = "button";
    boton.addEventListener("click", function () { abrirFicha(p.id); });
    nombre.appendChild(boton);
    fila.appendChild(nombre);
    fila.appendChild(crearPrecio(p));
    info.appendChild(fila);

    var color = el("p", "producto__color");
    var muestra = el("span", "muestra");
    muestra.style.background = L.colorSeguro(p.color && p.color.hex);
    color.appendChild(muestra);
    color.appendChild(document.createTextNode(p.color ? p.color.nombre : ""));
    info.appendChild(color);

    if (rec) {
      var st = p.tallas[rec];
      info.appendChild(el("p", "producto__talla-tuya",
        st === "agotada" ? "Tu talla (" + rec + ") está agotada" :
        "Tu talla: " + rec + (st === "pocas" ? " · últimas unidades" : "")));
    }
    art.appendChild(info);
    return art;
  }

  function pintarProductos(soloNuevos) {
    var cont = $("productos");
    var lista = productosFiltrados();
    var desde = soloNuevos ? cont.children.length : 0;
    if (!soloNuevos) cont.textContent = "";
    var frag = document.createDocumentFragment();
    lista.slice(desde, estado.visibles).forEach(function (p, i) { frag.appendChild(crearTarjeta(p, i)); });
    cont.appendChild(frag);
    $("vacio").hidden = lista.length > 0;
    $("conteo").textContent = lista.length + (lista.length === 1 ? " producto" : " productos");
    pintarVerMas(lista.length);
  }

  function pintarVerMas(total) {
    var mostrados = Math.min(estado.visibles, total);
    var restantes = total - mostrados;
    $("verMas").hidden = total <= POR_PAGINA;
    $("verMasTexto").textContent = restantes > 0
      ? "Estás viendo " + mostrados + " de " + total + " prendas"
      : "Ya viste las " + total + " prendas de la colección";
    $("verMasBarra").style.width = (total ? mostrados / total * 100 : 0) + "%";
    $("botonVerMas").hidden = restantes <= 0;
    $("botonVerMasTexto").textContent = "Ver " + Math.min(POR_PAGINA, restantes) + " más";
  }

  function reiniciarPaginas() {
    estado.visibles = POR_PAGINA;
  }

  function elegirGrupo(grupo) {
    reiniciarPaginas();
    estado.filtro.grupo = grupo;
    document.querySelectorAll(".chip").forEach(function (c) {
      var activo = c.dataset.grupo === grupo;
      c.classList.toggle("activo", activo);
      c.setAttribute("aria-pressed", String(activo));
    });
    pintarProductos();
  }

  function iniciarFiltros() {
    document.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () { elegirGrupo(c.dataset.grupo); });
    });

    document.querySelectorAll(".categoria").forEach(function (c) {
      var img = c.querySelector(".categoria__img");
      img.insertAdjacentHTML("beforeend", L.svgPrenda(img.dataset.prenda, img.dataset.color));
      c.addEventListener("click", function () {
        elegirGrupo(c.dataset.grupo);
        irA("#tienda");
      });
    });

    var espera;
    $("buscar").addEventListener("input", function (e) {
      clearTimeout(espera);
      espera = setTimeout(function () {
        estado.filtro.texto = e.target.value.slice(0, 40);
        reiniciarPaginas();
        pintarProductos();
      }, 150);
    });
    $("orden").addEventListener("change", function (e) {
      estado.filtro.orden = e.target.value;
      reiniciarPaginas();
      pintarProductos();
    });
    $("soloMiTalla").addEventListener("change", function (e) {
      estado.filtro.soloMiTalla = e.target.checked;
      reiniciarPaginas();
      pintarProductos();
    });
    $("botonVerMas").addEventListener("click", function () {
      var boton = $("botonVerMas");
      var primeraNueva = $("productos").children.length;
      estado.visibles += POR_PAGINA;
      boton.classList.add("cargando");
      pintarProductos(true);
      setTimeout(function () { boton.classList.remove("cargando"); }, 500);
      var nueva = $("productos").children[primeraNueva];
      if (nueva) {
        var enlace = nueva.querySelector(".producto__media");
        if (enlace) enlace.focus({ preventScroll: true });
      }
    });
    $("limpiarFiltros").addEventListener("click", function () {
      estado.filtro.texto = "";
      estado.filtro.soloMiTalla = false;
      $("buscar").value = "";
      $("soloMiTalla").checked = false;
      elegirGrupo("todo");
    });
  }

  var ficha = { producto: null, talla: null };

  function abrirFicha(id) {
    var p = buscarProducto(id);
    if (!p) return;
    var rec = L.recomendar(p, estado.medidas);
    ficha.producto = p;
    ficha.talla = rec && p.tallas[rec] !== "agotada" ? rec : null;

    var media = $("fichaMedia");
    media.textContent = "";
    pintarMedio(media, p);

    $("fichaCategoria").textContent = (L.CATEGORIAS[p.categoria] || {}).nombre || "";
    $("fichaNombre").textContent = p.nombre;
    var precio = $("fichaPrecio");
    precio.textContent = "";
    precio.appendChild(crearPrecio(p));

    var color = $("fichaColor");
    color.textContent = "";
    var muestra = el("span", "muestra");
    muestra.style.background = L.colorSeguro(p.color && p.color.hex);
    color.appendChild(muestra);
    color.appendChild(document.createTextNode(p.color ? p.color.nombre : ""));

    $("fichaDescripcion").textContent = p.descripcion || "";

    var nota = "";
    if (rec) {
      nota = "Te recomendamos la " + rec + ".";
      if (p.ajuste_talla > 0) nota += " Este modelo queda pequeño; ya subimos una talla.";
      if (p.ajuste_talla < 0) nota += " Este modelo queda grande; ya bajamos una talla.";
    } else if (p.ajuste_talla > 0) {
      nota = "Este modelo queda pequeño: te conviene una talla más.";
    } else if (p.ajuste_talla < 0) {
      nota = "Este modelo queda grande: te conviene una talla menos.";
    }
    $("fichaRecomendacion").textContent = nota;
    $("fichaError").textContent = "";

    pintarTallasFicha(rec);
    $("dlgProducto").showModal();
  }

  function pintarTallasFicha(rec) {
    var p = ficha.producto;
    var cont = $("fichaTallas");
    cont.textContent = "";
    L.TALLAS.forEach(function (t) {
      var st = p.tallas[t];
      var b = el("button", "talla" + (st === "agotada" ? " talla--agotada" : ""), t);
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(ficha.talla === t));
      b.setAttribute("aria-label", "Talla " + t + (st === "agotada" ? ", agotada" : st === "pocas" ? ", últimas unidades" : ""));
      if (t === rec) b.appendChild(el("span", "talla__marca", "TÚ"));
      b.addEventListener("click", function () {
        ficha.talla = t;
        cont.querySelectorAll(".talla").forEach(function (x) {
          x.setAttribute("aria-checked", String(x === b));
        });
        $("fichaError").textContent = "";
        actualizarBotonesFicha();
      });
      cont.appendChild(b);
    });
    actualizarBotonesFicha();
  }

  function actualizarBotonesFicha() {
    var p = ficha.producto;
    var t = ficha.talla;
    var sinStock = t ? p.tallas[t] === "agotada" : agotado(p);
    $("fichaAgregar").hidden = sinStock;
    $("fichaAvisar").hidden = !sinStock;
  }

  function iniciarFicha() {
    $("fichaAgregar").addEventListener("click", function () {
      if (!ficha.talla) { $("fichaError").textContent = "Elige una talla."; return; }
      agregarABolsa(ficha.producto.id, ficha.talla);
      $("dlgProducto").close();
      abrirBolsa();
    });
    $("fichaAvisar").addEventListener("click", function () {
      if (!ficha.talla) { $("fichaError").textContent = "Elige la talla que buscas."; return; }
      $("dlgProducto").close();
      abrirAviso(ficha.producto, ficha.talla);
    });
    document.querySelector("[data-ir-guia]").addEventListener("click", function (e) {
      e.preventDefault();
      $("dlgProducto").close();
      irA("#guia");
    });
  }

  function guardarBolsa() { almacen.guardar("linaza_bolsa", estado.bolsa); }

  function agregarABolsa(id, talla) {
    var p = buscarProducto(id);
    if (!p || p.tallas[talla] === "agotada") return;
    var linea = estado.bolsa.find(function (l) { return l.id === id && l.talla === talla; });
    if (linea) linea.cantidad = Math.min(5, linea.cantidad + 1);
    else estado.bolsa.push({ id: id, talla: talla, cantidad: 1 });
    guardarBolsa();
    pintarBolsa();

    var num = $("bolsaNum");
    num.classList.remove("salto");
    void num.offsetWidth;
    num.classList.add("salto");
    toast(p.nombre + " · talla " + talla + " añadido a la bolsa");
  }

  function calcularTotales() {
    var subtotal = estado.bolsa.reduce(function (s, l) {
      var p = buscarProducto(l.id);
      return s + (p ? p.precio * l.cantidad : 0);
    }, 0);
    var envio = subtotal === 0 || subtotal >= estado.envio.gratis_desde ? 0 : estado.envio.costo;
    return { subtotal: subtotal, envio: envio, total: subtotal + envio };
  }

  function pintarBolsa() {
    var cantidad = estado.bolsa.reduce(function (s, l) { return s + l.cantidad; }, 0);
    $("bolsaNum").textContent = cantidad;
    $("bolsaCuenta").textContent = cantidad ? "(" + cantidad + ")" : "";

    var lista = $("bolsaLineas");
    lista.textContent = "";
    estado.bolsa.forEach(function (l, indice) {
      var p = buscarProducto(l.id);
      if (!p) return;
      var li = el("li", "linea");

      var img = el("div", "linea__img");
      pintarMedio(img, p);
      li.appendChild(img);

      var centro = el("div");
      centro.appendChild(el("p", "linea__nombre", p.nombre));
      centro.appendChild(el("p", "linea__meta", "Talla " + l.talla + " · " + (p.color ? p.color.nombre : "")));
      if (p.tallas[l.talla] === "agotada") centro.appendChild(el("p", "linea__aviso", "Esta talla se agotó. Quítala para continuar."));

      var cant = el("div", "cantidad");
      var menos = el("button", null, "−");
      var mas = el("button", null, "+");
      menos.type = mas.type = "button";
      menos.setAttribute("aria-label", "Quitar una unidad");
      mas.setAttribute("aria-label", "Agregar una unidad");
      menos.addEventListener("click", function () { cambiarCantidad(indice, -1); });
      mas.addEventListener("click", function () { cambiarCantidad(indice, 1); });
      cant.appendChild(menos);
      cant.appendChild(el("span", null, String(l.cantidad)));
      cant.appendChild(mas);
      centro.appendChild(cant);
      li.appendChild(centro);

      var lado = el("div", "linea__lado");
      lado.appendChild(el("span", "precio", L.dinero(p.precio * l.cantidad)));
      var quitar = el("button", "linea__quitar", "Quitar");
      quitar.type = "button";
      quitar.addEventListener("click", function () {
        estado.bolsa.splice(indice, 1);
        guardarBolsa();
        pintarBolsa();
      });
      lado.appendChild(quitar);
      li.appendChild(lado);
      lista.appendChild(li);
    });

    var vacia = cantidad === 0;
    $("bolsaVacia").hidden = !vacia;
    $("bolsaPie").hidden = vacia;
    $("envioProgreso").hidden = vacia;

    var tot = calcularTotales();
    var falta = estado.envio.gratis_desde - tot.subtotal;
    $("envioTexto").textContent = falta > 0
      ? "Te faltan " + L.dinero(falta) + " para el envío gratis."
      : "Tu envío es gratis.";
    $("envioBarra").style.width = Math.min(100, tot.subtotal / estado.envio.gratis_desde * 100) + "%";
    $("bolsaSubtotal").textContent = L.dinero(tot.subtotal);
    $("bolsaEnvio").textContent = tot.envio === 0 ? "Gratis" : L.dinero(tot.envio);
    $("bolsaTotal").textContent = L.dinero(tot.total);
    $("botonPagar").textContent = "Confirmar pedido · " + L.dinero(tot.total);
  }

  function cambiarCantidad(indice, delta) {
    var l = estado.bolsa[indice];
    if (!l) return;
    l.cantidad += delta;
    if (l.cantidad <= 0) estado.bolsa.splice(indice, 1);
    if (l.cantidad > 5) l.cantidad = 5;
    guardarBolsa();
    pintarBolsa();
  }

  function mostrarPaso(id) {
    ["pasoBolsa", "pasoPago", "pasoListo"].forEach(function (p) { $(p).hidden = p !== id; });
  }

  function abrirBolsa() {
    mostrarPaso("pasoBolsa");
    pintarBolsa();
    if (!$("dlgBolsa").open) $("dlgBolsa").showModal();
  }

  var REGLAS_CLIENTE = {
    nombre: function (v) { return /^[\p{L}\s'.-]{2,60}$/u.test(v) || "Escribe tu nombre (solo letras)."; },
    correo: function (v) { return (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120) || "El correo no parece válido."; },
    telefono: function (v) { return /^[0-9 +()-]{7,20}$/.test(v) || "Escribe un teléfono válido."; },
    direccion: function (v) { return (v.length >= 5 && v.length <= 160) || "Escribe la dirección completa."; },
    ciudad: function (v) { return (v.length >= 2 && v.length <= 60) || "Escribe la ciudad."; }
  };

  function validar(form, reglas) {
    var primero = null;
    Object.keys(reglas).forEach(function (campo) {
      var input = form.elements[campo];
      var r = reglas[campo](input.value.trim());
      input.setAttribute("aria-invalid", String(r !== true));
      if (r !== true && !primero) primero = { input: input, mensaje: r };
    });
    return primero;
  }

  function iniciarBolsa() {
    var form = $("pasoPago");

    $("irPagar").addEventListener("click", function () {
      var agotadas = estado.bolsa.some(function (l) {
        var p = buscarProducto(l.id);
        return !p || p.tallas[l.talla] === "agotada";
      });
      if (agotadas) { toast("Quita las tallas agotadas antes de continuar."); return; }
      var guardado = almacen.leer("linaza_cliente");
      if (guardado) {
        Object.keys(REGLAS_CLIENTE).forEach(function (k) {
          if (!form.elements[k].value && typeof guardado[k] === "string") form.elements[k].value = guardado[k];
        });
      }
      mostrarPaso("pasoPago");
      form.elements.nombre.focus();
    });
    $("volverBolsa").addEventListener("click", function () { mostrarPaso("pasoBolsa"); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var error = $("errorPago");
      var fallo = validar(form, REGLAS_CLIENTE);
      if (fallo) { error.textContent = fallo.mensaje; fallo.input.focus(); return; }
      error.textContent = "";

      var cliente = {};
      Object.keys(REGLAS_CLIENTE).forEach(function (k) { cliente[k] = form.elements[k].value.trim(); });
      var pedido = {
        cliente: cliente,
        pago: form.elements.pago.value,
        notas: form.elements.notas.value.trim().slice(0, 200),
        sitio_web: form.elements.sitio_web.value,
        items: estado.bolsa.map(function (l) { return { id: l.id, talla: l.talla, cantidad: l.cantidad }; })
      };
      almacen.guardar("linaza_cliente", cliente);

      if (!hayServidor) {
        terminarPedido("Modo local: el pedido no se envió porque la página está abierta como archivo. Ábrela desde XAMPP para registrar pedidos reales.");
        return;
      }

      var boton = $("botonPagar");
      boton.disabled = true;
      boton.textContent = "Enviando…";
      fetch("../api/pedidos.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": estado.token },
        body: JSON.stringify(pedido)
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (r) {
          if (r.ok) {
            var texto = "Tu número de pedido es " + r.numero + " por " + L.dinero(r.total) + ". Te escribiremos a " + cliente.correo + " para coordinar la entrega.";
            if (pedido.pago === "transferencia") texto += " En ese correo van los datos para la transferencia.";
            terminarPedido(texto);
            cargarCatalogo().then(aplicarCatalogo);
          } else {
            error.textContent = r.mensaje || "No pudimos registrar el pedido. Intenta de nuevo.";
            if (r.agotados) cargarCatalogo().then(aplicarCatalogo);
          }
        })
        .catch(function () { error.textContent = "Sin conexión con el servidor. Intenta de nuevo."; })
        .finally(function () {
          boton.disabled = false;
          pintarBolsa();
        });
    });
  }

  function terminarPedido(texto) {
    estado.bolsa = [];
    guardarBolsa();
    pintarBolsa();
    $("listoTexto").textContent = texto;
    mostrarPaso("pasoListo");
  }

  function abrirAviso(p, talla) {
    var form = $("formAviso");
    $("avisoProducto").value = p.id;
    $("avisoTalla").value = talla;
    $("avisoResumen").textContent = p.nombre + " · talla " + talla;
    $("errorAviso").textContent = "";
    $("okAviso").textContent = "";
    var cliente = almacen.leer("linaza_cliente");
    if (cliente && !form.elements.nombre.value) form.elements.nombre.value = String(cliente.nombre || "").split(" ")[0];
    if (cliente && !form.elements.correo.value) form.elements.correo.value = cliente.correo || "";
    $("dlgAviso").showModal();
  }

  function iniciarAvisos() {
    var form = $("formAviso");
    var reglas = { nombre: REGLAS_CLIENTE.nombre, correo: REGLAS_CLIENTE.correo };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var error = $("errorAviso");
      var ok = $("okAviso");
      error.textContent = ok.textContent = "";
      var fallo = validar(form, reglas);
      if (fallo) { error.textContent = fallo.mensaje; return; }
      if (!form.elements.acepta.checked) { error.textContent = "Marca la casilla de consentimiento."; return; }

      if (!hayServidor) {
        ok.textContent = "Modo local: abre el sitio desde XAMPP para registrar avisos.";
        return;
      }
      var boton = $("botonAviso");
      boton.disabled = true;
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
        headers: { "X-CSRF-Token": estado.token }
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (r) {
          if (r.ok) {
            ok.textContent = r.mensaje;
            form.elements.acepta.checked = false;
            setTimeout(function () { if ($("dlgAviso").open) $("dlgAviso").close(); }, 2200);
          } else {
            error.textContent = r.mensaje || "No pudimos registrar el aviso.";
          }
        })
        .catch(function () { error.textContent = "Sin conexión con el servidor."; })
        .finally(function () { boton.disabled = false; });
    });
  }

  function pintarResultadoTalla(animar) {
    var m = estado.medidas;
    var caja = $("resultadoTalla");
    var base = L.recomendar({ medida: "pecho" }, m);
    $("tallaGrande").textContent = base;

    var textoAjuste = { "-1": "ajustado", "0": "regular", "1": "holgado" }[String(m.ajuste)];
    var detalle = m.pecho + " cm de pecho, " + m.cintura + " cm de cintura, ajuste " + textoAjuste + ".";
    if (m.altura >= 185) detalle += " En pantalones pide el largo sin bastilla: lo ajustamos gratis.";
    $("tallaDetalle").textContent = detalle;

    var lista = $("tallaPrendas");
    lista.textContent = "";
    estado.productos.forEach(function (p) {
      var t = L.recomendar(p, m);
      var li = el("li");
      li.appendChild(el("span", null, p.nombre));
      var der = el("span");
      if (p.tallas[t] === "agotada") der.appendChild(el("em", null, "agotada "));
      der.appendChild(el("strong", null, t));
      li.appendChild(der);
      lista.appendChild(li);
    });

    if (animar) { caja.hidden = true; void caja.offsetWidth; }
    caja.hidden = false;

    var interruptor = $("soloMiTalla");
    interruptor.disabled = false;
    $("interruptorTalla").removeAttribute("title");
  }

  function iniciarGuia() {
    var form = $("formTalla");
    var campos = ["pecho", "cintura", "altura"].map(function (n) { return form.elements[n]; });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var problemas = [];
      var datos = {};
      campos.forEach(function (input) {
        var v = Number(input.value);
        var ok = input.value !== "" && v >= Number(input.min) && v <= Number(input.max);
        input.setAttribute("aria-invalid", String(!ok));
        if (!ok) problemas.push(input.labels[0].textContent.toLowerCase() + " (" + input.min + "–" + input.max + " cm)");
        datos[input.name] = v;
      });
      if (problemas.length) { $("errorTalla").textContent = "Revisa: " + problemas.join(", ") + "."; return; }
      $("errorTalla").textContent = "";
      datos.ajuste = Number(form.elements.ajuste.value) || 0;

      estado.medidas = datos;
      almacen.guardar("linaza_medidas", datos);
      pintarResultadoTalla(true);
      pintarProductos();
      toast("Listo. Ahora la tienda marca tu talla en cada prenda.");
    });

    var m = estado.medidas;
    if (m && m.pecho && m.cintura && m.altura) {
      form.elements.pecho.value = m.pecho;
      form.elements.cintura.value = m.cintura;
      form.elements.altura.value = m.altura;
      var radio = form.querySelector("input[name='ajuste'][value='" + (Number(m.ajuste) || 0) + "']");
      if (radio) radio.checked = true;
    } else {
      estado.medidas = null;
    }
  }

  function iniciarRevelado() {
    var elementos = document.querySelectorAll(".revelar");
    elementos.forEach(function (e) {
      var hermanos = Array.prototype.filter.call(e.parentElement.children, function (h) {
        return h.classList.contains("revelar");
      });
      e.style.setProperty("--retraso", hermanos.indexOf(e) * 0.08 + "s");
    });
    if (!("IntersectionObserver" in window) || reducirMovimiento) {
      elementos.forEach(function (e) { e.classList.add("visible"); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("visible");
        obs.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    elementos.forEach(function (e) { obs.observe(e); });
  }

  function iniciarDialogos() {
    document.querySelectorAll("dialog").forEach(function (d) {
      d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    });
    document.addEventListener("click", function (e) {
      var cerrar = e.target.closest("[data-cerrar]");
      if (cerrar) cerrar.closest("dialog").close();
      var ir = e.target.closest("[data-cerrar-ir]");
      if (ir) {
        ir.closest("dialog").close();
        irA(ir.dataset.cerrarIr);
      }
    });
  }

  function cargarPatrocinadores() {
    var respaldo = L.PATROCINADORES_LOCAL;
    if (!hayServidor) return Promise.resolve(respaldo);
    return fetch("../api/patrocinadores.php", { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("marcas"); return r.json(); })
      .then(function (d) { return Array.isArray(d.patrocinadores) ? d.patrocinadores : respaldo; })
      .catch(function () { return respaldo; });
  }

  function crearAliado(m, copia) {
    var url = /^https?:\/\/[^\s"'<>]+$/i.test(m.url || "") ? m.url : "";
    var nodo = el(url ? "a" : "div", "aliado");
    if (url) {
      nodo.href = url;
      nodo.target = "_blank";
      nodo.rel = "noopener noreferrer nofollow";
    }
    if (copia && url) nodo.tabIndex = -1;
    if (L.esLogo(m.simbolo)) {
      nodo.classList.add("aliado--logo");
      var logo = el("span", "aliado__logo");
      logo.insertAdjacentHTML("beforeend", L.svgLogo(m.simbolo, 34));
      nodo.appendChild(logo);
      nodo.appendChild(el("span", "visualmente-oculto", m.nombre));
      nodo.title = m.nombre;
      return nodo;
    }
    var marca = el("span", "aliado__simbolo");
    marca.insertAdjacentHTML("beforeend", L.svgSimbolo(m.simbolo));
    nodo.appendChild(marca);
    nodo.appendChild(el("span", "aliado__nombre", m.nombre));
    return nodo;
  }

  function pintarPatrocinadores(lista) {
    var seccion = $("marcas");
    var pista = $("carruselPista");
    pista.textContent = "";
    if (!lista.length) { seccion.hidden = true; return; }
    seccion.hidden = false;

    var grupo = el("div", "carrusel__grupo");
    lista.forEach(function (m) { grupo.appendChild(crearAliado(m, false)); });
    pista.appendChild(grupo);

    var copia = el("div", "carrusel__grupo");
    copia.setAttribute("aria-hidden", "true");
    lista.forEach(function (m) { copia.appendChild(crearAliado(m, true)); });
    pista.appendChild(copia);

    pista.style.setProperty("--duracion", Math.max(20, lista.length * 5) + "s");
  }

  function pedirToken() {
    if (!hayServidor) return;
    fetch("../api/token.php", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.token) return;
        estado.token = d.token;
        document.querySelectorAll(".campo-token").forEach(function (i) { i.value = d.token; });
      })
      .catch(function () {  });
  }

  $("anio").textContent = new Date().getFullYear();
  iniciarNavegacion();
  iniciarDialogos();
  iniciarFiltros();
  iniciarFicha();
  iniciarBolsa();
  iniciarAvisos();
  iniciarGuia();
  iniciarRevelado();
  iniciarBanner();
  pedirToken();
  pintarBolsa();
  cargarCatalogo().then(aplicarCatalogo);
  cargarPatrocinadores().then(pintarPatrocinadores);
})();
