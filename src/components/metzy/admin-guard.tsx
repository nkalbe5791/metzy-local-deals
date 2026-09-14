import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchIsAdmin } from "@/lib/metzy-admin";
import { LoadingState, ErrorState, PermissionState } from "@/components/metzy/states";

const tabs = [
  { to: "/admin", label: "Vue d'ensemble" },
  { to: "/admin/commerces", label: "Commerces" },
  { to: "/admin/offres", label: "Offres" },
  { to: "/admin/fraude", label: "Fraude" },
  { to: "/admin/cadeaux", label: "Cadeaux" },
  { to: "/admin/parametres", label: "Paramètres" },
  { to: "/admin/support", label: "Support" },
  { to: "/admin/acces", label: "Accès & rôles" },

] as const;

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const isAdmin = useQuery({ queryKey: ["is-admin"], queryFn: fetchIsAdmin });

  if (isAdmin.isLoading) return <LoadingState label="Vérification des droits..." />;
  if (isAdmin.isError) return <ErrorState onRetry={() => isAdmin.refetch()} />;
  if (!isAdmin.data)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <PermissionState description="Cette section est réservée à l'équipe METZY." />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <h1 className="font-display text-2xl">{title}</h1>
      <nav aria-label="Navigation back-office" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="whitespace-nowrap rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "border-primary text-primary", "aria-current": "page" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
