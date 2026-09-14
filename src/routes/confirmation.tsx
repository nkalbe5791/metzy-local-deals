import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyPendingReferral } from "@/lib/metzy-referral";
import { fetchMyMerchant } from "@/lib/metzy-pro";
import { resolveHomePath } from "@/lib/metzy-redirect";

export const Route = createFileRoute("/confirmation")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirmation de ton compte METZY" },
      {
        name: "description",
        content: "Ton adresse email est confirmée : METZY t'emmène directement au bon endroit.",
      },
      { property: "og:title", content: "Compte METZY confirmé" },
      { property: "og:description", content: "Adresse email confirmée sur METZY." },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function route() {
      // Le lien de confirmation contient les jetons : on laisse au client
      // le temps d'établir la session avant de décider de la destination.
      let user = null as Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          user = data.user;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (cancelled) return;
      if (!user) {
        setFailed(true);
        return;
      }

      const isPro =
        (user.user_metadata as Record<string, unknown> | null)?.["account_type"] === "pro";

      if (isPro) {
        const merchant = await fetchMyMerchant().catch(() => null);
        if (cancelled) return;
        navigate({ to: merchant ? "/espace-pro" : "/espace-pro/inscription" });
        return;
      }

      await applyPendingReferral();
      const destination = await resolveHomePath();
      if (cancelled) return;
      navigate({ to: destination });
    }

    void route();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="font-display text-2xl">
        MET<span className="text-primary">ZY</span>
      </p>
      {failed ? (
        <>
          <h1 className="mt-4 font-display text-xl">Lien de confirmation expiré</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connecte-toi pour continuer, ou demande un nouveau lien.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="flex min-h-12 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-foreground"
            >
              Connexion particulier
            </Link>
            <Link
              to="/pro/auth"
              className="flex min-h-12 items-center rounded-2xl border border-border px-5 font-semibold"
            >
              Connexion pro
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Confirmation en cours, on t&apos;emmène au bon endroit...
        </p>
      )}
    </main>
  );
}
