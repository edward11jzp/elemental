// Master de tallas Elemental. Admin puede agregar más vía UI (persisten en localStorage).

export type SizeGroup = 'unica' | 'ninos' | 'adultos' | 'otras';

export interface Size {
  value: string;     // identifier saved on the product (also display label)
  label: string;     // display label
  group: SizeGroup;
}

const DEFAULT_SIZES: Size[] = [
  { value: 'Talla Única', label: 'Talla Única', group: 'unica' },

  // Niños
  { value: '2-4', label: '2-4', group: 'ninos' },
  { value: '4-6', label: '4-6', group: 'ninos' },
  { value: '6-8', label: '6-8', group: 'ninos' },
  { value: '8-10', label: '8-10', group: 'ninos' },
  { value: '10-12', label: '10-12', group: 'ninos' },
  { value: '12-14', label: '12-14', group: 'ninos' },
  { value: '14-16', label: '14-16', group: 'ninos' },

  // Adultos
  { value: 'XS', label: 'XS', group: 'adultos' },
  { value: 'S', label: 'S', group: 'adultos' },
  { value: 'M', label: 'M', group: 'adultos' },
  { value: 'L', label: 'L', group: 'adultos' },
  { value: 'XL', label: 'XL', group: 'adultos' },
  { value: '2XL', label: '2XL', group: 'adultos' },
  { value: '3XL', label: '3XL', group: 'adultos' },
  { value: '4XL', label: '4XL', group: 'adultos' },
];

const STORAGE_KEY = 'elemental_custom_sizes';

export function loadSizes(): Size[] {
  if (typeof window === 'undefined') return DEFAULT_SIZES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SIZES;
    const custom = JSON.parse(raw) as Size[];
    const existing = new Set(DEFAULT_SIZES.map((s) => s.value.toLowerCase()));
    const extras = custom.filter((s) => !existing.has(s.value.toLowerCase()));
    return [...DEFAULT_SIZES, ...extras];
  } catch {
    return DEFAULT_SIZES;
  }
}

export function saveCustomSize(size: Size) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY);
  const custom: Size[] = raw ? JSON.parse(raw) : [];
  if (custom.find((s) => s.value.toLowerCase() === size.value.toLowerCase())) return;
  custom.push(size);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function deleteCustomSize(value: string) {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY);
  const custom: Size[] = raw ? JSON.parse(raw) : [];
  const next = custom.filter((s) => s.value !== value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export const GROUP_LABELS: Record<SizeGroup, string> = {
  unica: 'Talla Única',
  ninos: 'Niños',
  adultos: 'Adultos',
  otras: 'Otras',
};

export function groupSizes(sizes: Size[]): Record<SizeGroup, Size[]> {
  return sizes.reduce(
    (acc, s) => {
      acc[s.group].push(s);
      return acc;
    },
    { unica: [], ninos: [], adultos: [], otras: [] } as Record<SizeGroup, Size[]>,
  );
}

export function findSize(allSizes: Size[], value: string): Size | undefined {
  return allSizes.find((s) => s.value === value);
}
