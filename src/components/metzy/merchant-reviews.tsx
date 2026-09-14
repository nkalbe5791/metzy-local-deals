import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteMerchantReview,
  fetchMerchantRating,
  fetchMerchantReviews,
  fetchReviewEligibility,
  saveMerchantReview,
} from "@/lib/metzy-reviews";

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${n <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}


export function MerchantRatingBadge({ merchantId }: { merchantId: string }) {
  const rating = useQuery({
    queryKey: ["merchant-rating", merchantId],
    queryFn: () => fetchMerchantRating(merchantId),
  });

  if (!rating.data || rating.data.total === 0) {
    return <span className="text-xs text-muted-foreground">Pas encore d&apos;avis</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <Stars value={rating.data.average ?? 0} />
      <span className="text-muted-foreground">
        {rating.data.average?.toFixed(1)} · {rating.data.total} avis
      </span>
    </span>
  );
}

export function MerchantReviews({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient();
  const reviews = useQuery({
    queryKey: ["merchant-reviews", merchantId],
    queryFn: () => fetchMerchantReviews(merchantId),
  });
  const eligibility = useQuery({
    queryKey: ["review-eligibility", merchantId],
    queryFn: () => fetchReviewEligibility(merchantId),
  });

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const mine = eligibility.data?.myReview;
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment ?? "");
    }
  }, [eligibility.data?.myReview]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["merchant-reviews", merchantId] });
    queryClient.invalidateQueries({ queryKey: ["merchant-rating", merchantId] });
    queryClient.invalidateQueries({ queryKey: ["review-eligibility", merchantId] });
  }

  const save = useMutation({
    mutationFn: () =>
      saveMerchantReview({
        merchantId,
        userId: eligibility.data?.userId as string,
        reviewId: eligibility.data?.myReview?.id ?? null,
        rating,
        comment,
      }),
    onSuccess: () => {
      toast.success("Merci pour ton avis !");
      refresh();
    },
    onError: () => toast.error("Impossible d'enregistrer ton avis."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMerchantReview(id),
    onSuccess: () => {
      setRating(0);
      setComment("");
      toast.success("Avis supprimé.");
      refresh();
    },
    onError: () => toast.error("Suppression impossible."),
  });

  const myReview = eligibility.data?.myReview ?? null;
  const signedIn = Boolean(eligibility.data?.userId);
  const canReview = Boolean(eligibility.data?.canReview);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Avis des membres</h2>
        <MerchantRatingBadge merchantId={merchantId} />
      </div>

      {signedIn ? (
        canReview ? (
          <div className="mt-4 rounded-3xl border border-border bg-surface/60 p-5">
            <p className="text-sm font-medium">{myReview ? "Modifier mon avis" : "Noter ce commerce"}</p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`Noter ${n} sur 5`}
                  aria-pressed={rating === n}
                  className="min-h-11 min-w-11 rounded-2xl"
                >
                  <Star
                    className={`mx-auto size-6 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm">
              <span className="sr-only">Commentaire</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={600}
                rows={3}
                placeholder="Ton retour sur l'accueil, la qualité, l'offre..."
                className="mt-1 w-full rounded-2xl border border-input bg-surface/60 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={rating < 1 || save.isPending}
                onClick={() => save.mutate()}
                className="inline-flex min-h-11 items-center rounded-2xl bg-gradient-metzy px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {save.isPending ? "Envoi..." : myReview ? "Mettre à jour" : "Publier mon avis"}
              </button>
              {myReview ? (
                <button
                  type="button"
                  onClick={() => remove.mutate(myReview.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm"
                >
                  <Trash2 className="size-4" aria-hidden /> Supprimer
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-3xl border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
            Utilise une offre de ce commerce pour pouvoir laisser un avis vérifié.
          </p>
        )
      ) : (
        <p className="mt-4 rounded-3xl border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
          Connecte-toi et utilise une offre pour laisser un avis vérifié.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {reviews.data && reviews.data.length > 0 ? (
          reviews.data.map((review) => (
            <li key={review.id} className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{review.author_name}</span>
                <Stars value={review.rating} />
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString("fr-FR")}
              </p>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">
            Aucun avis pour l&apos;instant — sois le premier à partager ton expérience.
          </li>
        )}
      </ul>
    </section>
  );
}
