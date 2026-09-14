import { supabase } from "@/integrations/supabase/client";

export type MerchantReview = {
  id: string;
  merchant_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  author_name: string;
  created_at: string;
};

export type MerchantRating = { average: number | null; total: number };

export async function fetchMerchantReviews(merchantId: string) {
  const { data, error } = await supabase
    .from("merchant_reviews")
    .select("id,merchant_id,user_id,rating,comment,author_name,created_at")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as MerchantReview[];
}

export async function fetchMerchantRating(merchantId: string): Promise<MerchantRating> {
  const { data, error } = await supabase.rpc("merchant_rating", { _merchant_id: merchantId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return {
    average: row?.average != null ? Number(row.average) : null,
    total: row?.total ?? 0,
  };
}

/** Un membre ne peut noter qu'un commerce dont il a déjà utilisé une offre. */
export async function fetchReviewEligibility(merchantId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { userId: null, canReview: false, myReview: null as MerchantReview | null };

  const [redemptions, mine] = await Promise.all([
    supabase
      .from("offer_redemptions")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("user_id", user.id)
      .limit(1),
    supabase
      .from("merchant_reviews")
      .select("id,merchant_id,user_id,rating,comment,author_name,created_at")
      .eq("merchant_id", merchantId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    canReview: (redemptions.data ?? []).length > 0,
    myReview: (mine.data ?? null) as MerchantReview | null,
  };
}

export async function saveMerchantReview(input: {
  merchantId: string;
  userId: string;
  reviewId?: string | null;
  rating: number;
  comment: string;
}) {
  if (input.rating < 1 || input.rating > 5) throw new Error("Note invalide");
  const comment = input.comment.trim().slice(0, 600);

  if (input.reviewId) {
    const { error } = await supabase
      .from("merchant_reviews")
      .update({ rating: input.rating, comment: comment || null })
      .eq("id", input.reviewId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("merchant_reviews").insert({
    merchant_id: input.merchantId,
    user_id: input.userId,
    rating: input.rating,
    comment: comment || null,
  });
  if (error) throw error;
}

export async function deleteMerchantReview(reviewId: string) {
  const { error } = await supabase.from("merchant_reviews").delete().eq("id", reviewId);
  if (error) throw error;
}
