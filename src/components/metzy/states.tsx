import type { ReactNode } from "react";
import { Loader2, WifiOff, Inbox, ShieldAlert } from "lucide-react";

export function LoadingState({ label = "Chargement..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-surface/60 px-6 py-14 text-center">
      <Inbox className="size-7 text-muted-foreground" aria-hidden />
      <h3 className="font-display text-lg">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Une erreur est survenue",
  description = "Vérifie ta connexion puis réessaie.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-destructive/40 bg-destructive/10 px-6 py-12 text-center"
    >
      <WifiOff className="size-7 text-destructive" aria-hidden />
      <h3 className="font-display text-lg">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

export function PermissionState({ description }: { description: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-3xl border border-warning/40 bg-warning/10 px-6 py-12 text-center"
    >
      <ShieldAlert className="size-7 text-warning" aria-hidden />
      <h3 className="font-display text-lg">Accès non autorisé</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
