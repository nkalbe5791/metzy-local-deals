import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/metzy/admin-guard";
import { ErrorState, LoadingState } from "@/components/metzy/states";
import {
  REWARD_STATUS_LABELS,
  adminDeleteReward,
  adminSetRewardShipped,
  adminUpsertReward,
  fetchRewards,
  rewardError,
  type Reward,
  type RewardRedemption,
} from "@/lib/metzy-rewards";

export const Route = createFileRoute("/_authenticated/admin/cadeaux")({
  head: () => ({
    meta: [
      { title: "Cadeaux fidélité — back-office METZY" },
      {
        name: "description",
        content: "Gestion du catalogue de cadeaux METZY et des envois à préparer.",
      },
      { property: "og:title", content: "Cadeaux fidélité METZY" },
      { property: "og:description", content: "Catalogue et envois de cadeaux METZY." },
    ],
  }),
  component: AdminCadeaux,
});

async function fetchAllRewardRedemptions(): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("id,reward_name,cost_points,kind,status,code,shipping_info,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as RewardRedemption[];
}

const emptyDraft = {
  name: "",
  description: "",
  cost_points: 200,
  kind: "COUPON" as Reward["kind"],
  stock: "",
  is_active: true,
};

function AdminCadeaux() {
  const queryClient = useQueryClient();
  const rewards = useQuery({ queryKey: ["admin-rewards"], queryFn: fetchRewards });
  const redemptions = useQuery({
    queryKey: ["admin-reward-redemptions"],
    queryFn: fetchAllRewardRedemptions,
  });
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] }),
      queryClient.invalidateQueries({ queryKey: ["rewards"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-reward-redemptions"] }),
    ]);
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.name.trim();
    if (name.length < 3) {
      toast.error("Nom du cadeau trop court.");
      return;
    }
    if (!Number.isFinite(draft.cost_points) || draft.cost_points < 1) {
      toast.error("Le coût en points doit être supérieur à 0.");
      return;
    }
    setBusy(true);
    try {
      await adminUpsertReward({
        name,
        description: draft.description.trim() || null,
        cost_points: Math.round(draft.cost_points),
        kind: draft.kind,
        stock: draft.stock.trim() === "" ? null : Math.max(0, Number(draft.stock)),
        is_active: draft.is_active,
      });
      toast.success("Cadeau ajouté.");
      setDraft(emptyDraft);
      await refresh();
    } catch {
      toast.error("Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(reward: Reward) {
    try {
      await adminUpsertReward({
        id: reward.id,
        name: reward.name,
        description: reward.description,
        cost_points: reward.cost_points,
        kind: reward.kind,
        stock: reward.stock,
        is_active: !reward.is_active,
      });
      await refresh();
    } catch {
      toast.error("Mise à jour impossible.");
    }
  }

  async function onDelete(id: string) {
    try {
      await adminDeleteReward(id);
      toast.success("Cadeau supprimé.");
      await refresh();
    } catch {
      toast.error("Suppression impossible (cadeau déjà échangé ?).");
    }
  }

  async function onShipped(id: string) {
    try {
      const res = await adminSetRewardShipped(id);
      if (!res.ok) {
        toast.error(rewardError(res.code));
        return;
      }
      toast.success("Marqué comme expédié.");
      await refresh();
    } catch {
      toast.error("Action impossible.");
    }
  }

  return (
    <AdminShell title="Cadeaux fidélité">
      <form onSubmit={onCreate} className="space-y-3 rounded-3xl border border-border bg-card p-4">
        <h2 className="font-display text-lg">Nouveau cadeau</h2>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Nom du cadeau"
          className="metzy-input w-full"
        />
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="Description"
          rows={2}
          className="metzy-input w-full"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Coût en points
            <input
              type="number"
              min={1}
              value={draft.cost_points}
              onChange={(e) => setDraft({ ...draft, cost_points: Number(e.target.value) })}
              className="metzy-input mt-1 w-full"
            />
          </label>
          <label className="text-sm">
            Type
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as Reward["kind"] })}
              className="metzy-input mt-1 w-full"
            >
              <option value="COUPON">Coupon en boutique</option>
              <option value="SHIPPED">Cadeau à envoyer</option>
            </select>
          </label>
          <label className="text-sm">
            Stock (vide = illimité)
            <input
              value={draft.stock}
              onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
              className="metzy-input mt-1 w-full"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Ajouter le cadeau
        </button>
      </form>

      <h2 className="mt-8 font-display text-lg">Catalogue</h2>
      {rewards.isLoading ? (
        <LoadingState />
      ) : rewards.isError ? (
        <ErrorState onRetry={() => rewards.refetch()} />
      ) : (
        <ul className="mt-3 space-y-2">
          {rewards.data!.map((reward) => (
            <li
              key={reward.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-display text-base">{reward.name}</p>
                <p className="text-xs text-muted-foreground">
                  {reward.cost_points} pts ·{" "}
                  {reward.kind === "COUPON" ? "coupon boutique" : "envoi postal"} ·{" "}
                  {reward.stock == null ? "stock illimité" : `${reward.stock} en stock`} ·{" "}
                  {reward.is_active ? "actif" : "inactif"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onToggle(reward)}
                  className="min-h-10 rounded-full border border-border px-4 text-sm"
                >
                  {reward.is_active ? "Désactiver" : "Activer"}
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(reward.id)}
                  className="min-h-10 rounded-full border border-destructive/50 px-4 text-sm text-destructive"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-display text-lg">Échanges récents</h2>
      {redemptions.isLoading ? (
        <LoadingState />
      ) : redemptions.isError ? (
        <ErrorState onRetry={() => redemptions.refetch()} />
      ) : redemptions.data!.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucun échange pour l&apos;instant.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {redemptions.data!.map((row) => {
            const info = (row.shipping_info ?? {}) as Record<string, string | null>;
            return (
              <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-base">{row.reward_name}</p>
                  <span className="text-xs text-muted-foreground">
                    {REWARD_STATUS_LABELS[row.status]} ·{" "}
                    {new Date(row.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                {row.kind === "SHIPPED" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      `${info["first_name"] ?? ""} ${info["last_name"] ?? ""}`.trim(),
                      info["address_line1"],
                      `${info["postal_code"] ?? ""} ${info["city_name"] ?? ""}`.trim(),
                      info["phone"],
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                {row.status === "PENDING_SHIPMENT" ? (
                  <button
                    type="button"
                    onClick={() => void onShipped(row.id)}
                    className="mt-2 min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    Marquer comme expédié
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
