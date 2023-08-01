import { useEffect, useState, useRef } from "react";
import { usePopper } from "react-popper";

import Layout from "./components/Layout";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Card from "./components/utility/Card";
import CopyText from "./components/utility/CopyText";
import ConnectClient from "./components/ConnectClient";
import TotalBackups from "./components/TotalBackups";
import LatestActions from "./components/LatestActions";
import PublicRelaysModal from "./components/PublicRelaysModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  PORT,
  WEB_SOCKET_RELAY_URL, // Websocket URL of the private relay
  HTTP_RELAY_URL, // http URL of the private relay
} from "./constants/constants";

// Event kinds that we want to render in the UI
const supportedEventKinds = {
  0: {
    icon: "📝",
    name: "Profile Update",
  },
  1: {
    icon: "💭",
    name: "Post",
    showContent: true,
  },
  2: {
    icon: "📶",
    name: "Relay Update",
  },
  3: {
    icon: "🤝",
    name: "Following Update",
  },
  4: {
    icon: "🔏",
    name: "Encrypted DM",
  },
  5: {
    icon: "🗑",
    name: "Deleted Action",
  },
  6: {
    icon: "🔁",
    name: "Repost",
  },
  7: {
    icon: "🤙",
    name: "Reaction",
  },
  40: {
    icon: "🧙‍♂️",
    name: "Channel Creation",
    showContent: true,
    contentKey: "name",
  },
  41: {
    icon: "🪄",
    name: "Channel Update",
    showContent: true,
    contentKey: "name",
  },
  42: {
    icon: "📢",
    name: "Channel Message",
    showContent: true,
  },
  43: {
    icon: "🙈",
    name: "Hid Message",
  },
  44: {
    icon: "🙊",
    name: "Muted User",
  },
  22242: {
    icon: "🔓",
    name: "Authenticated Relay",
  },
  other: {
    icon: "🛠",
    name: "Other Action",
  },
};

// Total events we want to render in the activity list
const eventsToRenderLimit = 300;

export default function App() {
  // State to store events from websocket
  const [events, setEvents] = useState([]);
  // State to store the connection status of websocket
  const [isConnected, setIsConnected] = useState(false);
  // State to keep track of whether all stored events have been fetched
  const [hasFetchedAllEvents, setHasFetchedAllEvents] = useState(false);
  // State to store the relay info as per NIP-11: https://github.com/nostr-protocol/nips/blob/master/11.md
  const [relayInformationDocument, setRelayInformationDocument] = useState({});
  // State to track the public relays modal
  const [showModal, setShowModal] = useState(false);
  const [isPreventModalClose, setIsPreventModalClose] = useState(false);
  // State to store the reference and popper elements for the public relays modal
  const [offset, setOffset] = useState(
    window.innerWidth > 768 ? [-170, 10] : [0, 10],
  );
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const { styles, attributes, update } = usePopper(
    referenceElement,
    popperElement,
    {
      placement: "bottom-start",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: offset,
          },
        },
      ],
    },
  );
  const updatePopper = useRef(update);

  useEffect(() => {
    // Create websocket connection
    const socket = new WebSocket(WEB_SOCKET_RELAY_URL);

    // Generate a random subscription ID
    const subscriptionID =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Handle websocket connection open event
    socket.onopen = () => {
      setIsConnected(true);
      // Reset events array to clear previous events
      setEvents([]);
      // Request latest 3000 events
      socket.send(JSON.stringify(["REQ", subscriptionID, { limit: 3000 }]));
    };

    // Handle websocket message event
    socket.onmessage = (message) => {
      // Parse the message data
      const data = JSON.parse(message.data);

      if (!data.length) {
        console.error("Error: No data length", data);
        return;
      }

      // Check if data is End of Stored Events Notice
      // https://github.com/nostr-protocol/nips/blob/master/15.md
      if (data[0] === "EOSE") {
        setHasFetchedAllEvents(true);
        return;
      }

      // If the data is of type EVENT
      if (data[0] === "EVENT") {
        // Add the event to the events array
        setEvents((prevEvents) => {
          // Extract the relevant data from the event
          const { id, kind, created_at, content } = data[2];
          return [{ id, kind, created_at, content }, ...prevEvents];
        });
      }
    };

    // Handle websocket error
    socket.onerror = () => {
      setIsConnected(false);
    };

    // Handle websocket close
    socket.onclose = () => {
      setIsConnected(false);
    };

    // get nostr-rs-relay version
    fetch(HTTP_RELAY_URL, {
      method: "GET",
      headers: {
        Accept: "application/nostr+json",
      },
    }).then(async (response) => {
      if (response.ok) {
        const relayInfoDoc = await response.json();
        setRelayInformationDocument(relayInfoDoc);
      }
    });

    // Cleanup function to run on component unmount
    return () => {
      // Check if the websocket is open
      if (socket.readyState === WebSocket.OPEN) {
        // Stop previous subscription and close the websocket
        socket.send(JSON.stringify(["CLOSE", subscriptionID]));
        socket.close();
      }
    };
  }, []);

  // Update popper offset for the public relays modal when the window is resized
  useEffect(() => {
    const handleResize = () => {
      setOffset(window.innerWidth > 768 ? [-150, 10] : [0, 10]);
      updatePopper.current?.();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Layout>
      <ToastContainer
        position="bottom-center"
        autoClose={8000} // close toast after 8 seconds
        hideProgressBar={true}
        closeOnClick={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        closeButton={false}
      />
      <div className="container mx-auto px-4 pb-10">
        <Header isConnected={isConnected}>
          <div className="flex">
            <button
              ref={setReferenceElement}
              onClick={(event) => {
                event.stopPropagation();
                setShowModal((prevState) => !prevState); // toggles the current state of showModal
              }}
              className={`self-center p-3 m-1 rounded-md bg-white ring-1 ring-gray-900/5 dark:ring-white/10 hover:bg-[#CEC8F4] dark:hover:bg-[#264D96] ${
                showModal
                  ? "bg-[#CEC8F4] dark:bg-[#264D96] ring-violet-400 dark:ring-white/30"
                  : "dark:bg-slate-900"
              }`}
            >
              <div className="w-5 h-5 bg-relays-modal-icon-light-mode dark:bg-relays-modal-icon-dark-mode bg-no-repeat bg-center"></div>
            </button>
            <div className="relay-url-container flex self-center after:bg-white dark:after:bg-slate-900 p-3 rounded-md after:rounded-md">
              <span className="text-sm text-slate-900 dark:text-slate-50">
                Relay URL:&nbsp;&nbsp;
              </span>
              <CopyText value={WEB_SOCKET_RELAY_URL} />
            </div>
          </div>
        </Header>

        <main className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-3 gap-6 sm:gap-8">
            <Card
              className="order-last xl:order-first md:col-span-5 xl:col-span-1"
              heading="Get started"
            >
              <ConnectClient relayPort={PORT} />
            </Card>

            <Card
              className="col-1 md:col-span-2 xl:col-span-1"
              heading="Total actions"
            >
              <TotalBackups
                loading={!hasFetchedAllEvents}
                events={events}
                supportedEventKinds={supportedEventKinds}
              />
            </Card>

            <Card
              className="col-1 md:col-span-3 xl:col-span-1"
              heading="Latest actions"
            >
              <LatestActions
                loading={!hasFetchedAllEvents}
                events={events}
                eventsToRenderLimit={eventsToRenderLimit}
                supportedEventKinds={supportedEventKinds}
              />
            </Card>
          </div>
        </main>

        <Footer
          leftContent={<>&copy; Umbrel 2023.</>}
          rightContent={
            <>
              Powered by{" "}
              <a
                href="https://github.com/scsibug/nostr-rs-relay"
                target="_blank"
                className="underline underline-offset-2"
                rel="noreferrer"
              >
                nostr-rs-relay
                {relayInformationDocument.version
                  ? ` ${relayInformationDocument.version}`
                  : ""}
              </a>
              .
            </>
          }
        />
        {showModal && (
          <div
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
          >
            <PublicRelaysModal
              onClose={() => {
                if (isPreventModalClose) return;
                setShowModal(false);
              }}
              isPreventModalClose={isPreventModalClose}
              setIsPreventModalClose={setIsPreventModalClose}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
