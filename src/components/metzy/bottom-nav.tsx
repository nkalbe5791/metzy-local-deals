import { Link } from "@tanstack/react-router";
import { Home, Search, Map, Gift, User } from "lucide-react";

const items = [
  { to: "/accueil", label: "Accueil", icon: Home },
  { to: "/explorer", label: "Explorer", icon: Search },
  { to: "/carte", label: "Carte", icon: Map },
  { to: "/recompenses", label: "Récompenses", icon: Gift },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-glass"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 pt-2">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex min-h-12 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary", "aria-current": "page" }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
