import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — METZY" },
      {
        name: "description",
        content:
          "Éditeur, hébergeur, propriété intellectuelle et contact du service METZY, la carte d'avantages des commerces de Metz.",
      },
      { property: "og:title", content: "Mentions légales METZY" },
      { property: "og:description", content: "Informations légales sur l'éditeur du service METZY." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentionsPage,
});

function MentionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground">
        ← Retour
      </Link>
      <h1 className="mt-4 font-display text-3xl">Mentions légales</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : septembre 2026.</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-display text-lg text-foreground">Éditeur du service</h2>
          <p>
            METZY — service d&apos;avantages auprès des commerces de Metz et de sa région.
            <br />
            Contact : contact@metzy.app — Espace commerçants : pro@metzy.app
          </p>
          <p className="mt-2">
            Les informations d&apos;immatriculation (raison sociale, forme juridique, capital, SIRET,
            numéro de TVA intracommunautaire, siège social et responsable de publication) sont à
            compléter avant la mise en ligne publique du service.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Hébergement</h2>
          <p>
            L&apos;application et sa base de données sont hébergées chez des prestataires situés dans
            l&apos;Union européenne. Les demandes relatives à l&apos;hébergement peuvent être
            adressées à contact@metzy.app.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Propriété intellectuelle</h2>
          <p>
            La marque METZY, le nom de domaine, l&apos;interface, les textes et les visuels sont
            protégés. Toute reproduction, extraction automatisée ou réutilisation sans autorisation
            écrite est interdite. Les logos et photos des commerces partenaires restent la propriété
            de leurs titulaires.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Données personnelles</h2>
          <p>
            Le traitement des données est décrit dans la{" "}
            <Link to="/confidentialite" className="text-primary underline">
              politique de confidentialité
            </Link>
            . Chaque membre peut consulter, corriger ou supprimer ses informations depuis son espace
            compte.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Médiation et litiges</h2>
          <p>
            En cas de désaccord, une réclamation peut être adressée à contact@metzy.app. À défaut de
            solution amiable, les tribunaux français sont compétents, le droit applicable étant le
            droit français.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-foreground">Documents liés</h2>
          <p className="flex flex-wrap gap-4">
            <Link to="/cgu" className="text-primary underline">
              Conditions générales
            </Link>
            <Link to="/faq" className="text-primary underline">
              Questions fréquentes
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
