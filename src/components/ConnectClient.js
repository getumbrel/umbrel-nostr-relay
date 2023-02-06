export default function ConnectClientCard({ relayPort }) {
  return (
    <div className="pt-5 px-10 pb-8">
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
        Connect your Nostr clients, such as Damus, Astral, and Amethyst, to your
        private relay for seamless backup of all your activity on Nostr. This
        ensures that your activity is not lost even if you are censored or
        blocked by public relays.
      </p>
      <div className="my-4" />
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
        In Damus, go to Settings &gt; Relays, and add your Relay URL.
      </p>
      <hr className="opacity-90 px-6 mt-4 mb-5 dark:opacity-10" />
      <p className="text-slate-800 dark:text-slate-400 text-sm mb-1">
        Tip: Install{" "}
        <a
          href={`${window.location.protocol}//${window.location.hostname}/app-store/tailscale`}
          target="_blank"
          className="underline underline-offset-2"
          rel="noreferrer"
        >
          Tailscale
        </a>{" "}
        on your Umbrel and your devices for an uninterrupted connection between
        your clients and your relay, even when you&apos;re away from your home
        network. Enable Tailscale&apos;s{" "}
        <a
          href="https://tailscale.com/kb/1081/magicdns"
          target="_blank"
          className="underline underline-offset-2"
          rel="noreferrer"
        >
          MagicDNS
        </a>{" "}
        and use{" "}
        <span className="font-mono underline decoration-dashed underline-offset-4">
          ws://umbrel:{relayPort}
        </span>{" "}
        as your Relay URL.
      </p>
    </div>
  );
}
