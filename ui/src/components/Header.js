import { useEffect } from "react";
import icon from "../assets/icon.jpg";

export default function Header({ isConnected, children }) {
  useEffect(() => {
    if (!("theme" in localStorage)) {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        localStorage.theme = "dark";
      } else {
        localStorage.theme = "light";
      }
    }

    if (localStorage.theme === "dark") {
      return document.documentElement.classList.add("dark");
    }
    return document.documentElement.classList.remove("dark");
  }, []);

  function toggleDarkMode() {
    if (localStorage.theme === "light") {
      localStorage.theme = "dark";
      return document.documentElement.classList.add("dark");
    }
    localStorage.theme = "light";
    return document.documentElement.classList.remove("dark");
  }
  return (
    <div>
      <div className="flex justify-end pt-6">
        <button
          onClick={(event) => {
            event.stopPropagation(); // prevent event from bubbling up to the document
            toggleDarkMode();
          }}
        >
          <span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 block dark:hidden"
            >
              <path
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                className="fill-orange-400/20 stroke-orange-500"
              />
              <path
                d="M12 4v1M17.66 6.344l-.828.828M20.005 12.004h-1M17.66 17.664l-.828-.828M12 20.01V19M6.34 17.664l.835-.836M3.995 12.004h1.01M6 6l.835.836"
                className="stroke-orange-500"
              />
            </svg>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6 hidden dark:block"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.715 15.15A6.5 6.5 0 0 1 9 6.035C6.106 6.922 4 9.645 4 12.867c0 3.94 3.153 7.136 7.042 7.136 3.101 0 5.734-2.032 6.673-4.853Z"
                className="fill-cyan-400/5"
              />
              <path
                d="m17.715 15.15.95.316a1 1 0 0 0-1.445-1.185l.495.869ZM9 6.035l.846.534a1 1 0 0 0-1.14-1.49L9 6.035Zm8.221 8.246a5.47 5.47 0 0 1-2.72.718v2a7.47 7.47 0 0 0 3.71-.98l-.99-1.738Zm-2.72.718A5.5 5.5 0 0 1 9 9.5H7a7.5 7.5 0 0 0 7.5 7.5v-2ZM9 9.5c0-1.079.31-2.082.845-2.93L8.153 5.5A7.47 7.47 0 0 0 7 9.5h2Zm-4 3.368C5 10.089 6.815 7.75 9.292 6.99L8.706 5.08C5.397 6.094 3 9.201 3 12.867h2Zm6.042 6.136C7.718 19.003 5 16.268 5 12.867H3c0 4.48 3.588 8.136 8.042 8.136v-2Zm5.725-4.17c-.81 2.433-3.074 4.17-5.725 4.17v2c3.552 0 6.553-2.327 7.622-5.537l-1.897-.632Z"
                className="fill-cyan-400/75"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17 3a1 1 0 0 1 1 1 2 2 0 0 0 2 2 1 1 0 1 1 0 2 2 2 0 0 0-2 2 1 1 0 1 1-2 0 2 2 0 0 0-2-2 1 1 0 1 1 0-2 2 2 0 0 0 2-2 1 1 0 0 1 1-1Z"
                className="fill-cyan-400/75"
              />
            </svg>
          </span>
        </button>
      </div>
      <div className="flex flex-col md:flex-row justify-between align-center mb-10 md:mb-14">
        <div className="flex mb-8 md:mb-0">
          <div className="flex items-center mr-6 w-32 h-32 rounded-2xl sm:rounded-3xl">
            <img
              className="object-cover rounded-2xl shadow-xl sm:rounded-3xl ring-1 ring-gray-900/5 dark:ring-white/10"
              src={icon}
              alt="Nostr Relay Icon"
            />
          </div>
          <div>
            <div className="flex items-center">
              <div className="relative">
                {isConnected ? (
                  <span className="flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </span>
                ) : (
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
                  </span>
                )}
              </div>
              {isConnected ? (
                <p className="ml-2 text-green-500 text-md">Running</p>
              ) : (
                <p className="ml-2 text-sky-400 text-md">
                  Connecting to relay...
                </p>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-medium text-slate-900 dark:text-white opacity-90">
              Nostr Relay
            </h1>
            <div className="mt-2">
              <span className="text-black/50 dark:text-white/50 font-medium">
                Private Relay
              </span>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
