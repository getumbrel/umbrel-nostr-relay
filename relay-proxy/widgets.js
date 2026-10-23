import ReconnectingSocket from "./ReconnectingSocket.js";
import moment from 'moment';

import { LOCAL_RELAY_URL } from "./constants.js";

const events = [];

function getEventsStore() {
  return events;
}

function insertSortedEvent(event) {
  if (events.some(existing => existing.id === event.id)) return;
  const { created_at } = event;
  
  // Find the correct position for the new event
  const index = events.findIndex(event => created_at > event.created_at);
  
  // Insert at the end if it is the oldest event
  if (index === -1) {
    events.push(event);
  } else {
    // Otherwise, insert at the correct position
    events.splice(index, 0, event);
  }
  
  // Remove the oldest event if we have more than 1000
  if (events.length > 1000) {
    events.pop();
  }
}

// Event kinds that we want to render in the widget
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
    icon: "📡",
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
  },
  41: {
    icon: "🪄",
    name: "Channel Update",
  },
  42: {
    icon: "📢",
    name: "Channel Message",
  },
  43: {
    icon: "🙈",
    name: "Hid Message",
  },
  44: {
    icon: "🙊",
    name: "Muted User",
  },
  16: {
    icon: "🔁",
    name: "Repost",
  },
  20: {
    icon: "🖼️",
    name: "Photo",
  },
  21: {
    icon: "🎬",
    name: "Video",
  },
  22: {
    icon: "🎞️",
    name: "Short Video",
  },
  1068: {
    icon: "📊",
    name: "Poll",
  },
  1111: {
    icon: "💬",
    name: "Comment",
  },
  9735: {
    icon: "⚡",
    name: "Zap Receipt",
  },
  30023: {
    icon: "📰",
    name: "Article",
  },
  10002: {
    icon: "📡",
    name: "Relay Update",
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

export function getLatestEvents() {
  const events = getEventsStore();

  // Return the latest 5 events as well as the total count of events (999+ if over 999 events)
  const limit = 5;
  const count = events.length > 999 ? "999+" : events.length.toString();

  const getEventAction = (event) => {
    const kind = supportedEventKinds[event.kind] || supportedEventKinds.other;
    return {
      emoji: kind.icon,
      text: kind.name
    };
  };

  const actions = events.slice(0, limit).map(getEventAction);

  const widgetData = {
    type: "list-emoji",
    link: "",
    refresh: "5s",
    count,
    items: actions
  };

  return widgetData;
}

export function getLatestKind1() {
  const events = getEventsStore();

  // each event comes back as this format:
  // {
  //   "id": "ddbb668b9ce69fb463dd80e34f87a375043afb446d62270b8c1a9f76ceeab7e9",
  //   "kind": 1,
  //   "created_at": 1689221445,
  //   "content": "#OnlyFacts"
  // }

  const getNotification = (event) => {
    return {
      text: event.content,
      // textSub: moment(event.created_at * 1000).format('h:mm a · MMM D, YYYY')
      // TODO: figure out how to display this since the frontend is not formatting to the user's timezone
      subtext: moment(event.created_at * 1000).format('HH:mm MMM DD, YYYY')
    };
  };

  // Return the latest 5 kind 1 events
  const limit = 5;
  const notifications = events
    .filter(event => event.kind === 1)
    .slice(0, limit)
    .map(getNotification);

  const widgetData = {
    type: "list",
    link: "",
    refresh: "5s",
    items: notifications
  };

  return widgetData;
}

// Re-query on reconnect and deduplicate replayed events by ID.
export const widgetSocket = new ReconnectingSocket(LOCAL_RELAY_URL, {
  onOpen: socket => socket.send(["REQ", "widgets", { limit: 1000 }]),
  onMessage: data => {
    if (data[0] !== "EVENT" || data[1] !== "widgets") return;
    const event = data[2];
    if (!event || typeof event.id !== "string" || !Number.isInteger(event.created_at) ||
      !Number.isInteger(event.kind) || typeof event.content !== "string") return;
    const { id, kind, created_at, content } = event;
    insertSortedEvent({ id, kind, created_at, content });
  },
});
