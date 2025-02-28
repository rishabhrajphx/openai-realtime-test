import { useState } from "react";
import ShaderBackground from "./ShaderBackground";
import ToolPanel from "./ToolPanel";
import SessionControls from "./SessionControls";

export default function App() {
  const [events, setEvents] = useState([]);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const handleEventsUpdate = (newEvents) => {
    setEvents(newEvents);
    setIsSessionActive(newEvents.length > 0);
  };

  return (
    <>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <div className="relative h-full">
          <div className="absolute inset-0">
            <ShaderBackground isSessionActive={isSessionActive} />
          </div>
          <SessionControls onEventsUpdate={handleEventsUpdate} />
          <ToolPanel
            isSessionActive={isSessionActive}
            events={events}
          />
        </div>
      </main>
    </>
  );
}