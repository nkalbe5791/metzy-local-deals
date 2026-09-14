import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyContext } from "@/lib/metzy";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/abonnement")({
  head: () => ({
    meta: [
      { title: "Mon abonnement METZY" },
      {
        name: "description",
        content: "Active ou gère ton abonnement METZY pour débloquer toutes les offres de Metz.",
      },
      { property: "og:title", content: "Abonnement METZY" },
      { property: "og:description", content: "Un abonnement, tous les avantages locaux." },
    ],
  }),
  component: AbonnementPage,
});

async function fetchPricing() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["client_plan_monthly_eur", "client_plan_yearly_eur"]);
  if (error) throw error;
  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    client: Number(map.get("client_plan_monthly_eur") ?? 4.99),
    clientYearly: Number(map.get("client_plan_yearly_eur") ?? 39),
  };
}

const perks = [
  "Toutes les offres des commerces partenaires",
  "Réductions illimitées selon les conditions de chaque offre",
  "Points METZY et niveaux à débloquer",
  "Sans engagement, résiliable en un clic",
];

const euro = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;

function AbonnementPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const pricing = useQuery({ queryKey: ["pricing"], queryFn: fetchPricing });
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  if (me.isLoading) return <LoadingState />;
  if (me.isError) return <ErrorState onRetry={() => me.refetch()} />;

  const sub = me.data?.subscription;
  const active = me.data?.isSubscribed ?? false;
  const monthly = pricing.data?.client ?? 4.99;
  const yearly = pricing.data?.clientYearly ?? 39;
  const yearlySavings = Math.max(monthly * 12 - yearly, 0);
  const savingsPercent = monthly > 0 ? Math.round((yearlySavings / (monthly * 12)) * 100) : 0;
  const isYearly = cycle === "yearly";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Abonnement METZY</h1>

      <div
        role="radiogroup"
        aria-label="Choisis ta formule"
        className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-surface/60 p-1"
      >
        {(
          [
            { id: "monthly", label: "Mensuel" },
            { id: "yearly", label: "Annuel" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={cycle === option.id}
            onClick={() => setCycle(option.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              cycle === option.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
            {option.id === "yearly" && savingsPercent > 0 ? ` · -${savingsPercent}%` : ""}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-3xl border border-primary/40 bg-card p-6">
        <p className="font-display text-4xl">
          {euro(isYearly ? yearly : monthly)}
          <span className="text-base font-normal text-muted-foreground">
            {isYearly ? " / an" : " / mois"}
          </span>
        </p>
        {isYearly ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Soit {euro(yearly / 12)} par mois
            {yearlySavings > 0 ? ` — tu économises ${euro(yearlySavings)} par an.` : "."}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Passe à l&apos;annuel pour payer moins cher sur l&apos;année.
          </p>
        )}
        <ul className="mt-5 space-y-2 text-sm">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 text-accent" aria-hidden />
              <span className="text-muted-foreground">{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {active ? (
            <div className="rounded-2xl border border-accent/40 bg-surface/60 p-4 text-sm">
              <p className="font-medium">Abonnement actif</p>
              <p className="mt-1 text-muted-foreground">
                {sub?.current_period_end
                  ? `Prochaine échéance : ${new Date(sub.current_period_end).toLocaleDateString("fr-FR")}`
                  : "Renouvellement automatique à chaque échéance."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Toutes les offres sont débloquées : tu peux générer tes QR codes en boutique.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-warning/40 bg-surface/60 p-4 text-sm text-muted-foreground">
              Le paiement sécurisé arrive très bientôt, en mensuel comme en annuel. En attendant, tu
              peux découvrir toutes les offres des commerces partenaires de METZY.
            </div>
          )}
        </div>
      </div>


      <p className="mt-6 text-xs text-muted-foreground">
        En t&apos;abonnant, tu acceptes les{" "}
        <Link to="/cgu" className="text-primary underline">
          CGU
        </Link>
        .
      </p>

      <BottomNav />
    </div>
  );
}
