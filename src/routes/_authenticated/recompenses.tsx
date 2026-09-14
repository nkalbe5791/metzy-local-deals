import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyContext } from "@/lib/metzy";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/recompenses")({
  head: () => ({
    meta: [
      { title: "Mes points et niveaux METZY" },
      {
        name: "description",
        content: "Suis tes points METZY, ton niveau actuel et ce qu'il te reste à débloquer.",
      },
      { property: "og:title", content: "Récompenses METZY" },
      { property: "og:description", content: "Gagne des points à chaque offre utilisée." },
    ],
  }),
  component: RecompensesPage,
});

async function fetchLevels() {
  const { data, error } = await supabase
    .from("levels")
    .select("id,name,min_xp,position")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

function RecompensesPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const levels = useQuery({ queryKey: ["levels"], queryFn: fetchLevels });

  if (me.isLoading || levels.isLoading) return <LoadingState />;
  if (me.isError) return <ErrorState onRetry={() => me.refetch()} />;
  if (levels.isError) return <ErrorState onRetry={() => levels.refetch()} />;

  const xp = me.data?.xp ?? 0;
  const next = me.data?.nextLevel ?? null;
  const progress = next
    ? Math.min(100, Math.round((xp / Math.max(next.min_xp, 1)) * 100))
    : 100;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Mes récompenses</h1>

      <div className="mt-5 rounded-3xl border border-border bg-gradient-metzy p-6 text-primary-foreground">
        <p className="inline-flex items-center gap-2 text-sm">
          <Sparkles className="size-4" aria-hidden />
          Points METZY
        </p>
        <p className="mt-1 font-display text-4xl">{xp}</p>
        <p className="mt-2 text-sm opacity-90">
          Niveau actuel : {me.data?.currentLevel?.name ?? "—"}
        </p>
        <div className="mt-4">
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression vers le niveau suivant"
            className="h-2 w-full overflow-hidden rounded-full bg-background/30"
          >
            <div className="h-full rounded-full bg-background" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs opacity-90">
            {next
              ? `Encore ${next.min_xp - xp} points pour ${next.name}`
              : "Niveau maximum atteint, bravo !"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          to="/cadeaux"
          className="flex min-h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          Échanger mes points ({me.data?.pointsBalance ?? 0} dispo)
        </Link>
        <Link
          to="/amis"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-border text-sm font-semibold"
        >
          Mes amis & classement
        </Link>
      </div>

      <h2 className="mt-8 font-display text-lg">Tous les niveaux</h2>
      <div className="mt-3 space-y-3">
        {levels.data?.map((level) => {
          const reached = xp >= level.min_xp;
          return (
            <div
              key={level.id}
              className={`rounded-3xl border p-4 ${
                reached ? "border-accent/50 bg-accent/10" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-2 font-display text-base">
                  <Trophy
                    className={`size-4 ${reached ? "text-accent" : "text-muted-foreground"}`}
                    aria-hidden
                  />
                  {level.name}
                </p>
                <span className="text-xs text-muted-foreground">{level.min_xp} pts</span>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
