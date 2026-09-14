import { supabase } from "@/integrations/supabase/client";

export type MerchantRole = "OWNER" | "MANAGER" | "STAFF";

export type MyMerchant = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  city_id: string | null;
  category_id: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  role: MerchantRole;
};

export const MERCHANT_STATUS_LABELS: Record<MyMerchant["status"], string> = {
  PENDING: "En attente de validation",
  APPROVED: "Validé",
  REJECTED: "Refusé",
  SUSPENDED: "Suspendu",
};

/** Renvoie le commerce de l'utilisateur (propriétaire ou membre) avec son rôle. */
export async function fetchMyMerchant(): Promise<MyMerchant | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: members, error: memberError } = await supabase
    .from("merchant_members")
    .select("merchant_id,role")
    .eq("user_id", user.id);
  if (memberError) throw memberError;

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("id,name,description,logo_url,address,phone,city_id,category_id,status,owner_id")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const mine = (merchants ?? []).filter(
    (m) => m.owner_id === user.id || (members ?? []).some((x) => x.merchant_id === m.id),
  );
  const merchant = mine[0];
  if (!merchant) return null;

  const membership = (members ?? []).find((x) => x.merchant_id === merchant.id);
  const role: MerchantRole =
    merchant.owner_id === user.id ? "OWNER" : ((membership?.role as MerchantRole) ?? "STAFF");

  const { owner_id: _ownerId, ...rest } = merchant;
  return { ...rest, role } as MyMerchant;
}

export type MerchantOffer = {
  id: string;
  title: string;
  description: string | null;
  discount_label: string;
  terms: string | null;
  photo_url: string | null;
  category_id: string | null;
  starts_at: string;
  ends_at: string;
  limit_type: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "UNLIMITED";
  limit_count: number;
  xp_reward: number;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "EXPIRED" | "REJECTED";
  views_count: number;
  created_at: string;
};

export async function fetchMerchantOffers(merchantId: string) {
  const { data, error } = await supabase
    .from("offers")
    .select(
      "id,title,description,discount_label,terms,photo_url,category_id,starts_at,ends_at,limit_type,limit_count,xp_reward,status,views_count,created_at",
    )
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MerchantOffer[];
}

export async function fetchMerchantStats(merchantId: string) {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [all, month, offers] = await Promise.all([
    supabase
      .from("offer_redemptions")
      .select("id,created_at,discount_label,xp_awarded,offers(title)")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("offer_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .gte("created_at", since),
    supabase
      .from("offers")
      .select("id,status,views_count")
      .eq("merchant_id", merchantId),
  ]);
  if (all.error) throw all.error;

  const offerRows = offers.data ?? [];
  return {
    recent: all.data ?? [],
    monthCount: month.count ?? 0,
    activeOffers: offerRows.filter((o) => o.status === "ACTIVE").length,
    totalViews: offerRows.reduce((sum, o) => sum + (o.views_count ?? 0), 0),
  };
}

export type ValidationResult =
  | {
      ok: true;
      offer_title: string;
      discount_label: string;
      xp_awarded: number;
      customer_name: string;
      validated_at: string;
    }
  | { ok: false; code: string };

export async function validateRedemption(token: string): Promise<ValidationResult> {
  const { data, error } = await supabase.rpc("validate_redemption", { _token: token.trim() });
  if (error) throw error;
  return data as unknown as ValidationResult;
}
