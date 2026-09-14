import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchMyContext } from "@/lib/metzy";
import {
  deleteNotification,
  fetchMyNotifications,
  markAllRead,
  markRead,
  setNewOfferNotifications,
} from "@/lib/metzy-notifications";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { EmptyState, ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Mes notifications METZY" },
      {
        name: "description",
        content:
          "Retrouve les nouvelles offres des commerces partenaires proches de toi et gère tes préférences de notifications METZY.",
      },
      { property: "og:title", content: "Mes notifications METZY" },
      {
        property: "og:description",
        content: "Nouvelles offres à proximité et préférences de notification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const list = useQuery({ queryKey: ["notifications"], queryFn: fetchMyNotifications });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  }

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => setNewOfferNotifications(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Préférence enregistrée.");
    },
    onError: () => toast.error("Modification impossible."),
  });

  const readAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: refresh,
    onError: () => toast.error("Action impossible."),
  });

  const readOne = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: refresh,
    onError: () => toast.error("Suppression impossible."),
  });

  if (list.isLoading || me.isLoading) return <LoadingState label="Chargement des notifications..." />;
  if (list.isError) return <ErrorState onRetry={() => list.refetch()} />;

  const enabled = me.data?.profile?.notify_new_offers !== false;
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Les nouvelles offres des commerces partenaires de ta ville.
      </p>

      <div className="mt-5 rounded-3xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-base">Nouvelles offres à proximité</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {enabled ? "Tu es prévenu dès qu'une offre sort près de toi." : "Notifications désactivées."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle.mutate(!enabled)}
            disabled={toggle.isPending}
            aria-pressed={enabled}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium disabled:opacity-50"
          >
            {enabled ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}
            {enabled ? "Activées" : "Activer"}
          </button>
        </div>
      </div>

      {unread > 0 ? (
        <button
          type="button"
          onClick={() => readAll.mutate()}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm"
        >
          <Check className="size-4" aria-hidden /> Tout marquer comme lu ({unread})
        </button>
      ) : null}

      <ul className="mt-4 space-y-3">
        {items.length === 0 ? (
          <li>
            <EmptyState
              title="Aucune notification"
              description="Dès qu'un commerce partenaire publie une offre près de toi, elle arrive ici."
            />
          </li>
        ) : (
          items.map((n) => (
            <li
              key={n.id}
              className={`rounded-3xl border p-4 ${n.read_at ? "border-border bg-surface/40" : "border-primary/40 bg-card"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("fr-FR")}
                  </p>
                  {n.offer_id ? (
                    <Link
                      to="/offres/$offerId"
                      params={{ offerId: n.offer_id }}
                      onClick={() => {
                        if (!n.read_at) readOne.mutate(n.id);
                      }}
                      className="mt-2 inline-block text-sm text-primary underline"
                    >
                      Voir l&apos;offre
                    </Link>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {!n.read_at ? (
                    <button
                      type="button"
                      onClick={() => readOne.mutate(n.id)}
                      aria-label="Marquer comme lu"
                      className="min-h-11 min-w-11 rounded-2xl border border-border"
                    >
                      <Check className="mx-auto size-4" aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove.mutate(n.id)}
                    aria-label="Supprimer la notification"
                    className="min-h-11 min-w-11 rounded-2xl border border-border"
                  >
                    <Trash2 className="mx-auto size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <BottomNav />
    </div>
  );
}
