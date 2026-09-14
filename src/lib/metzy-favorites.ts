import { supabase } from "@/integrations/supabase/client";
import type { OfferWithMerchant } from "@/lib/metzy";

const OFFER_SELECT =
  "id,title,description,photo_url,discount_label,terms,starts_at,ends_at,limit_type,limit_count,xp_reward,status,category_id,merchant_id,merchants(id,name,logo_url,address,lat,lng,city_id,category_id)";

/** Identifiants des offres mises en favori par l'utilisateur connecté. */
export async function fetchFavoriteIds(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase.from("offer_favorites").select("offer_id");
  if (error) throw error;
  return (data ?? []).map((row) => row.offer_id);
}

/** Offres favorites complètes, les plus récentes d'abord. */
export async function fetchFavoriteOffers(): Promise<OfferWithMerchant[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data: favorites, error } = await supabase
    .from("offer_favorites")
    .select("offer_id,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (favorites ?? []).map((row) => row.offer_id);
  if (ids.length === 0) return [];

  const { data: offers, error: offersError } = await supabase
    .from("offers")
    .select(OFFER_SELECT)
    .in("id", ids);
  if (offersError) throw offersError;

  const byId = new Map((offers ?? []).map((offer) => [offer.id, offer]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean) as unknown as OfferWithMerchant[];
}

/** Ajoute ou retire une offre des favoris. Renvoie le nouvel état. */
export async function toggleFavorite(offerId: string, isFavorite: boolean): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Connexion requise");

  if (isFavorite) {
    const { error } = await supabase
      .from("offer_favorites")
      .delete()
      .eq("offer_id", offerId)
      .eq("user_id", userId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("offer_favorites")
    .insert({ offer_id: offerId, user_id: userId });
  if (error) throw error;
  return true;
}
