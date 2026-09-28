---
version: 1
slug: "src-app-inbox-page-tsx"
primary_target: "src/app/inbox/page.tsx"
related_targets: ["src/app/inbox/[id]/page.tsx","src/components/inbox/inbox-shell.tsx","src/app/startups/[slug]/page.tsx"]
---

# Inbox surface

Scope: `/inbox` and `/inbox/:id`, an Operate surface for authenticated founders and investors. The job is to notice, understand, and safely answer a private introduction without exposing contact information. The specification fixes chronological messages, unread state, retries, blocking, and separate list/detail screens on mobile.

## Direction contract

THESIS: A calm correspondence desk where identity, startup context, and the next safe action remain visible. It refuses the generic chat-app arrangement of decorative bubbles, floating chrome, and presence theatre.

OWN-WORLD: Extend the incumbent quiet editorial marketplace: white working surface, graphite ink, cobalt action, amber reserved for consequential context, fine rules, disciplined square-edged message rows, and restrained 12–16px radii only where controls need grouping.

STORY: The participant sees which startup opened the relationship, what was said, whether action is needed, and can reply or block without a subscription surprise. Empty, offline, sending, failed, blocked, and no-longer-listed states explain recovery plainly.

FIRST VIEWPORT: Desktop pairs a narrow ordered correspondence index with the active thread; mobile shows either the index or one full thread. The message history owns the central height, while a persistent composer and status line keep the next action in reach.

FORM: Precisely specified incumbent-world extension, shaped directly from S11 and the messaging contracts; seed key `precise-spec-extension-no-seed`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
