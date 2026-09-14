import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { distanceKm, fetchApprovedMerchants } from "@/lib/metzy";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { ErrorState, LoadingState } from "@/components/metzy/states";

const NearbyMap = lazy(() => import("@/components/metzy/nearby-map"));

export const Route = createFileRoute("/_authenticated/carte")({
  head: () => ({
    meta: [
      { title: "Carte des commerces METZY à Metz" },
      {
        name: "description",
        content: "Les commerces partenaires METZY autour de toi, classés par distance.",
      },
      { property: "og:title", content: "Carte METZY" },
      { property: "og:description", content: "Trouve le partenaire METZY le plus proche." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartePage,
});

function CartePage() {
  const merchants = useQuery({ queryKey: ["merchants"], queryFn: fetchApprovedMerchants });
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoDenied(true),
      { timeout: 8000 },
    );
  }, []);

  const list = useMemo(
    () =>
      (merchants.data ?? [])
        .map((m) => ({
          ...m,
          distance:
            position && m.lat != null && m.lng != null
              ? distanceKm({ lat: m.lat, lng: m.lng }, position)
              : null,
        }))
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)),
    [merchants.data, position],
  );

  const markers = useMemo(
    () =>
      list
        .filter((m) => m.lat != null && m.lng != null)
        .map((m) => ({ id: m.id, name: m.name, lat: m.lat as number, lng: m.lng as number })),
    [list],
  );

  const isEmpty = !merchants.isLoading && !merchants.isError && markers.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Autour de moi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {position
          ? "Commerces partenaires classés du plus proche au plus loin."
          : geoDenied
            ? "Position non partagée : voici la carte de Metz et tous les partenaires."
            : "Recherche de ta position..."}
      </p>

      <div className="relative mt-5 h-72 overflow-hidden rounded-3xl border border-border bg-surface">
        <ClientOnly
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Chargement de la carte...
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chargement de la carte...
              </div>
            }
          >
            <NearbyMap position={position} markers={markers} />
          </Suspense>
        </ClientOnly>

        {isEmpty ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-card/90 px-4 py-3 text-center backdrop-blur">
            <p className="font-display text-sm">Aucun commerce partenaire à proximité</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Voici ta position — les premiers partenaires arrivent bientôt.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {merchants.isLoading ? <LoadingState label="Chargement des commerces..." /> : null}
        {merchants.isError ? <ErrorState onRetry={() => merchants.refetch()} /> : null}
        {list.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card px-4 py-4"
          >
            <Link to="/commerces/$merchantId" params={{ merchantId: m.id }} className="min-w-0">
              <p className="truncate font-display text-base">{m.name}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {m.address ?? "Metz"}
                {m.distance != null
                  ? ` — ${m.distance < 1 ? `${Math.round(m.distance * 1000)} m` : `${m.distance.toFixed(1)} km`}`
                  : ""}
              </p>
            </Link>
            {m.lat != null && m.lng != null ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`Itinéraire vers ${m.name}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border"
              >
                <Navigation className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
