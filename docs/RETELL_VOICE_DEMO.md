# Live voice demo (Retell AI)

The `/demo` page has two modes:

- **Guided demo** — a fully on-device simulation (no keys, works anywhere).
- **Live voice** — a *real* two-way call: the visitor's microphone streams to a
  Retell AI agent that answers out loud, with the dialogue transcribed live.

Live voice turns on automatically once these two server env vars are set:

```
RETELL_API_KEY=          # your Retell secret API key
RETELL_DEMO_AGENT_ID=    # the agent id the public demo should connect to
```

When they're unset, `/api/retell/web-call` returns `503 { configured: false }`
and the UI falls back to the guided demo — nothing breaks.

## One-time setup

1. **Create a Retell account** → https://dashboard.retellai.com
2. **Create an agent** (a Single-Prompt or Conversation-Flow agent). Pick a
   voice you like and paste the prompt below as the system/global prompt.
3. **Copy two values into your env** (Vercel → Settings → Environment Variables):
   - `RETELL_API_KEY` — Dashboard → API Keys
   - `RETELL_DEMO_AGENT_ID` — the agent's id (looks like `agent_xxx`)
4. **Redeploy.** The demo page's "Live voice" tab now connects for real.

> Keep `RETELL_API_KEY` server-only (no `NEXT_PUBLIC_` prefix). The browser
> never sees it — it calls our `/api/retell/web-call` route, which mints a
> short-lived access token via the Retell SDK.

## Suggested demo agent prompt

```
You are the AI receptionist for a home-services company (HVAC, plumbing, or
electrical). You answer the phone warmly and professionally, sound natural and
concise, and never mention that you are an AI unless asked.

Your goal on every call:
1. Greet the caller and ask how you can help.
2. Understand the problem. If it sounds urgent (burst pipe, no AC in heat, no
   heat in cold, sparking, gas smell), acknowledge the urgency and reassure them.
3. Collect: caller name, service address, and the issue.
4. Offer the soonest reasonable appointment window and confirm it.
5. Recap the booking (name, address, job, window) and say a confirmation text
   is on its way. Keep replies short — one or two sentences.

Stay on topic. If asked something off-topic, gently steer back to booking the
service. Do not make up prices; give a rough range only if pressed.
```

## How it works (code)

- `app/api/retell/web-call/route.ts` — `POST` creates a web call via
  `lib/retell.ts#createWebCall` and returns `{ accessToken, callId, agentId }`.
  `GET` reports `{ configured }` for the UI's availability probe.
- `components/marketing/demo/LiveVoiceCall.tsx` — loads `retell-client-js-sdk`
  in the browser, calls `startCall({ accessToken })`, and renders the live
  transcript from the SDK's `update` event plus talking-state indicators.

Full inbound phone answering (your real CallCatch number) and post-call
persistence (transcript, summary, booking) land in **Phase 3**.
