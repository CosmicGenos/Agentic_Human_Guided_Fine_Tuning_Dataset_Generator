/**
 * Where the access token lives. Kept out of the auth feature so the API client
 * can read it without importing React code.
 *
 * localStorage is readable by any script on the page, so the app must never render
 * untrusted HTML (we don't) and should be served with a strict CSP.
 */
const KEY = 'luman.token';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      /* private mode / storage disabled: session simply won't survive a reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};

type Listener = () => void;
let unauthorizedListener: Listener | null = null;

/** The auth provider registers here so a 401 anywhere logs the user out through React state. */
export function onUnauthorized(listener: Listener | null) {
  unauthorizedListener = listener;
}

export function notifyUnauthorized() {
  unauthorizedListener?.();
}
