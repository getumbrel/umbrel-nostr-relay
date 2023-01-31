import { useEffect, useState } from "react";

import Layout from "./components/Layout";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Card from "./components/utility/Card";
import CopyText from "./components/utility/CopyText";
import ConnectClient from "./components/ConnectClient";
import TotalBackups from "./components/TotalBackups";
import LatestActions from "./components/LatestActions";

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
    icon: "🪄",
    name: "Channel Creations",
    showContent: true,
    contentKey: "name",
  },
  41: {
    icon: "🤙",
    name: "Channel Update",
    showContent: true,
    contentKey: "name",
  },
  42: {
    icon: "✉️",
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
};

// Total events we want to render in the activity list
const eventsToRenderLimit = 300;

const relayPort = "4848";

export default function App() {
  // State to store events from websocket
  const [events, setEvents] = useState([]);
  // State to store the connection status of websocket
  const [isConnected, setIsConnected] = useState(false);
  // State to keep track of whether all stored events have been fetched
  const [hasFetchedAllEvents, setHasFetchedAllEvents] = useState(false);

  // URL of the websocket relay
  const relayUrl = `ws://${window.location.hostname}:${relayPort}`;

  useEffect(() => {
    // Create websocket connection
    const socket = new WebSocket(relayUrl);

    // Generate a random subscription ID
    const subscriptionID =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Handle websocket connection open event
    socket.onopen = () => {
      setIsConnected(true);
      // Reset events array to clear previous events
      setEvents([]);
      // Request latest 100 events
      socket.send(JSON.stringify(["REQ", subscriptionID, { limit: 1000 }]));
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

  return (
    <Layout>
      <div className="container mx-auto px-4 pb-10">
        <Header isConnected={isConnected}>
          <div className="relay-url-container flex self-center after:bg-white dark:after:bg-slate-900 p-3 rounded-md after:rounded-md">
            <span className="text-sm text-slate-900 dark:text-slate-50">
              Relay URL:&nbsp;&nbsp;
            </span>
            <CopyText value={relayUrl} />
          </div>
        </Header>

        <main className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-3 gap-6 sm:gap-8">
            <Card
              className="order-last xl:order-first md:col-span-5 xl:col-span-1"
              heading="Connect your Nostr client"
            >
              <ConnectClient relayPort={relayPort} />
            </Card>

            <Card
              className="col-1 md:col-span-2 xl:col-span-1"
              heading="Total backups"
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

        <Footer />
      </div>
    </Layout>
  );
}
