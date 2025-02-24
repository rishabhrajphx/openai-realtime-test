import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user asks for weather information about any location.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_weather",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            location: {
              type: "string",
              description: "Name of the city or location",
            },
            temperature: {
              type: "number",
              description: "Current temperature in Celsius",
            },
            condition: {
              type: "string",
              description: "Weather condition (e.g., 'Sunny', 'Rainy', 'Cloudy')",
            },
            humidity: {
              type: "number",
              description: "Humidity percentage",
            },
            windSpeed: {
              type: "number",
              description: "Wind speed in km/h",
            }
          },
          required: ["location", "temperature", "condition", "humidity", "windSpeed"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function WeatherDisplay({ functionCallOutput }) {
  const { location, temperature, condition, humidity, windSpeed } = JSON.parse(functionCallOutput.arguments);

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800">{location}</h3>
        <div className="text-4xl font-bold text-blue-600 my-2">
          {temperature}°C
        </div>
        <div className="text-lg text-gray-600">{condition}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="text-center p-2 bg-gray-50 rounded-md">
          <div className="text-gray-500">Humidity</div>
          <div className="font-bold">{humidity}%</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-md">
          <div className="text-gray-500">Wind Speed</div>
          <div className="font-bold">{windSpeed} km/h</div>
        </div>
      </div>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [prevTopicKeywords, setPrevTopicKeywords] = useState([]);
  
  // Register the weather function when the session starts
  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }
  }, [events, functionAdded, sendClientEvent]);

  // Handle function call and auto-dismiss
  useEffect(() => {
    if (!events || events.length === 0) return;

    const mostRecentEvent = events[0];
    
    // Check for function calls
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response?.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_weather"
        ) {
          setFunctionCallOutput(output);
          
          // Auto-dismiss after 10 seconds
          setTimeout(() => {
            setFunctionCallOutput(null);
          }, 10000);
          
          // Send follow-up to continue the conversation
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                Ask if they would like to know some fun facts about ${JSON.parse(output.arguments).location}.
                Keep the conversation natural.
              `,
              },
            });
          }, 500);
        }
      });
    }
    
    // Topic change detection
    if (
      mostRecentEvent.type === "conversation.item.create" &&
      mostRecentEvent.item?.role === "user" &&
      mostRecentEvent.item?.content?.[0]?.text
    ) {
      const userText = mostRecentEvent.item.content[0].text.toLowerCase();
      const currentKeywords = userText.split(/\s+/).filter(word => 
        word.length > 3 && !["weather", "temperature", "forecast", "climate"].includes(word)
      );
      
      // If we have previous keywords to compare against
      if (prevTopicKeywords.length > 0 && functionCallOutput) {
        // Check if topic has changed significantly
        const totalPrevKeywords = prevTopicKeywords.length;
        let matchingKeywords = 0;
        
        currentKeywords.forEach(word => {
          if (prevTopicKeywords.includes(word)) {
            matchingKeywords++;
          }
        });
        
        // If less than 30% keywords match, consider it a topic change
        if (totalPrevKeywords > 0 && matchingKeywords / totalPrevKeywords < 0.3) {
          setFunctionCallOutput(null); // Dismiss weather display on topic change
        }
      }
      
      // Update previous keywords for next comparison
      setPrevTopicKeywords(currentKeywords);
    }
  }, [events, sendClientEvent, prevTopicKeywords]);

  // Reset state when session ends
  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
      setPrevTopicKeywords([]);
    }
  }, [isSessionActive]);

  if (!functionCallOutput) {
    return null; // Don't render anything if there's no weather data
  }

  return (
    <div className="absolute top-4 right-4 z-10 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg w-80">
        <div className="relative">
          <button 
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            onClick={() => setFunctionCallOutput(null)}
          >
            ✕
          </button>
          <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Weather Information</h2>
            <WeatherDisplay functionCallOutput={functionCallOutput} />
          </div>
        </div>
      </div>
    </div>
  );
}