# Chromium on Vercel + Claude without API keys

**Problem** — First live run of the analyzer failed twice: (1) the route died at import with `Cannot find module 'playwright-core/browsers.json'`; (2) after fixing that, the Claude call 401'd — every Anthropic API key in the org (Doppler ent-agency-automation, ecas, Vercel) is dead.

**Approach**
1. Vercel's file tracer includes an external package's JS but can miss its data files. Fix: `outputFileTracingIncludes` in next.config.ts mapping the route to `./node_modules/playwright-core/**` and `./node_modules/@sparticuz/chromium/**`. Also moved the `playwright-core` import from module top-level to inside the launch function — a trace miss then fails one run instead of 500ing the entire route at load.
2. Instead of minting a new Anthropic key (burns API credits, against org rules), pointed the shared Claude helper at the ent-agent-server on Railway: `POST /complete {prompt}` → `{text, returncode, stderr}`, Bearer `AGENT_SERVER_API_KEY` — backed by the Claude Max subscription. Probed the endpoint shape FIRST (T1), then wrote the transport. Anthropic API kept as fallback when env vars are absent (keeps jest tests on the mocked fetch path unchanged).
3. Gotcha: `vercel env add` immediately followed by `git push` raced — the build snapshotted env before the vars saved. One `vercel redeploy` after the vars exist fixed it.

**Judgment calls**
- Did NOT extend the agent server for vision/image input; layout analysis uses structured above-the-fold DOM extraction instead (deterministic, no new infra). Screenshots still captured for humans via Supabase storage.
- Did NOT ask Ethan for a new API key (T12): ran the search ladder, found all keys dead, then found the already-working agent-server path.

**Reusable rules**
- On Vercel, any external package that reads its own JSON/binary files at runtime needs `outputFileTracingIncludes` — and its import belongs inside the function that uses it, never at module top.
- When a serverless app needs Claude, the ent-agent-server `/complete` endpoint is the sanctioned transport; a dead `ANTHROPIC_API_KEY` is a signal to switch transport, not to mint a key.
- Never trust a poll that never terminates: an RLS-protected table queried with the anon key returns `[]` forever — poll with service role or check the error channel.

**Verification**
- Live run c45a1647 in prod: completed in 161s — Chromium launched via sparticuz, 3 screenshots uploaded to public storage (HTTP 200), 6 fix packs generated through the agent server, verification 82/100.
