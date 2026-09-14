import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { applyPendingReferral, rememberReferralCode } from "@/lib/metzy-referral";
import { consumeNext, resolveHomePath } from "@/lib/metzy-redirect";
import { checkSignupAvailability } from "@/lib/metzy-friends";
import { GoogleMark } from "@/components/metzy/google-mark";


export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" ? { ref: search["ref"] } : {},
  head: () => ({
    meta: [
      { title: "Rejoindre METZY — Inscription & connexion" },
      {
        name: "description",
        content: "Crée ton compte METZY en 30 secondes et profite des avantages locaux à Metz.",
      },
      { property: "og:title", content: "Rejoindre METZY" },
      { property: "og:description", content: "Inscription et connexion à METZY." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  firstName: z.string().trim().min(2, "Ton prénom est trop court").max(60),
  lastName: z.string().trim().min(2, "Ton nom est trop court").max(60),
  username: z
    .string()
    .trim()
    .min(3, "Ton pseudo doit faire 3 caractères minimum")
    .max(30)
    .regex(/^[a-z0-9_.]+$/, "Pseudo : lettres minuscules, chiffres, _ ou . uniquement"),
  email: z.string().trim().email("Adresse email invalide").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Numéro de téléphone invalide")
    .max(20)
    .regex(/^[0-9 +().-]+$/, "Numéro de téléphone invalide"),
  addressLine1: z.string().trim().min(5, "Adresse trop courte").max(120),
  postalCode: z
    .string()
    .trim()
    .regex(/^[0-9]{5}$/, "Code postal invalide (5 chiffres)"),
  cityName: z.string().trim().min(2, "Ville invalide").max(80),
  password: z.string().min(8, "8 caractères minimum").max(72),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Tu dois accepter les CGU" }) }),
});

const inputClass =
  "mt-1 min-h-12 w-full rounded-2xl border border-input bg-surface px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

const loginSchema = z.object({
  email: z.string().trim().email("Adresse email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const [referralCode, setReferralCode] = useState("");


  useEffect(() => {
    if (ref) setReferralCode(ref.trim().toUpperCase());
    rememberReferralCode(ref);
  }, [ref]);

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "signup") {
      const parsed = signupSchema.safeParse({
        firstName,
        lastName,
        username,
        email,
        phone,
        addressLine1,
        postalCode,
        cityName,
        password,
        acceptTerms,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
        return;
      }
      if (referralCode.trim()) rememberReferralCode(referralCode);
      setBusy(true);

      // Un seul compte par pseudo et par numéro de téléphone.
      try {
        const availability = await checkSignupAvailability(parsed.data.username, parsed.data.phone);
        if (!availability.username_valid) {
          setBusy(false);
          setError("Pseudo invalide (3 caractères minimum).");
          return;
        }
        if (!availability.username_available) {
          setBusy(false);
          setError("Ce pseudo est déjà pris, choisis-en un autre.");
          return;
        }
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

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirmation`,
          data: {
            account_type: "client",
            display_name: parsed.data.firstName,
            username: parsed.data.username,
            first_name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            phone: parsed.data.phone,
            address_line1: parsed.data.addressLine1,
            postal_code: parsed.data.postalCode,
            city_name: parsed.data.cityName,
          },
        },
      });
      setBusy(false);
      if (signUpError) {
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? "Un compte existe déjà avec cet email."
            : signUpError.message,
        );
        return;
      }
      if (!signUpData.session) {
        // Sans session (email à confirmer), inutile d'aller sur une page protégée.
        setPendingEmail(parsed.data.email);
        toast.success("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.");
        return;
      }
      toast.success("Bienvenue sur METZY !");
      await applyPendingReferral();
      navigate({ to: consumeNext() ?? (await resolveHomePath()) });
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
          ? "Ton adresse email n'est pas encore confirmée. Vérifie ta boîte mail."
          : "Email ou mot de passe incorrect.",
      );
      return;
    }
    await applyPendingReferral();
    navigate({ to: consumeNext() ?? (await resolveHomePath()) });
  }

  async function handleGoogle() {
    setError(null);

    // The Google OAuth button is powered by Lovable Cloud's own auth broker,
    // which only exists behind Lovable's own hosting (it intercepts
    // "/~oauth/*" requests at the edge). On any other host — like this
    // Vercel deployment — that route simply doesn't exist and the browser
    // would hard-navigate to a 404. Detect that up front and fail
    // gracefully instead of sending the user to a dead page.
    const isLovableHostedDomain = /(^|\.)lovable\.app$/.test(window.location.hostname);
    if (!isLovableHostedDomain) {
      setError(
        "La connexion avec Google n'est pas encore disponible sur ce site. Utilise ton email et ton mot de passe pour continuer — désolé pour la gêne !",
      );
      return;
    }

    setBusy(true);
    try {
      if (referralCode.trim()) rememberReferralCode(referralCode);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.redirected) return;
      if (result.error) {
        setBusy(false);
        setError("La connexion Google a échoué. Réessaie.");
        return;
      }
      await applyPendingReferral();
      navigate({ to: consumeNext() ?? (await resolveHomePath()) });
    } catch {
      setBusy(false);
      setError("La connexion Google a échoué. Réessaie.");
    }
  }


  async function handleReset() {
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) {
      setError("Renseigne ton email pour recevoir un nouveau mot de passe.");
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (resetError) {
      setError("Impossible d'envoyer l'email pour le moment.");
      return;
    }
    toast.success("Email de réinitialisation envoyé.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link to="/" className="mb-8 font-display text-xl font-bold">
        MET<span className="text-primary">ZY</span>
      </Link>
      <h1 className="font-display text-3xl">
        {mode === "signup" ? "Rejoins METZY" : "Content de te revoir"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "30 secondes, et les bons plans de Metz sont à toi."
          : "Connecte-toi pour retrouver tes offres et tes points."}
      </p>

      {pendingEmail ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Confirme ton adresse email</p>
          <p className="mt-1 text-muted-foreground">
            Nous avons envoyé un lien à {pendingEmail}. Clique dessus, puis reviens te connecter
            ici.
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
              <label htmlFor="firstName" className="text-sm font-medium">
                Prénom
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                maxLength={60}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-medium">
                Nom
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                maxLength={60}
                className={inputClass}
              />
            </div>
          </div>
        ) : null}

        {mode === "signup" ? (
          <div>
            <label htmlFor="username" className="text-sm font-medium">
              Pseudo
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
              autoComplete="username"
              maxLength={30}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Unique : c'est avec ce pseudo que tes amis te retrouvent sur METZY.
            </p>
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={255}
            className={inputClass}
          />
        </div>

        {mode === "signup" ? (
          <>
            <div>
              <label htmlFor="phone" className="text-sm font-medium">
                Téléphone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                maxLength={20}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="addressLine1" className="text-sm font-medium">
                Adresse
              </label>
              <input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                autoComplete="street-address"
                maxLength={120}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <div>
                <label htmlFor="postalCode" className="text-sm font-medium">
                  Code postal
                </label>
                <input
                  id="postalCode"
                  inputMode="numeric"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  autoComplete="postal-code"
                  maxLength={5}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="cityName" className="text-sm font-medium">
                  Ville
                </label>
                <input
                  id="cityName"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  autoComplete="address-level2"
                  maxLength={80}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="referralCode" className="text-sm font-medium">
                Code de parrainage <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <input
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="EX : METZY123"
                maxLength={20}
                className={`${inputClass} tracking-[0.15em] uppercase`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Un ami t&apos;a partagé son code ? Saisis-le pour qu&apos;il soit crédité.
              </p>
            </div>
          </>
        ) : null}


        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
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
              J'accepte les{" "}
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
          <p role="alert" className="rounded-2xl bg-destructive/15 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-2xl bg-gradient-metzy font-display font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Un instant..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
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
        {mode === "signup" ? "Créer mon compte avec Google" : "Continuer avec Google"}
      </button>

      <p className="mt-6 text-xs text-muted-foreground">
        Vous êtes un commerce&nbsp;?{" "}
        <Link to="/pro/auth" className="text-primary underline">
          Accéder à l&apos;espace pro
        </Link>
        .
      </p>


      <div className="mt-6 flex flex-col gap-2 text-sm">
        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
          className="text-left text-muted-foreground hover:text-foreground"
        >
          {mode === "signup" ? "J'ai déjà un compte — me connecter" : "Créer un compte METZY"}
        </button>
        {mode === "login" ? (
          <button onClick={handleReset} className="text-left text-muted-foreground hover:text-foreground">
            Mot de passe oublié ?
          </button>
        ) : null}
      </div>
    </main>
  );
}
