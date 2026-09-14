import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkSignupAvailability } from "@/lib/metzy-friends";
import { lovable } from "@/integrations/lovable/index";
import { fetchMyMerchant } from "@/lib/metzy-pro";
import { GoogleMark } from "@/components/metzy/google-mark";


export const Route = createFileRoute("/pro/auth")({
  head: () => ({
    meta: [
      { title: "Espace pro METZY — inscription & connexion commerçant" },
      {
        name: "description",
        content:
          "Créez votre compte commerçant METZY ou connectez-vous pour gérer vos offres, votre équipe et vos validations.",
      },
      { property: "og:title", content: "Espace pro METZY" },
      {
        property: "og:description",
        content: "Compte commerçant METZY : offres, scanner QR et statistiques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProAuthPage,
});

const proSignupSchema = z.object({
  firstName: z.string().trim().min(2, "Prénom trop court").max(60),
  lastName: z.string().trim().min(2, "Nom trop court").max(60),
  email: z.string().trim().email("Adresse email invalide").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Numéro de téléphone invalide")
    .max(20)
    .regex(/^[0-9 +().-]+$/, "Numéro de téléphone invalide"),
  password: z.string().min(8, "8 caractères minimum").max(72),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les CGU" }) }),
});

const loginSchema = z.object({
  email: z.string().trim().email("Adresse email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis"),
});

const inputClass =
  "mt-1 min-h-12 w-full rounded-2xl border border-input bg-surface px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ProAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "signup") {
      const parsed = proSignupSchema.safeParse({
        firstName,
        lastName,
        email,
        phone,
        password,
        acceptTerms,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
        return;
      }
      setBusy(true);
      // Un seul compte METZY par numéro de téléphone.
      try {
        const availability = await checkSignupAvailability("", parsed.data.phone);
        if (!availability.phone_available) {
          setBusy(false);
          setError("Un compte METZY existe déjà avec ce numéro de téléphone.");
          return;
        }
      } catch {
        setBusy(false);
        setError("Vérification impossible pour le moment. Réessaie.");
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirmation`,
          data: {
            account_type: "pro",
            display_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
            first_name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            phone: parsed.data.phone,
          },
        },
      });
      setBusy(false);
      if (signUpError) {
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? "Un compte existe déjà avec cet email. Connectez-vous."
            : signUpError.message,
        );
        return;
      }
      if (!data.session) {
        setPendingEmail(parsed.data.email);
        toast.success("Compte créé ! Confirmez votre email pour continuer.");
        return;
      }
      toast.success("Compte pro créé. Décrivez maintenant votre commerce.");
      navigate({ to: "/espace-pro/inscription" });
      return;
    }

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("not confirmed")
          ? "Votre adresse email n'est pas encore confirmée."
          : "Email ou mot de passe incorrect.",
      );
      return;
    }
    navigate({ to: "/espace-pro" });
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/pro/auth`,
      });
      if (result.redirected) return;
      if (result.error) {
        setBusy(false);
        setError("La connexion Google a échoué. Réessayez.");
        return;
      }
      const merchant = await fetchMyMerchant().catch(() => null);
      navigate({ to: merchant ? "/espace-pro" : "/espace-pro/inscription" });
    } catch {
      setBusy(false);
      setError("La connexion Google a échoué. Réessayez.");
    }
  }



  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link to="/pro" className="mb-6 text-sm text-muted-foreground">
        ← Espace pro
      </Link>
      <div className="flex items-center gap-2 text-primary">
        <Store className="size-5" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-widest">Compte commerçant</span>
      </div>
      <h1 className="mt-2 font-display text-3xl">
        {mode === "signup" ? "Créer mon compte pro" : "Connexion pro"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Un espace réservé aux commerces : offres, équipe, scanner et statistiques."
          : "Accédez au tableau de bord de votre commerce."}
      </p>

      {pendingEmail ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Confirmez votre adresse email</p>
          <p className="mt-1 text-muted-foreground">
            Un lien a été envoyé à {pendingEmail}. Cliquez dessus, puis revenez vous connecter ici.
          </p>
          <button
            onClick={() => {
              setPendingEmail(null);
              setMode("login");
              setPassword("");
            }}
            className="mt-3 min-h-11 w-full rounded-2xl border border-input font-medium"
          >
            J&apos;ai confirmé — me connecter
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {mode === "signup" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pro-first" className="text-sm font-medium">
                Prénom
              </label>
              <input
                id="pro-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                maxLength={60}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="pro-last" className="text-sm font-medium">
                Nom
              </label>
              <input
                id="pro-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                maxLength={60}
                className={inputClass}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="pro-email" className="text-sm font-medium">
            Email professionnel
          </label>
          <input
            id="pro-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={255}
            className={inputClass}
          />
        </div>

        {mode === "signup" ? (
          <div>
            <label htmlFor="pro-phone" className="text-sm font-medium">
              Téléphone
            </label>
            <input
              id="pro-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              maxLength={20}
              className={inputClass}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="pro-password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="pro-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={inputClass}
          />
        </div>

        {mode === "signup" ? (
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 size-4 accent-[oklch(0.7_0.196_34)]"
            />
            <span>
              J&apos;accepte les{" "}
              <Link to="/cgu" className="text-primary underline">
                CGU
              </Link>{" "}
              et la{" "}
              <Link to="/confidentialite" className="text-primary underline">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-destructive/15 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-2xl bg-gradient-metzy font-display font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy
            ? "Un instant..."
            : mode === "signup"
              ? "Créer mon compte pro"
              : "Accéder à mon espace pro"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-input font-medium hover:bg-secondary disabled:opacity-60"
      >
        <GoogleMark />
        {mode === "signup" ? "Créer mon compte pro avec Google" : "Continuer avec Google"}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        Avec Google, il restera à compléter la fiche de votre commerce (nom, adresse, téléphone).
      </p>



      <button
        onClick={() => {
          setMode(mode === "signup" ? "login" : "signup");
          setError(null);
        }}
        className="mt-6 text-sm text-muted-foreground underline"
      >
        {mode === "signup"
          ? "J'ai déjà un compte pro — me connecter"
          : "Je n'ai pas encore de compte pro — m'inscrire"}
      </button>

      <p className="mt-6 text-xs text-muted-foreground">
        Vous cherchez le pass client&nbsp;?{" "}
        <Link to="/auth" className="text-primary underline">
          Créer un compte particulier
        </Link>
        .
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Une question&nbsp;?{" "}
        <Link to="/pro/contact" className="text-primary underline">
          Parler à l&apos;équipe
        </Link>
        .
      </p>
    </main>
  );
}
