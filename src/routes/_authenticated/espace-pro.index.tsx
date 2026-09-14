import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QrCode, Tag, Eye, TicketCheck, Store, Users } from "lucide-react";
import { fetchMyMerchant, fetchMerchantStats, MERCHANT_STATUS_LABELS } from "@/lib/metzy-pro";
import { LoadingState, ErrorState, EmptyState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/espace-pro/")({
  head: () => ({
    meta: [
      { title: "Espace commerçant METZY" },
      {
        name: "description",
        content: "Pilote tes offres, scanne les QR clients et suis tes utilisations sur METZY.",
      },
      { property: "og:title", content: "Espace commerçant METZY" },
      { property: "og:description", content: "Tableau de bord commerçant METZY." },
    ],
  }),
  component: ProDashboard,
});

function ProDashboard() {
  const merchant = useQuery({ queryKey: ["my-merchant"], queryFn: fetchMyMerchant });
  const stats = useQuery({
    queryKey: ["merchant-stats", merchant.data?.id],
    queryFn: () => fetchMerchantStats(merchant.data!.id),
    enabled: !!merchant.data?.id,
  });

  if (merchant.isLoading) return <LoadingState label="Chargement de ton commerce..." />;
  if (merchant.isError) return <ErrorState onRetry={() => merchant.refetch()} />;

  if (!merchant.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="Aucun commerce rattaché"
          description="Inscris ton commerce pour créer des offres et scanner les QR de tes clients."
          action={
            <Link
              to="/espace-pro/inscription"
              className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Inscrire mon commerce
            </Link>
          }
        />
      </div>
    );
  }

  const m = merchant.data;
  const canManage = m.role === "OWNER" || m.role === "MANAGER";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <header className="flex items-start gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-metzy">
          <Store className="size-6 text-primary-foreground" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-2xl leading-tight">{m.name}</h1>
          <p className="text-sm text-muted-foreground">
            {MERCHANT_STATUS_LABELS[m.status]} · rôle {m.role}
          </p>
        </div>
      </header>

      {m.status !== "APPROVED" ? (
        <p className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
          Ton commerce n&apos;est pas encore visible des clients ({MERCHANT_STATUS_LABELS[m.status]}
          ). Tu peux déjà préparer tes offres en brouillon.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat icon={<TicketCheck className="size-4" aria-hidden />} label="Utilisations 30j" value={stats.data?.monthCount ?? 0} />
        <Stat icon={<Tag className="size-4" aria-hidden />} label="Offres actives" value={stats.data?.activeOffers ?? 0} />
        <Stat icon={<Eye className="size-4" aria-hidden />} label="Vues cumulées" value={stats.data?.totalViews ?? 0} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/espace-pro/scanner"
          className="flex items-center gap-3 rounded-3xl border border-primary/40 bg-card p-5 shadow-soft"
        >
          <QrCode className="size-6 text-primary" aria-hidden />
          <span>
            <span className="block font-display">Scanner un QR</span>
            <span className="block text-xs text-muted-foreground">Valider une réduction client</span>
          </span>
        </Link>
        {canManage ? (
          <Link
            to="/espace-pro/offres"
            className="flex items-center gap-3 rounded-3xl border border-border bg-card p-5 shadow-soft"
          >
            <Tag className="size-6 text-accent" aria-hidden />
            <span>
              <span className="block font-display">Mes offres</span>
              <span className="block text-xs text-muted-foreground">Créer, modifier, activer</span>
            </span>
          </Link>
        ) : null}
        {canManage ? (
          <Link
            to="/espace-pro/equipe"
            className="flex items-center gap-3 rounded-3xl border border-border bg-card p-5 shadow-soft"
          >
            <Users className="size-6 text-accent" aria-hidden />
            <span>
              <span className="block font-display">Mon équipe</span>
              <span className="block text-xs text-muted-foreground">
                Managers et personnel autorisés à scanner
              </span>
            </span>
          </Link>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg">Dernières validations</h2>
        {stats.isLoading ? (
          <LoadingState label="Chargement..." />
        ) : (stats.data?.recent.length ?? 0) === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface/60 p-4 text-sm text-muted-foreground">
            Aucune utilisation pour le moment.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stats.data!.recent.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm"
              >
                <span>
                  <span className="block font-medium">
                    {(row as { offers?: { title?: string } | null }).offers?.title ?? "Offre"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("fr-FR")}
                  </span>
                </span>
                <span className="font-display text-primary">{row.discount_label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
