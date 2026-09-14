import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { z } from "zod";
import { fetchMyMerchant } from "@/lib/metzy-pro";
import { inviteTeamMember, listTeam, removeTeamMember } from "@/lib/merchant-team.functions";
import { EmptyState, ErrorState, LoadingState, PermissionState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/espace-pro/equipe")({
  head: () => ({
    meta: [
      { title: "Mon équipe — Espace commerçant METZY" },
      {
        name: "description",
        content:
          "Ajoute tes collaborateurs pour qu'ils puissent scanner les QR codes METZY de tes clients.",
      },
      { property: "og:title", content: "Gestion d'équipe METZY" },
      { property: "og:description", content: "Managers et personnel de ton commerce METZY." },
    ],
  }),
  component: TeamPage,
});

const formSchema = z.object({
  email: z.string().trim().email({ message: "E-mail invalide." }).max(255),
  role: z.enum(["MANAGER", "STAFF"]),
});

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Manager",
  STAFF: "Personnel",
};

function TeamPage() {
  const queryClient = useQueryClient();
  const merchant = useQuery({ queryKey: ["my-merchant"], queryFn: fetchMyMerchant });
  const merchantId = merchant.data?.id;
  const canManage = merchant.data?.role === "OWNER" || merchant.data?.role === "MANAGER";

  const list = useServerFn(listTeam);
  const invite = useServerFn(inviteTeamMember);
  const remove = useServerFn(removeTeamMember);

  const team = useQuery({
    queryKey: ["merchant-team", merchantId],
    queryFn: () => list({ data: { merchantId: merchantId! } }),
    enabled: !!merchantId && !!canManage,
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MANAGER" | "STAFF">("STAFF");

  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; role: "MANAGER" | "STAFF" }) =>
      invite({ data: { merchantId: merchantId!, ...input } }),
    onSuccess: () => {
      toast.success("Membre ajouté à l'équipe.");
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: ["merchant-team", merchantId] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Ajout impossible."),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => remove({ data: { merchantId: merchantId!, memberId } }),
    onSuccess: () => {
      toast.success("Membre retiré.");
      void queryClient.invalidateQueries({ queryKey: ["merchant-team", merchantId] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Suppression impossible."),
  });

  if (merchant.isLoading) return <LoadingState label="Chargement de ton commerce..." />;
  if (merchant.isError) return <ErrorState onRetry={() => merchant.refetch()} />;

  if (!merchant.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="Aucun commerce rattaché"
          description="Inscris ton commerce pour gérer ton équipe."
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

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <PermissionState description="Seuls le propriétaire et les managers peuvent gérer l'équipe." />
      </div>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = formSchema.safeParse({ email, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    inviteMutation.mutate(parsed.data);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="font-display text-2xl">Mon équipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Le personnel peut scanner les QR codes. Les managers peuvent aussi gérer les offres et
        l&apos;équipe.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">E-mail du compte METZY</span>
          <input
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="metzy-input"
            placeholder="collaborateur@exemple.fr"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Rôle</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "MANAGER" | "STAFF")}
            className="metzy-input"
          >
            <option value="STAFF">Personnel (scanner uniquement)</option>
            <option value="MANAGER">Manager (offres + équipe)</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={inviteMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          <UserPlus className="size-4" aria-hidden />
          {inviteMutation.isPending ? "Ajout..." : "Ajouter au commerce"}
        </button>
        <p className="text-xs text-muted-foreground">
          La personne doit déjà avoir créé son compte METZY avec cet e-mail.
        </p>
      </form>

      <section className="mt-8">
        <h2 className="font-display text-lg">Membres</h2>
        {team.isLoading ? (
          <LoadingState label="Chargement de l'équipe..." />
        ) : team.isError ? (
          <ErrorState onRetry={() => team.refetch()} />
        ) : (team.data?.length ?? 0) === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface/60 p-4 text-sm text-muted-foreground">
            Aucun collaborateur pour l&apos;instant.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {team.data!.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm"
              >
                <span>
                  <span className="block font-medium">{member.display_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </span>
                {member.role === "OWNER" ? null : (
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(member.id)}
                    disabled={removeMutation.isPending}
                    aria-label={`Retirer ${member.display_name}`}
                    className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-60"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
