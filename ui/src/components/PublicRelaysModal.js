import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

import AddIdentifierButton from "./AddIdentifierButton";
import RemoveIdentiferButton from "./RemoveIdentifierButton";
import LoadingButton from "./LoadingButton";
import ErrorMessage from "./utility/ErrorMessage";
import InfoPopup from "./InfoPopup";
import connectedRelayIcon from "../assets/connected-relay.svg";
import disconnectedRelayIcon from "../assets/disconnected-relay.svg";
import { toast } from "react-toastify";
import SyncConfirmationMsg from "./SyncConfirmationMsg";

import { RELAY_PROXY_URL } from "../constants/constants";

export default function PublicRelaysModal({
  onClose,
  isPreventModalClose,
  setIsPreventModalClose,
}) {
  const [publicRelays, setPublicRelays] = useState(null);
  const fetchIntervalRef = useRef();
  const [serverConnectionError, setServerConnectionError] = useState(null);
  const [error, setError] = useState(null);
  const errorTimeoutRef = useRef();
  const [inputValue, setInputValue] = useState("");
  const modalRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [openPopup, setOpenPopup] = useState(false);
  // sync confirmation modal state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef();

  // When the modal is open, we prevent background scrolling and compensate for the scrollbar disappearing so the page doesn't jump
  useEffect(() => {
    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "unset";
    };
  }, []);

  useEffect(() => {
    fetchPublicRelaysOnMount();

    return () => {
      clearInterval(fetchIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [onClose]);

  // clear the confirmation timeout when we receive the first event from syncing public relays
  // and show confirmation modal right away
  // TODO: refactor so that we are not using publicRelays object in dependency array
  useEffect(() => {
    if (isTimerRunning && publicRelays?.firstEventReceived) {
      clearTimeout(timerRef.current);
      setIsTimerRunning(false);
      setIsPreventModalClose(false);
      toast(
        <SyncConfirmationMsg
          message="Public relays detected successfully. All your Nostr activity, including past and future actions, will be automatically synced to your private relay in the background."
          type="success"
        />,
      );
    }
  }, [publicRelays, isTimerRunning]);

  async function fetchPublicRelaysOnMount() {
    await fetchPublicRelays();
    fetchIntervalRef.current = setInterval(fetchPublicRelays, 2000); // poll every 2 seconds
  }

  async function fetchPublicRelays() {
    setServerConnectionError(null);
    try {
      const { data } = await axios.get(`${RELAY_PROXY_URL}/connectionStatus`);
      setPublicRelays(data);

      // check connection status and update isLoading accordingly
      if (data.status === "discovering relays") {
        setIsLoading(true);
      } else if (data.status === "idle") {
        setIsLoading(false);
      }
    } catch (err) {
      setPublicRelays(null);
      setServerConnectionError(
        err.response?.data?.error ||
          "An unexpected error occurred connecting to the server",
      );
      setIsLoading(false);
    }
  }

  const statusToIconAndColor = (status) => {
    return status === 1
      ? { icon: connectedRelayIcon, color: "#10AA16" }
      : { icon: disconnectedRelayIcon, color: "#aa7109" };
  };

  async function handleButtonClick(e, action) {
    e.preventDefault();
    e.stopPropagation();
    setServerConnectionError(null);
    setIsLoading(true);

    // Currently all validation is done on the backend
    await handleAction(action, inputValue);
    setInputValue("");
  }

  async function handleAction(action, identifier) {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setError(null);

    try {
      if (action === "add") {
        // don't allow modal close until the confirmation message has been displayed
        setIsPreventModalClose(true);
        setIsTimerRunning(true);

        timerRef.current = setTimeout(() => {
          toast(
            <SyncConfirmationMsg
              message="Unable to discover your past activity on public relays. Your private relay will continue to monitor popular public relays and sync your activity as soon as it becomes available. Make sure you're connected to popular public relays in your Nostr client for successful syncing."
              type="default"
            />,
          );
          setIsTimerRunning(false);
          setIsPreventModalClose(false);
        }, 10000);

        await axios.post(`${RELAY_PROXY_URL}/identifier`, {
          identifier,
        });
      } else if (action === "remove") {
        const userConfirmation = window.confirm(
          "Are you sure you want to stop syncing from your public relays?",
        );
        if (!userConfirmation) return;
        await axios.delete(`${RELAY_PROXY_URL}/identifier`);
      }
    } catch (error) {
      clearTimeout(timerRef.current);
      setIsPreventModalClose(false);
      setError(
        error.response?.data?.error ||
          error.message ||
          "An unexpected error occurred",
      );
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      fetchPublicRelays();
    }
  }

  const shouldDisplayNoRelaysMessage = () => {
    return (
      publicRelays !== null &&
      publicRelays.relayStates.length === 0 &&
      publicRelays.identifier !== null &&
      publicRelays.status !== "discovering relays"
    );
  };

  return (
    <div
      ref={modalRef}
      className="sm:w-[450px] w-[350px] pt-7 bg-gray-300 shadow-xl dark:shadow-gray-900 ring-1 ring-gray-900/5 dark:ring-white/10 rounded-md backdrop-blur-xl bg-opacity-[1%]"
    >
      <div className="relative flex gap-1 mb-3 items-center px-7">
        <h1 className="text-slate-700 dark:text-slate-100 text-xl font-semibold">
          Sync from public relays
        </h1>
        <InfoPopup openPopup={openPopup} setOpenPopup={setOpenPopup} />
      </div>
      <div className="px-7">
        <p className="text-slate-700 dark:text-slate-200 text-xs mb-4">
          Back up all your past Nostr activity from your public relays and
          ensure future activity is backed up, even if the connection between
          your private relay and Nostr client is interrupted.
        </p>
      </div>
      <div className="flex gap-2 px-7">
        <input
          className="text-slate-700 dark:text-white border dark:border-white dark:border-opacity-10 rounded-md w-full px-3 bg-white dark:bg-opacity-5 focus:ring-[#6361FF] focus:ring-1 dark:focus:ring-[#264D96] dark:focus:ring-[3px] focus:border-opacity-0 outline-none"
          type="text"
          value={inputValue}
          placeholder={
            publicRelays !== null && publicRelays.identifier
              ? publicRelays.identifier
              : "Enter NIP-05 or npub address"
          }
          spellCheck="false"
          disabled={publicRelays?.identifier}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {(isLoading && publicRelays.relayStates.length === 0) ||
        isPreventModalClose ? (
          <LoadingButton />
        ) : publicRelays !== null && publicRelays.identifier ? (
          <RemoveIdentiferButton
            onClick={(e) => handleButtonClick(e, "remove")}
          />
        ) : (
          <AddIdentifierButton
            onClick={(e) => handleButtonClick(e, "add")}
            disabled={
              publicRelays?.identifier || !inputValue || serverConnectionError
            }
          />
        )}
      </div>
      {serverConnectionError && <ErrorMessage error={serverConnectionError} />}
      {error && <ErrorMessage error={error} />}
      {shouldDisplayNoRelaysMessage() && (
        <div className="px-7 mt-3">
          <p className="text-slate-700 dark:text-slate-200 text-sm">
            No relays discovered
          </p>
        </div>
      )}
      <div className="mt-6 max-h-40 sm:max-h-60 overflow-y-auto !scrollbar-thin !scrollbar-w-1 !scrollbar-thumb-rounded-full !scrollbar-track-transparent !scrollbar-thumb-black/10 dark:!scrollbar-thumb-white/10 mx-[0.15rem]">
        {publicRelays !== null &&
          publicRelays.relayStates.map((relay, index) => (
            <AnimatePresence key={relay.url}>
              <motion.div
                className="flex gap-2 mb-5 px-7"
                initial={{
                  y: 20,
                  opacity: 0,
                }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: {
                    delay: index * 0.05,
                  },
                }}
                exit={{
                  y: 20,
                  opacity: 0,
                }}
              >
                <img
                  className="rounded-full w-5 h-5 p-1"
                  style={{
                    backgroundColor: statusToIconAndColor(relay.readyState)
                      .color,
                  }}
                  src={statusToIconAndColor(relay.readyState).icon}
                />
                <span className="text-slate-700 dark:text-slate-200 text-sm">
                  {relay.url}
                </span>
              </motion.div>
            </AnimatePresence>
          ))}
      </div>
    </div>
  );
}
