/* ============================================================
   MESA Y RUTA · menú inicial de ejemplo (asadero costeño, Hatillo de Loba)
   Es solo el punto de partida: el administrador cambia platos, precios,
   fotos y ofertas desde el panel del negocio.
   · Fotos: Unsplash (licencia libre, uso comercial permitido). Si una foto
     no carga, la app muestra la ilustración de respaldo («arte»).
   · Precios: referencia de octubre de 2026 para un asadero de municipio
     del Caribe (el pollo asado entero promedió $ 44.417 en Colombia en
     junio de 2026, según el Índice del Pollo Asado). Ajústelos.
   ============================================================ */
(function () {
  'use strict';
  const U = id => 'unsplash:' + id;

  const CATEGORIAS = [
    { id: 'fogon', nombre: 'Del fogón', sub: 'Asados al carbón' },
    { id: 'rio', nombre: 'Del río', sub: 'Pescados' },
    { id: 'rapidas', nombre: 'Comidas rápidas', sub: 'Para antojarse' },
    { id: 'acomp', nombre: 'Acompañantes', sub: 'Para completar' },
    { id: 'bebidas', nombre: 'Bebidas', sub: 'Bien frías' }
  ];

  // ingredientes: [nombre, forma, color1, color2] para la miniatura
  const INGR = {
    pollo: ['Pollo asado al carbón', 'disco', '#C86B2A', '#F2A23A'],
    papa: ['Papa salada', 'granos', '#F3CF6A', '#D9A93F'],
    arepa: ['Arepa de maíz', 'disco', '#F1D8A0', '#C99A4A'],
    bollo: ['Bollo limpio', 'pan', '#F3E3B5', '#D7BE7E'],
    ensalada: ['Ensalada fresca', 'hoja', '#5DB33B', '#3E8E2F'],
    limon: ['Limón', 'cuna', '#8CC63F', '#E3F4B5'],
    costilla: ['Costilla de cerdo', 'tira', '#8E2A14', '#E86A3E'],
    bbq: ['Salsa BBQ de la casa', 'disco', '#5E1A0B', '#B23A1F'],
    yuca: ['Yuca cocida', 'palitos', '#F3DFA2', '#D2B160'],
    res: ['Carne de res 300 g', 'disco', '#7A2E14', '#B5502E'],
    chimi: ['Chimichurri', 'hoja', '#3E8E2F', '#2D6B22'],
    chorizo: ['Chorizo', 'rodaja', '#9C2F1C', '#F2C1A8'],
    butifarra: ['Butifarra', 'disco', '#B87A55', '#E2B08E'],
    patacon: ['Patacón', 'disco', '#F2C14E', '#D99A2B'],
    queso: ['Queso costeño', 'cubo', '#FFF6E0', '#E7D9B5'],
    mojarra: ['Mojarra frita', 'tira', '#C98A3A', '#7A3F10'],
    arroz_coco: ['Arroz de coco', 'granos', '#E9D3A8', '#C99A5A'],
    pan: ['Pan brioche', 'pan', '#E39B3E', '#B9621E'],
    carne_h: ['Carne de res 150 g', 'disco', '#5B2B17', '#8D4A2C'],
    cheddar: ['Queso cheddar', 'cubo', '#FFC928', '#E59E0B'],
    tocineta: ['Tocineta', 'tira', '#C8553D', '#F4C2B1'],
    lechuga: ['Lechuga', 'hoja', '#5DB33B', '#3E8E2F'],
    tomate: ['Tomate', 'rodaja', '#E8412F', '#FFB4A6'],
    cebolla: ['Cebolla', 'rodaja', '#9B3D8F', '#E7B6E0'],
    salchicha: ['Salchicha', 'rodaja', '#C7604A', '#E9A08C'],
    pan_perro: ['Pan de perro', 'pan', '#F1C27A', '#C47A2A'],
    papita: ['Papita ripio', 'granos', '#F7C64A', '#C98A22'],
    fritas: ['Papa a la francesa', 'palitos', '#F7C64A', '#C98A22'],
    huevo: ['Huevos de codorniz', 'huevo', '#FFB82E', '#FFB82E'],
    pollo_d: ['Pollo desmechado', 'tira', '#E9B35A', '#C86B2A'],
    platano: ['Plátano verde', 'disco', '#F2C14E', '#D99A2B'],
    coco: ['Leche de coco', 'disco', '#FBF5E6', '#E2D6B8'],
    hielo: ['Hielo', 'cubo', '#DFF3FB', '#A9DCEF'],
    limon_j: ['Limón natural', 'cuna', '#8CC63F', '#E3F4B5'],
    fruta: ['Fruta natural', 'disco', '#F7A928', '#E2572B'],
    leche: ['Leche', 'disco', '#FFFFFF', '#E7E2D8']
  };

  const P = (o) => Object.assign({ disponible: true, oferta: null, especialidad: false, ocasiones: [] }, o);
  const PRODUCTOS = [
    P({ id: 'pollo-entero', cat: 'fogon', nombre: 'Pollo asado entero', precio: 42000, porcion: 'Para 3 o 4 personas',
      descripcion: 'Al carbón, con papa salada, arepa, bollo limpio y ensalada.',
      foto: U('photo-1598103442097-8b74394b95c6'), arte: 'pollo', ingredientes: ['pollo', 'papa', 'arepa', 'bollo', 'ensalada'],
      especialidad: true, ocasiones: ['cumpleanos', 'familia', 'grado'] }),
    P({ id: 'medio-pollo', cat: 'fogon', nombre: 'Medio pollo asado', precio: 23000, porcion: 'Para 2 personas',
      descripcion: 'Al carbón, con papa salada, arepa y limón.',
      foto: U('photo-1606728035253-49e8a23146de'), arte: 'pollo', ingredientes: ['pollo', 'papa', 'arepa', 'limon'] }),
    P({ id: 'cuarto-pollo', cat: 'fogon', nombre: 'Cuarto de pollo', precio: 13000, porcion: 'Personal',
      descripcion: 'Pierna-pernil o pechuga, con papa salada y arepa.',
      foto: U('photo-1630564510761-a560db92a09b'), arte: 'pollo', ingredientes: ['pollo', 'papa', 'arepa'] }),
    P({ id: 'costillas', cat: 'fogon', nombre: 'Costillas de cerdo BBQ', precio: 28000, porcion: 'Personal',
      descripcion: 'Glaseadas al carbón, con yuca cocida y ensalada.',
      foto: U('photo-1544025162-d76694265947'), arte: 'costillas', ingredientes: ['costilla', 'bbq', 'yuca', 'ensalada'],
      ocasiones: ['cita', 'aniversario'] }),
    P({ id: 'carne-asada', cat: 'fogon', nombre: 'Carne asada', precio: 30000, porcion: '300 g',
      descripcion: 'Res a la brasa con papa salada, ensalada y chimichurri.',
      foto: U('photo-1594041680534-e8c8cdebd659'), arte: 'carne', ingredientes: ['res', 'papa', 'ensalada', 'chimi'],
      ocasiones: ['cita', 'aniversario', 'trabajo'] }),
    P({ id: 'picada', cat: 'fogon', nombre: 'Picada costeña', precio: 45000, porcion: 'Para 2 o 3 personas',
      descripcion: 'Res, cerdo, chorizo, butifarra, patacón, yuca y queso costeño.',
      foto: U('photo-1529193591184-b1d58069ecdd'), arte: 'picada', ingredientes: ['res', 'costilla', 'chorizo', 'butifarra', 'patacon', 'yuca', 'queso'],
      especialidad: true, ocasiones: ['cumpleanos', 'quince', 'familia', 'grado', 'trabajo'] }),
    P({ id: 'chuzo', cat: 'fogon', nombre: 'Chuzo mixto', precio: 12000, porcion: 'Personal',
      descripcion: 'Pollo, res y verduras al carbón, con arepa.',
      foto: U('photo-1555939594-58d7cb561ad1'), arte: 'chuzo', ingredientes: ['pollo', 'res', 'cebolla', 'arepa'] }),
    P({ id: 'mojarra', cat: 'rio', nombre: 'Mojarra frita', precio: 28000, porcion: 'Personal',
      descripcion: 'Entera, con patacón, arroz de coco y ensalada.',
      foto: U('photo-1766556403793-04cd52cbf678'), arte: 'pescado', ingredientes: ['mojarra', 'patacon', 'arroz_coco', 'ensalada', 'limon'],
      especialidad: true, ocasiones: ['familia', 'aniversario', 'cita'] }),
    P({ id: 'hamburguesa', cat: 'rapidas', nombre: 'Hamburguesa de la casa', precio: 15000, porcion: 'Personal',
      descripcion: 'Carne a la parrilla, queso, lechuga, tomate y cebolla.',
      foto: U('photo-1568901346375-23c9450c58cd'), arte: 'hamburguesa', ingredientes: ['pan', 'carne_h', 'cheddar', 'lechuga', 'tomate', 'cebolla'] }),
    P({ id: 'hamburguesa-doble', cat: 'rapidas', nombre: 'Hamburguesa doble', precio: 22000, porcion: 'Personal',
      descripcion: 'Dos carnes, doble queso cheddar y tocineta.',
      foto: U('photo-1572802419224-296b0aeee0d9'), arte: 'hamburguesa', ingredientes: ['pan', 'carne_h', 'cheddar', 'tocineta', 'lechuga', 'tomate'] }),
    P({ id: 'perro', cat: 'rapidas', nombre: 'Perro caliente', precio: 10000, porcion: 'Personal',
      descripcion: 'Salchicha, queso, papita ripio y salsas.',
      foto: U('photo-1599599810694-b5b37304c041'), arte: 'perro', ingredientes: ['pan_perro', 'salchicha', 'cheddar', 'papita', 'cebolla'] }),
    P({ id: 'salchipapa', cat: 'rapidas', nombre: 'Salchipapa especial', precio: 15000, porcion: 'Personal',
      descripcion: 'Papa a la francesa, salchicha, queso y huevos de codorniz.',
      foto: U('photo-1762284513031-3d7ad15562bc'), arte: 'salchipapa', ingredientes: ['fritas', 'salchicha', 'queso', 'huevo'] }),
    P({ id: 'papas', cat: 'rapidas', nombre: 'Papas a la francesa', precio: 6000, porcion: 'Porción',
      descripcion: 'Crocantes, recién fritas.',
      foto: U('photo-1609530127564-bee93ebe1c9e'), arte: 'papas', ingredientes: ['fritas'] }),
    P({ id: 'patacon', cat: 'acomp', nombre: 'Patacón', precio: 4000, porcion: '3 unidades',
      descripcion: 'Plátano verde frito y aplastado.', foto: U('photo-1540714605746-4f474eefc6d4'), arte: 'acompanante', ingredientes: ['platano'] }),
    P({ id: 'arroz-coco', cat: 'acomp', nombre: 'Arroz de coco', precio: 5000, porcion: 'Porción',
      descripcion: 'Arroz costeño con coco y pasas.', foto: U('photo-1584208632869-05fa2b2a5934'), arte: 'arroz', ingredientes: ['coco'] }),
    P({ id: 'yuca', cat: 'acomp', nombre: 'Yuca frita', precio: 4000, porcion: 'Porción', descripcion: 'Bastones de yuca dorados.', foto: '', arte: 'papas', ingredientes: ['yuca'] }),
    P({ id: 'bollo', cat: 'acomp', nombre: 'Bollo limpio', precio: 2000, porcion: 'Unidad', descripcion: 'Bollo de maíz costeño.', foto: '', arte: 'acompanante', ingredientes: ['bollo'] }),
    P({ id: 'limonada', cat: 'bebidas', nombre: 'Limonada natural', precio: 5000, porcion: 'Vaso 16 oz', descripcion: 'Limón exprimido y hielo.',
      foto: U('photo-1523677011781-c91d1bbe2f9e'), arte: 'vaso', color: '#E7EFA0', ingredientes: ['limon_j', 'hielo'] }),
    P({ id: 'limonada-coco', cat: 'bebidas', nombre: 'Limonada de coco', precio: 8000, porcion: 'Vaso 16 oz', descripcion: 'Cremosa, con leche de coco.',
      foto: U('photo-1621263764928-df1444c5e859'), arte: 'vaso', color: '#F3EEDD', ingredientes: ['limon_j', 'coco', 'hielo'] }),
    P({ id: 'jugo-agua', cat: 'bebidas', nombre: 'Jugo natural en agua', precio: 5000, porcion: 'Corozo, mango, maracuyá o tamarindo', descripcion: 'De la fruta del día.',
      foto: U('photo-1583577612013-4fecf7bf8f13'), arte: 'vaso', color: '#F7A928', ingredientes: ['fruta', 'hielo'] }),
    P({ id: 'jugo-leche', cat: 'bebidas', nombre: 'Jugo natural en leche', precio: 6000, porcion: 'Vaso 16 oz', descripcion: 'La fruta del día en leche.',
      foto: U('photo-1577680716097-9a565ddc2007'), arte: 'vaso', color: '#F2B98A', ingredientes: ['fruta', 'leche'] }),
    P({ id: 'gaseosa', cat: 'bebidas', nombre: 'Gaseosa', precio: 3500, porcion: 'Botella 400 ml', descripcion: 'Bien fría.',
      foto: U('photo-1566846128021-b940b0eec910'), arte: 'vaso', color: '#3A2A22', ingredientes: [] }),
    P({ id: 'agua', cat: 'bebidas', nombre: 'Agua', precio: 2500, porcion: 'Botella 600 ml', descripcion: 'Sin gas.',
      foto: U('photo-1628692945318-f44a3c346afb'), arte: 'vaso', color: '#BFE6F5', ingredientes: [] })
  ];

  const SALSAS = [
    { id: 'rosada', nombre: 'Rosada', color: '#F4A3B4', precio: 0 },
    { id: 'pina', nombre: 'Piña', color: '#FFD23F', precio: 0 },
    { id: 'ajo', nombre: 'Ajo de la casa', color: '#F7F1DE', brillo: '#D5CCC0', precio: 0 },
    { id: 'bbq', nombre: 'BBQ', color: '#7A2A12', precio: 0 },
    { id: 'tartara', nombre: 'Tártara', color: '#EFEBD4', brillo: '#D0C9A6', precio: 0 },
    { id: 'aji', nombre: 'Ají picante', color: '#E2572B', precio: 0 },
    { id: 'suero', nombre: 'Suero costeño', color: '#FBF5E6', brillo: '#E2D6B8', precio: 2000 },
    { id: 'guacamole', nombre: 'Guacamole', color: '#7FB241', precio: 3000 }
  ];

  // Ocasiones para reservas: el administrador puede cambiarlas
  const OCASIONES = [
    { id: 'cumpleanos', nombre: 'Cumpleaños', foto: U('photo-1577998474517-7eeeed4e448a'), texto: 'Mesa decorada y la picada o el pollo entero para compartir.' },
    { id: 'quince', nombre: 'Quince años', foto: U('photo-1558301211-0d8c8ddee6ec'), texto: 'Salón para el grupo, menú para compartir y espacio para la torta.' },
    { id: 'cita', nombre: 'Cita romántica', foto: U('photo-1679993387260-38824cf1a93a'), texto: 'Mesa para dos en un rincón tranquilo.' },
    { id: 'aniversario', nombre: 'Aniversario', foto: U('photo-1527529482837-4698179dc6ce'), texto: 'Celebren con una especialidad de la casa.' },
    { id: 'familia', nombre: 'Reunión familiar', foto: U('photo-1755811248324-c70c1f10a7fd'), texto: 'Mesas juntas y platos para compartir.' },
    { id: 'grado', nombre: 'Grado', foto: U('photo-1513151233558-d860c5398176'), texto: 'Para celebrar con la familia y los amigos.' },
    { id: 'trabajo', nombre: 'Reunión de trabajo', foto: U('photo-1414235077428-338989a2e8c0'), texto: 'Almuerzo de equipo con factura y menú fijo.' },
    { id: 'otra', nombre: 'Otra ocasión', foto: U('photo-1599487488170-d11ec9c172f0'), texto: 'Cuéntenos qué celebran.' }
  ];

  // Publicidad de ejemplo: el administrador la reemplaza desde el panel
  const PUBLICIDAD = [
    { id: 'pub-1', titulo: 'Martes de pollo', texto: 'Medio pollo asado con limonada natural', etiqueta: 'Oferta de ejemplo', producto: 'medio-pollo', foto: U('photo-1606728035253-49e8a23146de'), activo: true },
    { id: 'pub-2', titulo: 'Picada para compartir', texto: 'La especialidad de la casa, al carbón', etiqueta: 'Especialidad', producto: 'picada', foto: U('photo-1529193591184-b1d58069ecdd'), activo: true },
    { id: 'pub-3', titulo: 'Reserve su celebración', texto: 'Cumpleaños, quince años y reuniones', etiqueta: 'Reservas', accion: 'reservas', foto: U('photo-1577998474517-7eeeed4e448a'), activo: true }
  ];

  const HEROE = U('photo-1599487488170-d11ec9c172f0');

  window.CATALOGO = { CATEGORIAS, INGR, PRODUCTOS, SALSAS, OCASIONES, PUBLICIDAD, HEROE };
})();
