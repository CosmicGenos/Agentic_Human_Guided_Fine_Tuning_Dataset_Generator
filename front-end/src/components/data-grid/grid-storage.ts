/** Per-grid preferences (column layout, page size) remembered in localStorage under `luman.grid.<key>`. */
export interface GridPrefs {
  pageSize?: number;
  order?: string[];
  hidden?: string[];
  sizes?: Record<string, number>;
}

const prefix = 'luman.grid.';

export function readGridPrefs(key: string | undefined): GridPrefs {
  if (!key) return {};
  try {
    const raw = localStorage.getItem(prefix + key);
    return raw ? (JSON.parse(raw) as GridPrefs) : {};
  } catch {
    return {};
  }
}

export function writeGridPrefs(key: string | undefined, patch: GridPrefs) {
  if (!key) return;
  try {
    localStorage.setItem(prefix + key, JSON.stringify({ ...readGridPrefs(key), ...patch }));
  } catch {
    /* storage unavailable: preferences just won't persist */
  }
}
