export default function Footer() {
  return (
    <footer className="container mx-auto">
      <div className="flex justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          &copy; Umbrel 2023.
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Powered by{" "}
          <a
            href="https://github.com/scsibug/nostr-rs-relay"
            target="_blank"
            className="underline underline-offset-2"
            rel="noreferrer"
          >
            nostr-rs-relay
          </a>
          .
        </span>
      </div>
    </footer>
  );
}
