import { supabase } from "@/integrations/supabase/client";

export async function fetchIsAdmin() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

export type SupportTicket = {
  id: string;
  user_id: string | null;
  email: string | null;
  subject: string;
  message: string;
  kind: string;
  status: string;
  created_at: string;
};

export async function fetchSupportTickets() {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id,user_id,email,subject,message,kind,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function setTicketStatus(id: string, status: string) {
  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
  if (error) throw error;
}


export type AdminMerchant = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  created_at: string;
};

export async function fetchAdminMerchants() {
  const { data, error } = await supabase
    .from("merchants")
    .select("id,name,address,phone,description,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminMerchant[];
}

export async function setMerchantStatus(id: string, status: AdminMerchant["status"]) {
  const { error } = await supabase.from("merchants").update({ status }).eq("id", id);
  if (error) throw error;
}

export type AdminOffer = {
  id: string;
  title: string;
  discount_label: string;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "EXPIRED" | "REJECTED";
  xp_reward: number;
  ends_at: string;
  merchants: { name: string } | null;
};

export async function fetchAdminOffers() {
  const { data, error } = await supabase
    .from("offers")
    .select("id,title,discount_label,status,xp_reward,ends_at,merchants(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as AdminOffer[];
}

export async function setOfferStatus(id: string, status: AdminOffer["status"]) {
  const { error } = await supabase.from("offers").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function fetchAdminOverview() {
  const [merchants, offers, redemptions, fraud, users] = await Promise.all([
    supabase.from("merchants").select("id", { count: "exact", head: true }),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("offer_redemptions").select("id", { count: "exact", head: true }),
    supabase.from("fraud_events").select("id", { count: "exact", head: true }).eq("risk", "HIGH"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const pending = await supabase
    .from("merchants")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDING");
  return {
    merchants: merchants.count ?? 0,
    pendingMerchants: pending.count ?? 0,
    activeOffers: offers.count ?? 0,
    redemptions: redemptions.count ?? 0,
    highRiskEvents: fraud.count ?? 0,
    users: users.count ?? 0,
  };
}

export async function fetchFraudEvents() {
  const { data, error } = await supabase
    .from("fraud_events")
    .select("id,created_at,event_type,risk,reason,merchant_id")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export type AppRole = "admin" | "merchant" | "client";

export type AllowlistEntry = {
  id: string;
  email: string;
  role: AppRole;
  note: string | null;
  created_at: string;
};

export async function fetchAllowlist() {
  const { data, error } = await supabase
    .from("admin_allowlist")
    .select("id,email,role,note,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AllowlistEntry[];
}

export async function addAllowlistEntry(email: string, role: AppRole, note: string | null) {
  const { error } = await supabase
    .from("admin_allowlist")
    .insert({ email: email.trim().toLowerCase(), role, note });
  if (error) throw error;
}

export async function removeAllowlistEntry(id: string) {
  const { error } = await supabase.from("admin_allowlist").delete().eq("id", id);
  if (error) throw error;
}

export type RoleHolder = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile: { display_name: string; first_name: string; last_name: string } | null;
};

export async function fetchRoleHolders() {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id,user_id,role,created_at")
    .in("role", ["admin", "merchant"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const profiles = ids.length
    ? await supabase.from("profiles").select("id,display_name,first_name,last_name").in("id", ids)
    : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const map = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    profile: map.get(r.user_id) ?? null,
  })) as RoleHolder[];
}

export async function revokeRole(userId: string, role: AppRole) {
  const { data, error } = await supabase.rpc("admin_revoke_role", {
    _user_id: userId,
    _role: role,
  });
  if (error) throw error;
  const result = data as { ok: boolean; code?: string };
  if (!result.ok) throw new Error(result.code ?? "ERROR");
}
