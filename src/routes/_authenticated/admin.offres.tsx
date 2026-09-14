import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAdminOffers, setOfferStatus, type AdminOffer } from "@/lib/metzy-admin";
import { AdminShell } from "@/components/metzy/admin-guard";
import { LoadingState, ErrorState, EmptyState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/admin/offres")({
  head: () => ({
    meta: [
      { title: "Offres — Back-office METZY" },
      { name: "description", content: "Modérer les offres publiées par les commerces partenaires METZY." },
      { property: "og:title", content: "Modération des offres METZY" },
      { property: "og:description", content: "Activer, mettre en pause ou refuser une offre." },
    ],
  }),
  component: AdminOffers,
});

const STATUS_LABELS: Record<AdminOffer["status"], string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En relecture",
  ACTIVE: "Active",
  PAUSED: "En pause",
  EXPIRED: "Expirée",
  REJECTED: "Refusée",
};

const actions: AdminOffer["status"][] = ["ACTIVE", "PAUSED", "REJECTED"];

function AdminOffers() {
  const queryClient = useQueryClient();
  const offers = useQuery({ queryKey: ["admin-offers"], queryFn: fetchAdminOffers });

  async function update(id: string, status: AdminOffer["status"]) {
    try {
      await setOfferStatus(id, status);
      toast.success("Offre mise à jour.");
      await queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
    } catch {
      toast.error("Mise à jour impossible.");
    }
  }

  return (
    <AdminShell title="Offres">
      {offers.isLoading ? (
        <LoadingState />
      ) : offers.isError ? (
        <ErrorState onRetry={() => offers.refetch()} />
      ) : offers.data!.length === 0 ? (
        <EmptyState title="Aucune offre" description="Les offres créées par les commerces apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {offers.data!.map((offer) => (
            <li key={offer.id} className="rounded-3xl border border-border bg-card p-5">
              <h2 className="font-display text-base">{offer.title}</h2>
              <p className="text-sm text-primary">{offer.discount_label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {offer.merchants?.name ?? "Commerce"} · {STATUS_LABELS[offer.status]} · +{offer.xp_reward} XP ·
                jusqu&apos;au {new Date(offer.ends_at).toLocaleDateString("fr-FR")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {actions
                  .filter((status) => status !== offer.status)
                  .map((status) => (
                    <button
                      key={status}
                      onClick={() => update(offer.id, status)}
                      className="rounded-full border border-border px-4 py-2 text-sm"
                    >
                      {STATUS_LABELS[status]}
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
