export default function ConnectClientCard({ relayPort }) {
  return (
    <div className="pt-5 px-10 pb-8">
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
        Connect your Nostr clients to your relay to ensure all your Nostr
        activity, including your posts, are backed up and accessible even if you
        are censored by other relays.
      </p>
      <div className="my-4" />
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
        Add your Relay URL to your Nostr clients, like Damus, Astral, and
        Amethyst. In Damus, you can add it from Settings &gt; Relays &gt; Add
        Relay.
      </p>
      <hr className="opacity-90 px-6 mt-4 mb-5 dark:opacity-10" />
      <p className="text-slate-800 dark:text-slate-400 text-sm mb-1">
        Consider installing{" "}
        <a
          href={`${window.location.protocol}//${window.location.hostname}/app-store/tailscale`}
          target="_blank"
          className="underline underline-offset-2"
          rel="noreferrer"
        >
          Tailscale
        </a>{" "}
        on your Umbrel and your devices to seamlessly connect your Nostr clients
        to your relay even when you are not on your local network. Enable
        Tailscale&apos;s{" "}
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
