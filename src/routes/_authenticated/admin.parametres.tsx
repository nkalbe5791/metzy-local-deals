import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/metzy/admin-guard";
import { ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/admin/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Back-office METZY" },
      {
        name: "description",
        content: "Gère les villes, les catégories et les tarifs d'abonnement METZY.",
      },
      { property: "og:title", content: "Paramètres METZY" },
      { property: "og:description", content: "Villes, catégories et tarifs de la plateforme." },
    ],
  }),
  component: AdminSettings,
});

async function fetchSettingsData() {
  const [cities, categories, settings, levels] = await Promise.all([
    supabase.from("cities").select("id,name,code,is_active").order("name"),
    supabase.from("categories").select("id,name,code,emoji,is_active,position").order("position"),
    supabase.from("app_settings").select("key,value"),
    supabase.from("levels").select("id,name,min_xp,position").order("position"),
  ]);
  if (cities.error) throw cities.error;
  if (categories.error) throw categories.error;
  if (settings.error) throw settings.error;
  if (levels.error) throw levels.error;
  const map = new Map((settings.data ?? []).map((row) => [row.key, row.value]));
  return {
    cities: cities.data ?? [],
    categories: categories.data ?? [],
    levels: levels.data ?? [],
    clientPrice: Number(map.get("client_plan_monthly_eur") ?? 4.99),
    clientYearlyPrice: Number(map.get("client_plan_yearly_eur") ?? 39),
    merchantPrice: Number(map.get("merchant_plan_business_eur") ?? 29),
  };
}

function AdminSettings() {
  const queryClient = useQueryClient();
  const data = useQuery({ queryKey: ["admin-settings"], queryFn: fetchSettingsData });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-settings"] });

  const [cityName, setCityName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryEmoji, setCategoryEmoji] = useState("");
  const [levelName, setLevelName] = useState("");
  const [levelXp, setLevelXp] = useState("");

  const slug = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const addCity = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("cities").insert({ name, code: slug(name) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ville ajoutée.");
      setCityName("");
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Ajout impossible."),
  });

  const toggleCity = useMutation({
    mutationFn: async (row: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("cities")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Mise à jour impossible."),
  });

  const addCategory = useMutation({
    mutationFn: async (input: { name: string; emoji: string }) => {
      const { error } = await supabase.from("categories").insert({
        name: input.name,
        code: slug(input.name),
        emoji: input.emoji || null,
        position: (data.data?.categories.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Catégorie ajoutée.");
      setCategoryName("");
      setCategoryEmoji("");
      void invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Ajout impossible."),
  });

  const toggleCategory = useMutation({
    mutationFn: async (row: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Mise à jour impossible."),
  });

  const saveLevel = useMutation({
    mutationFn: async (input: { id: string; name: string; minXp: number }) => {
      const { error } = await supabase
        .from("levels")
        .update({ name: input.name, min_xp: input.minXp })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Niveau mis à jour.");
      void invalidate();
      void queryClient.invalidateQueries({ queryKey: ["levels"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible."),
  });

  const addLevel = useMutation({
    mutationFn: async (input: { name: string; minXp: number }) => {
      const { error } = await supabase.from("levels").insert({
        name: input.name,
        min_xp: input.minXp,
        position: (data.data?.levels.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Niveau ajouté.");
      setLevelName("");
      setLevelXp("");
      void invalidate();
      void queryClient.invalidateQueries({ queryKey: ["levels"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Ajout impossible."),
  });

  const removeLevel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Niveau supprimé.");
      void invalidate();
      void queryClient.invalidateQueries({ queryKey: ["levels"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Suppression impossible."),
  });

  const savePrices = useMutation({
    mutationFn: async (input: { client: number; clientYearly: number; merchant: number }) => {
      const rows = [
        { key: "client_plan_monthly_eur", value: input.client },
        { key: "client_plan_yearly_eur", value: input.clientYearly },
        { key: "merchant_plan_business_eur", value: input.merchant },
      ];
      const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarifs enregistrés.");
      void invalidate();
      void queryClient.invalidateQueries({ queryKey: ["pricing"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Enregistrement impossible."),
  });

  return (
    <AdminShell title="Paramètres">
      {data.isLoading ? (
        <LoadingState />
      ) : data.isError ? (
        <ErrorState onRetry={() => data.refetch()} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-lg">Villes</h2>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = cityName.trim();
                if (name.length < 2) {
                  toast.error("Nom de ville invalide.");
                  return;
                }
                addCity.mutate(name);
              }}
            >
              <input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                maxLength={80}
                placeholder="Nouvelle ville"
                className="metzy-input"
              />
              <button
                type="submit"
                disabled={addCity.isPending}
                className="whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Ajouter
              </button>
            </form>
            <ul className="mt-3 space-y-2">
              {data.data!.cities.map((city) => (
                <li
                  key={city.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm"
                >
                  <span>{city.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleCity.mutate(city)}
                    className={`rounded-full border px-3 py-1 text-xs ${city.is_active ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
                  >
                    {city.is_active ? "Active" : "Inactive"}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg">Catégories</h2>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = categoryName.trim();
                if (name.length < 2) {
                  toast.error("Nom de catégorie invalide.");
                  return;
                }
                addCategory.mutate({ name, emoji: categoryEmoji.trim() });
              }}
            >
              <input
                value={categoryEmoji}
                onChange={(e) => setCategoryEmoji(e.target.value)}
                maxLength={4}
                placeholder="🍔"
                aria-label="Emoji de la catégorie"
                className="metzy-input w-16 text-center"
              />
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                maxLength={60}
                placeholder="Nouvelle catégorie"
                className="metzy-input"
              />
              <button
                type="submit"
                disabled={addCategory.isPending}
                className="whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Ajouter
              </button>
            </form>
            <ul className="mt-3 space-y-2">
              {data.data!.categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm"
                >
                  <span>
                    {cat.emoji ? `${cat.emoji} ` : ""}
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCategory.mutate(cat)}
                    className={`rounded-full border px-3 py-1 text-xs ${cat.is_active ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
                  >
                    {cat.is_active ? "Active" : "Inactive"}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg">Niveaux de points</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Définis le nom de chaque niveau et le nombre de points METZY nécessaires pour
              l&apos;atteindre.
            </p>
            <ul className="mt-3 space-y-2">
              {data.data!.levels.map((level) => (
                <li key={level.id} className="rounded-2xl border border-border bg-card p-3">
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      const name = String(form.get("name") ?? "").trim();
                      const minXp = Number(form.get("min_xp"));
                      if (name.length < 2) {
                        toast.error("Nom de niveau invalide.");
                        return;
                      }
                      if (!Number.isInteger(minXp) || minXp < 0 || minXp > 1000000) {
                        toast.error("Nombre de points invalide.");
                        return;
                      }
                      saveLevel.mutate({ id: level.id, name, minXp });
                    }}
                  >
                    <label className="min-w-40 flex-1">
                      <span className="mb-1 block text-xs text-muted-foreground">Nom</span>
                      <input
                        name="name"
                        defaultValue={level.name}
                        maxLength={40}
                        className="metzy-input w-full"
                      />
                    </label>
                    <label className="w-32">
                      <span className="mb-1 block text-xs text-muted-foreground">Points requis</span>
                      <input
                        name="min_xp"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={level.min_xp}
                        className="metzy-input w-full"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={saveLevel.isPending}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLevel.mutate(level.id)}
                      className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Supprimer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = levelName.trim();
                const minXp = Number(levelXp);
                if (name.length < 2) {
                  toast.error("Nom de niveau invalide.");
                  return;
                }
                if (!Number.isInteger(minXp) || minXp < 0 || minXp > 1000000) {
                  toast.error("Nombre de points invalide.");
                  return;
                }
                addLevel.mutate({ name, minXp });
              }}
            >
              <input
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                maxLength={40}
                placeholder="Nouveau niveau"
                aria-label="Nom du nouveau niveau"
                className="metzy-input min-w-40 flex-1"
              />
              <input
                value={levelXp}
                onChange={(e) => setLevelXp(e.target.value)}
                type="number"
                min="0"
                step="1"
                placeholder="Points"
                aria-label="Points requis"
                className="metzy-input w-32"
              />
              <button
                type="submit"
                disabled={addLevel.isPending}
                className="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Ajouter
              </button>
            </form>
          </section>

          <section>
            <h2 className="font-display text-lg">Tarifs d&apos;abonnement (€)</h2>
            <form
              className="mt-3 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const client = Number(form.get("client"));
                const clientYearly = Number(form.get("client_yearly"));
                const merchant = Number(form.get("merchant"));
                if (!Number.isFinite(client) || client < 0 || client > 1000) {
                  toast.error("Tarif client mensuel invalide.");
                  return;
                }
                if (!Number.isFinite(clientYearly) || clientYearly < 0 || clientYearly > 10000) {
                  toast.error("Tarif client annuel invalide.");
                  return;
                }
                if (!Number.isFinite(merchant) || merchant < 0 || merchant > 10000) {
                  toast.error("Tarif commerçant invalide.");
                  return;
                }
                savePrices.mutate({ client, clientYearly, merchant });
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Client / mois</span>
                <input
                  name="client"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={data.data!.clientPrice}
                  className="metzy-input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Client / an</span>
                <input
                  name="client_yearly"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={data.data!.clientYearlyPrice}
                  className="metzy-input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Commerçant / mois</span>
                <input
                  name="merchant"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={data.data!.merchantPrice}
                  className="metzy-input"
                />
              </label>
              <button
                type="submit"
                disabled={savePrices.isPending}
                className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2"
              >
                {savePrices.isPending ? "Enregistrement..." : "Enregistrer les tarifs"}
              </button>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
