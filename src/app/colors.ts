// Paleta oficial Elemental Fábrica - 42 colores con código
// Usada por el admin (selector al crear/editar producto) y por el cliente (selector en producto).

export interface PaletteColor {
  code: string;
  name: string;
  value: string;
  swatch: string;
}

const camoSwatch = (base: string, mid: string, dark: string, light: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60' preserveAspectRatio='xMidYMid slice'>
      <rect width='60' height='60' fill='${base}'/>
      <path d='M0 8 Q12 2 22 10 T48 6 L60 10 V22 Q44 26 30 22 T0 26 Z' fill='${dark}'/>
      <path d='M0 38 Q14 32 26 40 T54 38 L60 40 V60 H0 Z' fill='${mid}'/>
      <ellipse cx='14' cy='30' rx='9' ry='5' fill='${light}'/>
      <ellipse cx='42' cy='46' rx='8' ry='5' fill='${dark}'/>
      <ellipse cx='50' cy='18' rx='5' ry='4' fill='${light}'/>
      <path d='M18 50 Q26 46 34 52 Q40 56 30 58 Q22 58 18 54 Z' fill='${light}'/>
    </svg>`
  )}") center/cover`;

export const PALETTE: PaletteColor[] = [
  { code: 'A1', name: 'Marrón', value: 'A1', swatch: '#6B4A2B' },
  { code: 'A2', name: 'Verde Esmeralda', value: 'A2', swatch: '#2EB872' },
  { code: 'A3', name: 'Azul Rey', value: 'A3', swatch: '#1E40AF' },
  { code: 'A4', name: 'Turquesa', value: 'A4', swatch: '#38B6C4' },
  { code: 'A5', name: 'Rojo', value: 'A5', swatch: '#8B1A2B' },
  { code: 'A6', name: 'Amarillo Neón', value: 'A6', swatch: '#E0E840' },
  { code: 'B1', name: 'Lila', value: 'B1', swatch: '#C6A8E2' },
  { code: 'B2', name: 'Rosa Neón', value: 'B2', swatch: '#FF6F8E' },
  { code: 'B3', name: 'Verde Oliva', value: 'B3', swatch: '#A4B58F' },
  { code: 'B4', name: 'Amarillo Claro', value: 'B4', swatch: '#F1E27A' },
  { code: 'B5', name: 'Mostaza', value: 'B5', swatch: '#D9A02B' },
  { code: 'B6', name: 'Amarillo Fuerte', value: 'B6', swatch: '#F1D300' },
  { code: 'C1', name: 'Crema', value: 'C1', swatch: '#EAE6DD' },
  { code: 'C2', name: 'Jaspe Claro', value: 'C2', swatch: '#B0B0B0' },
  { code: 'C3', name: 'Jaspe Oscuro', value: 'C3', swatch: '#5C5C5C' },
  { code: 'C4', name: 'Guayaba', value: 'C4', swatch: '#D5A99B' },
  { code: 'C5', name: 'Rosado', value: 'C5', swatch: '#F1B6CC' },
  { code: 'C6', name: 'Azul Petróleo', value: 'C6', swatch: '#14365A' },
  { code: 'D1', name: 'Magenta', value: 'D1', swatch: '#C72A8F' },
  { code: 'D2', name: 'Morado', value: 'D2', swatch: '#6E2BB4' },
  { code: 'D3', name: 'Azul Oscuro', value: 'D3', swatch: '#232A47' },
  { code: 'D4', name: 'Verde Seco', value: 'D4', swatch: '#A3D2A3' },
  { code: 'D5', name: 'Celeste Bebé', value: 'D5', swatch: '#ACDEF3' },
  { code: 'D6', name: 'Fucsia', value: 'D6', swatch: '#D14479' },
  { code: 'E1', name: 'Verde Militar', value: 'E1', swatch: '#5C6B3F' },
  { code: 'E2', name: 'Vinotinto', value: 'E2', swatch: '#6E1F2F' },
  { code: 'E3', name: 'Verde Navidad', value: 'E3', swatch: '#1F8B4C' },
  { code: 'E4', name: 'Marrón Oscuro', value: 'E4', swatch: '#5B3B1F' },
  { code: 'E5', name: 'Rojo', value: 'E5', swatch: '#E33B2C' },
  { code: 'E6', name: 'Terracota', value: 'E6', swatch: '#A65B36' },
  { code: 'F1', name: 'Verde Neón', value: 'F1', swatch: '#B9F23B' },
  { code: 'F2', name: 'Naranja Neón', value: 'F2', swatch: '#F5A11B' },
  { code: 'F3', name: 'Beige', value: 'F3', swatch: '#D6CDB5' },
  { code: 'F4', name: 'Naranja', value: 'F4', swatch: '#F37224' },
  { code: 'F5', name: 'Aguamarina', value: 'F5', swatch: '#56DBCB' },
  { code: 'F6', name: 'Azul Cielo', value: 'F6', swatch: '#A7DDFF' },
  { code: 'G1', name: 'Crema Jaspe', value: 'G1', swatch: '#C7C0AC' },
  { code: 'G2', name: 'Negro', value: 'G2', swatch: '#000000' },
  { code: 'G3', name: 'Blanco', value: 'G3', swatch: '#FFFFFF' },
  { code: 'G4', name: 'Camu 3', value: 'G4', swatch: camoSwatch('#3a3a3a', '#525252', '#1a1a1a', '#6b6b6b') },
  { code: 'G5', name: 'Camu 2', value: 'G5', swatch: camoSwatch('#c8c8c8', '#9b9b9b', '#6e6e6e', '#eeeeee') },
  { code: 'G6', name: 'Camu 1', value: 'G6', swatch: camoSwatch('#5c6b3f', '#3f4a2a', '#2a3019', '#8a9663') },
];

export const findColor = (value: string) =>
  PALETTE.find((c) => c.value === value || c.code === value);

// Helper: tells if a swatch needs a dark check mark (light background)
export const isLightSwatch = (color?: PaletteColor) => {
  if (!color) return false;
  return ['G3', 'C1', 'D5', 'F6', 'B4', 'C5', 'D4'].includes(color.code);
};
