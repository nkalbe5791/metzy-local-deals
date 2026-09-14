/** Logo Google officiel (4 couleurs) pour les boutons de connexion. */
export function GoogleMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.6l7.8 6.1C12.3 13.4 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.1h12.7c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.2z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.3A14.7 14.7 0 0 1 9.6 24c0-1.5.3-3 .8-4.3l-7.8-6.1A23.6 23.6 0 0 0 .5 24c0 3.8.9 7.4 2.1 10.4l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 47.5c6.2 0 11.5-2 15.6-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8 2.4-6.4 0-11.7-3.9-13.6-9.9l-7.8 6.1C6.5 42.2 14.6 47.5 24 47.5z"
      />
    </svg>
  );
}
