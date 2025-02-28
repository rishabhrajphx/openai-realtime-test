const API_CONFIG = {
  baseUrl: "https://api.openai.com/v1/realtime",
  model: "gpt-4o-mini-realtime-preview",
  voice: "alloy",
  instructions: "You are Menmosyne.",
};

async function getEphemeralKey() {
  const response = await fetch("/token");
  const data = await response.json();
  return data.client_secret.value;
}

async function createSession(offer) {
  const EPHEMERAL_KEY = await getEphemeralKey();
  
  const sdpResponse = await fetch(
    `${API_CONFIG.baseUrl}?model=${API_CONFIG.model}&voice=${API_CONFIG.voice}&instructions=${encodeURIComponent(API_CONFIG.instructions)}`,
    {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    }
  );

  const sdp = await sdpResponse.text();
  return {
    type: "answer",
    sdp,
  };
}

export const openAIService = {
  createSession,
}; 