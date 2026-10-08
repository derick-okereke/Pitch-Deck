# Pxxl runtime memory and audio uploads

Confirm Compute & Scaling shows 1.5 GB RAM and 1 vCPU. An account upgrade alone
may leave the project at 0.5 GB. Do not use the new default on that allocation.

Keep the start command `npm run start`. The launcher now defaults to a 768 MiB
V8 old-space limit, leaving room for other heap regions, native libraries,
buffers, and the launcher in a 1.5 GB container. This is a starting budget,
not a total memory cap or a guarantee of smooth performance. Measure normal
use and a full simulator session before adjusting it.

In project Secrets, inspect `NODE_OPTIONS`. An explicit
`--max-old-space-size=256` overrides the default; remove that old restriction
or intentionally set `--max-old-space-size=768`. Preserve unrelated options.
Alternatively set `NODE_HEAP_LIMIT_MB=768` without a heap cap in NODE_OPTIONS.
The repository default applies to the runtime, not to `npm run build`.
Restart/redeploy as required for changed variables to take effect.

Recordings now upload directly from the browser to the private `pitch-audio`
Supabase bucket. Preparation checks session ownership, state, version, size,
type and duration. Fresh object paths prevent overwriting accepted evidence.
A signed processing ticket binds metadata to the user and session and expires
after 15 minutes. Processing checks stored size and MIME type before changing
session state. Groq reads a server-generated five-minute signed URL, so Pxxl
does not download the recording. The database still holds references,
transcripts and metrics. No migration or public bucket is required.

Recording controls and processing screens are unchanged. Validate a real pitch
and both answers after deployment: local checks cannot verify service credentials
or browser CORS. Uncompleted uploads may leave unreferenced private objects;
include them in storage retention cleanup.
