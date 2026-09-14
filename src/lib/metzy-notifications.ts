import { supabase } from "@/integrations/supabase/client";

export type MetzyNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  offer_id: string | null;
  merchant_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchMyNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,kind,title,body,offer_id,merchant_id,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as MetzyNotification[];
}

export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function markRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function setNewOfferNotifications(enabled: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("AUTH_REQUIRED");
  const { error } = await supabase
    .from("profiles")
    .update({ notify_new_offers: enabled })
    .eq("id", auth.user.id);
  if (error) throw error;
}
