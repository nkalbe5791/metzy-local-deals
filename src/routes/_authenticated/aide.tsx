import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { fetchMyContext } from "@/lib/metzy";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { EmptyState, ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/aide")({
  head: () => ({
    meta: [
      { title: "Aide et support METZY" },
      {
        name: "description",
        content:
          "Une question, un problème avec une offre ou un commerce ? Écris à l'équipe METZY et suis l'avancement de tes demandes.",
      },
      { property: "og:title", content: "Aide METZY" },
      { property: "og:description", content: "Contacte l'équipe METZY et suis tes demandes." },
    ],
  }),
  component: AidePage,
});

const kinds = [
  { id: "question", label: "Question" },
  { id: "probleme_offre", label: "Problème avec une offre" },
  { id: "signalement", label: "Signaler un commerce" },
  { id: "facturation", label: "Abonnement / facturation" },
  { id: "autre", label: "Autre" },
] as const;

const schema = z.object({
  subject: z.string().trim().min(4, "Sujet trop court").max(120),
  message: z.string().trim().min(15, "Décris ta demande en quelques phrases").max(2000),
  kind: z.string().min(1),
});

const statusLabels: Record<string, string> = {
  OPEN: "En attente",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolue",
  CLOSED: "Clôturée",
};

async function fetchMyTickets() {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id,subject,message,kind,status,created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

function AidePage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const tickets = useQuery({ queryKey: ["my-tickets"], queryFn: fetchMyTickets });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = schema.safeParse({
      subject: String(form.get("subject") ?? ""),
      message: String(form.get("message") ?? ""),
      kind: String(form.get("kind") ?? "question"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire incomplet.");
      return;
    }

    setSending(true);
    const { error: insertError } = await supabase.from("support_tickets").insert({
      user_id: me.data?.user.id ?? null,
      email: me.data?.user.email ?? null,
      subject: parsed.data.subject,
      message: parsed.data.message,
      kind: parsed.data.kind,
    });
    setSending(false);

    if (insertError) {
      setError("Envoi impossible pour le moment. Réessaie dans un instant.");
      return;
    }
    formElement.reset();
    toast.success("Demande envoyée. Réponse sous 24 à 48 h ouvrées.");
    await queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Aide et support</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Consulte d&apos;abord la{" "}
        <Link to="/faq" className="text-primary underline">
          FAQ
        </Link>{" "}
        : la réponse y est peut-être déjà. Sinon, écris-nous ci-dessous.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <label className="block text-sm">
          Type de demande
          <select
            name="kind"
            className="mt-1 w-full rounded-2xl border border-input bg-surface/60 px-4 py-3 text-sm"
          >
            {kinds.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Sujet
          <input
            name="subject"
            className="mt-1 w-full rounded-2xl border border-input bg-surface/60 px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="Ex. Mon QR code a été refusé"
          />
        </label>
        <label className="block text-sm">
          Message
          <textarea
            name="message"
            rows={5}
            className="mt-1 w-full rounded-2xl border border-input bg-surface/60 px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="Décris la situation, le commerce concerné et la date."
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-12 items-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {sending ? "Envoi..." : "Envoyer ma demande"}
        </button>
      </form>

      <h2 className="mt-10 font-display text-lg">Mes demandes</h2>
      <div className="mt-3 space-y-3">
        {tickets.isLoading ? <LoadingState label="Chargement..." /> : null}
        {tickets.isError ? <ErrorState onRetry={() => tickets.refetch()} /> : null}
        {tickets.data?.length === 0 ? (
          <EmptyState
            title="Aucune demande"
            description="Tes échanges avec l'équipe METZY apparaîtront ici."
          />
        ) : null}
        {tickets.data?.map((ticket) => (
          <article key={ticket.id} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{ticket.subject}</p>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {statusLabels[ticket.status] ?? ticket.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
            </p>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{ticket.message}</p>
          </article>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
