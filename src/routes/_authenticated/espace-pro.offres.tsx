import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories, LIMIT_LABELS } from "@/lib/metzy";
import { fetchMyMerchant, fetchMerchantOffers, type MerchantOffer } from "@/lib/metzy-pro";
import { LoadingState, ErrorState, EmptyState, PermissionState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/espace-pro/offres")({
  head: () => ({
    meta: [
      { title: "Mes offres — Espace commerçant METZY" },
      {
        name: "description",
        content: "Crée et gère les offres de ton commerce METZY : réduction, conditions, limites, points.",
      },
      { property: "og:title", content: "Gérer mes offres METZY" },
      { property: "og:description", content: "Gestion des offres commerçant METZY." },
    ],
  }),
  component: OffresPro,
});

const STATUS_LABELS: Record<MerchantOffer["status"], string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En relecture",
  ACTIVE: "Active",
  PAUSED: "En pause",
  EXPIRED: "Expirée",
  REJECTED: "Refusée",
};

function toInput(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OffresPro() {
  const queryClient = useQueryClient();
  const merchant = useQuery({ queryKey: ["my-merchant"], queryFn: fetchMyMerchant });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const offers = useQuery({
    queryKey: ["merchant-offers", merchant.data?.id],
    queryFn: () => fetchMerchantOffers(merchant.data!.id),
    enabled: !!merchant.data?.id,
  });
  const [editing, setEditing] = useState<MerchantOffer | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  if (merchant.isLoading) return <LoadingState />;
  if (merchant.isError) return <ErrorState onRetry={() => merchant.refetch()} />;
  if (!merchant.data)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="Aucun commerce"
          description="Inscris ton commerce avant de créer des offres."
          action={
            <Link to="/espace-pro/inscription" className="mt-2 text-sm text-primary underline">
              Inscrire mon commerce
            </Link>
          }
        />
      </div>
    );
  if (merchant.data.role === "STAFF")
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <PermissionState description="Seuls les propriétaires et responsables peuvent gérer les offres." />
      </div>
    );

  const merchantId = merchant.data.id;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      merchant_id: merchantId,
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim() || null,
      discount_label: String(form.get("discount_label") ?? "").trim(),
      terms: String(form.get("terms") ?? "").trim() || null,
      photo_url: String(form.get("photo_url") ?? "").trim() || null,
      category_id: (String(form.get("category_id") ?? "") || null) as string | null,
      starts_at: new Date(String(form.get("starts_at"))).toISOString(),
      ends_at: new Date(String(form.get("ends_at"))).toISOString(),
      limit_type: String(form.get("limit_type")) as MerchantOffer["limit_type"],
      limit_count: Number(form.get("limit_count") ?? 1),
      xp_reward: Number(form.get("xp_reward") ?? 100),
      status: String(form.get("status")) as MerchantOffer["status"],
    };

    if (payload.title.length < 3) {
      toast.error("Le titre doit contenir au moins 3 caractères.");
      return;
    }
    if (payload.discount_label.length < 2) {
      toast.error("Indique le libellé de la réduction (ex. -20 %).");
      return;
    }
    if (Number.isNaN(Date.parse(payload.starts_at)) || Number.isNaN(Date.parse(payload.ends_at))) {
      toast.error("Dates de début et de fin obligatoires.");
      return;
    }
    if (new Date(payload.ends_at) <= new Date(payload.starts_at)) {
      toast.error("La date de fin doit être après la date de début.");
      return;
    }
    if (!Number.isInteger(payload.limit_count) || payload.limit_count < 1 || payload.limit_count > 100) {
      toast.error("La limite d'utilisation doit être un nombre entre 1 et 100.");
      return;
    }
    if (!Number.isInteger(payload.xp_reward) || payload.xp_reward < 0 || payload.xp_reward > 10000) {
      toast.error("Les points doivent être un nombre entre 0 et 10 000.");
      return;
    }
    if (payload.photo_url && !/^https:\/\/\S+$/i.test(payload.photo_url)) {
      toast.error("L'adresse de la photo doit commencer par https://");
      return;
    }


    setSaving(true);
    try {
      if (editing && editing !== "new") {
        const { error } = await supabase.from("offers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("offers").insert(payload);
        if (error) throw error;
      }
      toast.success("Offre enregistrée.");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["merchant-offers", merchantId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(offer: MerchantOffer) {
    if (!window.confirm(`Supprimer l'offre « ${offer.title} » ?`)) return;
    const { error } = await supabase.from("offers").delete().eq("id", offer.id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    toast.success("Offre supprimée.");
    await queryClient.invalidateQueries({ queryKey: ["merchant-offers", merchantId] });
  }

  const current = editing === "new" ? null : editing;
  const now = new Date();
  const inAMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Mes offres</h1>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden />
          Nouvelle
        </button>
      </div>

      {editing ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-lg">{current ? "Modifier l'offre" : "Créer une offre"}</h2>
          <Field label="Titre *">
            <input name="title" defaultValue={current?.title ?? ""} required className="metzy-input" />
          </Field>
          <Field label="Réduction affichée * (ex : -20%, 1 café offert)">
            <input
              name="discount_label"
              defaultValue={current?.discount_label ?? ""}
              required
              className="metzy-input"
            />
          </Field>
          <Field label="Description">
            <textarea name="description" rows={3} defaultValue={current?.description ?? ""} className="metzy-input" />
          </Field>
          <Field label="Conditions">
            <textarea name="terms" rows={2} defaultValue={current?.terms ?? ""} className="metzy-input" />
          </Field>
          <Field label="Photo (URL)">
            <input name="photo_url" type="url" defaultValue={current?.photo_url ?? ""} className="metzy-input" />
          </Field>
          <Field label="Catégorie">
            <select name="category_id" defaultValue={current?.category_id ?? ""} className="metzy-input">
              <option value="">— Choisir —</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début *">
              <input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={toInput(current?.starts_at ?? now.toISOString())}
                className="metzy-input"
              />
            </Field>
            <Field label="Fin *">
              <input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={toInput(current?.ends_at ?? inAMonth.toISOString())}
                className="metzy-input"
              />
            </Field>
            <Field label="Fréquence d'utilisation">
              <select name="limit_type" defaultValue={current?.limit_type ?? "ONCE"} className="metzy-input">
                {Object.entries(LIMIT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre par période">
              <input
                name="limit_count"
                type="number"
                min={1}
                max={50}
                defaultValue={current?.limit_count ?? 1}
                className="metzy-input"
              />
            </Field>
            <Field label="Points METZY offerts">
              <input
                name="xp_reward"
                type="number"
                min={0}
                max={10000}
                defaultValue={current?.xp_reward ?? 100}
                className="metzy-input"
              />
            </Field>
            <Field label="Statut">
              <select name="status" defaultValue={current?.status ?? "DRAFT"} className="metzy-input">
                {(["DRAFT", "ACTIVE", "PAUSED"] as const).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-border px-5 py-3 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      <section className="mt-8">
        {offers.isLoading ? (
          <LoadingState />
        ) : offers.isError ? (
          <ErrorState onRetry={() => offers.refetch()} />
        ) : (offers.data?.length ?? 0) === 0 ? (
          <EmptyState title="Aucune offre" description="Crée ta première offre pour attirer les abonnés METZY." />
        ) : (
          <ul className="space-y-3">
            {offers.data!.map((offer) => (
              <li key={offer.id} className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base">{offer.title}</h3>
                    <p className="text-sm text-primary">{offer.discount_label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {STATUS_LABELS[offer.status]} · jusqu&apos;au{" "}
                      {new Date(offer.ends_at).toLocaleDateString("fr-FR")} · +{offer.xp_reward} XP
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(offer)}
                      aria-label={`Modifier ${offer.title}`}
                      className="rounded-full border border-border p-2"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      onClick={() => remove(offer)}
                      aria-label={`Supprimer ${offer.title}`}
                      className="rounded-full border border-destructive/40 p-2 text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
