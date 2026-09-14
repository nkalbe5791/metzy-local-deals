import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAdminMerchants, setMerchantStatus, type AdminMerchant } from "@/lib/metzy-admin";
import { MERCHANT_STATUS_LABELS } from "@/lib/metzy-pro";
import { AdminShell } from "@/components/metzy/admin-guard";
import { LoadingState, ErrorState, EmptyState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/admin/commerces")({
  head: () => ({
    meta: [
      { title: "Commerces — Back-office METZY" },
      { name: "description", content: "Valider, refuser ou suspendre les commerces partenaires METZY." },
      { property: "og:title", content: "Modération des commerces METZY" },
      { property: "og:description", content: "Validation des commerces partenaires." },
    ],
  }),
  component: AdminMerchants,
});

const actions: { status: AdminMerchant["status"]; label: string }[] = [
  { status: "APPROVED", label: "Valider" },
  { status: "REJECTED", label: "Refuser" },
  { status: "SUSPENDED", label: "Suspendre" },
];

function AdminMerchants() {
  const queryClient = useQueryClient();
  const merchants = useQuery({ queryKey: ["admin-merchants"], queryFn: fetchAdminMerchants });

  async function update(id: string, status: AdminMerchant["status"]) {
    try {
      await setMerchantStatus(id, status);
      toast.success("Statut mis à jour.");
      await queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    } catch {
      toast.error("Mise à jour impossible.");
    }
  }

  return (
    <AdminShell title="Commerces">
      {merchants.isLoading ? (
        <LoadingState />
      ) : merchants.isError ? (
        <ErrorState onRetry={() => merchants.refetch()} />
      ) : merchants.data!.length === 0 ? (
        <EmptyState title="Aucun commerce" description="Les demandes d'inscription apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {merchants.data!.map((m) => (
            <li key={m.id} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base">{m.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {MERCHANT_STATUS_LABELS[m.status]} · {new Date(m.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  {m.address ? <p className="mt-1 text-sm text-muted-foreground">{m.address}</p> : null}
                  {m.phone ? <p className="text-sm text-muted-foreground">{m.phone}</p> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {actions
                  .filter((a) => a.status !== m.status)
                  .map((a) => (
                    <button
                      key={a.status}
                      onClick={() => update(m.id, a.status)}
                      className="rounded-full border border-border px-4 py-2 text-sm"
                    >
                      {a.label}
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
