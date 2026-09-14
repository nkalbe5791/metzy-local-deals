import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFraudEvents } from "@/lib/metzy-admin";
import { refusalMessage } from "@/lib/metzy";
import { AdminShell } from "@/components/metzy/admin-guard";
import { LoadingState, ErrorState, EmptyState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/admin/fraude")({
  head: () => ({
    meta: [
      { title: "Fraude — Back-office METZY" },
      { name: "description", content: "Suivi des tentatives de fraude et des scans refusés sur METZY." },
      { property: "og:title", content: "Surveillance anti-fraude METZY" },
      { property: "og:description", content: "Scans refusés, QR réutilisés et commerces non autorisés." },
    ],
  }),
  component: AdminFraud,
});

const RISK_STYLES: Record<string, string> = {
  LOW: "border-border text-muted-foreground",
  MEDIUM: "border-warning/50 text-warning",
  HIGH: "border-destructive/50 text-destructive",
};

function AdminFraud() {
  const events = useQuery({ queryKey: ["fraud-events"], queryFn: fetchFraudEvents });

  return (
    <AdminShell title="Fraude">
      {events.isLoading ? (
        <LoadingState />
      ) : events.isError ? (
        <ErrorState onRetry={() => events.refetch()} />
      ) : events.data!.length === 0 ? (
        <EmptyState title="Aucun incident" description="Les scans refusés et anomalies apparaîtront ici." />
      ) : (
        <ul className="space-y-2">
          {events.data!.map((event) => (
            <li key={event.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm">{event.event_type}</p>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${RISK_STYLES[event.risk] ?? RISK_STYLES["LOW"]}`}
                >
                  {event.risk}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{refusalMessage(event.reason)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(event.created_at).toLocaleString("fr-FR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
