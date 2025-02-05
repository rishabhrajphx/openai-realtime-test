import { useState, useRef } from "react";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const peerConnection = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElement = useRef(null);
  const recognitionRef = useRef(null);

  async function startSession() {
    try {
      // Get an ephemeral key from the Fastify server
      const tokenResponse = await fetch("/token");
      const data = await tokenResponse.json();
      const EPHEMERAL_KEY = data.client_secret.value;

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => {
        audioElement.current.srcObject = e.streams[0];
      };

      // Create a data channel for events
      const dc = pc.createDataChannel("oai-events");
      dc.addEventListener("open", () => {
        setIsSessionActive(true);
        startVoiceRecognition();
      });
      // We're not displaying messages anymore, so no need for a message event listener.
      dc.addEventListener("message", () => {});

      // Add local audio track for the connection.
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track);
      });

      // Start SDP negotiation
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-mini-realtime-preview";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;
      dataChannelRef.current = dc;
    } catch (error) {
      console.error("Error starting session", error);
    }
  }

  function stopSession() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setIsSessionActive(false);
  }

  function startVoiceRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim();
      if (transcript) {
        sendVoiceMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function sendVoiceMessage(transcript) {
    if (!dataChannelRef.current) {
      console.error("No active data channel.");
      return;
    }
    const chatEvent = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: transcript,
          },
        ],
      },
      event_id: crypto.randomUUID(),
    };
    dataChannelRef.current.send(JSON.stringify(chatEvent));
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!isSessionActive ? (
        <button
          onClick={startSession}
          style={{
            padding: "1rem 2rem",
            fontSize: "1rem",
            backgroundColor: "#4CAF50",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Start Session
        </button>
      ) : (
        <button
          onClick={stopSession}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          End Session
        </button>
      )}
    </div>
  );
}
