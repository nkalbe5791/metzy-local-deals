import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, LogOut, Share2, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchMyContext, fetchMyRedemptions } from "@/lib/metzy";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { EmptyState, ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil METZY" },
      {
        name: "description",
        content: "Tes points, ton niveau, ton abonnement et l'historique de tes offres utilisées.",
      },
      { property: "og:title", content: "Mon profil METZY" },
      { property: "og:description", content: "Gère ton compte et ton abonnement METZY." },
    ],
  }),
  component: ProfilPage,
});

function ReferralActions({ code }: { code: string }) {
  const [link, setLink] = useState("");

  useEffect(() => {
    setLink(`${window.location.origin}/auth?ref=${encodeURIComponent(code)}`);
  }, [code]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié.`);
    } catch {
      toast.error("Copie impossible sur cet appareil.");
    }
  }

  async function share() {
    const shareData = {
      title: "METZY",
      text: `Rejoins-moi sur METZY avec mon code ${code} et profite des bons plans de Metz.`,
      url: link,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // partage annulé : on retombe sur la copie
      }
    }
    await copy(link, "Lien de parrainage");
  }

  return (
    <div className="mt-4">
      <p className="rounded-2xl border border-border bg-card px-4 py-3 text-xs break-all text-muted-foreground">
        {link || "…"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Share2 className="size-4" /> Partager mon lien
        </button>
        <button
          type="button"
          onClick={() => copy(link, "Lien de parrainage")}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary px-4 text-sm font-semibold text-primary"
        >
          <Copy className="size-4" /> Copier le lien
        </button>
        <button
          type="button"
          onClick={() => copy(code, "Code de parrainage")}
          className="inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-semibold"
        >
          Copier le code
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Le lien pré-remplit ton code sur la page d&apos;inscription. Le code peut aussi être saisi à
        la main dans le formulaire.
      </p>
    </div>
  );
}

function ProfilPage() {

  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const history = useQuery({ queryKey: ["redemptions"], queryFn: fetchMyRedemptions });

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Déconnexion impossible pour le moment.");
      return;
    }
    navigate({ to: "/" });
  }

  if (me.isLoading) return <LoadingState />;
  if (me.isError) return <ErrorState onRetry={() => me.refetch()} />;

  const ctx = me.data;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Mon profil</h1>

      <div className="mt-5 rounded-3xl border border-border bg-card p-5">
        <p className="font-display text-lg">{ctx?.profile?.display_name ?? "Membre METZY"}</p>
        <p className="text-sm text-muted-foreground">{ctx?.user.email}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1 text-accent">
            <Sparkles className="size-4" aria-hidden />
            {ctx?.xp ?? 0} points
          </span>
          <span className="text-muted-foreground">{ctx?.currentLevel?.name ?? "Niveau 1"}</span>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-surface/60 p-5">
        <h2 className="font-display text-base">Abonnement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ctx?.isSubscribed
            ? `Actif — statut ${ctx?.subscription?.status}`
            : "Aucun abonnement actif."}
        </p>
        <Link to="/abonnement" className="mt-3 inline-block text-sm text-primary underline">
          Gérer mon abonnement
        </Link>
      </div>

      <Link
        to="/cadeaux"
        className="mt-4 flex min-h-12 items-center justify-between rounded-2xl border border-border bg-card px-4 text-sm font-medium"
      >
        Mes cadeaux fidélité
        <span aria-hidden>→</span>
      </Link>

      <Link
        to="/amis"
        className="mt-3 flex min-h-12 items-center justify-between rounded-2xl border border-border bg-card px-4 text-sm font-medium"
      >
        Mes amis & classement
        <span aria-hidden>→</span>
      </Link>

      <Link
        to="/favoris"
        className="mt-4 block rounded-3xl border border-border bg-surface/60 p-5 text-sm"
      >
        <span className="font-display text-base">Mes favoris</span>
        <p className="mt-1 text-muted-foreground">Les offres que tu as mises de côté.</p>
      </Link>

      <div className="mt-4 rounded-3xl border border-border bg-surface/60 p-5">
        <h2 className="font-display text-base">Parrainage</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Partage ton code : tes amis rejoignent METZY et soutiennent les commerces messins.
        </p>
        <p className="mt-3 font-display text-xl tracking-[0.2em] text-primary">
          {ctx?.profile?.referral_code ?? "—"}
        </p>
        {ctx?.profile?.referral_code ? (
          <ReferralActions code={ctx.profile.referral_code} />
        ) : null}
      </div>


      {(ctx?.memberships?.length ?? 0) > 0 ? (
        <Link
          to="/espace-pro"
          className="mt-4 block rounded-3xl border border-border bg-surface/60 p-5 text-sm"
        >
          <span className="font-display text-base">Espace commerçant</span>
          <p className="mt-1 text-muted-foreground">Gérer mes offres et scanner les QR codes.</p>
        </Link>
      ) : null}

      {ctx?.roles?.includes("admin") ? (
        <Link
          to="/admin"
          className="mt-4 block rounded-3xl border border-border bg-surface/60 p-5 text-sm"
        >
          <span className="font-display text-base">Back-office METZY</span>
          <p className="mt-1 text-muted-foreground">Commerces, offres et surveillance anti-fraude.</p>
        </Link>
      ) : null}

      <h2 className="mt-8 font-display text-lg">Historique</h2>
      <div className="mt-3 space-y-3">
        {history.isLoading ? <LoadingState label="Chargement de l'historique..." /> : null}
        {history.isError ? <ErrorState onRetry={() => history.refetch()} /> : null}
        {history.data?.length === 0 ? (
          <EmptyState
            title="Aucune offre utilisée"
            description="Ta première réduction t'attend dans Explorer."
          />
        ) : null}
        {history.data?.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{row.merchants?.name ?? "Commerce"}</p>
              <p className="text-xs text-muted-foreground">
                {row.offers?.title} — {new Date(row.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <span className="text-accent">+{row.xp_awarded}</span>
          </div>
        ))}
      </div>

      <Link
        to="/compte"
        className="mt-8 block rounded-3xl border border-border bg-surface/60 p-5 text-sm"
      >
        <span className="font-display text-base">Mon compte</span>
        <p className="mt-1 text-muted-foreground">
          Modifier mes informations, mon mot de passe ou supprimer mon compte.
        </p>
      </Link>

      <Link
        to="/notifications"
        className="mt-4 block rounded-3xl border border-border bg-surface/60 p-5 text-sm"
      >
        <span className="font-display text-base">Notifications</span>
        <p className="mt-1 text-muted-foreground">
          Nouvelles offres à proximité et préférences d&apos;alerte.
        </p>
      </Link>

      <Link
        to="/aide"
        className="mt-4 block rounded-3xl border border-border bg-surface/60 p-5 text-sm"
      >
        <span className="font-display text-base">Aide et support</span>
        <p className="mt-1 text-muted-foreground">Une question, un souci avec une offre ?</p>
      </Link>

      <div className="mt-8 space-y-2 text-sm">
        <Link to="/faq" className="block text-muted-foreground underline">
          Questions fréquentes
        </Link>
        <Link to="/cgu" className="block text-muted-foreground underline">
          Conditions générales
        </Link>
        <Link to="/confidentialite" className="block text-muted-foreground underline">
          Politique de confidentialité
        </Link>
        <Link to="/mentions-legales" className="block text-muted-foreground underline">
          Mentions légales
        </Link>
      </div>


      <button
        onClick={signOut}
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border px-5 text-sm font-semibold"
      >
        <LogOut className="size-4" aria-hidden />
        Se déconnecter
      </button>

      <BottomNav />
    </div>
  );
}
