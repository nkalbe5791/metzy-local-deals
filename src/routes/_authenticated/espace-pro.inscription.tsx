import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "@/lib/metzy";
import { fetchMyMerchant } from "@/lib/metzy-pro";
import { LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/espace-pro/inscription")({
  head: () => ({
    meta: [
      { title: "Inscrire mon commerce — METZY" },
      {
        name: "description",
        content: "Rejoins METZY : crée ta fiche commerce et propose des offres aux abonnés de Metz.",
      },
      { property: "og:title", content: "Inscrire mon commerce sur METZY" },
      { property: "og:description", content: "Crée ta fiche commerce METZY en 2 minutes." },
    ],
  }),
  component: InscriptionPro,
});

async function fetchCities() {
  const { data, error } = await supabase
    .from("cities")
    .select("id,name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

function InscriptionPro() {
  const navigate = useNavigate();
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const cities = useQuery({ queryKey: ["cities"], queryFn: fetchCities });
  const existing = useQuery({ queryKey: ["my-merchant"], queryFn: fetchMyMerchant });
  const [saving, setSaving] = useState(false);

  if (existing.isLoading) return <LoadingState />;
  if (existing.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-sm text-muted-foreground">
        Tu gères déjà le commerce « {existing.data.name} ».
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (name.length < 2) {
      toast.error("Le nom du commerce est requis.");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Session expirée");

      const { data: merchant, error } = await supabase
        .from("merchants")
        .insert({
          owner_id: userId,
          name,
          description: String(form.get("description") ?? "").trim() || null,
          address: String(form.get("address") ?? "").trim() || null,
          phone: String(form.get("phone") ?? "").trim() || null,
          city_id: (String(form.get("city_id") ?? "") || null) as string | null,
          category_id: (String(form.get("category_id") ?? "") || null) as string | null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await supabase
        .from("merchant_members")
        .insert({ merchant_id: merchant.id, user_id: userId, role: "OWNER" });

      toast.success("Commerce enregistré. Il sera visible après validation.");
      await navigate({ to: "/espace-pro" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="font-display text-2xl">Inscrire mon commerce</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ta fiche sera vérifiée par l&apos;équipe METZY avant publication.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Nom du commerce *">
          <input name="name" required className="metzy-input" autoComplete="organization" />
        </Field>
        <Field label="Description">
          <textarea name="description" rows={3} className="metzy-input" />
        </Field>
        <Field label="Adresse">
          <input name="address" className="metzy-input" autoComplete="street-address" />
        </Field>
        <Field label="Téléphone">
          <input name="phone" type="tel" className="metzy-input" autoComplete="tel" />
        </Field>
        <Field label="Ville">
          <select name="city_id" className="metzy-input">
            <option value="">— Choisir —</option>
            {(cities.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Catégorie">
          <select name="category_id" className="metzy-input">
            <option value="">— Choisir —</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Envoyer ma demande"}
        </button>
      </form>
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
