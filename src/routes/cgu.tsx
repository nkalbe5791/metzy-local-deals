import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions générales d'utilisation — METZY" },
      {
        name: "description",
        content:
          "Règles d'utilisation de METZY : abonnement, utilisation des offres, limites, obligations et résiliation.",
      },
      { property: "og:title", content: "CGU METZY" },
      { property: "og:description", content: "Les conditions générales d'utilisation de METZY." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CguPage,
});

function CguPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-3xl">Conditions générales d&apos;utilisation</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : septembre 2026.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-display text-lg text-foreground">1. Objet</h2>
          <p>
            METZY est un service d&apos;abonnement donnant accès à des avantages proposés par des
            commerces partenaires de Metz et de sa région. L&apos;utilisation de l&apos;application
            implique l&apos;acceptation des présentes conditions.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">2. Compte et abonnement</h2>
          <p>
            L&apos;accès aux offres nécessite un compte personnel et un abonnement actif. Les
            informations fournies doivent être exactes. L&apos;abonnement est mensuel, sans
            engagement, et résiliable à tout moment depuis l&apos;espace abonnement.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">3. Utilisation des offres</h2>
          <p>
            Chaque offre est utilisée en présentant un QR code temporaire, valable quelques minutes
            et validé par le commerçant. Les limites d&apos;utilisation (une seule fois, quotidienne,
            hebdomadaire, mensuelle ou illimitée) sont indiquées sur chaque offre et doivent être
            respectées.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">4. Comportements interdits</h2>
          <p>
            Le partage de compte, la revente d&apos;avantages, la capture ou la réutilisation
            frauduleuse de QR codes entraînent la suspension immédiate du compte, sans remboursement.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">5. Responsabilité</h2>
          <p>
            METZY met en relation clients et commerçants. La qualité des produits et services reste
            de la responsabilité du commerce partenaire. Les offres peuvent évoluer ou être retirées.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">6. Contact</h2>
          <p>Pour toute question : contact@metzy.app</p>
        </section>
      </div>
    </div>
  );
}
