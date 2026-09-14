import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OfferCard } from "@/components/metzy/offer-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/metzy/states";
import type { OfferWithMerchant } from "@/lib/metzy";
import { MerchantRatingBadge, MerchantReviews } from "@/components/metzy/merchant-reviews";

export const Route = createFileRoute("/commerces/$merchantId")({
  head: () => ({
    meta: [
      { title: "Commerce partenaire METZY à Metz" },
      {
        name: "description",
        content: "Adresse, description et offres en cours de ce commerce partenaire METZY.",
      },
      { property: "og:title", content: "Commerce partenaire METZY" },
      { property: "og:description", content: "Découvre ce commerce messin et ses offres METZY." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MerchantDetail,
});

async function fetchMerchantWithOffers(id: string) {
  const [merchant, offers] = await Promise.all([
    supabase
      .from("merchants")
      .select("id,name,description,logo_url,address,lat,lng,status")
      .eq("id", id)
      .eq("status", "APPROVED")
      .maybeSingle(),
    supabase
      .from("offers")
      .select(
        "id,title,description,photo_url,discount_label,terms,starts_at,ends_at,limit_type,limit_count,xp_reward,status,category_id,merchant_id,merchants(id,name,logo_url,address,lat,lng,city_id,category_id)",
      )
      .eq("merchant_id", id)
      .eq("status", "ACTIVE")
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString()),
  ]);
  if (merchant.error) throw merchant.error;
  if (offers.error) throw offers.error;
  return {
    merchant: merchant.data,
    offers: (offers.data ?? []) as unknown as OfferWithMerchant[],
  };
}

function MerchantDetail() {
  const { merchantId } = Route.useParams();
  const query = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => fetchMerchantWithOffers(merchantId),
  });

  if (query.isLoading) return <LoadingState label="Chargement du commerce..." />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (!query.data?.merchant)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">Commerce introuvable</h1>
        <Link to="/explorer" className="mt-4 inline-block text-primary underline">
          Retour aux offres
        </Link>
      </div>
    );

  const { merchant, offers } = query.data;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <Link to="/explorer" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Retour
      </Link>

      <div className="mt-5 flex items-center gap-4">
        {merchant.logo_url ? (
          <img
            src={merchant.logo_url}
            alt={`Logo ${merchant.name}`}
            className="size-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-metzy font-display text-primary-foreground">
            {merchant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl">{merchant.name}</h1>
          <div className="mt-1">
            <MerchantRatingBadge merchantId={merchant.id} />
          </div>
          {merchant.address ? (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {merchant.address}
            </p>
          ) : null}
        </div>
      </div>

      {merchant.description ? (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{merchant.description}</p>
      ) : null}

      {merchant.lat != null && merchant.lng != null ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${merchant.lat},${merchant.lng}`}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex min-h-11 items-center rounded-2xl border border-border px-4 text-sm font-medium"
        >
          Ouvrir l&apos;itinéraire
        </a>
      ) : null}

      <h2 className="mt-8 font-display text-lg">Offres en cours</h2>
      <div className="mt-4 space-y-4">
        {offers.length === 0 ? (
          <EmptyState title="Aucune offre active" description="Reviens bientôt, ça bouge vite." />
        ) : (
          offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)
        )}
      </div>

      <MerchantReviews merchantId={merchant.id} />
    </div>
  );
}
