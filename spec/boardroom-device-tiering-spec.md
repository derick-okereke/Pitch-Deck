# Boardroom Scene — Device Tiering Spec

Companion to [06-simulator-and-ai.md](06-simulator-and-ai.md) and
[09-visual-assets-and-webgpu.md](09-visual-assets-and-webgpu.md).
Owner-approved tiering rules, updated 26 September 2026.

## Device policy

- **Phones are Tier 2 only**, regardless of GPU capability, WebGPU support,
  screen size, desktop-site mode, or attached mouse/keyboard. No user-facing
  override may enable Tier 1 on a phone.
- Tablets also remain Tier 2, including tablets with keyboard cases or
  trackpads, preserving the original mobile policy.
- Only laptop/desktop devices are candidates for Tier 1. They must also
  pass initialization and remain within the performance budget.
- Start every scene in Tier 2. Unknown or ambiguous device classification
  stays in Tier 2; a capable GPU does not override the device policy.

## Eligibility and initialization

The `(hover: hover) and (pointer: fine)` query describes primary input
capabilities; it is not proof that a device is a laptop or desktop.
Neither viewport width nor WebGPU presence establishes device class.

Use a conservative device-classification step before importing the full
renderer. Mobile/tablet indicators veto Tier 1 even when a fine pointer
is available. Browser-provided device hints and platform indicators are
heuristics, not an infallible hardware identity: conflicting, unavailable,
or inconclusive evidence must resolve to `unknown`, not `desktop`.
The classifier must be implemented and tested separately; the following
is the eligibility contract, not a complete classifier:

```ts
type DeviceClass = 'phone' | 'tablet' | 'desktop' | 'unknown';

function mayAttemptFullScene(deviceClass: DeviceClass): boolean {
  return deviceClass === 'desktop'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && 'gpu' in navigator;
}
```

- Evaluate initial eligibility on scene mount. Window resizing changes
  layout, not the selected tier.
- Apply the saved Reduce experience preference before attempting the full
  renderer. Reduced-motion preferences stop decorative motion within the
  selected experience; they do not switch tiers.
- Only an eligible desktop may dynamically import the Three.js scene.
  Keep the selected experience separate from asynchronous graphics readiness.
  Adapter, initialization, and chunk-load errors preserve the shared room and
  full-experience selection, with a visible Retry graphics control.
- Keep the full renderer isolated from shared audio/UI imports. Do not
  preload or prefetch its chunk on Tier 2-only devices.
- Provide a visible **Reduce experience** control. On desktop it disposes
  the full scene and selects static Tier 2 without interrupting the session.
  **Use full experience** reverses this saved choice. This is the only runtime
  tier switch on an eligible desktop. Phones and tablets remain Tier 2 only.

## Tier 1 — Full WebGPU experience

- The same approved room and outlined chairs as Tier 2, enhanced with bounded
  GPU particles and ambient motion. Constellation dots are independent, without
  connecting lines. Photorealism is not a requirement.
- Use the existing visual language: deep charcoal, cobalt speaking signals,
  and earned amber only after feedback. Keep inactive personas calm.
- A TSL uniform drives a real voice-reactive pulse for the active speaker.
- Restrained bloom/glow is optional and is the first effect removed under
  performance pressure.
- Build with `three/webgpu`, `three/tsl`, and node materials.

### Performance budget and explicit experience selection

- Retain the provisional ceiling of **10,000 particles**, pixel ratio
  **at most 1.5**, and target **at least 30 fps** on the demo laptop.
- Do not connect constellation particles. Tune bounded particle density
  within the performance budget.
- Bound the lite scene's dot count, canvas resolution, and update rate too.
- Low frame rates must not change the selected tier. Optimise effect cost
  within Tier 1; only the user can select Reduce experience.
- Rendering changes must never restart audio or session state.

## Tier 2 — Lightweight experience

- Phones, tablets, unknown devices, and ineligible desktops receive this
  complete, intentional experience.
- **No Three.js/WebGPU renderer bundle is requested on a Tier 2-only path.**
  Use a conditional import boundary, not merely a hidden or disabled canvas.
  A desktop that downgrades after loading Tier 1 cannot undo its download,
  but must dispose the renderer and stop its GPU work.
- Use a small, fixed-count CSS or Canvas2D dot composition in the shared
  brand colours, retaining three identifiable persona positions.
- Preserve the live voice waveform using lightweight Canvas2D or SVG,
  driven by the same audio signal as Tier 1.
- Reduced motion and Reduce effects show a static composition; semantic
  speaker and microphone status remain available in HTML.

## Shared audio and session controls

Build amplitude extraction once, upstream of both renderers. Analyse the
founder's microphone during their turn and actual persona TTS playback
during theirs. Both visuals consume the same level and active-speaker state.

- Renderer changes must not recreate the analyser, restart recording,
  reacquire microphone permission, or lose session state.
- Start microphone capture only after consent and an explicit gesture.
  Silence, paused playback, unavailable audio, or failed TTS shows an idle
  signal; never simulate speech. Volume is not a confidence score.
- Keep question text, timers, speaker identity, microphone status, recording
  controls, and feedback in semantic HTML outside the canvas.
- Preserve the written-question continuation when TTS fails.

## Lifecycle and recovery

- Pause decorative rendering when the page is hidden or the scene is outside
  the viewport; this must not stop an active recording or session timer.
- Honour reduced motion in both tiers, with static visuals preserving meaning.
- On GPU device loss, retain the selected experience and shared room. Permit at
  most one graphics recovery attempt when not capturing or playing audio.
  Failed recovery pauses the GPU layer and exposes Retry graphics; it must not
  silently select Tier 2. Never reload the page or interrupt capture.
- Show the founder microphone indicator only during countdown and recording
  after Start pitch or Record answer. At boardroom widths up to 680px, show
  only the initials circle and a blue ring responding to real microphone
  amplitude. Wider rooms use a minimal, translucent rounded waveform bar.
- Dispose renderers, observers, animation loops, and listeners on route exit.
  Audio resources belong to the session lifecycle and are cleaned up there.

## Acceptance checks

- On phone/tablet and unknown-device paths, verify zero Three.js renderer
  chunk requests, including preloads and prefetches.
- Test phones with desktop-site mode and attached peripherals, tablets with
  keyboard/trackpad, and desktop devices with and without WebGPU.
- Test adapter/initialization failure, chunk-load failure, simulated device
  loss, sustained poor performance, and Reduce effects during a session.
  Recording and session progress must survive every renderer transition.
- Test reduced motion, hidden-page/out-of-view behaviour, route cleanup,
  keyboard controls, 320/390 px layouts, and 200% zoom.
- Complete a pitch-and-answer session on an actual low-memory phone and
  measure the full scene on the actual demo laptop. Viewport emulation alone
  does not establish mobile performance.
- Confirm both tiers respond to the same real microphone/TTS audio and remain
  idle during silence or unavailable playback.

## Remaining implementation decisions

- Exact particle/dot counts and effect density within
  the stated budgets, selected through measurement.
- Tier 2 composition and motion details, recorded against the existing
  `stitch_brand_design_system_generator/DESIGN.md` visual authority.
- Conservative classifier rules and the tested browser/device matrix. Device
  identity cannot be guaranteed against spoofed browser signals; ambiguity
  must never be treated as permission to load Tier 1.

This spec refines the boardroom rendering/fallback rules in spec/09. Existing
audio, session, privacy, and scoring requirements remain authoritative.
