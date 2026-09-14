import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchMyContext } from "@/lib/metzy";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/compte")({
  head: () => ({
    meta: [
      { title: "Mon compte METZY" },
      {
        name: "description",
        content:
          "Modifie tes informations personnelles METZY, gère tes préférences et demande la suppression de ton compte.",
      },
      { property: "og:title", content: "Mon compte METZY" },
      {
        property: "og:description",
        content: "Informations personnelles, sécurité et suppression de compte.",
      },
    ],
  }),
  component: ComptePage,
});

const schema = z.object({
  first_name: z.string().trim().min(2, "Prénom trop court").max(60),
  last_name: z.string().trim().min(2, "Nom trop court").max(60),
  display_name: z.string().trim().min(2, "Pseudo trop court").max(40),
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}$/, "Numéro de téléphone invalide")
    .or(z.literal("")),
  address_line1: z.string().trim().max(120).or(z.literal("")),
  postal_code: z.string().trim().regex(/^\d{5}$/, "Code postal invalide").or(z.literal("")),
  city_name: z.string().trim().max(60).or(z.literal("")),
});

const field =
  "mt-1 w-full rounded-2xl border border-input bg-surface/60 px-4 py-3 text-sm outline-none focus:border-primary";

function ComptePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  if (me.isLoading) return <LoadingState />;
  if (me.isError) return <ErrorState onRetry={() => me.refetch()} />;

  const profile = me.data?.profile;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
      display_name: String(form.get("display_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address_line1: String(form.get("address_line1") ?? ""),
      postal_code: String(form.get("postal_code") ?? ""),
      city_name: String(form.get("city_name") ?? ""),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire incomplet.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        display_name: parsed.data.display_name,
        phone: parsed.data.phone || null,
        address_line1: parsed.data.address_line1 || null,
        postal_code: parsed.data.postal_code || null,
        city_name: parsed.data.city_name || null,
      })
      .eq("id", me.data!.user.id);
    setSaving(false);

    if (updateError) {
      setError("Enregistrement impossible pour le moment.");
      return;
    }
    toast.success("Informations mises à jour.");
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  async function resetPassword() {
    const email = me.data?.user.email;
    if (!email) return;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (resetError) {
      toast.error("Envoi impossible pour le moment.");
      return;
    }
    toast.success("E-mail de réinitialisation envoyé.");
  }

  async function deleteAccount() {
    if (confirmDelete.trim().toUpperCase() !== "SUPPRIMER") {
      toast.error('Écris « SUPPRIMER » pour confirmer.');
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("request_account_deletion");
    const result = data as { ok?: boolean } | null;
    if (rpcError || !result?.ok) {
      toast.error("Suppression impossible pour le moment.");
      return;
    }
    await supabase.auth.signOut();
    toast.success("Compte supprimé. Tes données personnelles ont été effacées.");
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Mon compte</h1>
      <p className="mt-1 text-sm text-muted-foreground">{me.data?.user.email}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Prénom
            <input name="first_name" defaultValue={profile?.first_name ?? ""} className={field} />
          </label>
          <label className="block text-sm">
            Nom
            <input name="last_name" defaultValue={profile?.last_name ?? ""} className={field} />
          </label>
        </div>
        <label className="block text-sm">
          Pseudo affiché
          <input name="display_name" defaultValue={profile?.display_name ?? ""} className={field} />
        </label>
        <label className="block text-sm">
          Téléphone
          <input
            name="phone"
            type="tel"
            defaultValue={profile?.phone ?? ""}
            className={field}
            placeholder="06 12 34 56 78"
          />
        </label>
        <label className="block text-sm">
          Adresse
          <input name="address_line1" defaultValue={profile?.address_line1 ?? ""} className={field} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Code postal
            <input name="postal_code" defaultValue={profile?.postal_code ?? ""} className={field} />
          </label>
          <label className="block text-sm">
            Ville
            <input name="city_name" defaultValue={profile?.city_name ?? ""} className={field} />
          </label>
        </div>

        {error ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 items-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      <section className="mt-8 rounded-3xl border border-border bg-surface/60 p-5">
        <h2 className="font-display text-base">Sécurité</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reçois un e-mail pour changer ton mot de passe.
        </p>
        <button
          type="button"
          onClick={resetPassword}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-semibold"
        >
          Réinitialiser mon mot de passe
        </button>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-surface/60 p-5 text-sm">
        <h2 className="font-display text-base">Aide et documents</h2>
        <div className="mt-2 flex flex-wrap gap-4 text-muted-foreground">
          <Link to="/aide" className="underline">
            Contacter le support
          </Link>
          <Link to="/faq" className="underline">
            FAQ
          </Link>
          <Link to="/cgu" className="underline">
            CGU
          </Link>
          <Link to="/confidentialite" className="underline">
            Confidentialité
          </Link>
          <Link to="/mentions-legales" className="underline">
            Mentions légales
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="font-display text-base">Supprimer mon compte</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tes informations personnelles seront effacées, tes favoris et tes QR codes non utilisés
          supprimés. Cette action est définitive et n&apos;annule pas automatiquement un abonnement
          payant en cours : résilie-le d&apos;abord depuis la page abonnement.
        </p>
        <label className="mt-3 block text-sm">
          Écris SUPPRIMER pour confirmer
          <input
            value={confirmDelete}
            onChange={(event) => setConfirmDelete(event.target.value)}
            className={field}
            placeholder="SUPPRIMER"
          />
        </label>
        <button
          type="button"
          onClick={deleteAccount}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-destructive px-4 text-sm font-semibold text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          Supprimer définitivement
        </button>
      </section>

      <BottomNav />
    </div>
  );
}
