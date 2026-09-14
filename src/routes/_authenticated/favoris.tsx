import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFavoriteOffers } from "@/lib/metzy-favorites";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { OfferCard } from "@/components/metzy/offer-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/favoris")({
  head: () => ({
    meta: [
      { title: "Mes offres favorites — METZY" },
      {
        name: "description",
        content:
          "Retrouve en un coup d'œil les offres METZY que tu as mises de côté chez tes commerces préférés.",
      },
      { property: "og:title", content: "Mes favoris METZY" },
      { property: "og:description", content: "Tes offres locales préférées, gardées au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FavorisPage,
});

function FavorisPage() {
  const favorites = useQuery({ queryKey: ["favorites-offers"], queryFn: fetchFavoriteOffers });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Mes favoris</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Les offres que tu as enregistrées pour plus tard.
      </p>

      <div className="mt-6 space-y-4">
        {favorites.isLoading ? <LoadingState label="Chargement de tes favoris..." /> : null}
        {favorites.isError ? <ErrorState onRetry={() => favorites.refetch()} /> : null}
        {favorites.data?.length === 0 ? (
          <EmptyState
            title="Aucun favori pour l'instant"
            description="Touche le cœur sur une offre pour la retrouver ici."
            action={
              <Link
                to="/explorer"
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground"
              >
                Explorer les offres
              </Link>
            }
          />
        ) : null}
        {favorites.data?.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
      </div>

      <BottomNav />
    </div>
  );
}
