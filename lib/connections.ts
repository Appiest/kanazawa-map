import { vocabulary } from "./vocabulary";

/**
 * How somebody is connected to Japan. Asked before anything else when a person
 * adds themselves, and shown on their pin. Several can be true at once.
 */
export const CONNECTIONS = [
  { id: "born", label: "Born in Japan" },
  { id: "lived", label: "Lived in Japan" },
  { id: "ancestry", label: "Have one or more ancestors from Japan" },
  { id: "study-culture", label: "Connected through study, culture or other" },
] as const;

export type ConnectionId = (typeof CONNECTIONS)[number]["id"];

const connections = vocabulary<ConnectionId>(CONNECTIONS);

export const CONNECTION_IDS = connections.ids;
export const keepKnownConnections = connections.keepKnown;
export const connectionLabel = connections.labelFor;

export const MIN_CONNECTIONS = 1;
