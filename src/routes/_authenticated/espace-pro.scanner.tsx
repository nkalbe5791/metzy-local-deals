import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, CheckCircle2, XCircle } from "lucide-react";
import { refusalMessage } from "@/lib/metzy";
import { fetchMyMerchant, validateRedemption, type ValidationResult } from "@/lib/metzy-pro";
import { rewardError, validateRewardCoupon, type RewardValidation } from "@/lib/metzy-rewards";
import { LoadingState, ErrorState, EmptyState } from "@/components/metzy/states";

export const Route = createFileRoute("/_authenticated/espace-pro/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner un QR client — METZY" },
      {
        name: "description",
        content: "Scanne le QR code du client METZY pour valider sa réduction en toute sécurité.",
      },
      { property: "og:title", content: "Scanner METZY" },
      { property: "og:description", content: "Validation des réductions METZY en caisse." },
    ],
  }),
  component: ScannerPro,
});

function ScannerPro() {
  const merchant = useQuery({ queryKey: ["my-merchant"], queryFn: fetchMyMerchant });
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const busyRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [rewardResult, setRewardResult] = useState<RewardValidation | null>(null);

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function submitToken(token: string) {
    if (!token || busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await validateRedemption(token);
      // Un coupon cadeau METZY n'est pas un QR d'offre : on tente alors la validation cadeau.
      if (!res.ok && res.code === "INVALID_TOKEN") {
        const gift = await validateRewardCoupon(token);
        if (gift.ok) {
          setResult(null);
          setRewardResult(gift);
          toast.success("Cadeau validé");
          return;
        }
        if (gift.code !== "INVALID_TOKEN") {
          setResult(null);
          setRewardResult(gift);
          toast.error(rewardError(gift.code));
          return;
        }
      }
      setRewardResult(null);
      setResult(res);
      if (res.ok) toast.success("Réduction validée");
      else toast.error(refusalMessage(res.code));
    } catch {
      toast.error("Validation impossible. Réessaie.");
    } finally {
      setTimeout(() => {
        busyRef.current = false;
      }, 1500);
    }
  }

  async function startScan() {
    setResult(null);
    setRewardResult(null);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (res) => {
          if (res) void submitToken(res.getText());
        },
      );
      controlsRef.current = controls;
      setScanning(true);
    } catch {
      toast.error("Caméra indisponible. Utilise la saisie manuelle du code.");
    }
  }

  function stopScan() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  if (merchant.isLoading) return <LoadingState />;
  if (merchant.isError) return <ErrorState onRetry={() => merchant.refetch()} />;
  if (!merchant.data)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title="Aucun commerce"
          description="Le scanner est réservé aux équipes des commerces partenaires."
          action={
            <Link to="/espace-pro/inscription" className="mt-2 text-sm text-primary underline">
              Inscrire mon commerce
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="font-display text-2xl">Scanner un QR client</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {merchant.data.name} · le QR d'offre est valable 3 minutes et utilisable une seule fois. Tu
        ne peux valider que les offres de ton commerce ; les coupons cadeaux METZY sont, eux,
        acceptés partout.
      </p>

      <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-black">
        <video
          ref={videoRef}
          className="aspect-square w-full object-cover"
          muted
          playsInline
          aria-label="Aperçu caméra du scanner"
        />
      </div>

      <div className="mt-4 flex gap-3">
        {scanning ? (
          <button
            onClick={stopScan}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold"
          >
            <CameraOff className="size-4" aria-hidden />
            Arrêter
          </button>
        ) : (
          <button
            onClick={startScan}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Camera className="size-4" aria-hidden />
            Activer la caméra
          </button>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const input = new FormData(event.currentTarget).get("token");
          void submitToken(String(input ?? ""));
        }}
        className="mt-6 space-y-2"
      >
        <label className="block text-sm font-medium" htmlFor="token">
          Saisie manuelle du code
        </label>
        <div className="flex gap-2">
          <input id="token" name="token" className="metzy-input flex-1" placeholder="Code du QR" />
          <button type="submit" className="rounded-full border border-border px-5 text-sm font-semibold">
            Valider
          </button>
        </div>
      </form>

      {rewardResult ? (
        rewardResult.ok ? (
          <div
            role="status"
            className="mt-6 rounded-3xl border border-accent/50 bg-accent/10 p-5 text-center"
          >
            <CheckCircle2 className="mx-auto size-8 text-accent" aria-hidden />
            <p className="mt-2 font-display text-xl">Cadeau METZY validé</p>
            <p className="text-sm text-muted-foreground">
              {rewardResult.reward_name} · {rewardResult.customer_name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(rewardResult.validated_at).toLocaleTimeString("fr-FR")}
            </p>
          </div>
        ) : (
          <div
            role="alert"
            className="mt-6 rounded-3xl border border-destructive/50 bg-destructive/10 p-5 text-center"
          >
            <XCircle className="mx-auto size-8 text-destructive" aria-hidden />
            <p className="mt-2 font-display text-lg">Cadeau refusé</p>
            <p className="text-sm text-muted-foreground">{rewardError(rewardResult.code)}</p>
          </div>
        )
      ) : null}

      {result ? (
        result.ok ? (
          <div
            role="status"
            className="mt-6 rounded-3xl border border-accent/50 bg-accent/10 p-5 text-center"
          >
            <CheckCircle2 className="mx-auto size-8 text-accent" aria-hidden />
            <p className="mt-2 font-display text-xl">{result.discount_label}</p>
            <p className="text-sm text-muted-foreground">
              {result.offer_title} · {result.customer_name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              +{result.xp_awarded} points attribués · {new Date(result.validated_at).toLocaleTimeString("fr-FR")}
            </p>
          </div>
        ) : (
          <div role="alert" className="mt-6 rounded-3xl border border-destructive/50 bg-destructive/10 p-5 text-center">
            <XCircle className="mx-auto size-8 text-destructive" aria-hidden />
            <p className="mt-2 font-display text-lg">Refusé</p>
            <p className="text-sm text-muted-foreground">{refusalMessage(result.code)}</p>
          </div>
        )
      ) : null}
    </div>
  );
}
