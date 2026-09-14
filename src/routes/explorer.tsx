import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { fetchActiveOffers, fetchCategories } from "@/lib/metzy";
import { OfferCard } from "@/components/metzy/offer-card";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { EmptyState, ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Explorer les offres METZY à Metz" },
      {
        name: "description",
        content:
          "Parcours toutes les réductions METZY à Metz : restaurants, bars, beauté, sport, culture et shopping.",
      },
      { property: "og:title", content: "Explorer les offres METZY" },
      { property: "og:description", content: "Toutes les bonnes affaires des commerces messins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorerPage,
});

function ExplorerPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const offers = useQuery({
    queryKey: ["offers", categoryId, search],
    queryFn: () =>
      fetchActiveOffers({
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { search } : {}),
      }),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Explorer</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Trouve l&apos;offre parfaite près de toi.
      </p>

      <div className="relative mt-5">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="search" className="sr-only">
          Rechercher une offre
        </label>
        <input
          id="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pizza, coiffeur, salle de sport..."
          className="min-h-12 w-full rounded-2xl border border-input bg-surface pl-11 pr-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setCategoryId(null)}
          aria-pressed={categoryId === null}
          className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
            categoryId === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-muted-foreground"
          }`}
        >
          Tout
        </button>
        {(categories.data ?? []).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryId(cat.id)}
            aria-pressed={categoryId === cat.id}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
              categoryId === cat.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {cat.emoji ? `${cat.emoji} ` : ""}
            {cat.name}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {offers.isLoading ? <LoadingState label="Chargement des offres..." /> : null}
        {offers.isError ? <ErrorState onRetry={() => offers.refetch()} /> : null}
        {offers.data?.length === 0 ? (
          <EmptyState
            title="Aucune offre trouvée"
            description="Essaie une autre catégorie ou un autre mot-clé."
          />
        ) : null}
        {offers.data?.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
      </div>

      <BottomNav />
    </div>
  );
}
