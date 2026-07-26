# Oracle Veil — prototype

A self-contained, mobile-first PWA prototype with seven tactile tarot rituals: Love, Career, Money, Decision, Friendship / Family, Personal Growth, and General Future. It uses no third-party dependencies and can be run from any static web server.

## Run it

For the complete experience—including the private Gemini interpretation endpoint—run this with Node 18 or later:

```sh
export GEMINI_API_KEY="paste-your-key-in-your-terminal-only"
node server.mjs
```

Then open `http://127.0.0.1:4173`. The API key stays in the server process; it is not saved in the app, service worker, local storage, or source code. You may set `GEMINI_MODEL` to use an allowed Gemini model other than the default `gemini-2.5-flash`.

For a purely offline visual/ritual demo, opening `index.html` directly also works in Safari and other modern browsers. PWA installation and live Gemini interpretation require the local server (or an equivalent HTTPS deployment).

## Rituals implemented

### Love

1. Choose Love and write a question.
2. Shuffle a loose, overlapping table pile by dragging, turning, dropping, or tapping individual cards. Each move also changes the real 78-card order.
3. Gather the cards, then use a side-on view and brass marker to choose the exact first cut. The two packets visibly separate before settling in centered positions.
4. Draw the hidden card from beneath the lifted packet, choose which remaining pile belongs on top, and watch both piles meet in the center.
5. Use the side view again to place two cut markers. Three centered piles are formed; tap them in top-to-bottom order and watch them stack.
6. Sweep a path across the deck to create the spread. Cards follow the pointer during the gesture; speed and curvature change the final geometry.
7. Select three existing face-down cards, reveal any of the four in any order, and receive the single configurable mock ad checkpoint on the first reveal.
8. Read the basic spread, then unlock a mocked personal interpretation through a second mock ad checkpoint.

### Career — the Twin-Path Constellation

1. Choose the locked Career path and pass through the configurable entry ad checkpoint.
2. Pick a Career-specific question or write your own.
3. Let the opening stack ease into its constellation, then wake three clearly haloed "embers"; those cards stay above the field and are held aside while every other card visibly gathers into one deck.
4. Use the side view to cut the remaining 75 cards into two real piles.
5. Each pile opens into its spread automatically; choose one card from the first, then one from the second.
6. Reveal the five-card path: Current Ground, Your Unclaimed Strength, The Friction, Your Leverage, and The Next Bold Move.
7. On the Midnight-default share page, the five cards form a tight, touching 3-over-2 constellation.
### Money — the Living Treasury

1. Choose Money through the same sponsored entry treatment as Career, then place an open money question.
2. Give the full deck the same broad physical shuffle used by Love.
3. Use two brass markers to cut the deck into three genuine piles, then choose their left-to-right order.
4. Each pile now fans open automatically as soon as it becomes active; there is no extra “Open the spread” pause.
5. Choose one card from each spread in sequence: Keep, Grow, and Flow.
6. Reveal the three-card living ledger, then read a resource-centered reflection with a clear financial-safety disclaimer.

### Decision — the Crossroads

Decision is now a focused one-card ritual built from the same tactile language as Love.

1. Choose Decision through the same sponsored entry treatment as Career and Money, then place an open question about the choice.
2. Give the full deck a generous, physical shuffle by sweeping waves through the loose cards.
3. Gather the cards and use the Love ritual's side view and brass marker to cut the deck into two real halves.
4. See both piles from above, then press the central seal to riffle cards alternately from each half into a genuinely mixed deck.
5. Open the deck into the same broad reading arc used by Love.
6. Choose one face-down card. It travels into the center and waits in a dedicated reveal scene.
7. Tap the card, pass through the same first-reveal sponsored moment used by Love, then turn it over.
8. Enter the compact one-card reading. The card's core meaning is visible immediately; its AI interpretation stays behind a second, clearly labelled sponsored unlock.

### Friendship / Family — the Bond

1. Pass through the sponsored entrance, place a question about a friendship or family bond, and give the full deck a broad physical shuffle.
2. Use the side view and brass marker to divide the deck into two real piles: Your Voice and Their Voice.
3. The first pile spreads automatically; choose one card for Your Voice.
4. The second pile spreads automatically; choose one card for Their Voice.
5. Reveal the two cards side by side. The reading treats the second card as an invitation to curiosity, never as a claim about another person's private thoughts.

### Personal Growth — the Inner Moon

1. Pass through the sponsored entrance and name a pattern, threshold, or quality you want to understand.
2. Loosen the full deck with the same satisfying broad shuffle used by Love.
3. Gather the deck and watch it spread automatically into one continuous inner path.
4. Choose three cards: The Root, The Threshold, and The Becoming.
5. Reveal the three-card movement and receive a practical, non-diagnostic reflection.

### General Future — the Far Horizon

General Future matches Love's deliberate complexity while using an entirely different four-direction ceremony.

1. Pass through the sponsored entrance, place an open question about the season ahead, and shuffle the complete deck.
2. Use the side view to place three independent brass markers, dividing all 78 cards into four genuine quarters.
3. Assign the four piles to Dawn, Zenith, Dusk, and Midnight in the order that feels right, then align them around the compass.
4. Watch all four quarters fan outward together around the central star.
5. Choose one card from each direction in sequence: What Begins, What Becomes Clear, What Must Change, and What Guides You.
6. Reveal the four-card compass and unlock the closer AI reflection through the same deliberate reveal and interpretation pauses used by Love.

The lower-left `⌘` seal opens the development diagnostics panel. It exposes the stage, seed, pile boundaries, selected IDs, deck order, orientation, and a guided-interaction fallback. It is deliberately visible for prototype review and should be feature-flagged or removed for production.

## Architecture

`app.js` is intentionally dependency-free so the deliverable is immediately runnable. Its state is persisted under `heart-cut-prototype-v2` in `localStorage`.

- At the beginning, `state.deck` holds the complete ordered 78-card array. Every card has a stable ID, original micro-rotation, and upright/reversed state created at session start.
- `state.piles` holds genuine ranges taken from that deck. Reassembly explicitly flattens selected pile order back into `state.deck`.
- When the hidden Love card is drawn, it moves into `state.ritualCard`, leaving the physical deck with 77 cards. Decision and General Future keep all 78 cards throughout; Future divides them into four directional quarters before recording one selected card from each.
- `state.ritualCardId`, `selectedIds`, and `revealedIds` always refer to those same persistent card objects; identity and orientation are never generated on reveal.
- `STAGES` acts as the ritual state machine. Each stage only exposes the next valid manipulation.
- `AD_CONFIG` isolates the two mock ad checkpoints, so an advertising SDK can replace the overlay without touching tarot state.
- `server.mjs` owns `POST /api/interpretation` and forwards only the question plus the selected card states to Gemini: one for Decision, two for Friendship / Family, three for Money or Personal Growth, four for Love or General Future, and five for Career. The browser never receives or stores the key. The endpoint adds a per-IP rate limit (30 requests per 10 minutes) and a 20-second upstream timeout; static responses get correct MIME types, cache headers, and basic security headers.
- Face-up cards use the supplied 78-card artwork in `assets/tarot/`; deck data and rendering remain separated so the set can be swapped later. Images load lazily and fall back to a styled text face if a file is missing.

## Physics and procedural assistance

This prototype uses deliberate assisted physics instead of a full rigid-body engine:

- **True state transformations:** packet shuffle, both cuts, all reassembly choices, hidden-card removal, spread selection, and orientation flips.
- **Gesture-derived motion:** loose shuffle cards retain their dropped positions while changing packet order; side-view range markers define exact cut boundaries; the spread derives position, width, curve and rotation from pointer samples.
- **Procedural polish:** stack offsets, card micro-rotations, lift shadows, overshoot-style transitions, snapping into a coherent reading layout, paper sounds, and haptic hooks.

This is the right performance tradeoff for a 78-card mobile DOM prototype: it preserves the meaningful physical invariants while avoiding simulation work on hidden, tightly stacked cards. A production build could retain this state model while swapping the visible interaction layer for Canvas/PixiJS and activating individual card bodies only when cards separate.

## Accessibility and PWA notes

- Buttons and cards have explicit labels; touch targets also work with a mouse/trackpad.
- Stage changes move keyboard focus to the new heading; dialogs focus their controls, close on Escape, and toasts use a polite live region.
- System reduced-motion preferences collapse decorative animation, including the JavaScript-driven card flight.
- Guided mode provides a one-tap assisted spread while keeping the flow connected.
- Sound and haptics are optional toggles; sound uses short browser-generated tones (one shared AudioContext), not an autoplaying track.
- Interface copy is available in English, French, Russian, and Chinese (Settings → Language).
- `manifest.webmanifest` (SVG + PNG icons, including a maskable tile) and `sw.js` make the prototype installable from a normal static HTTPS host; the service worker serves card art cache-first and the app shell network-first.

## Production next steps

1. Move the current state model into TypeScript modules and add unit tests for state transitions and deck integrity.
2. Add a canvas/WebGL card renderer for lower-memory mobile performance.
3. Connect a server-side interpretation endpoint; retain uncertainty-aware language and do not present readings as fact.
4. Add product analytics only with explicit privacy design, especially around questions and reading content.
