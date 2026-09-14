import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const CONTACT_EMAIL = "pro@metzy.app";

export const Route = createFileRoute("/pro/contact")({
  head: () => ({
    meta: [
      { title: "Contacter l'équipe METZY — commerçants" },
      {
        name: "description",
        content:
          "Une question avant d'inscrire votre commerce sur METZY ? Écrivez à l'équipe, réponse sous 24 à 48 h ouvrées.",
      },
      { property: "og:title", content: "Contacter l'équipe METZY" },
      {
        property: "og:description",
        content: "Support commerçants METZY : inscription, offres, scanner et abonnement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProContactPage,
});

function ProContactPage() {
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      toast.success("Adresse copiée.");
    } catch {
      toast.error("Copie impossible, note l'adresse : " + CONTACT_EMAIL);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link to="/pro" className="text-sm text-muted-foreground">
        ← Espace pro
      </Link>
      <h1 className="mt-4 font-display text-3xl leading-tight">Parler à l&apos;équipe METZY</h1>
      <p className="mt-3 text-muted-foreground">
        Une question sur l&apos;inscription de votre commerce, vos offres ou le scanner ? Écrivez-nous,
        nous répondons sous 24 à 48 h ouvrées.
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Mail className="size-5 text-primary" aria-hidden />
          <span className="font-semibold">{CONTACT_EMAIL}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Commerce partenaire METZY")}`}
            className="flex min-h-12 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-foreground"
          >
            Écrire un email
          </a>
          <button
            onClick={copyEmail}
            className="flex min-h-12 items-center gap-2 rounded-2xl border border-border px-5 font-semibold"
          >
            <Copy className="size-4" aria-hidden />
            Copier l&apos;adresse
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <MessageCircle className="size-5 text-primary" aria-hidden />
          <h2 className="font-display text-lg">Pour aller plus vite</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Indiquez le nom, l&apos;adresse et la catégorie de votre commerce.</li>
          <li>• Précisez l&apos;avantage que vous souhaitez proposer aux abonnés.</li>
          <li>• Vous pouvez aussi créer votre fiche vous-même, nous la validons ensuite.</li>
        </ul>
        <Link
          to="/pro/auth"
          className="mt-4 inline-flex min-h-12 items-center rounded-2xl border border-border px-5 font-semibold"
        >
          Inscrire mon commerce
        </Link>
      </div>
    </div>
  );
}
