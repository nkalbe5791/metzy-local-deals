import { createFileRoute, Link } from "@tanstack/react-router";

const faq = [
  {
    q: "Comment fonctionne METZY ?",
    a: "Tu t'abonnes, tu découvres les offres des commerces partenaires de Metz, puis tu génères un QR code en boutique. Le commerçant le scanne et ta réduction est appliquée immédiatement.",
  },
  {
    q: "Combien coûte l'abonnement ?",
    a: "L'abonnement est proposé au mois ou à l'année, la formule annuelle étant moins chère. Les tarifs à jour sont affichés sur la page abonnement.",
  },
  {
    q: "Y a-t-il un essai gratuit ?",
    a: "Pas pour l'instant. Tu peux créer ton compte, explorer toutes les offres et les commerces partenaires avant de t'abonner.",
  },
  {
    q: "Combien de fois puis-je utiliser une offre ?",
    a: "Chaque offre indique sa limite : une seule fois, une fois par jour, par semaine, par mois, ou à chaque passage. La limite est vérifiée automatiquement lors du scan.",
  },
  {
    q: "Mon QR code a expiré, que faire ?",
    a: "Le QR code est volontairement valable quelques minutes seulement, pour éviter la fraude. Il suffit d'en générer un nouveau depuis la page de l'offre, en caisse.",
  },
  {
    q: "À quoi servent les points METZY ?",
    a: "Chaque offre utilisée rapporte des points qui font progresser ton niveau. Les niveaux et les paliers sont visibles dans la page récompenses.",
  },
  {
    q: "Comment fonctionne le parrainage ?",
    a: "Tu partages ton lien ou ton code depuis ton profil. La personne parrainée saisit le code à l'inscription et vous êtes tous les deux rattachés à ton parrainage.",
  },
  {
    q: "Je suis commerçant, comment rejoindre METZY ?",
    a: "Crée un compte professionnel, inscris ton commerce, puis notre équipe le valide sous 24 à 48 h ouvrées. Tu peux ensuite créer tes offres et scanner les QR codes de tes clients.",
  },
  {
    q: "Comment résilier ou supprimer mon compte ?",
    a: "L'abonnement est sans engagement et se résilie depuis la page abonnement. La suppression du compte et de tes données personnelles se demande depuis la page « Mon compte ».",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Questions fréquentes — METZY" },
      {
        name: "description",
        content:
          "Abonnement, QR codes, limites d'utilisation, points, parrainage, espace commerçant : toutes les réponses sur METZY.",
      },
      { property: "og:title", content: "FAQ METZY" },
      {
        property: "og:description",
        content: "Les réponses aux questions les plus posées sur METZY.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-3xl">Questions fréquentes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tout ce qu&apos;il faut savoir avant et pendant ton abonnement METZY.
      </p>

      <div className="mt-8 space-y-3">
        {faq.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="cursor-pointer list-none font-display text-base">
              {item.q}
              <span className="float-right text-muted-foreground transition group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
        <p className="font-display text-base text-foreground">Une autre question ?</p>
        <p className="mt-1">
          Écris-nous à contact@metzy.app, ou depuis ton espace connecté via la page d&apos;aide.
        </p>
        <p className="mt-3 flex flex-wrap gap-4">
          <Link to="/cgu" className="text-primary underline">
            CGU
          </Link>
          <Link to="/mentions-legales" className="text-primary underline">
            Mentions légales
          </Link>
          <Link to="/pro/contact" className="text-primary underline">
            Contact commerçants
          </Link>
        </p>
      </div>
    </div>
  );
}
