import { useState, useRef, useEffect } from "react";

export default function InfoPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef();

  const handleOpen = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [isOpen]);

  return (
    <div ref={popupRef}>
      <svg
        onClick={(event) => {
          event.stopPropagation();
          handleOpen();
        }}
        className="cursor-pointer text-[#263143] dark:text-[#CDDDF6]"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="currentColor"
        fillOpacity="0.35"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M9.00049 16.4998C4.85835 16.4998 1.50049 13.1419 1.50049 8.99982C1.50049 4.85768 4.85835 1.49982 9.00049 1.49982C13.1426 1.49982 16.5005 4.85768 16.5005 8.99982C16.5005 13.1419 13.1426 16.4998 9.00049 16.4998ZM8.25049 8.24982V12.7498H9.75049V8.24982H8.25049ZM8.25049 5.24982V6.74982H9.75049V5.24982H8.25049Z" />
      </svg>
      {isOpen && (
        <div className="absolute top-0 left-0 mt-9 p-4 w-auto mx-7 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-gray-900/5 dark:ring-white/10 rounded-md z-10">
          <p className="text-slate-700 dark:text-slate-100 text-xs mb-2">
            Simply add your NIP-05 identifier or npub address to automatically
            detect your public relays. Your private relay will then establish
            connections with your public relays, fetching your Nostr activity
            from them.
          </p>
          <p className="text-slate-700 dark:text-slate-100 text-xs mb-2">
            This process backs up your past activity from before you started
            using your private relay, as well as any future activity—even if
            your Nostr client is not connected to your private relay at the
            time.
          </p>
          <p className="text-slate-700 dark:text-slate-100 text-xs">
            Any updates to your public relays in the future will be
            automatically detected, ensuring continuous synchronization.
          </p>
        </div>
      )}
    </div>
  );
}
