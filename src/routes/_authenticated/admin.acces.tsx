import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/metzy/admin-guard";
import { ErrorState, LoadingState, EmptyState } from "@/components/metzy/states";
import {
  addAllowlistEntry,
  fetchAllowlist,
  fetchRoleHolders,
  removeAllowlistEntry,
  revokeRole,
  type AppRole,
} from "@/lib/metzy-admin";

export const Route = createFileRoute("/_authenticated/admin/acces")({
  head: () => ({
    meta: [
      { title: "Accès & rôles — Back-office METZY" },
      {
        name: "description",
        content:
          "Gère les comptes de l'équipe METZY : administrateurs, commerçants et rôles attribués.",
      },
      { property: "og:title", content: "Accès & rôles METZY" },
      {
        property: "og:description",
        content: "Attribue et retire les rôles administrateur et commerçant.",
      },
    ],
  }),
  component: AdminAccess,
});

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  merchant: "Commerçant",
  client: "Membre",
};

function AdminAccess() {
  const queryClient = useQueryClient();
  const allowlist = useQuery({ queryKey: ["admin-allowlist"], queryFn: fetchAllowlist });
  const holders = useQuery({ queryKey: ["admin-role-holders"], queryFn: fetchRoleHolders });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("admin");
  const [note, setNote] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-allowlist"] });
    queryClient.invalidateQueries({ queryKey: ["admin-role-holders"] });
  };

  const add = useMutation({
    mutationFn: () => addAllowlistEntry(email, role, note.trim() || null),
    onSuccess: () => {
      toast.success("Accès enregistré. Le rôle sera attribué dès la vérification de l'e-mail.");
      setEmail("");
      setNote("");
      invalidate();
    },
    onError: () => toast.error("Impossible d'ajouter cet accès (e-mail déjà présent ?)"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeAllowlistEntry(id),
    onSuccess: () => {
      toast.success("Accès retiré de la liste");
      invalidate();
    },
    onError: () => toast.error("Suppression impossible"),
  });

  const revoke = useMutation({
    mutationFn: (vars: { userId: string; role: AppRole }) => revokeRole(vars.userId, vars.role),
    onSuccess: () => {
      toast.success("Rôle retiré");
      invalidate();
    },
    onError: (error: Error) =>
      toast.error(
        error.message === "SELF_REVOKE"
          ? "Tu ne peux pas retirer ton propre rôle administrateur"
          : "Retrait impossible",
      ),
  });

  return (
    <AdminShell title="Accès & rôles">
      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-lg">Autoriser un compte</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoute l'adresse e-mail de la personne. Elle crée son compte normalement (elle choisit son
          propre mot de passe) et reçoit automatiquement le rôle dès que son e-mail est vérifié.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!email.includes("@")) {
              toast.error("Adresse e-mail invalide");
              return;
            }
            add.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom@metzy.app"
              aria-label="Adresse e-mail"
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as AppRole)}
              aria-label="Rôle attribué"
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
            >
              <option value="admin">Administrateur</option>
              <option value="merchant">Commerçant</option>
            </select>
          </div>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note (ex : responsable Metz centre)"
            aria-label="Note"
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={add.isPending}
            className="justify-self-start rounded-full bg-gradient-metzy px-5 py-2.5 font-display font-semibold text-primary-foreground disabled:opacity-60"
          >
            {add.isPending ? "Ajout..." : "Autoriser"}
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg">Liste d'accès</h2>
        <div className="mt-3 space-y-2">
          {allowlist.isPending ? (
            <LoadingState />
          ) : allowlist.isError ? (
            <ErrorState onRetry={() => allowlist.refetch()} />
          ) : allowlist.data.length === 0 ? (
            <EmptyState
              title="Aucun accès configuré"
              description="Ajoute une adresse e-mail pour donner un rôle."
            />
          ) : (
            allowlist.data.map((entry) => (
              <article
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[entry.role]}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(entry.id)}
                  aria-label={`Retirer ${entry.email}`}
                  className="rounded-full border border-input p-2 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg">Rôles attribués</h2>
        <div className="mt-3 space-y-2">
          {holders.isPending ? (
            <LoadingState />
          ) : holders.isError ? (
            <ErrorState onRetry={() => holders.refetch()} />
          ) : holders.data.length === 0 ? (
            <EmptyState title="Aucun rôle privilégié" description="Personne n'a encore de rôle." />
          ) : (
            holders.data.map((holder) => (
              <article
                key={holder.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {holder.profile
                      ? `${holder.profile.first_name} ${holder.profile.last_name}`.trim() ||
                        holder.profile.display_name
                      : "Compte"}
                  </p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[holder.role]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke.mutate({ userId: holder.user_id, role: holder.role })}
                  className="rounded-full border border-input px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Retirer
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </AdminShell>
  );
}
