import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, UserPlus, Users, X } from "lucide-react";
import { fetchMyContext } from "@/lib/metzy";
import {
  fetchFriendRequests,
  fetchMyFriends,
  friendError,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
} from "@/lib/metzy-friends";
import { BottomNav } from "@/components/metzy/bottom-nav";
import { ErrorState, LoadingState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/amis")({
  head: () => ({
    meta: [
      { title: "Mes amis METZY — classement fidélité" },
      {
        name: "description",
        content:
          "Ajoute tes amis METZY avec leur pseudo, accepte leurs demandes et compare vos points de fidélité.",
      },
      { property: "og:title", content: "Mes amis METZY" },
      { property: "og:description", content: "Classement des points entre amis sur METZY." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AmisPage,
});

function AmisPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMyContext });
  const friends = useQuery({ queryKey: ["my-friends"], queryFn: fetchMyFriends });
  const requests = useQuery({ queryKey: ["friend-requests"], queryFn: fetchFriendRequests });
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-friends"] }),
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] }),
    ]);
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    try {
      const res = await sendFriendRequest(username.trim());
      if (!res.ok) {
        toast.error(friendError(res.code));
        return;
      }
      toast.success(res.status === "ACCEPTED" ? "Vous êtes amis !" : "Demande envoyée.");
      setUsername("");
      await refresh();
    } catch {
      toast.error("Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  async function onRespond(requestId: string, accept: boolean) {
    try {
      const res = await respondFriendRequest(requestId, accept);
      if (!res.ok) {
        toast.error(friendError(res.code));
        return;
      }
      toast.success(accept ? "Ami ajouté." : "Demande refusée.");
      await refresh();
    } catch {
      toast.error("Action impossible pour le moment.");
    }
  }

  async function onRemove(friendId: string) {
    try {
      await removeFriend(friendId);
      toast.success("Ami retiré.");
      await refresh();
    } catch {
      toast.error("Action impossible pour le moment.");
    }
  }

  const myXp = me.data?.xp ?? 0;
  const myUsername = (me.data?.profile as { username?: string } | null)?.username ?? "moi";

  const ranking = [
    { id: "me", username: myUsername, xp: myXp, isMe: true },
    ...(friends.data ?? []).map((f) => ({
      id: f.friend_id,
      username: f.username,
      xp: f.xp,
      isMe: false,
    })),
  ].sort((a, b) => b.xp - a.xp);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <h1 className="font-display text-2xl">Mes amis</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ton pseudo : <span className="font-mono text-foreground">@{myUsername}</span>
      </p>

      <form onSubmit={onAdd} className="mt-5 space-y-2">
        <label htmlFor="friend-username" className="block text-sm font-medium">
          Ajouter un ami par pseudo
        </label>
        <div className="flex gap-2">
          <input
            id="friend-username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            maxLength={30}
            placeholder="pseudo"
            className="min-h-12 flex-1 rounded-2xl border border-input bg-surface px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <UserPlus className="size-4" aria-hidden />
            Ajouter
          </button>
        </div>
      </form>

      <h2 className="mt-8 font-display text-lg">Demandes reçues</h2>
      {requests.isLoading ? (
        <LoadingState />
      ) : requests.isError ? (
        <ErrorState onRetry={() => requests.refetch()} />
      ) : (requests.data ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucune demande en attente.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {requests.data!.map((r) => (
            <li
              key={r.request_id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-display text-base">@{r.username}</p>
                <p className="text-xs text-muted-foreground">{r.display_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onRespond(r.request_id, true)}
                  className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  Accepter
                </button>
                <button
                  type="button"
                  onClick={() => void onRespond(r.request_id, false)}
                  className="min-h-10 rounded-full border border-border px-4 text-sm"
                >
                  Refuser
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-display text-lg">Classement entre amis</h2>
      {friends.isLoading ? (
        <LoadingState />
      ) : friends.isError ? (
        <ErrorState onRetry={() => friends.refetch()} />
      ) : (
        <ol className="mt-3 space-y-2">
          {ranking.map((row, index) => (
            <li
              key={row.id}
              className={`flex items-center justify-between gap-3 rounded-3xl border p-4 ${
                row.isMe ? "border-primary/50 bg-primary/10" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-display text-base text-muted-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="inline-flex items-center gap-2 font-display text-base">
                    {index === 0 ? <Crown className="size-4 text-accent" aria-hidden /> : null}@
                    {row.username}
                    {row.isMe ? " (toi)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.xp} points cumulés</p>
                </div>
              </div>
              {row.isMe ? null : (
                <button
                  type="button"
                  onClick={() => void onRemove(row.id)}
                  aria-label={`Retirer @${row.username} de mes amis`}
                  className="flex size-9 items-center justify-center rounded-full border border-border"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {(friends.data ?? []).length === 0 ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" aria-hidden />
          Ajoute tes amis pour comparer vos points METZY.
        </p>
      ) : null}

      <BottomNav />
    </div>
  );
}
