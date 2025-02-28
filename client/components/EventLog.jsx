import { ArrowUp, ArrowDown } from "react-feather";
import { useState } from "react";

function Event({ event, timestamp }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isClient = event.event_id && !event.event_id.startsWith("event_");

  return (
    <div className="flex flex-col gap-2 p-2 rounded-md bg-gray-50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isClient ? (
          <ArrowDown className="text-blue-400" />
        ) : (
          <ArrowUp className="text-green-400" />
        )}
        <div className="text-sm text-gray-500">
          {isClient ? "client:" : "server:"}&nbsp;{event.type} | {timestamp}
        </div>
      </div>
      {isExpanded && (
        <div className="text-gray-500 bg-gray-200 p-2 rounded-md overflow-x-auto">
          <pre className="text-xs">{JSON.stringify(event, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function EventLog({ events }) {
  if (events.length === 0) {
    return <div className="text-gray-500">Awaiting events...</div>;
  }

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {events.map((event) => (
        <Event
          key={event.event_id || `${event.type}-${Date.now()}`}
          event={event}
          timestamp={new Date().toLocaleTimeString()}
        />
      ))}
    </div>
  );
}
