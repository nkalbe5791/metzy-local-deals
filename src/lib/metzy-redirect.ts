const KEY = "metzy:next";

/** Mémorise la page voulue avant de passer par l'authentification. */
export function rememberNext(path: string) {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/") || path.startsWith("//")) return;
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {
    /* stockage indisponible */
  }
}

/** Récupère (et efface) la page voulue. Toujours un chemin interne. */
export function consumeNext(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Destination après connexion : les administrateurs arrivent directement
 * sur le back-office, les autres sur l'accueil client.
 */
export async function resolveHomePath(): Promise<"/admin" | "/accueil"> {
  const { fetchIsAdmin } = await import("@/lib/metzy-admin");
  const isAdmin = await fetchIsAdmin().catch(() => false);
  return isAdmin ? "/admin" : "/accueil";
}
