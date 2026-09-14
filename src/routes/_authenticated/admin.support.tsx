import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/metzy/admin-guard";
import { fetchSupportTickets, setTicketStatus } from "@/lib/metzy-admin";
import { EmptyState, ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({
    meta: [
      { title: "Demandes de support — Back-office METZY" },
      {
        name: "description",
        content: "Traite les demandes d'aide et les signalements envoyés par les membres METZY.",
      },
      { property: "og:title", content: "Support METZY" },
      { property: "og:description", content: "Suivi des demandes d'aide des membres." },
    ],
  }),
  component: AdminSupportPage,
});

const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const statusLabels: Record<string, string> = {
  OPEN: "En attente",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolue",
  CLOSED: "Clôturée",
};

function AdminSupportPage() {
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["admin-tickets"], queryFn: fetchSupportTickets });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setTicketStatus(id, status),
    onSuccess: async () => {
      toast.success("Statut mis à jour.");
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: () => toast.error("Mise à jour impossible."),
  });

  return (
    <AdminShell title="Demandes de support">
      {tickets.isLoading ? <LoadingState /> : null}
      {tickets.isError ? <ErrorState onRetry={() => tickets.refetch()} /> : null}
      {tickets.data?.length === 0 ? (
        <EmptyState title="Aucune demande" description="Les messages des membres arriveront ici." />
      ) : null}

      <div className="space-y-3">
        {tickets.data?.map((ticket) => (
          <article key={ticket.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{ticket.subject}</p>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {statusLabels[ticket.status] ?? ticket.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ticket.email ?? "Sans e-mail"} — {ticket.kind} —{" "}
              {new Date(ticket.created_at).toLocaleString("fr-FR")}
            </p>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{ticket.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {statuses
                .filter((status) => status !== ticket.status)
                .map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => update.mutate({ id: ticket.id, status })}
                    disabled={update.isPending}
                    className="min-h-9 rounded-full border border-input px-3 text-xs font-semibold disabled:opacity-60"
                  >
                    {statusLabels[status]}
                  </button>
                ))}
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
