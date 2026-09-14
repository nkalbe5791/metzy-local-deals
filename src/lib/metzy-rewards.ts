import { supabase } from "@/integrations/supabase/client";

export type Reward = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  kind: "COUPON" | "SHIPPED";
  stock: number | null;
  is_active: boolean;
};

export type RewardRedemption = {
  id: string;
  reward_name: string;
  cost_points: number;
  kind: "COUPON" | "SHIPPED";
  status: "READY" | "USED" | "PENDING_SHIPMENT" | "SHIPPED" | "CANCELED";
  code: string | null;
  shipping_info: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
};

export const REWARD_STATUS_LABELS: Record<RewardRedemption["status"], string> = {
  READY: "Coupon à présenter",
  USED: "Utilisé",
  PENDING_SHIPMENT: "En préparation d'envoi",
  SHIPPED: "Expédié",
  CANCELED: "Annulé",
};

export const REWARD_ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Connexion requise.",
  ACCOUNT_SUSPENDED: "Compte suspendu.",
  REWARD_UNAVAILABLE: "Ce cadeau n'est plus disponible.",
  REWARD_OUT_OF_STOCK: "Stock épuisé pour ce cadeau.",
  NOT_ENOUGH_POINTS: "Il te manque des points pour ce cadeau.",
  INVALID_TOKEN: "Coupon cadeau invalide.",
  ALREADY_USED: "Ce coupon a déjà été utilisé.",
  NOT_A_MERCHANT: "Seuls les commerces partenaires peuvent valider un cadeau.",
  FORBIDDEN: "Action non autorisée.",
  INVALID_STATE: "Ce cadeau n'est pas en attente d'envoi.",
};

export function rewardError(code?: string | null) {
  if (!code) return "Action impossible.";
  return REWARD_ERRORS[code] ?? "Action impossible.";
}

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select("id,name,description,image_url,cost_points,kind,stock,is_active")
    .order("cost_points");
  if (error) throw error;
  return (data ?? []) as Reward[];
}

export async function fetchMyRewardRedemptions(): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("id,reward_name,cost_points,kind,status,code,shipping_info,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as RewardRedemption[];
}

export type RedeemResult =
  | { ok: true; id: string; code: string | null; status: RewardRedemption["status"]; kind: Reward["kind"] }
  | { ok: false; code: string };

export async function redeemReward(rewardId: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("redeem_reward", { _reward_id: rewardId });
  if (error) throw error;
  return data as unknown as RedeemResult;
}

export type RewardValidation =
  | { ok: true; reward_name: string; customer_name: string; validated_at: string }
  | { ok: false; code: string };

export async function validateRewardCoupon(code: string): Promise<RewardValidation> {
  const { data, error } = await supabase.rpc("validate_reward_coupon", { _code: code.trim() });
  if (error) throw error;
  return data as unknown as RewardValidation;
}

export async function adminSetRewardShipped(redemptionId: string) {
  const { data, error } = await supabase.rpc("admin_set_reward_shipped", {
    _redemption_id: redemptionId,
  });
  if (error) throw error;
  return data as unknown as { ok: boolean; code?: string };
}

export async function adminUpsertReward(input: {
  id?: string;
  name: string;
  description: string | null;
  cost_points: number;
  kind: Reward["kind"];
  stock: number | null;
  is_active: boolean;
}) {
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from("rewards").update(rest).eq("id", id);
    if (error) throw error;
    return;
  }
  const { id: _ignored, ...rest } = input;
  const { error } = await supabase.from("rewards").insert(rest);
  if (error) throw error;
}

export async function adminDeleteReward(id: string) {
  const { error } = await supabase.from("rewards").delete().eq("id", id);
  if (error) throw error;
}
