import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { fetchActiveOffers, fetchMyContext, distanceKm } from "@/lib/metzy";
import { OfferCard } from "@/components/metzy/offer-card";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { LoadingState, EmptyState, ErrorState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/accueil")({
  head: () => ({
    meta: [
      { title: "Mon accueil METZY" },
      { name: "description", content: "Tes points, ton abonnement et les offres près de toi." },
      { property: "og:title", content: "Mon accueil METZY" },
      { property: "og:description", content: "Tes points et les offres METZY près de toi." },
    ],
  }),
  component: Accueil,
});

function useGeo() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!asked || typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { timeout: 8000 },
    );
  }, [asked]);
  return { coords, enable: () => setAsked(true), asked };
}

function Accueil() {
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const offers = useQuery({ queryKey: ["offers"], queryFn: () => fetchActiveOffers() });
  const geo = useGeo();

  const xp = me.data?.xp ?? 0;
  const nextThreshold = me.data?.nextLevel?.min_xp ?? null;

  return (
    <main className="mx-auto max-w-2xl px-5 pb-28">
      <header className="flex items-center justify-between py-6">
        <div>
          <p className="text-sm text-muted-foreground">Salut 👋</p>
          <h1 className="font-display text-2xl">{me.data?.profile?.display_name || "toi"}</h1>
        </div>
        <Link to="/profil" className="font-display text-lg font-bold">
          MET<span className="text-primary">ZY</span>
        </Link>
      </header>

      <section
        aria-label="Mon abonnement"
        className="flex items-center justify-between rounded-3xl border border-border bg-card p-4"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ton abonnement</p>
          <p className="mt-1 font-display text-lg">
            {me.data?.isSubscribed ? "🟢 Actif" : "🔴 Inactif"}
          </p>
        </div>
        {!me.data?.isSubscribed ? (
          <Link
            to="/abonnement"
            className="rounded-full bg-gradient-metzy px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            S'abonner
          </Link>
        ) : null}
      </section>

      <section aria-label="Mes points" className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tes points</p>
        <p className="mt-1 font-display text-3xl">
          {xp.toLocaleString("fr-FR")} <span className="text-accent">XP</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Niveau {me.data?.currentLevel?.position ?? 1} — {me.data?.currentLevel?.name ?? "Curieux"}
        </p>
        {nextThreshold ? (
          <>
            <div
              role="progressbar"
              aria-valuenow={xp}
              aria-valuemin={0}
              aria-valuemax={nextThreshold}
              aria-label="Progression vers le niveau suivant"
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-gradient-metzy"
                style={{ width: `${Math.min(100, (xp / nextThreshold) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {xp.toLocaleString("fr-FR")} / {nextThreshold.toLocaleString("fr-FR")} XP vers{" "}
              {me.data?.nextLevel?.name}
            </p>
          </>
        ) : null}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">🔥 Offres près de toi</h2>
          {!geo.coords ? (
            <button
              onClick={geo.enable}
              className="inline-flex items-center gap-1 text-xs text-primary underline"
            >
              <MapPin className="size-3.5" aria-hidden /> Activer ma position
            </button>
          ) : null}
        </div>
        {!geo.coords ? (
          <p className="mt-1 text-xs text-muted-foreground">
            La position sert uniquement à calculer la distance des commerces. Elle est facultative.
          </p>
        ) : null}
        <div className="mt-4 space-y-4">
          {offers.isPending ? (
            <LoadingState />
          ) : offers.isError ? (
            <ErrorState onRetry={() => offers.refetch()} />
          ) : offers.data.length === 0 ? (
            <EmptyState
              title="Pas encore d'offre disponible"
              description="Les premiers commerces METZY arrivent bientôt à Metz."
            />
          ) : (
            offers.data.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                distance={
                  geo.coords && offer.merchants
                    ? distanceKm(
                        { lat: offer.merchants.lat, lng: offer.merchants.lng },
                        geo.coords,
                      )
                    : null
                }
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-5">
        <h2 className="inline-flex items-center gap-2 font-display text-lg">
          <Sparkles className="size-4 text-accent" aria-hidden /> Comment ça marche
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>1. Choisis une offre autour de toi.</li>
          <li>2. Appuie sur « Profiter de l'offre » pour générer ton QR.</li>
          <li>3. Le commerçant le scanne : réduction validée et points crédités.</li>
        </ol>
      </section>

      <BottomNav />
    </main>
  );
}
