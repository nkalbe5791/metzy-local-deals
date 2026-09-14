import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/pro/")({
  head: () => ({
    meta: [
      { title: "Espace pro METZY — attirez des clients à Metz" },
      {
        name: "description",
        content:
          "Rejoignez METZY comme commerce partenaire : nouveaux clients locaux, validation par QR code et statistiques d'utilisation.",
      },
      { property: "og:title", content: "Devenir commerce partenaire METZY" },
      {
        property: "og:description",
        content: "Attirez des clients messins avec une offre METZY et validez-la en un scan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProPage,
});

const benefits = [
  {
    icon: Users,
    title: "Des clients locaux",
    text: "Des abonnés messins motivés qui cherchent une raison de pousser votre porte.",
  },
  {
    icon: QrCode,
    title: "Validation en un scan",
    text: "Un QR code temporaire, scanné par votre équipe : impossible à réutiliser ou à partager.",
  },
  {
    icon: TrendingUp,
    title: "Des chiffres clairs",
    text: "Suivez le nombre d'utilisations, les offres qui marchent et vos meilleurs créneaux.",
  },
];

function ProPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-tight">
        Faites venir les Messins <span className="text-primary">chez vous</span>.
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        METZY est le pass local de Metz. Vous proposez un avantage, nous amenons les clients, vous
        validez en un scan. Aucune commission sur vos ventes.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {benefits.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-3xl border border-border bg-card p-5">
            <Icon className="size-6 text-primary" aria-hidden />
            <h2 className="mt-3 font-display text-lg">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Comment ça marche</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>1. Vous créez votre compte commerçant et décrivez votre commerce.</li>
          <li>2. Notre équipe valide votre inscription (24 à 48 h).</li>
          <li>3. Vous publiez une ou plusieurs offres avec leurs conditions et limites.</li>
          <li>4. Vos clients présentent un QR code, vous le scannez, c&apos;est validé.</li>
        </ol>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        L&apos;espace pro est totalement séparé de l&apos;application client : vous créez un compte
        commerçant dédié, puis vous décrivez votre commerce.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to="/pro/auth"
          className="flex min-h-12 items-center rounded-2xl bg-primary px-6 font-semibold text-primary-foreground"
        >
          Inscrire mon commerce
        </Link>
        <Link
          to="/pro/auth"

          className="flex min-h-12 items-center rounded-2xl border border-border px-6 font-semibold"
        >
          Accéder à mon espace pro
        </Link>
        <Link
          to="/pro/contact"
          className="flex min-h-12 items-center rounded-2xl border border-border px-6 font-semibold"
        >
          Parler à l&apos;équipe
        </Link>
      </div>
    </div>
  );
}
