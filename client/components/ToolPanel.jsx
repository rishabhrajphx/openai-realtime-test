import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user asks for weather information.
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

      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
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

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_weather"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask if they would like to know the weather for another location
              `,
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Weather Information</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <WeatherDisplay functionCallOutput={functionCallOutput} />
          ) : (
            <p>Ask about the weather for any location...</p>
          )
        ) : (
          <p>Start the session to check weather information...</p>
        )}
      </div>
    </section>
  );
}
