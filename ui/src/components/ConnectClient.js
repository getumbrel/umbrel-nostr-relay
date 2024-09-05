const showParagraph = process.env.REACT_APP_OFFICIAL !== "false";

export default function ConnectClientCard({ relayPort }) {
  return (
    <div className="pt-5 px-10 pb-8">
      <div className="flex items-start gap-2">
        <span className="text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-md bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-0 dark:shadow-none dark:highlight-white/5">
          1
        </span>
        <div>
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">
            Connect your Nostr client (e.g., Damus, Amethyst) to your private
            relay for seamless backup of all Nostr activity. In Damus, add your
            Relay URL via Settings {">"} Relays.
          </p>
          {showParagraph && (
            <p className="text-slate-800 dark:text-slate-400 text-xs mt-4 mb-6">
              Tip: Install{" "}
              <a
                href={`${window.location.protocol}//${window.location.hostname}/app-store/tailscale`}
                target="_blank"
                className="underline underline-offset-2"
                rel="noreferrer"
              >
                Tailscale
              </a>{" "}
              on your Umbrel and your devices for an uninterrupted connection
              between your clients and your relay, even when you&apos;re away
              from your home network. Enable Tailscale&apos;s{" "}
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
          )}
          <hr className="opacity-90 px-6 mt-4 mb-5 dark:opacity-10" />
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-md bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:ring-0 dark:shadow-none dark:highlight-white/5">
          2
        </span>
        <div>
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">
            Tap the globe icon on the top to back up past Nostr activity from
            your public relays and ensure uninterrupted future backups, even if
            the connection between your private relay and Nostr client is
            disrupted.
          </p>
        </div>
      </div>
    </div>
  );
}
