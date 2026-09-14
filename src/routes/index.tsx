import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, QrCode, ShieldCheck, Sparkles, Store, User } from "lucide-react";
import { fetchActiveOffers } from "@/lib/metzy";
import { OfferCard } from "@/components/metzy/offer-card";
import { LoadingState, EmptyState, ErrorState } from "@/components/metzy/states";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "METZY — Dis oui à plus de sorties et moins de dépenses" },
      {
        name: "description",
        content:
          "METZY réunit les meilleurs commerces de Metz : avantages exclusifs, points METZY XP et récompenses. 5 €/mois.",
      },
      { property: "og:title", content: "METZY — Plus de sorties, moins de dépenses" },
      {
        property: "og:description",
        content:
          "Découvre les commerces autour de toi, profite d'avantages exclusifs et gagne des points.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const offers = useQuery({ queryKey: ["offers", "landing"], queryFn: () => fetchActiveOffers() });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-20">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-xl font-bold tracking-tight">
          MET<span className="text-primary">ZY</span>
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Particuliers
          </Link>
          <Link
            to="/pro/auth"
            className="rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Pros
          </Link>
        </div>
      </header>

      <section className="pt-6 pb-14">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-accent" aria-hidden /> Metz, et bientôt ailleurs
        </p>
        <h1 className="max-w-2xl font-display text-4xl leading-[1.05] sm:text-6xl">
          Avec METZY, dis oui à{" "}
          <span className="text-gradient-metzy">plus de sorties et moins de dépenses.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          Les meilleurs commerces autour de toi, des avantages exclusifs validés directement en
          caisse, et des points à chaque passage.
        </p>
      </section>

      <section aria-labelledby="espaces" className="pb-14">
        <h2 id="espaces" className="font-display text-2xl">
          Choisis ton espace
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="flex flex-col rounded-3xl border border-border bg-card p-6">
            <User className="size-7 text-primary" aria-hidden />
            <h3 className="mt-4 font-display text-xl">Espace particuliers</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Découvre les commerces autour de toi, profite d'avantages exclusifs en caisse et gagne
              des points METZY XP à chaque passage.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="rounded-full bg-gradient-metzy px-5 py-2.5 font-display font-semibold text-primary-foreground shadow-glow"
              >
                Créer mon compte
              </Link>
              <Link
                to="/explorer"
                className="rounded-full border border-input px-5 py-2.5 font-medium hover:bg-secondary"
              >
                Voir les offres
              </Link>
            </div>
          </article>

          <article className="flex flex-col rounded-3xl border border-border bg-card p-6">
            <Briefcase className="size-7 text-accent" aria-hidden />
            <h3 className="mt-4 font-display text-xl">Espace professionnels</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Inscris ton commerce, publie tes offres, valide les réductions par QR et suis tes
              statistiques depuis ton tableau de bord.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/pro/auth"
                className="rounded-full bg-accent px-5 py-2.5 font-display font-semibold text-accent-foreground"
              >
                Espace commerçant
              </Link>
              <Link
                to="/pro"
                className="rounded-full border border-input px-5 py-2.5 font-medium hover:bg-secondary"
              >
                En savoir plus
              </Link>
            </div>
          </article>
        </div>
      </section>


      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Store, title: "Commerces locaux", text: "Restaurants, sorties, sport, beauté…" },
          { icon: QrCode, title: "QR sécurisé", text: "Une réduction validée par le commerçant." },
          { icon: ShieldCheck, title: "Zéro triche", text: "Chaque validation est contrôlée côté serveur." },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-3xl border border-border bg-card p-5">
            <Icon className="size-6 text-primary" aria-hidden />
            <h2 className="mt-3 font-display text-lg">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <section className="pt-14">
        <h2 className="font-display text-2xl">🔥 Offres du moment</h2>
        <div className="mt-5">
          {offers.isPending ? (
            <LoadingState label="Chargement des offres..." />
          ) : offers.isError ? (
            <ErrorState onRetry={() => offers.refetch()} />
          ) : offers.data.length === 0 ? (
            <EmptyState
              title="Aucune offre publiée pour l'instant"
              description="Les premiers commerces partenaires arrivent très bientôt."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.data.slice(0, 6).map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
        <Link to="/faq" className="hover:text-foreground">
          FAQ
        </Link>
        <Link to="/cgu" className="hover:text-foreground">
          CGU
        </Link>
        <Link to="/confidentialite" className="hover:text-foreground">
          Politique de confidentialité
        </Link>
        <Link to="/mentions-legales" className="hover:text-foreground">
          Mentions légales
        </Link>
        <Link to="/pro" className="hover:text-foreground">
          Espace commerçant
        </Link>
      </footer>

    </main>
  );
}
