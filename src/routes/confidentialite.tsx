import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — METZY" },
      {
        name: "description",
        content:
          "Quelles données METZY collecte, pourquoi, combien de temps, et comment exercer tes droits RGPD.",
      },
      { property: "og:title", content: "Confidentialité METZY" },
      { property: "og:description", content: "Traitement des données personnelles chez METZY." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-3xl">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : septembre 2026.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-display text-lg text-foreground">Données collectées</h2>
          <p>
            Compte (email, pseudo), abonnement, utilisations d&apos;offres, points gagnés et
            journaux techniques de sécurité. La position géographique est facultative : elle sert
            uniquement à trier les offres par proximité et n&apos;est jamais stockée.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Finalités</h2>
          <p>
            Fournir le service, gérer l&apos;abonnement, prévenir la fraude sur les QR codes et
            mesurer l&apos;usage des offres pour les commerçants (données agrégées uniquement).
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Partage</h2>
          <p>
            Le commerçant voit uniquement le prénom affiché et l&apos;offre validée. Aucune donnée
            n&apos;est vendue à des tiers.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Conservation</h2>
          <p>
            Données de compte conservées pendant la durée de l&apos;abonnement puis 12 mois. Journaux
            de sécurité : 12 mois.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Tes droits</h2>
          <p>
            Accès, rectification, suppression, portabilité et opposition sur simple demande à
            privacy@metzy.app. Ton compte peut être supprimé depuis ton profil.
          </p>
        </section>
      </div>
    </div>
  );
}
