# Scheduling guardrail — Retell custom function

The `onboard:client` script attaches this automatically. For a **manual** agent
setup (pasting the prompt in the Retell dashboard), also add this custom
function so the agent can check the service area + real openings before booking.

Retell dashboard → your agent → **Functions / Tools → Add custom function** →
paste this (adjust the URL if your domain differs):

```json
{
  "type": "custom",
  "name": "check_availability",
  "url": "https://www.callcatchai.online/api/retell/check-availability",
  "description": "Check whether a caller's address is inside the service area and get realistic open appointment times. ALWAYS call this before offering or confirming a time. Use the returned `message` to decide what to say; only offer times in `available_slots`.",
  "speak_during_execution": true,
  "execution_message_description": "Let me check the schedule for you real quick…",
  "speak_after_execution": true,
  "parameters": {
    "type": "object",
    "properties": {
      "address": { "type": "string", "description": "The service address the caller gave (street, city)." },
      "preferred_day": { "type": "string", "description": "The day they want: \"today\", \"tomorrow\", a weekday, or YYYY-MM-DD." },
      "preferred_window": { "type": "string", "description": "Optional: \"morning\", \"afternoon\", or \"evening\"." }
    },
    "required": ["address"]
  }
}
```

The endpoint (`/api/retell/check-availability`) reads that business's scheduling
config from `businesses.settings.scheduling` (base address + radius, hours, job
duration, buffer, max/day, timezone) and returns only realistic, in-area slots.
