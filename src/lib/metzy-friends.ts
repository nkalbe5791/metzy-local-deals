import { supabase } from "@/integrations/supabase/client";

export type Friend = {
  friendship_id: string;
  friend_id: string;
  username: string;
  display_name: string;
  xp: number;
  level_name: string | null;
};

export type FriendRequest = {
  request_id: string;
  from_user_id: string;
  username: string;
  display_name: string;
  created_at: string;
};

export const FRIEND_ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Connexion requise.",
  INVALID_USERNAME: "Pseudo invalide (3 caractères minimum).",
  MEMBER_NOT_FOUND: "Aucun membre METZY avec ce pseudo.",
  SELF_REQUEST: "Tu ne peux pas t'ajouter toi-même.",
  ALREADY_FRIENDS: "Vous êtes déjà amis.",
  ALREADY_PENDING: "Demande déjà envoyée.",
  REQUEST_NOT_FOUND: "Demande introuvable.",
};

export function friendError(code?: string | null) {
  if (!code) return "Action impossible.";
  return FRIEND_ERRORS[code] ?? "Action impossible.";
}

export async function fetchMyFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc("my_friends");
  if (error) throw error;
  return (data ?? []) as unknown as Friend[];
}

export async function fetchFriendRequests(): Promise<FriendRequest[]> {
  const { data, error } = await supabase.rpc("my_friend_requests");
  if (error) throw error;
  return (data ?? []) as unknown as FriendRequest[];
}

export async function searchMembers(query: string) {
  const { data, error } = await supabase.rpc("search_members", { _query: query });
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; username: string; display_name: string }[];
}

type ActionResult = { ok: boolean; code?: string; status?: string };

export async function sendFriendRequest(username: string): Promise<ActionResult> {
  const { data, error } = await supabase.rpc("send_friend_request", { _username: username });
  if (error) throw error;
  return data as unknown as ActionResult;
}

export async function respondFriendRequest(requestId: string, accept: boolean): Promise<ActionResult> {
  const { data, error } = await supabase.rpc("respond_friend_request", {
    _request_id: requestId,
    _accept: accept,
  });
  if (error) throw error;
  return data as unknown as ActionResult;
}

export async function removeFriend(friendId: string): Promise<ActionResult> {
  const { data, error } = await supabase.rpc("remove_friend", { _friend_id: friendId });
  if (error) throw error;
  return data as unknown as ActionResult;
}

export async function checkSignupAvailability(username: string, phone: string) {
  const { data, error } = await supabase.rpc("signup_availability", {
    _username: username,
    _phone: phone,
  });
  if (error) throw error;
  return data as unknown as {
    username_valid: boolean;
    username_available: boolean;
    phone_available: boolean;
    normalized_username: string | null;
    normalized_phone: string | null;
  };
}
