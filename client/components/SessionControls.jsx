import { useState, useEffect, useRef } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";
import Button from "./Button";
import { openAIService } from "../services/openai";

export default function SessionControls({ onEventsUpdate }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [message, setMessage] = useState("");
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    const pc = new RTCPeerConnection();

    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const answer = await openAIService.createSession(offer);
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
    
    dc.onopen = () => {
      dc.send(JSON.stringify({ type: "response.create" }));
    };
  }

  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    setEvents([]);
  }

  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => {
        const newEvents = [message, ...prev];
        onEventsUpdate(newEvents);
        return newEvents;
      });
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

  function sendTextMessage(text) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
    setMessage("");
  }

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e) => {
        setEvents((prev) => {
          const newEvents = [JSON.parse(e.data), ...prev];
          onEventsUpdate(newEvents);
          return newEvents;
        });
      });

      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        onEventsUpdate([]);
      });
    }
  }, [dataChannel, onEventsUpdate]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendTextMessage(message);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 flex gap-4">
      {isSessionActive ? (
        <div className="flex w-full gap-4">
          <input
            type="text"
            className="w-full p-2 rounded bg-black/50 text-white backdrop-blur-sm"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={stopSession}
            icon={<CloudOff height={16} />}
            className="bg-red-600"
          >
            disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={startSession}
          className="w-full bg-blue-600"
          icon={<CloudLightning height={16} />}
        >
          start session
        </Button>
      )}
    </div>
  );
}