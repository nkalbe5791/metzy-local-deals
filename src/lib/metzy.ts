import { supabase } from "@/integrations/supabase/client";

export type OfferWithMerchant = {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  discount_label: string;
  terms: string | null;
  starts_at: string;
  ends_at: string;
  limit_type: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "UNLIMITED";
  limit_count: number;
  xp_reward: number;
  status: string;
  category_id: string | null;
  merchant_id: string;
  merchants: {
    id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    city_id: string | null;
    category_id: string | null;
  } | null;
};

export const LIMIT_LABELS: Record<OfferWithMerchant["limit_type"], string> = {
  ONCE: "Utilisable une seule fois",
  DAILY: "Utilisable 1 fois par jour",
  WEEKLY: "Utilisable 1 fois par semaine",
  MONTHLY: "Utilisable 1 fois par mois",
  UNLIMITED: "Utilisable à chaque passage",
};

export const REFUSAL_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Connexion requise.",
  INVALID_TOKEN: "QR invalide.",
  TOKEN_EXPIRED: "QR expiré.",
  ALREADY_USED: "Offre déjà utilisée.",
  WRONG_MERCHANT: "Ce QR ne concerne pas ton commerce.",
  MERCHANT_SUSPENDED: "Commerce suspendu.",
  OFFER_INACTIVE: "Offre non disponible.",
  OFFER_EXPIRED: "Offre expirée.",
  ACCOUNT_SUSPENDED: "Compte client suspendu.",
  SUBSCRIPTION_INVALID: "Abonnement client expiré.",
  SUBSCRIPTION_REQUIRED: "Un abonnement METZY actif est nécessaire.",
  LIMIT_REACHED: "Limite d'utilisation atteinte.",
  OFFER_UNAVAILABLE: "Offre non disponible.",
  MERCHANT_UNAVAILABLE: "Commerce indisponible.",
};

export function refusalMessage(code?: string | null) {
  if (!code) return "Validation impossible.";
  return REFUSAL_MESSAGES[code] ?? "Validation impossible.";
}

const OFFER_SELECT =
  "id,title,description,photo_url,discount_label,terms,starts_at,ends_at,limit_type,limit_count,xp_reward,status,category_id,merchant_id,merchants(id,name,logo_url,address,lat,lng,city_id,category_id)";

export async function fetchActiveOffers(params?: { categoryId?: string; search?: string }) {
  let query = supabase
    .from("offers")
    .select(OFFER_SELECT)
    .eq("status", "ACTIVE")
    .lte("starts_at", new Date().toISOString())
    .gte("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(60);

  if (params?.categoryId) query = query.eq("category_id", params.categoryId);
  if (params?.search) query = query.ilike("title", `%${params.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as OfferWithMerchant[];
}

export async function fetchOffer(id: string) {
  const { data, error } = await supabase.from("offers").select(OFFER_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as OfferWithMerchant | null;
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,code,emoji")
    .eq("is_active", true)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function fetchApprovedMerchants() {
  const { data, error } = await supabase
    .from("merchants")
    .select("id,name,logo_url,address,lat,lng,city_id,category_id,description")
    .eq("status", "APPROVED")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyContext() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [profile, sub, roles, points, levels, members, enforced] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("points_transactions").select("amount").eq("user_id", user.id),
    supabase.from("levels").select("*").order("position"),
    supabase.from("merchant_members").select("merchant_id,role").eq("user_id", user.id),
    supabase.rpc("subscriptions_enforced"),
  ]);

  const transactions = points.data ?? [];
  // Les niveaux s'appuient sur les points gagnés à vie, le solde sert aux cadeaux.
  const xp = transactions.reduce((total, row) => total + Math.max(row.amount ?? 0, 0), 0);
  const pointsBalance = transactions.reduce((total, row) => total + (row.amount ?? 0), 0);
  const levelList = levels.data ?? [];
  const currentLevel = [...levelList].reverse().find((l) => xp >= l.min_xp) ?? levelList[0] ?? null;
  const nextLevel = levelList.find((l) => l.min_xp > xp) ?? null;

  return {
    user,
    profile: profile.data,
    subscription: sub.data,
    roles: (roles.data ?? []).map((r) => r.role),
    memberships: members.data ?? [],
    xp,
    pointsBalance,
    currentLevel,
    nextLevel,
    subscriptionsEnforced: enforced.data === true,
    isSubscribed:
      (sub.data?.status === "ACTIVE" || sub.data?.status === "TRIALING") &&
      (!sub.data?.current_period_end || new Date(sub.data.current_period_end) > new Date()),
  };
}

export async function fetchMyRedemptions() {
  const { data, error } = await supabase
    .from("offer_redemptions")
    .select("id,created_at,discount_label,xp_awarded,offers(title),merchants(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export function distanceKm(
  a: { lat: number | null; lng: number | null },
  b: { lat: number; lng: number },
) {
  if (a.lat == null || a.lng == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
