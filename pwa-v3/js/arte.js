/* ============================================================
   MESA Y RUTA · ilustraciones de respaldo (cuando una foto no carga)
   Las ilustraciones son SVG dibujados en código: pesan casi nada y
   cargan sin señal. Para usar fotos propias, ponga la ruta en «foto»
   (por ejemplo 'img/platos/pollo.webp', 600×600, fondo transparente o
   recortada en círculo) y la app la usa en lugar del dibujo.
   ============================================================ */
(function () {
  'use strict';

  // ---------- utilidades de dibujo ----------
  let semilla = 1;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  const sembrar = s => { semilla = s; };
  const f = n => Math.round(n * 10) / 10;

  function grad(id, c1, c2, fx = '35%', fy = '30%') {
    return `<radialGradient id="${id}" cx="50%" cy="50%" r="60%" fx="${fx}" fy="${fy}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
  }
  const sombra = (u) => `<filter id="sb${u}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".35"/></filter>`;

  // ---------- platos (vista cenital, centrados en 0,0, radio útil ~88) ----------
  const ARTE = {
    pollo(u) {
      sembrar(11);
      let s = `<defs>${grad('pi' + u, '#F6B347', '#A4501C')}${grad('pa' + u, '#FFE59A', '#D9A93F')}${grad('ar' + u, '#FFF3D1', '#E3C27F')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      // arepa
      s += `<circle cx="-46" cy="40" r="30" fill="url(#ar${u})"/>`;
      for (let i = -2; i <= 2; i++) s += `<path d="M${-70 + 0} ${40 + i * 9}h48" stroke="#B9873A" stroke-width="3" stroke-linecap="round" opacity=".55" transform="rotate(-30 -46 40)"/>`;
      // papas saladas
      [[30, 52, 15], [52, 34, 13], [10, 70, 12], [44, 64, 11]].forEach(([x, y, r]) => {
        s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .82}" fill="url(#pa${u})"/><ellipse cx="${x - r * .3}" cy="${y - r * .3}" rx="${r * .3}" ry="${r * .18}" fill="#fff" opacity=".45"/>`;
      });
      // medio pollo (muslo + pechuga)
      s += `<path d="M-58-22C-62-56-24-78 8-72 44-66 66-40 60-10 55 16 30 26 4 22-22 18-54 10-58-22Z" fill="url(#pi${u})"/>`;
      s += `<path d="M18 4C34 0 54 6 62 20 70 34 60 46 46 44 36 42 30 34 24 30Z" fill="url(#pi${u})"/>`;
      s += `<circle cx="66" cy="28" r="7" fill="#F4E3C3"/><circle cx="71" cy="31" r="5" fill="#F4E3C3"/>`;
      for (let i = 0; i < 6; i++) s += `<path d="M${-46 + i * 17}-58l-14 70" stroke="#5E2A0C" stroke-width="4" stroke-linecap="round" opacity=".55"/>`;
      s += `<path d="M-40-40C-20-58 10-60 30-48" stroke="#FFD27A" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`;
      // limón y cilantro
      s += `<path d="M-6 76a26 26 0 0 1 40-30z" fill="#9BCB3C"/><path d="M-2 72a20 20 0 0 1 30-23z" fill="#DDF29B"/>`;
      for (let i = 0; i < 9; i++) s += `<circle cx="${f(-80 + azar() * 160)}" cy="${f(-70 + azar() * 140)}" r="${f(2 + azar() * 2.5)}" fill="#3E8E2F" opacity=".9"/>`;
      return s + '</g>';
    },

    hamburguesa(u) {
      sembrar(7);
      let s = `<defs>${grad('pn' + u, '#F7B657', '#B9621E')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      // lechuga que asoma
      let d = '';
      for (let i = 0; i <= 36; i++) {
        const a = i / 36 * Math.PI * 2, r = 84 + (i % 2 ? 9 : 0) + azar() * 4;
        d += (i ? 'L' : 'M') + f(Math.cos(a) * r) + ' ' + f(Math.sin(a) * r);
      }
      s += `<path d="${d}Z" fill="#5DB33B"/><path d="${d}Z" fill="none" stroke="#3E8E2F" stroke-width="3" transform="scale(.93)"/>`;
      // queso
      s += `<path d="M-86-6L-60-40-40-4Z" fill="#FFC928"/><path d="M60 50L90 34 70 70Z" fill="#FFC928"/><path d="M10 78L40 92 0 96Z" fill="#FFC928"/>`;
      // carne asomando
      s += `<circle r="80" fill="#5B2B17"/>`;
      // pan
      s += `<circle r="74" fill="url(#pn${u})"/><ellipse cx="-24" cy="-30" rx="34" ry="18" fill="#FFE1A3" opacity=".45"/>`;
      for (let i = 0; i < 26; i++) {
        const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 62;
        s += `<ellipse cx="${f(Math.cos(a) * r)}" cy="${f(Math.sin(a) * r)}" rx="3.6" ry="1.9" transform="rotate(${f(azar() * 180)} ${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)})" fill="#FFF6E0"/>`;
      }
      return s + '</g>';
    },

    picada(u) {
      sembrar(29);
      let s = `<defs>${grad('ch' + u, '#C2462D', '#6E1E12')}${grad('pt' + u, '#FFE07A', '#D99A2B')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      // yuca frita
      for (let i = 0; i < 7; i++) {
        const x = -70 + azar() * 60, y = -60 + azar() * 70, a = -40 + azar() * 80;
        s += `<rect x="${f(x)}" y="${f(y)}" width="54" height="16" rx="7" fill="#F3DFA2" stroke="#D2B160" stroke-width="2" transform="rotate(${f(a)} ${f(x + 27)} ${f(y + 8)})"/>`;
      }
      // patacones
      [[38, -40], [62, -6], [40, 26]].forEach(([x, y]) => {
        s += `<circle cx="${x}" cy="${y}" r="24" fill="url(#pt${u})"/><circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#E7B44A" stroke-width="3" opacity=".7"/>`;
      });
      // chorizo en rodajas
      [[-40, 34], [-16, 52], [-52, 62], [8, 30], [-24, 16]].forEach(([x, y]) => {
        s += `<circle cx="${x}" cy="${y}" r="15" fill="url(#ch${u})"/>`;
        for (let k = 0; k < 5; k++) s += `<circle cx="${f(x - 8 + azar() * 16)}" cy="${f(y - 8 + azar() * 16)}" r="2" fill="#F2C1A8" opacity=".8"/>`;
      });
      // butifarra
      [[18, 64], [34, 76], [52, 60]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="12" fill="#B87A55"/><circle cx="${x - 3}" cy="${y - 4}" r="4" fill="#E2B08E" opacity=".7"/>`; });
      // ají en pocillo
      s += `<circle cx="-4" cy="-62" r="17" fill="#F7F1E8"/><circle cx="-4" cy="-62" r="12" fill="#E2572B"/><circle cx="-8" cy="-66" r="3" fill="#fff" opacity=".6"/>`;
      return s + '</g>';
    },

    costillas(u) {
      sembrar(3);
      let s = `<defs>${grad('cs' + u, '#B23A1F', '#4A140A')}${grad('mz' + u, '#FFE27A', '#E1A52A')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      // repollo (ensalada)
      for (let i = 0; i < 26; i++) s += `<path d="M${f(28 + azar() * 50)} ${f(30 + azar() * 46)}q6 ${f(-4 + azar() * 8)} 14 0" stroke="${azar() > .5 ? '#E9F2D0' : '#C9DB8E'}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      // mazorca
      s += `<g transform="rotate(-25 -40 58)"><rect x="-78" y="44" width="76" height="28" rx="14" fill="url(#mz${u})"/>`;
      for (let x = -72; x < -8; x += 9) for (let y = 49; y < 70; y += 8) s += `<circle cx="${x}" cy="${y}" r="3.2" fill="#FFF2A8" opacity=".7"/>`;
      s += '</g>';
      // costillar
      s += `<g transform="rotate(-18)"><rect x="-80" y="-56" width="150" height="80" rx="30" fill="url(#cs${u})"/>`;
      for (let i = 0; i < 6; i++) s += `<path d="M${-58 + i * 24}-50v68" stroke="#2E0A04" stroke-width="5" opacity=".45" stroke-linecap="round"/><rect x="${-62 + i * 24}" y="-70" width="10" height="18" rx="5" fill="#F3E7D2"/>`;
      s += `<path d="M-64-30C-30-46 20-46 54-30" stroke="#E86A3E" stroke-width="7" fill="none" opacity=".55" stroke-linecap="round"/></g>`;
      return s + '</g>';
    },

    salchipapa(u) {
      sembrar(17);
      let s = `<defs>${sombra(u)}</defs><g filter="url(#sb${u})">`;
      for (let i = 0; i < 34; i++) {
        const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 66, x = Math.cos(a) * r, y = Math.sin(a) * r;
        s += `<rect x="${f(x - 26)}" y="${f(y - 6)}" width="52" height="12" rx="4" fill="${azar() > .3 ? '#F7C64A' : '#E9A93A'}" stroke="#C98A22" stroke-width="1.5" transform="rotate(${f(azar() * 180)} ${f(x)} ${f(y)})"/>`;
      }
      for (let i = 0; i < 10; i++) {
        const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 56, x = Math.cos(a) * r, y = Math.sin(a) * r;
        s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="13" ry="11" fill="#C7604A"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="8" ry="6.5" fill="#E9A08C"/>`;
      }
      // salsas en zigzag
      let z1 = 'M-60-40', z2 = 'M-56-20';
      for (let i = 0; i < 8; i++) { z1 += ` l${f(14)} ${i % 2 ? -16 : 16}`; z2 += ` l${f(14)} ${i % 2 ? -14 : 14}`; }
      s += `<path d="${z1}" stroke="#F4A3B4" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${z2}" stroke="#FFE36E" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 40)"/>`;
      for (let i = 0; i < 18; i++) s += `<rect x="${f(-50 + azar() * 100)}" y="${f(-50 + azar() * 100)}" width="10" height="3" rx="1.5" fill="#FFF3C4" transform="rotate(${f(azar() * 180)})"/>`;
      return s + '</g>';
    },

    ensalada(u) {
      sembrar(5);
      let s = `<defs>${grad('tm' + u, '#FF6B5A', '#B71E12')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      for (let i = 0; i < 16; i++) {
        const a = azar() * Math.PI * 2, r = 20 + azar() * 52, x = Math.cos(a) * r, y = Math.sin(a) * r;
        s += `<path d="M${f(x)} ${f(y)}c-18-14-10-34 6-36 16 6 18 24-6 36z" fill="${azar() > .5 ? '#6CC04A' : '#3E9B35'}" transform="rotate(${f(azar() * 360)} ${f(x)} ${f(y)})"/>`;
      }
      for (let i = 0; i < 6; i++) { const x = -60 + azar() * 120, y = -60 + azar() * 120; s += `<circle cx="${f(x)}" cy="${f(y)}" r="10" fill="#E9F5DA" stroke="#5AA845" stroke-width="3"/><circle cx="${f(x)}" cy="${f(y)}" r="3" fill="#B8DE9B"/>`; }
      for (let i = 0; i < 7; i++) { const x = -55 + azar() * 110, y = -55 + azar() * 110; s += `<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="url(#tm${u})"/><circle cx="${f(x - 3)}" cy="${f(y - 3)}" r="2.5" fill="#fff" opacity=".6"/>`; }
      for (let i = 0; i < 5; i++) { const x = -50 + azar() * 100, y = -50 + azar() * 100; s += `<circle cx="${f(x)}" cy="${f(y)}" r="11" fill="none" stroke="#9B3D8F" stroke-width="3"/>`; }
      for (let i = 0; i < 22; i++) s += `<circle cx="${f(-50 + azar() * 100)}" cy="${f(-50 + azar() * 100)}" r="3.4" fill="#FFD23F"/>`;
      return s + '</g>';
    },
    pescado(u) {
      sembrar(13);
      let s = `<defs>${grad('pz' + u, '#E9B35A', '#9A5A1C')}${grad('pt2' + u, '#FFE07A', '#D99A2B')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      [[48, 46], [62, 14], [30, 70]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="20" fill="url(#pt2${u})"/><circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#E7B44A" stroke-width="3" opacity=".7"/>`; });
      s += `<ellipse cx="-34" cy="52" rx="34" ry="22" fill="#FBF6EC"/>`;
      for (let i = 0; i < 14; i++) s += `<ellipse cx="${f(-58 + azar() * 48)}" cy="${f(40 + azar() * 24)}" rx="4" ry="2" fill="#E9DFC9"/>`;
      s += `<path d="M-78-14C-50-62 30-66 64-22L88-46 84 4 90 44 62 18C30 60-50 54-78-14Z" fill="url(#pz${u})"/>`;
      for (let i = 0; i < 7; i++) s += `<path d="M${-40 + i * 13}-34q8 22 0 44" stroke="#7A3F10" stroke-width="3" fill="none" opacity=".45"/>`;
      s += `<circle cx="-56" cy="-18" r="5" fill="#2B1A10"/><circle cx="-57" cy="-19" r="1.6" fill="#fff"/>`;
      s += `<path d="M-10 -70a24 24 0 0 1 36 -22z" fill="#9BCB3C"/><path d="M-6 -73a18 18 0 0 1 27 -17z" fill="#DDF29B"/>`;
      return s + '</g>';
    },
    carne(u) {
      sembrar(19);
      let s = `<defs>${grad('cr' + u, '#8E3B22', '#3E140A')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      s += `<path d="M-74-30C-60-70 30-74 66-40 90-14 70 40 30 50-20 62-84 30-74-30Z" fill="url(#cr${u})"/>`;
      for (let i = 0; i < 6; i++) s += `<path d="M${-60 + i * 22}-56l-18 92" stroke="#1E0703" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;
      s += `<path d="M-50-30C-20-50 20-52 50-34" stroke="#C9643C" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/>`;
      [[40, 66], [62, 52], [20, 80]].forEach(([x, y]) => { s += `<ellipse cx="${x}" cy="${y}" rx="13" ry="10" fill="#F3CF6A"/>`; });
      for (let i = 0; i < 10; i++) s += `<circle cx="${f(-70 + azar() * 40)}" cy="${f(50 + azar() * 30)}" r="5" fill="${azar() > .5 ? '#5DB33B' : '#E8412F'}"/>`;
      return s + '</g>';
    },
    chuzo(u) {
      sembrar(23);
      let s = `<defs>${sombra(u)}</defs><g filter="url(#sb${u})">`;
      [-34, 0, 34].forEach((y, k) => {
        s += `<rect x="-92" y="${y - 2}" width="184" height="4" rx="2" fill="#C9A97A" transform="rotate(-12)"/>`;
        for (let i = 0; i < 5; i++) {
          const x = -64 + i * 32, c = ['#7A2E14', '#E8412F', '#9B5A2A', '#5DB33B', '#C86B2A'][(i + k) % 5];
          s += `<rect x="${x - 13}" y="${y - 13}" width="26" height="26" rx="7" fill="${c}" transform="rotate(-12)"/>`;
        }
      });
      return s + '</g>';
    },
    perro(u) {
      sembrar(31);
      let s = `<defs>${grad('pn2' + u, '#F7C26A', '#C47A2A')}${sombra(u)}</defs><g filter="url(#sb${u})" transform="rotate(-25)">`;
      s += `<rect x="-90" y="-30" width="180" height="60" rx="30" fill="url(#pn2${u})"/>`;
      s += `<rect x="-96" y="-14" width="192" height="28" rx="14" fill="#B5502E"/>`;
      let z = 'M-80-4'; for (let i = 0; i < 12; i++) z += ` l14 ${i % 2 ? -8 : 8}`;
      s += `<path d="${z}" stroke="#FFE36E" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="${z}" stroke="#F4A3B4" stroke-width="4" fill="none" transform="translate(4 8)" stroke-linejoin="round"/>`;
      for (let i = 0; i < 14; i++) s += `<rect x="${f(-70 + azar() * 140)}" y="${f(-20 + azar() * 10)}" width="8" height="3" fill="#F3E3A6"/>`;
      return s + '</g>';
    },
    papas(u) {
      sembrar(37);
      let s = `<defs>${sombra(u)}</defs><g filter="url(#sb${u})">`;
      for (let i = 0; i < 40; i++) {
        const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 70, x = Math.cos(a) * r, y = Math.sin(a) * r;
        s += `<rect x="${f(x - 26)}" y="${f(y - 6)}" width="52" height="12" rx="4" fill="${azar() > .3 ? '#F7C64A' : '#E9A93A'}" stroke="#C98A22" stroke-width="1.5" transform="rotate(${f(azar() * 180)} ${f(x)} ${f(y)})"/>`;
      }
      return s + '</g>';
    },
    acompanante(u) {
      sembrar(41);
      let s = `<defs>${grad('pt3' + u, '#FFE07A', '#D99A2B')}${sombra(u)}</defs><g filter="url(#sb${u})">`;
      [[-30, -30], [30, -24], [-26, 32], [34, 34], [0, 0]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="30" fill="url(#pt3${u})"/><circle cx="${x}" cy="${y}" r="18" fill="none" stroke="#E7B44A" stroke-width="3" opacity=".7"/>`; });
      return s + '</g>';
    },
    arroz(u) {
      sembrar(43);
      let s = `<defs>${sombra(u)}</defs><g filter="url(#sb${u})"><circle r="74" fill="#E9D3A8"/>`;
      for (let i = 0; i < 160; i++) { const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 70; s += `<ellipse cx="${f(Math.cos(a) * r)}" cy="${f(Math.sin(a) * r)}" rx="4" ry="1.8" fill="${azar() > .7 ? '#C99A5A' : '#FBF2DE'}" transform="rotate(${f(azar() * 180)} ${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)})"/>`; }
      return s + '</g>';
    },
    vaso(u, color = '#F7A928') {
      return `<defs>${sombra(u)}</defs><g filter="url(#sb${u})"><path d="M-46-80h92l-12 160h-68z" fill="#fff" opacity=".9"/><path d="M-42-40h84l-9 116h-66z" fill="${color}"/><path d="M14-96l-20 70" stroke="#E2572B" stroke-width="7" stroke-linecap="round"/><rect x="-30" y="-30" width="22" height="16" rx="4" fill="#fff" opacity=".6"/></g>`;
    }

  };

  // ---------- miniaturas de ingredientes (círculo de 40 px) ----------
  function mini(forma, c1, c2) {
    const fondo = `<circle r="19" fill="${c2}" opacity=".22"/>`;
    const formas = {
      disco: `<circle r="12" fill="${c1}"/><circle cx="-4" cy="-4" r="4" fill="#fff" opacity=".45"/>`,
      rodaja: `<circle r="12" fill="${c1}"/><circle r="7" fill="none" stroke="${c2}" stroke-width="2.5"/><circle r="2.5" fill="${c2}"/>`,
      hoja: `<path d="M-11 9C-14-6-2-15 12-12 13 2 4 13-11 9Z" fill="${c1}"/><path d="M-9 7L9-9" stroke="${c2}" stroke-width="2"/>`,
      cuna: `<path d="M-12 8A15 15 0 0 1 12 8Z" fill="${c1}"/><path d="M-8 6A10 10 0 0 1 8 6Z" fill="${c2}"/>`,
      palitos: `<rect x="-12" y="-9" width="22" height="6" rx="3" fill="${c1}" transform="rotate(-20)"/><rect x="-10" y="-1" width="22" height="6" rx="3" fill="${c1}" transform="rotate(12)"/><rect x="-8" y="6" width="18" height="6" rx="3" fill="${c2}"/>`,
      granos: `<circle cx="-5" cy="-5" r="4.5" fill="${c1}"/><circle cx="5" cy="-4" r="4.5" fill="${c1}"/><circle cx="0" cy="5" r="4.5" fill="${c1}"/><circle cx="-8" cy="5" r="3.5" fill="${c2}"/><circle cx="8" cy="6" r="3.5" fill="${c2}"/>`,
      cubo: `<rect x="-10" y="-10" width="20" height="20" rx="4" fill="${c1}"/><circle cx="-3" cy="-2" r="2.5" fill="${c2}"/><circle cx="4" cy="4" r="2" fill="${c2}"/>`,
      tira: `<path d="M-13-4c6-6 10 4 16-2s8-2 10 2v6c-4-4-6 0-10 2s-10-6-16 0z" fill="${c1}"/><path d="M-11 0c6-4 10 3 16-1" stroke="${c2}" stroke-width="2" fill="none"/>`,
      huevo: `<ellipse rx="13" ry="11" fill="#FFFDF6"/><circle cx="2" cy="1" r="6" fill="${c1}"/>`,
      pan: `<path d="M-13 6C-13-8 13-8 13 6Z" fill="${c1}"/><rect x="-13" y="5" width="26" height="5" rx="2" fill="${c2}"/>`
    };
    return `<svg viewBox="-20 -20 40 40" aria-hidden="true">${fondo}${formas[forma] || formas.disco}</svg>`;
  }

  // ---------- recipiente de salsa (vista cenital) ----------
  function recipiente(color, brillo = '#fff') {
    return `<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="18" fill="#EDE7DF"/><circle r="18" fill="none" stroke="#D5CCC0" stroke-width="1.5"/><circle r="13" fill="${color}"/><path d="M-7-7a10 10 0 0 1 9-3" stroke="${brillo}" stroke-width="2.5" stroke-linecap="round" opacity=".7" fill="none"/></svg>`;
  }

  // ---------- bebida (vista lateral) ----------
  function bebida(color, tipo = 'vaso', extra = '') {
    if (tipo === 'botella') {
      return `<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="19" fill="${color}" opacity=".16"/><path d="M-3-17h6v6l4 5v20a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V-6l4-5z" fill="${color}"/><rect x="-7" y="-1" width="14" height="8" rx="1.5" fill="#fff" opacity=".85"/><rect x="-3" y="-19" width="6" height="3" rx="1" fill="#333"/></svg>`;
    }
    return `<svg viewBox="-20 -20 40 40" aria-hidden="true"><circle r="19" fill="${color}" opacity=".16"/><path d="M-10-12h20l-3 26h-14z" fill="#fff" opacity=".9" stroke="#D5CCC0"/><path d="M-9-5h18l-2.2 18.5h-13.6z" fill="${color}"/>${extra}<path d="M4-16l-4 14" stroke="#E2572B" stroke-width="2" stroke-linecap="round"/></svg>`;
  }


  let cuenta = 0;
  function svgArte(tipo, color) {
    const u = 'a' + (++cuenta);
    const fn = ARTE[tipo] || ARTE.acompanante;
    return `<svg viewBox="-100 -100 200 200" aria-hidden="true">${fn(u, color)}</svg>`;
  }
  window.ARTE = { svg: svgArte, mini, recipiente, bebida };
})();
