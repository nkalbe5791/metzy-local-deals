import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "metzy:pending-referral";

export function rememberReferralCode(code: string | null | undefined) {
  if (!code || typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
}

/** Applique le code de parrainage en attente si l'utilisateur est connecté. */
export async function applyPendingReferral(): Promise<void> {
  if (typeof window === "undefined") return;
  const code = window.localStorage.getItem(STORAGE_KEY);
  if (!code) return;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data, error } = await supabase.rpc("apply_referral_code", { _code: code });
  if (error) return;

  const result = data as { ok?: boolean; code?: string } | null;
  // Un code invalide ou déjà utilisé ne doit pas rester en attente indéfiniment.
  if (result?.ok || result?.code !== "AUTH_REQUIRED") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
