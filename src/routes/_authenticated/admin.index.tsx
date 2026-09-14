import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminOverview } from "@/lib/metzy-admin";
import { AdminShell } from "@/components/metzy/admin-guard";
import { LoadingState, ErrorState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Back-office METZY" },
      { name: "description", content: "Pilotage METZY : commerces, offres, utilisations et fraude." },
      { property: "og:title", content: "Back-office METZY" },
      { property: "og:description", content: "Supervision de la plateforme METZY." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: fetchAdminOverview });

  return (
    <AdminShell title="Vue d'ensemble">
      {overview.isLoading ? (
        <LoadingState />
      ) : overview.isError ? (
        <ErrorState onRetry={() => overview.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card label="Membres" value={overview.data!.users} />
          <Card label="Commerces" value={overview.data!.merchants} />
          <Card label="À valider" value={overview.data!.pendingMerchants} accent />
          <Card label="Offres actives" value={overview.data!.activeOffers} />
          <Card label="Utilisations" value={overview.data!.redemptions} />
          <Card label="Alertes fraude" value={overview.data!.highRiskEvents} accent />
        </div>
      )}
    </AdminShell>
  );
}

function Card({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border bg-card p-4 ${accent ? "border-primary/50" : "border-border"}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
