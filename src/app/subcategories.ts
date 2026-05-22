// Subcategorías de productos. Admin puede agregar más vía UI (persisten en localStorage).

export interface Subcategory {
  value: string;  // slug, used in URLs and product.subcategory
  label: string;  // display label (Spanish)
}

const DEFAULT_SUBCATEGORIES: Subcategory[] = [
  { value: 't-shirts', label: 'Camisetas' },
  { value: 'polos',    label: 'Polos' },
  { value: 'gorras',   label: 'Gorras' },
  { value: 'hoodies',  label: 'Hoodies' },
  { value: 'joggers',  label: 'Joggers' },
];

const STORAGE_KEY = 'elemental_custom_subcategories';

const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function loadSubcategories(): Subcategory[] {
  if (typeof window === 'undefined') return DEFAULT_SUBCATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SUBCATEGORIES;
    const custom = JSON.parse(raw) as Subcategory[];
    const existing = new Set(DEFAULT_SUBCATEGORIES.map((s) => s.value));
    const extras = custom.filter((s) => !existing.has(s.value));
    return [...DEFAULT_SUBCATEGORIES, ...extras];
  } catch {
    return DEFAULT_SUBCATEGORIES;
  }
}

export function saveCustomSubcategory(label: string): Subcategory | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const value = slugify(trimmed);
  if (!value) return null;
  const all = loadSubcategories();
  if (all.some((s) => s.value === value || s.label.toLowerCase() === trimmed.toLowerCase())) {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const custom: Subcategory[] = raw ? JSON.parse(raw) : [];
  const next = [...custom, { value, label: trimmed }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return { value, label: trimmed };
}

export function deleteCustomSubcategory(value: string) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const custom: Subcategory[] = raw ? JSON.parse(raw) : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom.filter((s) => s.value !== value)));
}

export function isDefaultSubcategory(value: string) {
  return DEFAULT_SUBCATEGORIES.some((s) => s.value === value);
}

export function findSubcategory(value: string): Subcategory | undefined {
  return loadSubcategories().find((s) => s.value === value);
}
