(function (global) {
  "use strict";

  var TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

  var MEDIDAS = {
    XS:  { pecho: [80, 86],   cintura: [64, 70] },
    S:   { pecho: [87, 93],   cintura: [71, 77] },
    M:   { pecho: [94, 100],  cintura: [78, 85] },
    L:   { pecho: [101, 108], cintura: [86, 94] },
    XL:  { pecho: [109, 118], cintura: [95, 104] },
    XXL: { pecho: [119, 128], cintura: [105, 114] }
  };

  var GRUPOS = {
    superior: "Camisas y blusas",
    inferior: "Pantalones y shorts",
    vestidos: "Faldas y vestidos"
  };

  var CATEGORIAS = {
    camisa:      { nombre: "Camisa",      grupo: "superior", medida: "pecho" },
    blusa:       { nombre: "Blusa",       grupo: "superior", medida: "pecho" },
    sobrecamisa: { nombre: "Sobrecamisa", grupo: "superior", medida: "pecho" },
    pantalon:    { nombre: "Pantalón",    grupo: "inferior", medida: "cintura" },
    short:       { nombre: "Short",       grupo: "inferior", medida: "cintura" },
    falda:       { nombre: "Falda",       grupo: "vestidos", medida: "cintura" },
    vestido:     { nombre: "Vestido",     grupo: "vestidos", medida: "pecho" }
  };

  var FORMAS = {
    camisa: {
      cuerpo: "M112 58 L150 72 L188 58 L226 72 L262 104 L286 242 L258 250 L232 150 L230 322 Q150 332 70 322 L68 150 L42 250 L14 242 L38 104 L74 72 Z",
      extra: "M112 58 L150 72 L136 98 Z M188 58 L150 72 L164 98 Z",
      lineas: "M150 74 L150 326 M74 72 L68 150 M226 72 L232 150 M18 226 L46 234 M282 226 L254 234 M170 112 L204 112 L204 148 L170 148 Z",
      botones: [[150, 112], [150, 152], [150, 192], [150, 232], [150, 272], [150, 308]]
    },
    blusa: {
      cuerpo: "M118 56 Q150 90 182 56 L222 68 L262 104 L276 196 L246 204 L230 142 L240 322 Q150 336 60 322 L70 142 L54 204 L24 196 L38 104 L78 68 Z",
      extra: "",
      lineas: "M118 56 Q150 90 182 56 M78 68 L70 142 M222 68 L230 142 M28 182 L56 190 M272 182 L244 190 M66 290 Q150 302 234 290",
      botones: [[150, 92], [150, 110]]
    },
    sobrecamisa: {
      cuerpo: "M108 54 L150 66 L192 54 L234 70 L272 108 L292 250 L262 258 L238 152 L238 326 L62 326 L62 152 L38 258 L8 250 L28 108 L66 70 Z",
      extra: "M108 54 L150 66 L132 100 Z M192 54 L150 66 L168 100 Z",
      lineas: "M150 68 L150 326 M66 70 L62 152 M234 70 L238 152 M80 118 L130 118 L130 170 L80 170 Z M80 134 L130 134 M170 118 L220 118 L220 170 L170 170 Z M170 134 L220 134",
      botones: [[150, 110], [150, 160], [150, 210], [150, 260], [150, 306]]
    },
    pantalon: {
      cuerpo: "M92 40 L208 40 L222 330 L166 330 L150 128 L134 330 L78 330 Z",
      extra: "",
      lineas: "M92 58 L208 58 M150 58 L150 128 M98 62 Q120 82 110 106 M202 62 Q180 82 190 106 M112 150 L106 326 M188 150 L194 326",
      botones: [[150, 49]]
    },
    short: {
      cuerpo: "M88 70 L212 70 L230 250 L162 258 L150 170 L138 258 L70 250 Z",
      extra: "",
      lineas: "M88 88 L212 88 M150 88 L150 150 M94 92 Q116 110 106 132 M206 92 Q184 110 194 132 M72 234 L140 242 M228 234 L160 242",
      botones: [[150, 79]]
    },
    falda: {
      cuerpo: "M108 50 L192 50 L246 320 Q150 338 54 320 Z",
      extra: "",
      lineas: "M106 68 L194 68 M130 70 L110 326 M150 70 L150 332 M170 70 L190 326",
      botones: []
    },
    vestido: {
      cuerpo: "M118 40 L128 40 L134 104 L166 104 L172 40 L182 40 L192 128 L180 168 L246 328 Q150 344 54 328 L120 168 L108 128 Z",
      extra: "",
      lineas: "M134 104 Q150 116 166 104 M120 168 Q150 178 180 168 M132 176 L112 330 M168 176 L188 330",
      botones: []
    }
  };

  var SIMBOLOS = {
    circulo:  { nombre: "Círculo",  trazo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/>' },
    rombo:    { nombre: "Rombo",    trazo: '<path d="M12 2.5 21.5 12 12 21.5 2.5 12Z"/><path d="M12 8 16 12 12 16 8 12Z"/>' },
    lineas:   { nombre: "Líneas",   trazo: '<path d="M3 6.5h18M3 12h18M3 17.5h18"/>' },
    arco:     { nombre: "Arco",     trazo: '<path d="M3 19a9 9 0 0 1 18 0M7.5 19a4.5 4.5 0 0 1 9 0"/>' },
    cuadro:   { nombre: "Cuadro",   trazo: '<rect x="3.5" y="3.5" width="17" height="17"/><path d="M3.5 12h17M12 3.5v17"/>' },
    ondas:    { nombre: "Ondas",    trazo: '<path d="M2.5 9c3.2-3.4 6.3 3.4 9.5 0s6.3 3.4 9.5 0M2.5 15.5c3.2-3.4 6.3 3.4 9.5 0s6.3 3.4 9.5 0"/>' },
    flecha:   { nombre: "Flecha",   trazo: '<path d="M3 12h16M13 5.5l6.5 6.5-6.5 6.5"/>' },
    estrella: { nombre: "Estrella", trazo: '<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z"/>' }
  };

  var LOGOS = {
    nike: { nombre: "Nike", caja: [7.8, 8.4], d: "M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.504-.41-1.143-.28-1.918.13-.775.476-1.6 1.036-2.478.467-.71 1.232-1.643 2.297-2.8a6.122 6.122 0 00-.784 1.848c-.28 1.195-.028 2.072.756 2.632.373.261.886.392 1.54.392.522 0 1.11-.084 1.764-.252L24 7.8z" },
    adidas: { nombre: "Adidas", caja: [4.47, 15.07], d: "m24 19.535-8.697-15.07-4.659 2.687 7.145 12.383Zm-8.287 0L9.969 9.59 5.31 12.277l4.192 7.258ZM4.658 14.723l2.776 4.812H1.223L0 17.41Z" },
    puma: { nombre: "Puma", caja: [2.75, 18.5], d: "M23.845 3.008c-.417-.533-1.146-.106-1.467.08-2.284 1.346-2.621 3.716-3.417 5.077-.626 1.09-1.652 1.89-2.58 1.952-.686.049-1.43-.084-2.168-.405-1.807-.781-2.78-1.792-3.017-1.97-.487-.37-4.23-4.015-7.28-4.164 0 0-.372-.75-.465-.763-.222-.025-.45.451-.616.501-.15.053-.413-.512-.565-.487-.153.02-.302.586-.6.877-.22.213-.486.2-.637.463-.052.096-.034.265-.093.42-.127.32-.551.354-.555.697 0 .381.357.454.669.72.248.212.265.362.554.461.258.088.632-.187.964-.088.277.081.543.14.602.423.054.256 0 .658-.34.613-.112-.015-.598-.174-1.198-.11-.725.077-1.553.309-1.634 1.11-.041.447.514.97 1.055.866.371-.071.196-.506.399-.716.267-.27 1.772.944 3.172.944.593 0 1.031-.15 1.467-.605.04-.029.093-.102.155-.11a.632.632 0 01.195.088c1.131.897 1.984 2.7 6.13 2.721.582.007 1.25.279 1.796.777.48.433.764 1.125 1.037 1.825.418 1.053 1.161 2.069 2.292 3.203.06.068.99.78 1.06.833.012.01.084.167.053.255-.02.69-.123 2.67 1.365 2.753.366.02.275-.231.275-.41-.005-.341-.065-.685.113-1.04.253-.478-.526-.709-.509-1.756.019-.784-.645-.651-.984-1.25-.19-.343-.368-.532-.35-.946.073-2.38-.517-3.948-.805-4.327-.227-.294-.423-.403-.207-.54 1.24-.815 1.525-1.574 1.525-1.574.66-1.541 1.256-2.945 2.075-3.57.166-.12.589-.44.852-.56.763-.362 1.173-.578 1.388-.788.356-.337.635-1.053.294-1.48z" },
    jordan: { nombre: "Jordan", caja: [0.77, 22.46], d: "M13.55 2.194v-.075c0-.35.113-.663.338-.938.225-.275.512-.412.862-.412s.663.112.938.337.425.525.45.9c.025.375-.088.688-.338.938s-.55.375-.9.375l-.225.075.075.112-.075.413-.15 1.2c.05.05.075.1.075.15l-.15.75c-.05.1-.1.175-.15.225l-.075.3a22.59 22.59 0 01-.45 1.575v.15c-.05.25-.087.45-.112.6-.025.15-.113.4-.263.75-.1.2-.1.525 0 .975l.075.075c0 .15.063.325.188.525s.187.375.187.525c.05 1-.025 1.85-.225 2.55l.15.45c.6.3.775.625.525.975l.375.15c.6.3 1.025.562 1.275.787.25.225.5.463.75.713.2.05.35.125.45.225l.225.075c1.05.7 2.1 1.55 3.15 2.55l.3.225v.075l-.075.15.225.15h.075c.15.1.25.15.3.15h.075c.05 0 .1-.025.15-.075l.15-.075c.1-.1.2-.175.3-.225h.3c.05 0 .05.025 0 .075l-.3.15-.375.45h.525l.525.075c.15-.05.275-.1.375-.15l.375-.225c.15-.05.3 0 .45.15h.075c.05.05.025.125-.075.225l-.9.825c-.25.2-.475.325-.675.375l-.975.675c-.05.05-.1.05-.15 0l-.225-.3-.15-.3-.188-.263-.225-.3-.187-.225-.15-.187-.3-.225c-.1 0-.2-.025-.3-.075l-.975-.75c-.15 0-.325-.075-.525-.225-.75-.65-1.25-1.05-1.5-1.2l-.45-.3-.9-.15c-.3-.05-.7-.2-1.2-.45l-.6-.3c-.4-.2-.675-.3-.825-.3l-.3-.15c-.2-.05-.35-.1-.45-.15l-.15-.15c-.1 0-.2.025-.3.075l-1.5.75-1.875.825c-.5.4-.975.725-1.425.975l-.825.375-1.275.9c-.1.1-.2.1-.3 0l-.15.15c-.15.05-.25.075-.3.075l-.3.15v.15H3.2l-.15.225c-.1.2-.2.312-.3.337-.1.025-.162.063-.187.113a.434.434 0 01-.075.112l-.15.15-.225.15-.338-.037-.45.075-.3.075c-.25.05-.45.012-.6-.113-.15-.125-.275-.312-.375-.562-.1-.15-.05-.275.15-.375l.075-.075c.05-.05.125-.075.225-.075h.45l.6-.225.3-.075c0-.1.025-.175.075-.225.05-.05.125-.075.225-.075v-.075a.666.666 0 01-.075-.3c-.05-.1-.063-.175-.037-.225.025-.05.05-.075.075-.075h.037l.075.225c.05.25.125.325.225.225l.075-.15c.05-.1.125-.15.225-.15l.15.15.15-.15-.075-.075c0-.05.025-.075.075-.075l.3-.3c.25-.3.55-.575.9-.825.7-.55 1.45-.975 2.25-1.275.25-.25.525-.375.825-.375.2-.35.5-.725.9-1.125.35-.25.6-.425.75-.525.1-.2.225-.3.375-.3h.075l.15-.15c.1-.05.175-.1.225-.15v-.375c0-.25.025-.45.075-.6.05-.15.175-.225.375-.225l.3-.3c-.1-.2-.15-.425-.15-.675h-.075c-.1-.15-.15-.3-.15-.45-.15-.25-.25-.45-.3-.6H9.65c-.05.15-.175.25-.375.3l-.075.15c-.2.35-.375.612-.525.787-.15.175-.425.388-.825.638-.25.25-.425.525-.525.825-.05.15-.05.3 0 .45l-.075.15h.075c0 .1.025.15.075.15h.075c.1.05.15.112.15.187s-.075.1-.225.075a.606.606 0 01-.337-.15c-.075-.075-.138-.112-.188-.112l-.225.225c-.1.15-.2.212-.3.187-.1-.025-.125-.062-.075-.112l.075-.075c.05-.1.05-.15 0-.15l-.6.15c-.05.05-.112.05-.187 0s-.063-.1.037-.15l.375-.15c0-.05-.025-.075-.075-.075-.2.1-.4.125-.6.075l-.375-.075-.075-.075c0-.05.025-.075.075-.075.2.05.45.025.75-.075l.525-.225.6-.675.075-.15c.2-.4.413-.763.638-1.088a3.68 3.68 0 01.712-.787l.075-.3c.1-.2.2-.375.3-.525.1-.15.225-.35.375-.6l.225-.3c.2-.3.425-.45.675-.45l.225-.225c.05-.05.075-.125.075-.225l.15-.15-.075-.075c-.3-.25-.45-.475-.45-.675-.05-.35.063-.65.338-.9s.55-.363.825-.338c.275.025.487.113.637.263l.15.15c.05 0 .075.025.075.075l.3.15v.225c.1.1.15.175.15.225.1-.15.25-.325.45-.525l.375-1.2c0-.2.05-.4.15-.6l.15-.225v-.15l.225-.9h.15l.225-.9a.933.933 0 000-.525l-.3-.75-.15-.6z" },
    newbalance: { nombre: "New Balance", caja: [6.23, 11.54], d: "M12.169 10.306l1.111-1.937 3.774-.242.132-.236-3.488-.242.82-1.414h6.47c1.99 0 3.46.715 2.887 2.8-.17.638-.979 2.233-3.356 2.899.507.06 1.76.616 1.54 2.057-.384 2.558-3.69 3.774-5.533 3.774l-7.641.006-.38-1.48 4.005-.28.137-.237-4.346-.264-.467-1.755 6.178-.363.137-.231-11.096-.693.534-.925 11.948-.775.138-.231-3.504-.231m5 .385l1.1-.006c.738-.005 1.502-.34 1.783-1.018.259-.632-.088-1.171-.55-1.166h-1.067l-1.266 2.19zm-1.27 2.195l-1.326 2.305h1.265c.589 0 1.64-.292 1.964-1.128.302-.781-.253-1.177-.638-1.177h-1.266zM6.26 16.445l-.77 1.315L0 17.77l.534-.923 5.726-.402zm.385-10.216l4.417.006.336 1.248-5.276-.33.523-.924zm5 2.245l.484 1.832-7.542-.495.528-.92 6.53-.417zm-3.84 5.281l-.957 1.661-5.32-.302.534-.924 5.743-.435z" },
    underarmour: { nombre: "Under Armour", caja: [4.93, 14.13], d: "M15.954 12c-.089.066-.195.142-.324.233-.826.585-2.023.985-3.58.985h-.104c-1.556 0-2.755-.4-3.58-.985A36.43 36.43 0 018.042 12c.09-.067.196-.143.324-.234.825-.584 2.024-.985 3.58-.985h.104c1.557 0 2.756.401 3.58.985.129.09.235.167.325.234M24 7.181s-.709-.541-2.95-1.365c-1.968-.721-3.452-.883-3.452-.883l.006 4.243c0 .598-.162 1.143-.618 1.765-1.672-.61-3.254-.985-4.981-.985-1.728 0-3.308.375-4.98.985-.457-.619-.62-1.168-.62-1.765l.007-4.243s-1.494.16-3.463.883C.709 6.642 0 7.181 0 7.181c.093 1.926 1.78 3.638 4.435 4.82C1.777 13.18.09 14.887 0 16.818c0 0 .709.54 2.949 1.365 1.968.721 3.453.883 3.453.883l-.007-4.244c0-.597.164-1.143.619-1.764 1.672.61 3.252.983 4.98.983 1.727 0 3.309-.374 4.98-.983.457.62.62 1.167.62 1.764l-.006 4.244s1.484-.16 3.452-.883c2.241-.826 2.95-1.365 2.95-1.365-.093-1.927-1.78-3.64-4.435-4.819 2.657-1.182 4.343-2.888 4.435-4.82" },
    thenorthface: { nombre: "The North Face", caja: [6.36, 11.28], d: "M15.816 6.36v3.36h.228a4.847 4.847 0 0 1 4.764 4.764v3.036H24v-3.132c0-4.428-3.6-8.028-8.028-8.028H15.9Zm-9.06.012v.6h1.008V9.72h.696V6.972h1.008v-.6zm2.964 0V9.72h.696v-1.5h1.308v1.5h.696V6.372h-.696v1.272h-1.308V6.372Zm3 0V9.72h2.4v-.588h-1.752v-.876h1.548v-.588h-1.548V6.96h1.752v-.588ZM4.644 10.14c-.444 0-1.608.192-1.608 1.752s1.164 1.752 1.608 1.752c.444 0 1.608-.192 1.608-1.752S5.088 10.14 4.644 10.14zM0 10.236v3.336h.648v-2.376H.66l1.368 2.376h.696v-3.336h-.648v2.316h-.012L.732 10.236Zm6.54 0 .012 3.336h.684v-1.308h.72c.516 0 .54.18.54.636 0 .348.024.516.072.672h.768v-.084c-.144-.048-.144-.168-.144-.66 0-.624-.144-.732-.42-.852.324-.108.516-.42.516-.792 0-.288-.168-.948-1.056-.948zm2.916 0v.588h1.02v2.748h.696v-2.748h1.008v-.588zm2.976 0v3.336h.696v-1.5h1.296v1.5h.696v-3.336h-.696v1.26h-1.296v-1.26zm3.372 0v3.348h.156c1.08 0 1.944.876 1.944 1.944v1.992h2.388v-2.988c-.012-2.316-1.86-4.2-4.152-4.296h-.252Zm-11.16.504c.372 0 .9.228.9 1.164 0 .936-.528 1.164-.9 1.164s-.912-.228-.912-1.164c0-.936.54-1.164.912-1.164zm2.58.072h.864c.408 0 .492.252.492.432 0 .324-.18.456-.54.456h-.816Zm3.684 3.204c-.876 0-1.572.612-1.572 1.812 0 1.188.648 1.8 1.56 1.8.864 0 1.344-.516 1.488-1.26h-.72c-.084.42-.36.648-.756.648-.612 0-.852-.552-.852-1.164 0-.972.504-1.2.852-1.2.588 0 .696.384.756.588v-.012h.72c-.036-.504-.456-1.212-1.476-1.212zm-6.696.084v3.432h.708v-1.44h1.512v-.612H4.92v-.768h1.728V14.1Zm3.228 0-1.224 3.432h.756l.228-.708h1.284l.216.708h.78L8.268 14.1Zm5.232 0v3.432h2.46v-.612h-1.8v-.888h1.596v-.6h-1.596v-.72h1.8V14.1Zm3.144.012v3.432h1.596v-1.992c0-.792-.648-1.44-1.44-1.44zm-7.98.768h.012l.42 1.356h-.876Zm-4.92.912a.927.927 0 0 0-.936.924c0 .528.432.924.936.924a.917.917 0 0 0 .924-.924.917.917 0 0 0-.924-.924zm0 .144c.42 0 .756.336.756.78 0 .456-.324.792-.756.792s-.768-.348-.768-.792c0-.444.336-.78.768-.78zm-.36.24v1.092h.168V16.8h.18l.3.468h.18l-.312-.48c.168-.024.288-.108.288-.3 0-.216-.132-.312-.384-.312zm.168.132h.228c.12 0 .24.024.24.168 0 .168-.144.18-.288.18h-.18z" },
    reebok: { nombre: "Reebok", caja: [8.64, 6.72], d: "M14.991 11.48C17.744 10.38 19.458 9.748 24 8.64c-2.467.163-7.922.537-11.682 1.271l2.673 1.57m-8.56 3.651h3.6c.713-1.08 1.422-1.606 2.248-2.191a71.382 71.382 0 00-1.892-.701c-2.297 1.014-3.575 2.375-3.953 2.892m.709-3.928c-3.21 1.147-4.994 2.393-6.199 3.928h3.975c.387-.539 1.862-2.093 4.633-3.174a57.092 57.092 0 00-2.41-.754M8.79 8.788H0c8.862 1.6 13.133 3.66 20 6.572-.587-.439-10.051-6.013-11.209-6.572" },
    fila: { nombre: "Fila", caja: [8.03, 7.95], d: "M8.814 8.027c-.614 0-1.113.498-1.113 1.113v5.72a1.113 1.113 0 0 0 2.226 0V9.14c0-.614-.498-1.113-1.113-1.113m-2.849.078H1.113a1.113 1.113 0 0 0 0 2.226h4.852a1.113 1.113 0 0 0 0-2.226m17.411 4.417L21.03 8.705c-.275-.444-.65-.658-1.125-.658-.488 0-.904.229-1.162.658l-2.715 4.5c-.186.308-.4.436-.753.436h-2.019a.275.275 0 0 1-.285-.284V9.102c0-.613-.497-1.075-1.11-1.075-.614 0-1.11.463-1.11 1.076v5.215c0 .784.774 1.544 1.544 1.544h4.064c.576 0 .963-.42 1.292-.996l2.114-3.627c.018-.04.053-.091.093-.091.043 0 .07.051.091.088l1.384 2.22c.058.094.069.141.032.225-.033.077-.108.093-.23.093h-1.943a1.044 1.044 0 1 0 0 2.088h3.17c.77 0 1.638-.734 1.638-1.693 0-.608-.117-.822-.624-1.647M5.431 10.954H1.113c-.615 0-1.113.498-1.113 1.113v2.715a1.113 1.113 0 1 0 2.226 0v-1.268c0-.185.15-.334.334-.334h2.87a1.113 1.113 0 0 0 0-2.226" },
    zara: { nombre: "Zara", caja: [7, 10], d: "M8.562 7l.002.006 2.794 7.621v-7.23h-1.15v-.07h3.96c1.903 0 3.231.976 3.231 2.375 0 1.02-.91 1.868-2.263 2.109l-.249.031.25.026c.821.094 1.473.346 1.935.75l.003.003L19.141 7h.07l.002.006 3.556 9.698H24v.07h-3.918v-.07h1.154l-1.17-3.189h-2.373v.002l.013.037c.094.281.142.576.139.873v1.196c0 .615.271 1.238.79 1.238.304 0 .547-.107.837-.372l.041.038c-.314.332-.695.473-1.266.473-.43 0-.8-.104-1.096-.308l-.056-.04c-.39-.296-.644-.778-.753-1.435l-.018-.106-.018-.16-.002-.028-.654 1.78h.928v.07h-1.942v-.07h.938l.718-1.954v-.005a6.35 6.35 0 01-.013-.346v-.854c0-1.049-.78-1.65-2.14-1.65h-1.337v4.81h1.158v.07H9.433v-.07h1.154l-1.17-3.189H6.172l-1.158 3.154.048-.008c1.521-.262 2.22-1.423 2.23-2.645h.07v2.758H0l5.465-9.377H3.268c-1.822 0-2.646 1.407-2.659 2.81H.54v-2.88h6.634l-.04.07-5.425 9.307h2.854c.071 0 .141-.003.212-.009l.072-.006.09-.01L8.491 7h.07zm9.883 2.095l-1.313 3.576.007.007.067.066c.193.197.347.43.452.684l.007.017h2.375l-1.595-4.35zm-10.648 0l-1.599 4.35h3.194l-1.595-4.35zm6.026-1.698h-1.02v4.427h1.336c1.353 0 1.767-.493 1.767-2.107 0-1.517-.72-2.32-2.083-2.32z" },
    uniqlo: { nombre: "Uniqlo", caja: [0, 24], d: "M0 0v24h24V0H0zm3.006 3.236h1.52v5.051a1.007 1.007 0 1 0 2.014 0v-5.05h1.517v5.056a2.525 2.525 0 1 1-5.051 0V3.236zm7.07 0h1.514l2.023 4.328V3.236h1.516v7.575h-1.516L11.59 6.482v4.329h-1.514V3.236zm7.569.01h1.488v7.576h-1.488V3.246zM5.533 13.078a2.526 2.526 0 0 1 2.524 2.53v2.523a2.51 2.51 0 0 1-.75 1.793l.75 2.248H6.539l-.518-1.563a2.472 2.472 0 0 1-.488.043 2.524 2.524 0 0 1-2.527-2.521v-2.524a2.527 2.527 0 0 1 2.527-2.529zm4.547 0h1.514v6.057h3.535v1.517H10.08v-7.574zm8.336 0a2.526 2.526 0 0 1 2.523 2.53v2.523a2.525 2.525 0 0 1-2.523 2.521 2.53 2.53 0 0 1-2.531-2.521v-2.524a2.533 2.533 0 0 1 2.531-2.529zm-12.88 1.52a1.007 1.007 0 0 0-1.01 1.01v2.523c0 .552.45 1.006 1.01 1.006.558 0 1.003-.454 1.003-1.006v-2.524c0-.559-.445-1.01-1.004-1.01zm12.88 0a1.01 1.01 0 0 0-1.012 1.01v2.523c0 .552.453 1.006 1.012 1.006a1.012 1.012 0 0 0 1.01-1.006v-2.524c0-.559-.455-1.01-1.01-1.01z" },
    dior: { nombre: "Dior", caja: [8.64, 6.71], d: "M.0728 8.7751h3.1157c2.6789 0 3.7272 1.5724 3.7272 3.237 0 1.6937-1.3443 3.203-3.9019 3.203H.0776c-.0534 0-.0728-.034-.0728-.0631 0-.034.034-.0631.0825-.0631h.5484c.1699 0 .2815-.1019.2815-.2912V9.2022c0-.1407-.0679-.296-.2912-.296H.0679C.0243 8.9062 0 8.8771 0 8.8431c0-.0291.0097-.068.0728-.068m1.9461 6.1392c0 .1407.0631.1844.1553.1844h.825c2.0334 0 2.7711-1.5578 2.7711-3.1205S4.9889 8.9013 3.271 8.9013H2.1499c-.1165 0-.1262.0971-.1262.1407l-.0048 5.8723zm5.2073-6.1392c-.0485 0-.0922.0194-.0922.0582s.0243.0631.0679.0631h.5484c.1262 0 .2475.0874.2475.33v5.5762c0 .1165-.0874.2912-.2427.2912h-.5434c-.0631 0-.0679.0485-.0679.0679s-.0049.0534.0679.0534h2.6401c.0388 0 .0922-.0049.0922-.0437s-.0097-.0776-.0776-.0776h-.5097c-.0728 0-.2718-.0437-.2718-.2669V9.1682c0-.1602.1019-.2669.2863-.2669h.4999c.0437 0 .0679-.0243.0679-.0582 0-.034-.0243-.0631-.0825-.0631-.0005-.0048-2.6396.0092-2.6303-.0049zm4.1251 3.2225c0-1.7811.7959-3.2224 2.2906-3.2224 1.4656 0 2.2906 1.4414 2.2906 3.2224S15.1804 15.22 13.642 15.22c-1.4899.0049-2.2907-1.4414-2.2907-3.2224m2.2907 3.3583c2.1256 0 3.4651-1.5044 3.4651-3.3535s-1.3249-3.3583-3.4651-3.3583c-2.1353 0-3.4651 1.5044-3.4651 3.3535s1.3831 3.3583 3.4651 3.3583m10.2593-.1796c-.8347.0874-1.2958-1.2812-1.718-1.9315-.3154-.4805-.9852-.9706-1.6452-1.0677 1.0871-.0631 2.3052-.4125 2.3052-1.6452 0-.9997-.6163-1.7568-2.8779-1.7568h-2.6061c-.034 0-.0679.0194-.0679.0582s.034.0631.0679.0631h.5969c.1262 0 .2475.0874.2475.33v5.5762c0 .1165-.0874.2912-.2427.2912h-.587c-.0485 0-.0679.0388-.0679.0582s.0194.0631.0679.0631h2.7662c.0388 0 .0728-.0194.0728-.0582s-.0243-.0631-.0776-.0631h-.5581c-.0728 0-.2718-.0485-.2718-.2669v-2.6352h.2863c1.3686 0 1.4705 1.485 2.1499 2.3343.5824.728 1.3443.8202 1.7762.8202.1844 0 .3106-.0049.4271-.034.0728-.0243.0874-.1504-.0437-.1359m-4.3192-6.2798h.4028c.6891 0 1.8053.2718 1.8053 1.5724 0 1.1939-.99 1.5967-1.9073 1.5967h-.5872V9.1682c.0001-.165.102-.2717.2864-.2717" },
    gucci: { nombre: "Gucci", texto: "GUCCI" }
  };

  function colorSeguro(hex) {
    return /^#[0-9a-f]{6}$/i.test(hex || "") ? hex : "#D6C6AA";
  }

  function esOscuro(hex) {
    var c = colorSeguro(hex);
    var r = parseInt(c.substr(1, 2), 16);
    var g = parseInt(c.substr(3, 2), 16);
    var b = parseInt(c.substr(5, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 120;
  }

  function colorLinea(hex) {
    return esOscuro(hex) ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.17)";
  }

  function svgPrenda(categoria, color) {
    var f = FORMAS[categoria] || FORMAS.camisa;
    var c = colorSeguro(color);
    var l = colorLinea(c);
    var s = '<svg viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
    s += '<path d="' + f.cuerpo + '" fill="' + c + '"' + (esOscuro(c) ? ' stroke="rgba(255,255,255,0.16)" stroke-width="2" stroke-linejoin="round"' : "") + "/>";
    if (f.extra) s += '<path d="' + f.extra + '" fill="' + c + '" stroke="' + l + '" stroke-width="2" stroke-linejoin="round"/>';
    s += '<path d="' + f.lineas + '" fill="none" stroke="' + l + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    f.botones.forEach(function (b) {
      s += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="3.4" fill="' + l + '"/>';
    });
    return s + "</svg>";
  }

  function esLogo(clave) {
    return Object.prototype.hasOwnProperty.call(LOGOS, clave);
  }

  function svgLogo(clave, alto) {
    var l = LOGOS[clave];
    var h = alto || 32;
    if (l.texto) {
      return '<svg viewBox="0 0 132 24" width="' + Math.round(h * 132 / 24) + '" height="' + h + '" aria-hidden="true" focusable="false">' +
        '<text x="66" y="20" text-anchor="middle" fill="currentColor" font-family="Didot, \'Bodoni 72\', \'Times New Roman\', Georgia, serif" font-weight="700" font-size="24" letter-spacing="5">' + l.texto + "</text></svg>";
    }
    var ancho = Math.round(h * 24 / l.caja[1]);
    return '<svg viewBox="0 ' + l.caja[0] + " 24 " + l.caja[1] + '" width="' + ancho + '" height="' + h + '" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + l.d + '"/></svg>';
  }

  function svgSimbolo(simbolo) {
    if (esLogo(simbolo)) return svgLogo(simbolo, 24);
    var s = SIMBOLOS[simbolo] || SIMBOLOS.circulo;
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + s.trazo + "</svg>";
  }

  function dibujarPrenda(ctx, categoria, color, x, y, escala) {
    var f = FORMAS[categoria] || FORMAS.camisa;
    var c = colorSeguro(color);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(escala, escala);
    ctx.fillStyle = c;
    ctx.fill(new Path2D(f.cuerpo));
    ctx.strokeStyle = colorLinea(c);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (f.extra) {
      var extra = new Path2D(f.extra);
      ctx.fill(extra);
      ctx.stroke(extra);
    }
    ctx.stroke(new Path2D(f.lineas));
    ctx.fillStyle = colorLinea(c);
    f.botones.forEach(function (b) {
      ctx.beginPath();
      ctx.arc(b[0], b[1], 3.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function recomendar(producto, medidas) {
    if (!medidas || !producto) return null;
    var medida = producto.medida || (CATEGORIAS[producto.categoria] || {}).medida || "pecho";
    var valor = Number(medidas[medida]);
    if (!valor) return null;
    var ajuste = Number(medidas.ajuste) || 0;

    var i = TALLAS.findIndex(function (t) { return valor <= MEDIDAS[t][medida][1]; });
    if (i === -1) i = TALLAS.length - 1;
    var rango = MEDIDAS[TALLAS[i]][medida];
    var posicion = (valor - rango[0]) / (rango[1] - rango[0]);
    if (ajuste === 1 && posicion > 0.5) i++;
    if (ajuste === -1 && posicion < 0.4) i--;
    if (Number(producto.holgura) < 0 && ajuste < 1) i--;
    i += Number(producto.ajuste_talla) || 0;

    return TALLAS[Math.max(0, Math.min(TALLAS.length - 1, i))];
  }

  function dinero(n) {
    var v = Number(n) || 0;
    return "$" + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
  }

  function producto(id, nombre, categoria, descripcion, precio, original, color, hex, estados, extra) {
    var cat = CATEGORIAS[categoria];
    var tallas = {};
    TALLAS.forEach(function (t, i) {
      tallas[t] = { o: "ok", p: "pocas", a: "agotada" }[estados.charAt(i)];
    });
    return {
      id: id, nombre: nombre, categoria: categoria, grupo: cat.grupo, medida: cat.medida,
      descripcion: descripcion, precio: precio, precio_original: original,
      color: { nombre: color, hex: hex }, imagen: "",
      holgura: (extra && extra.holgura) || 0, ajuste_talla: (extra && extra.ajuste) || 0,
      nuevo: !!(extra && extra.nuevo), orden: 0, tallas: tallas
    };
  }

  var CATALOGO_LOCAL = [
    producto("camisa-costa", "Camisa Costa", "camisa", "Corte recto y cuello de campo. Lino de 180 g lavado a la piedra.", 54, null, "Arena", "#D6C6AA", "oooopo"),
    producto("pantalon-muelle", "Pantalón Muelle", "pantalon", "Pierna amplia y cintura con cordón interno. Tiro medio.", 62, null, "Carbón", "#2E3431", "paaopa", { ajuste: 1 }),
    producto("vestido-salina", "Vestido Salina", "vestido", "Tirantes finos, cintura marcada y falda con vuelo al tobillo.", 78, null, "Hueso", "#EAE3D6", "ooopao", { nuevo: true }),
    producto("blusa-bruma", "Blusa Bruma", "blusa", "Manga tres cuartos, escote redondo y botones de coco.", 48, null, "Ocre", "#B4532A", "pppaap"),
    producto("sobrecamisa-faro", "Sobrecamisa Faro", "sobrecamisa", "Lino grueso de 260 g con dos bolsillos de parche. Corte amplio.", 59, 74, "Oliva", "#6B6A4C", "oooooo", { holgura: -1 }),
    producto("falda-marea", "Falda Marea", "falda", "Largo midi con pretina elástica en la espalda.", 52, null, "Terracota", "#A4583A", "oooapo", { holgura: -1 }),
    producto("short-estero", "Short Estero", "short", "Largo a medio muslo con bolsillos profundos.", 39, null, "Lino natural", "#DCD1BF", "oooooo"),
    producto("pantalon-rada", "Pantalón Rada", "pantalon", "Pierna recta con pinzas delanteras y bolsillos de ojal.", 58, null, "Arena", "#CDBB9B", "oooopp", { nuevo: true }),
    producto("camisa-alba", "Camisa Alba", "camisa", "Manga larga en lino azul bruma, lavado en frío.", 54, null, "Azul bruma", "#8EA2A6", "aooooo"),
    producto("camisa-duna", "Camisa Duna", "camisa", "Cuello mao y manga larga. Lino de 170 g con caída suave.", 56, null, "Blanco hueso", "#F2EEE6", "oooooo", { nuevo: true }),
    producto("camisa-bahia", "Camisa Bahía", "camisa", "Corte relajado con bolsillo de parche y botones de nácar.", 52, null, "Índigo", "#3F4E66", "poooop"),
    producto("blusa-nube", "Blusa Nube", "blusa", "Escote en V y manga globo recogida en el puño.", 46, null, "Rosa arena", "#D9B8A6", "ooopaa"),
    producto("blusa-lirio", "Blusa Lirio", "blusa", "Cuello redondo con alforzas cosidas a mano en el frente.", 49, null, "Salvia", "#9AA58C", "oooooo", { nuevo: true }),
    producto("sobrecamisa-puerto", "Sobrecamisa Puerto", "sobrecamisa", "Sarga de lino de 280 g con forro ligero en la espalda.", 79, null, "Tabaco", "#7A5A3F", "oopooo", { holgura: -1 }),
    producto("pantalon-cabo", "Pantalón Cabo", "pantalon", "Corte palazzo con pretina alta y pinzas profundas.", 64, null, "Negro", "#1F1F1F", "oooooa"),
    producto("short-palma", "Short Palma", "short", "Tiro alto, cordón en la cintura y bastilla doblada.", 42, 49, "Oliva claro", "#A3A07E", "oooopo"),
    producto("falda-olivo", "Falda Olivo", "falda", "Midi cruzada con lazo lateral y forro de algodón.", 55, null, "Musgo", "#5E6450", "pooooo"),
    producto("vestido-coral", "Vestido Coral", "vestido", "Camisero con cinturón de la misma tela y mangas enrollables.", 82, null, "Terracota claro", "#C98A6B", "ooopoa"),
    producto("vestido-niebla", "Vestido Niebla", "vestido", "Tirantes anchos, espalda cruzada y bolsillos laterales.", 76, null, "Gris niebla", "#B9BBB6", "oooooo", { nuevo: true })
  ];
  CATALOGO_LOCAL.forEach(function (p, i) { p.orden = i + 1; });

  var PATROCINADORES_LOCAL = ["nike", "adidas", "gucci", "puma", "jordan", "dior", "newbalance", "zara",
    "underarmour", "thenorthface", "reebok", "fila", "uniqlo"].map(function (k) {
    return { id: k, nombre: LOGOS[k].nombre, simbolo: k, url: "" };
  });

  global.Linaza = {
    TALLAS: TALLAS,
    MEDIDAS: MEDIDAS,
    GRUPOS: GRUPOS,
    CATEGORIAS: CATEGORIAS,
    SIMBOLOS: SIMBOLOS,
    LOGOS: LOGOS,
    esLogo: esLogo,
    svgLogo: svgLogo,
    CATALOGO_LOCAL: CATALOGO_LOCAL,
    PATROCINADORES_LOCAL: PATROCINADORES_LOCAL,
    colorSeguro: colorSeguro,
    svgPrenda: svgPrenda,
    svgSimbolo: svgSimbolo,
    dibujarPrenda: dibujarPrenda,
    recomendar: recomendar,
    dinero: dinero
  };
})(window);
