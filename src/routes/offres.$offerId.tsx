import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ArrowLeft, Heart, MapPin, Sparkles, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LIMIT_LABELS, fetchMyContext, fetchOffer, refusalMessage } from "@/lib/metzy";
import { fetchFavoriteIds, toggleFavorite } from "@/lib/metzy-favorites";
import { ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/offres/$offerId")({
  head: () => ({
    meta: [
      { title: "Offre METZY — profite de ta réduction" },
      {
        name: "description",
        content: "Découvre les conditions de cette offre METZY et génère ton QR code en boutique.",
      },
      { property: "og:title", content: "Offre METZY" },
      { property: "og:description", content: "Réduction exclusive chez un commerce partenaire messin." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfferDetail,
});

function OfferDetail() {
  const { offerId } = Route.useParams();
  const offer = useQuery({ queryKey: ["offer", offerId], queryFn: () => fetchOffer(offerId) });
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const queryClient = useQueryClient();
  const favorites = useQuery({ queryKey: ["favorite-ids"], queryFn: fetchFavoriteIds });
  const isFavorite = favorites.data?.includes(offerId) ?? false;
  const [favPending, setFavPending] = useState(false);

  async function onToggleFavorite() {
    if (!me.data) {
      toast.error("Connecte-toi pour enregistrer cette offre.");
      return;
    }
    setFavPending(true);
    try {
      const next = await toggleFavorite(offerId, isFavorite);
      await queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
      await queryClient.invalidateQueries({ queryKey: ["favorites-offers"] });
      toast.success(next ? "Ajoutée à tes favoris." : "Retirée de tes favoris.");
    } catch {
      toast.error("Action impossible pour le moment.");
    } finally {
      setFavPending(false);
    }
  }


  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (expiresAt && remaining === 0) setToken(null);
  }, [remaining, expiresAt]);

  async function generateToken() {
    setPending(true);
    const { data, error } = await supabase.rpc("create_redemption_token", { _offer_id: offerId });
    setPending(false);
    if (error) {
      const code = error.message?.match(/[A-Z_]{4,}/)?.[0];
      toast.error(refusalMessage(code));
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.token) {
      toast.error("Impossible de générer le QR code.");
      return;
    }
    setToken(row.token);
    setExpiresAt(new Date(row.expires_at).getTime());
  }

  if (offer.isLoading) return <LoadingState label="Chargement de l'offre..." />;
  if (offer.isError) return <ErrorState onRetry={() => offer.refetch()} />;
  if (!offer.data)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">Offre introuvable</h1>
        <Link to="/explorer" className="mt-4 inline-block text-primary underline">
          Retour aux offres
        </Link>
      </div>
    );

  const data = offer.data;
  const isSubscribed = me.data?.isSubscribed ?? false;

  return (
    <div className="mx-auto max-w-2xl pb-32">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {data.photo_url ? (
          <img
            src={data.photo_url}
            alt={`${data.title} — ${data.merchants?.name ?? "commerce METZY"}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-metzy">
            <span className="font-display text-3xl text-primary-foreground">METZY</span>
          </div>
        )}
        <Link
          to="/explorer"
          aria-label="Retour"
          className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/85"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={favPending}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/85 disabled:opacity-60"
        >
          <Heart
            className={isFavorite ? "size-5 fill-primary text-primary" : "size-5"}
            aria-hidden
          />
        </button>
      </div>

      <div className="space-y-5 px-4 pt-6">
        <div>
          <p className="font-display text-2xl text-primary">{data.discount_label}</p>
          <h1 className="mt-1 font-display text-2xl">{data.title}</h1>
          {data.merchants ? (
            <Link
              to="/commerces/$merchantId"
              params={{ merchantId: data.merchants.id }}
              className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground underline"
            >
              <MapPin className="size-4" aria-hidden />
              {data.merchants.name}
              {data.merchants.address ? ` — ${data.merchants.address}` : ""}
            </Link>
          ) : null}
        </div>

        {data.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{data.description}</p>
        ) : null}

        <ul className="space-y-2 rounded-3xl border border-border bg-surface/60 p-4 text-sm">
          <li className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" aria-hidden />+{data.xp_reward} points METZY
          </li>
          <li className="flex items-center gap-2">
            <Timer className="size-4 text-muted-foreground" aria-hidden />
            {LIMIT_LABELS[data.limit_type]}
          </li>
          <li className="text-muted-foreground">
            Valable jusqu&apos;au {new Date(data.ends_at).toLocaleDateString("fr-FR")}
          </li>
        </ul>

        {data.terms ? (
          <div>
            <h2 className="font-display text-base">Conditions</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.terms}</p>
          </div>
        ) : null}

        {token ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-primary/40 bg-surface p-6">
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={token} size={200} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Code à saisir</p>
              <p className="break-all text-center font-mono text-sm tracking-widest">{token}</p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(token);
                  toast.success("Code copié");
                }}
                className="min-h-9 rounded-xl border border-border px-3 text-xs font-medium"
              >
                Copier le code
              </button>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              À présenter au commerçant — expire dans {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </p>

          </div>
        ) : null}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-border bg-surface-glass px-4 py-3">
        <div className="mx-auto max-w-2xl">
          {!me.data ? (
            <Link
              to="/auth"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground"
            >
              Se connecter pour utiliser l&apos;offre
            </Link>
          ) : (me.data?.subscriptionsEnforced ?? false) && !isSubscribed ? (
            <Link
              to="/abonnement"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground"
            >
              Activer mon abonnement METZY
            </Link>
          ) : (
            <button
              onClick={generateToken}
              disabled={pending}
              className="min-h-12 w-full rounded-2xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Génération..." : token ? "Générer un nouveau QR" : "Utiliser cette offre"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
