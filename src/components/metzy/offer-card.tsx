import { Link } from "@tanstack/react-router";
import { MapPin, Sparkles } from "lucide-react";
import type { OfferWithMerchant } from "@/lib/metzy";

export function OfferCard({
  offer,
  distance,
}: {
  offer: OfferWithMerchant;
  distance?: number | null;
}) {
  return (
    <Link
      to="/offres/$offerId"
      params={{ offerId: offer.id }}
      className="group block overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-soft transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {offer.photo_url ? (
          <img
            src={offer.photo_url}
            alt={`${offer.title} — ${offer.merchants?.name ?? "commerce METZY"}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-metzy">
            <span className="font-display text-2xl text-primary-foreground">METZY</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 font-display text-sm font-semibold text-primary">
          {offer.discount_label}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-base leading-tight">{offer.merchants?.name}</h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">{offer.title}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-accent">
            <Sparkles className="size-3.5" aria-hidden />+{offer.xp_reward} XP
          </span>
          {distance != null ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
