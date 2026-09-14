import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Gift, Package, Sparkles } from "lucide-react";
import { fetchMyContext } from "@/lib/metzy";
import {
  REWARD_STATUS_LABELS,
  fetchMyRewardRedemptions,
  fetchRewards,
  redeemReward,
  rewardError,
} from "@/lib/metzy-rewards";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/cadeaux")({
  head: () => ({
    meta: [
      { title: "Cadeaux fidélité METZY — échange tes points" },
      {
        name: "description",
        content:
          "Échange tes points METZY contre des cadeaux : coupons à présenter en boutique ou cadeaux envoyés chez toi.",
      },
      { property: "og:title", content: "Cadeaux fidélité METZY" },
      { property: "og:description", content: "Tes points METZY deviennent des cadeaux." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CadeauxPage,
});

function CadeauxPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const rewards = useQuery({ queryKey: ["rewards"], queryFn: fetchRewards });
  const mine = useQuery({ queryKey: ["my-reward-redemptions"], queryFn: fetchMyRewardRedemptions });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const balance = me.data?.pointsBalance ?? 0;

  async function onRedeem(rewardId: string) {
    setPendingId(rewardId);
    try {
      const res = await redeemReward(rewardId);
      if (!res.ok) {
        toast.error(rewardError(res.code));
        return;
      }
      toast.success(
        res.kind === "COUPON"
          ? "Cadeau échangé ! Ton coupon est prêt."
          : "Cadeau échangé ! L'équipe METZY prépare ton envoi.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["my-reward-redemptions"] }),
      ]);
    } catch {
      toast.error("Échange impossible pour le moment.");
    } finally {
      setPendingId(null);
    }
  }

  if (me.isLoading || rewards.isLoading) return <LoadingState />;
  if (rewards.isError) return <ErrorState onRetry={() => rewards.refetch()} />;

  const available = (rewards.data ?? []).filter((r) => r.is_active);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Cadeaux fidélité</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Plus tu utilises METZY chez les commerçants messins, plus tu cumules de points à échanger
        contre des cadeaux.
      </p>

      <div className="mt-5 rounded-3xl border border-border bg-gradient-metzy p-5 text-primary-foreground">
        <p className="inline-flex items-center gap-2 text-sm">
          <Sparkles className="size-4" aria-hidden />
          Points disponibles
        </p>
        <p className="mt-1 font-display text-4xl">{balance}</p>
      </div>

      <h2 className="mt-8 font-display text-lg">Catalogue</h2>
      <div className="mt-3 space-y-3">
        {available.length === 0 ? (
          <p className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Les premiers cadeaux METZY arrivent très bientôt.
          </p>
        ) : (
          available.map((reward) => {
            const affordable = balance >= reward.cost_points;
            const outOfStock = reward.stock != null && reward.stock <= 0;
            return (
              <div key={reward.id} className="rounded-3xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 font-display text-base">
                      {reward.kind === "COUPON" ? (
                        <Gift className="size-4 text-primary" aria-hidden />
                      ) : (
                        <Package className="size-4 text-accent" aria-hidden />
                      )}
                      {reward.name}
                    </p>
                    {reward.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{reward.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {reward.kind === "COUPON"
                        ? "Coupon QR à présenter dans n'importe quel commerce partenaire"
                        : "Cadeau envoyé par l'équipe METZY à ton adresse"}
                      {reward.stock != null ? ` · ${Math.max(reward.stock, 0)} restant(s)` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-display text-lg text-primary">
                    {reward.cost_points} pts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void onRedeem(reward.id)}
                  disabled={!affordable || outOfStock || pendingId === reward.id}
                  className="mt-3 min-h-11 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {outOfStock
                    ? "Stock épuisé"
                    : !affordable
                      ? `Encore ${reward.cost_points - balance} points`
                      : pendingId === reward.id
                        ? "Échange..."
                        : "Échanger mes points"}
                </button>
              </div>
            );
          })
        )}
      </div>

      <h2 className="mt-8 font-display text-lg">Mes cadeaux</h2>
      {mine.isLoading ? (
        <LoadingState />
      ) : mine.isError ? (
        <ErrorState onRetry={() => mine.refetch()} />
      ) : (mine.data ?? []).length === 0 ? (
        <p className="mt-3 rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Tu n&apos;as pas encore échangé de cadeau.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {mine.data!.map((row) => (
            <div key={row.id} className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-base">{row.reward_name}</p>
                <span className="text-xs text-muted-foreground">
                  {REWARD_STATUS_LABELS[row.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                −{row.cost_points} points · {new Date(row.created_at).toLocaleDateString("fr-FR")}
              </p>
              {row.status === "READY" && row.code ? (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <div className="rounded-2xl bg-white p-4">
                    <QRCodeSVG value={row.code} size={172} />
                  </div>
                  <p className="font-mono text-sm tracking-widest">{row.code}</p>
                  <p className="text-xs text-muted-foreground">
                    Valable dans tous les commerces partenaires METZY.
                  </p>
                </div>
              ) : null}
              {row.status === "PENDING_SHIPMENT" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tes coordonnées ont été transmises à l&apos;équipe METZY pour l&apos;envoi.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
