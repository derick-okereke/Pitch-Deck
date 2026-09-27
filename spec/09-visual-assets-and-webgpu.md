# Visual assets and WebGPU direction

Status: owner-directed addition, 26 September 2026. The owner wants the landing hero to carry a meaningful visual element and has installed the project-local `webgpu-threejs-tsl` skill primarily for the AI simulator. This extends the existing Quiet Editorial Marketplace world; it does not replace it.

## One visual language, two levels of rendering

The signature visual system is **Pitch Signal**: a founder's spoken pitch begins as a controlled cobalt waveform, travels through three distinct fictional investor nodes, and resolves into an amber readiness signal. It makes the product loop visible in one glance: practise → face scrutiny → improve → become discoverable.

- **Landing hero:** use a lightweight, code-authored SVG/canvas/DOM composition. It should feel like a still or miniature prelude to the boardroom, with calm motion and an immediately legible product story. Do not initialize a second WebGPU renderer on the landing page for decoration.
- **Simulator:** use Three.js `WebGPURenderer`, `three/tsl`, node materials, and bounded GPU particles for the contained boardroom scene. The scene carries the full spatial and speaking-state experience.
- **Shared grammar:** cobalt signal lines, deep-charcoal field, restrained neutral grid, three persona nodes, and earned amber only at the resolved score/state. Avoid generic AI orbs, neon clouds, floating glass cards, stock boardrooms, robot faces, and decorative gradients.

This direction preserves the existing product-led hero copy and dual founder/investor CTAs. The visual demonstrates the mechanism; it does not replace the value proposition or push either audience below the fold.

## Hero visual contract

Desktop first viewport uses an asymmetrical two-part composition within the existing editorial panel: headline/description/dual CTAs remain the primary reading path; the Pitch Signal occupies the complementary visual field or lower-right stage without becoming a generic dashboard screenshot.

The visual has four readable phases:

1. A founder marker emits a measured waveform labelled `Live pitch`.
2. The waveform passes through three fictional investor nodes with short focus labels such as `Market`, `Traction`, and `Ask`.
3. The signal tightens into evidence ticks rather than fireworks.
4. A compact `Pitch-Readiness 78` demonstration state appears in amber and is explicitly labelled `Illustrative demo`.

Motion is one orchestrated 6–8 second loop: signal enters, nodes respond in sequence, score resolves, then a quiet hold/reset. No continuous random movement, mouse-following, parallax, autoplay sound, or motion that implies the AI is listening before microphone consent. With `prefers-reduced-motion`, show the final composed state. All meaning is available as nearby HTML text; the visual is `aria-hidden` if it duplicates that text.

On mobile, reduce to one horizontal signal strip below the CTAs: founder marker → three nodes → score. Do not shrink the desktop diagram until labels become unreadable. The hero remains useful if all animation and scripting fail.

Performance target: no raster dependency for the main hero, no blocking network asset, <=30 KB compressed custom SVG/visual code excluding shared runtime, animate transforms/opacity/stroke offsets, stop when outside the viewport, and preserve a stable aspect ratio to avoid layout shift.

## Simulator boardroom contract

Build the neural boardroom from code-native geometry and TSL materials; no photorealistic room asset is required. Three abstract seat/persona constellations occupy stable positions. A restrained particle lattice suggests attention and pressure without representing real people. The speaking persona receives a cobalt pulse and slight local particle coherence; inactive personas remain visible and calm. The amber readiness colour appears only after feedback is complete, not while the founder is recording.

Technical requirements from the installed WebGPU skill:

- Import from `three/webgpu` and `three/tsl`; use node materials rather than handwritten shader strings where TSL covers the effect.
- Lazy-load the renderer on simulator routes. Check `navigator.gpu`, initialize asynchronously, and never make core session controls depend on successful GPU initialization.
- Use uniforms for active-speaker, amplitude, phase and reduced-effects state. Keep application state outside transient GPU buffers so device recovery cannot lose a recording/session.
- Keep the existing proposed ceiling of 10,000 particles, pixel ratio <=1.5 and target >=30 fps on the demo device. Request no elevated adapter limits unless measurement proves they are required; the effect should fit guaranteed defaults.
- Listen for device loss. Recover graphics once when audio is idle; if recovery fails, retain the selected experience and shared room with Retry graphics. Never automatically switch tiers. Do not reload or interrupt the active recording session.
- Pause animation when the page is hidden, canvas is outside the viewport, or reduced effects are enabled. Dispose renderer, observers and listeners on route exit.
- Test the scene with WebGPU unavailable, initialization failure, simulated device loss, reduced motion, 320/390 px widths and the actual demo laptop.

The boardroom remains a progressive enhancement. Question text, timers, mic state, recording controls and feedback are semantic DOM outside the canvas.

## Asset manifest

The initial build does **not** require the owner to supply visual files. These can be produced during implementation:

| Asset | Form | Source / provenance | Owner input needed? |
|---|---|---|---|
| Pitch Signal hero | SVG/canvas + HTML | Authored in code from this specification | No |
| Persona constellation geometry | Three.js/TSL | Procedural code | No |
| Waveform/signal paths | SVG/TSL | Procedural code driven by demo state | No |
| Score ring and evidence ticks | SVG/HTML | Existing design tokens | No |
| UI icons | Small original SVG or established open icon set with recorded licence | Authored/sourced during build | No |
| Hero reduced-motion/failure still | SVG or screenshot of the approved rendered state | Derived from the final build, not separately invented | No |
| Social preview image | 1200×630 raster derived from the approved hero; includes product name and illustrative label | Generated/exported after hero approval with prompt/source metadata embedded | No, unless owner has a preferred campaign line |
| Favicon/app mark | Typography-first `PD` or signal mark | Derived from approved wordmark/visual system | Optional approval before final export |

Do not generate founder portraits, investor headshots, customer logos, testimonials, company screenshots, or investment proof. Those assets would imply real people or evidence that the project does not yet have. Synthetic startup cards may be used only with an `Illustrative demo` label.

Any generated raster must retain its exact generation prompt in metadata/sidecar and be reviewed at its real display size. Any sourced raster must record origin and licence. Prefer SVG/code-native assets wherever the visual is geometric, animated, or stateful.

## Optional owner materials

Nothing is required to begin. The following would improve authenticity if they already exist; do not delay the build waiting for them:

- A final logo or wordmark, if `Pitch Deck` should not remain typography-only.
- A preferred favicon/app-mark concept.
- Any real founder/investor photography with explicit permission to use it.
- Real partner/customer logos, testimonials, or outcome data with permission and exact approved wording.
- A particular visual reference the owner wants the hero to sit beside. References guide quality and composition; they are not copied.

If none are supplied, retain the typography-only wordmark and code-native visual system. That is the recommended default for this brand.

## Acceptance additions

- The first viewport communicates practice, three-person investor scrutiny, scoring and discovery without reading lower-page sections.
- Hero visual and simulator feel related but are not duplicate scenes.
- Hero stays interactive/readable without WebGPU; simulator stays functional after GPU failure.
- No real-person likeness, fake company proof, unlabelled synthetic data, generic AI orb or unexplained decorative animation appears.
- Reduced-motion and static fallbacks preserve the complete meaning.
- Desktop and mobile captures show both CTAs before scrolling and no visual/text collision at 200% zoom.
