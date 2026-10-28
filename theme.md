# Yaply Theme System - Hybrid Approach (Option C)

## Design Philosophy
Yaply is a premium social gaming app that combines the best of both worlds - the gaming identity from design 1 with the polished interface from design 2. The lobby/premium screens use a dark, glassmorphic aesthetic, while individual games get their own colorful, playful personalities.

## Core Theme: Premium Social Gaming

### Color Palette

#### Backgrounds
| Name | Hex | RGB | Usage |
|---|---|---|---|
| `--bg-deepest` | `#050510` | 5, 5, 16 | Deepest background (game over modal backdrop) |
| `--bg-primary` | `#0a0a1a` | 10, 10, 26 | Primary app background |
| `--bg-secondary` | `#12122a` | 18, 18, 42 | Secondary surfaces, cards |
| `--bg-tertiary` | `#1a1a3a` | 26, 26, 58 | Elevated surfaces, inputs |

#### Brand Colors
| Name | Hex | RGB | Usage |
|---|---|---|---|
| `--primary` | `#8b5cf6` | 139, 92, 246 | Primary brand color, CTAs, active states |
| `--primary-hover` | `#a78bfa` | 167, 139, 250 | Primary hover state |
| `--primary-glow` | `rgba(139, 92, 246, 0.5)` | - | Glow effects for primary elements |
| `--accent-coral` | `#fb7185` | 251, 113, 133 | Secondary accent, playful elements |
| `--accent-coral-hover` | `#fda4af` | 253, 164, 175 | Coral hover state |
| `--accent-blue` | `#38bdf8` | 56, 189, 248 | Highlights, info states |
| `--accent-blue-hover` | `#7dd3fc` | 125, 211, 252 | Blue hover state |
| `--accent-cyan` | `#22d3ee` | 34, 211, 238 | Links, selected states |
| `--accent-yellow` | `#fbbf24` | 251, 191, 36 | Warnings, highlights |

#### UI Colors
| Name | Hex | RGB | Usage |
|---|---|---|---|
| `--text-primary` | `#f8fafc` | 248, 250, 252 | Primary text |
| `--text-secondary` | `#cbd5e1` | 203, 213, 225 | Secondary text |
| `--text-tertiary` | `#94a3b8` | 148, 163, 184 | Tertiary text, labels |
| `--border` | `rgba(148, 163, 184, 0.25)` | - | Default borders |
| `--border-glow` | `rgba(139, 92, 246, 0.5)` | - | Glowing borders |
| `--surface` | `rgba(18, 18, 42, 0.6)` | - | Translucent surfaces |
| `--surface-hover` | `rgba(139, 92, 246, 0.18)` | - | Surface hover states |

#### Status Colors
| Name | Hex | RGB | Usage |
|---|---|---|---|
| `--success` | `#22c55e` | 34, 197, 94 | Success, correct guesses |
| `--warning` | `#f59e0b` | 245, 158, 11 | Warnings, timer |
| `--danger` | `#ef4444` | 239, 68, 68 | Errors, destructive actions |

### Glassmorphism Effects
Glass effects are used **selectively** as recommended:

| Element | Effect | Usage |
|---|---|---|
| Cards (Lobby/Home) | `backdrop-filter: blur(24px) saturate(180%)` with gradient background | Premium panels |
| Header | `backdrop-filter: blur(20px)` with semi-transparent bg | Navigation |
| Modals/Dialogs | `backdrop-filter: blur(32px)` with stronger blur | Overlay dialogs |
| Toolbars | `backdrop-filter: blur(24px)` | Floating controls |
| In-game overlays | Selective blur only where needed | Room creation, player lists, voice chat |

**Rule:** Game names, buttons, scores, and critical game information should remain on solid/opaque backgrounds for readability.

### Typography

| Font | Weight | Usage |
|---|---|---|
| `Plus Jakarta Sans` | 400-800 | Headings, logo, display text |
| `Inter` | 400-800 | Body text, UI elements, forms |

Fallbacks: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`

### Spacing & Border Radius
- **Border Radius:** `12px` (small), `16px` (medium), `20px` (large), `24px` (x-large), `999px` (pill)
- **Shadows:** Layered shadows for depth - use glows for interactive elements
- **Transitions:** `0.2s cubic-bezier(0.4, 0, 0.2, 1)` for micro-interactions, `0.3s` for larger transitions

### Component Guidelines

#### Buttons
- Primary: Gradient from `--primary` to `#7c3aed`, with glow shadow
- Secondary: Gradient with neutral tones, subtle border
- Icon buttons: Circular or rounded, translucent background
- Touch targets: Minimum 44x44px

#### Cards
- Background: Gradient `linear-gradient(180deg, rgba(139, 92, 246, 0.14) 0%, rgba(18, 18, 42, 0.92) 100%)`
- Border: `1px solid var(--border)` with hover state adding glow
- Border radius: 20px
- Padding: 20-24px

#### Navigation
- Mobile-first bottom navigation (to be implemented)
- Header with room info, stats
- One primary action per screen

### Game-Specific Personalities
Each game maintains Yaply's brand identity while having unique theming:

| Game | Theme Direction | Colors |
|---|---|---|
| **Skribbl** | Bright canvas, playful | Warm colors, colorful palette, animated elements |
| **Who's the Spy?** | Mysterious dark | Deep purples, blacks, dramatic reveals, amber accents |
| **Chain Reaction** | Clean board, vivid | Bright cyans/oranges, satisfying animations |
| **Smash Karts** | Action-oriented, energetic | Bold corals/blues, dynamic lighting, racing aesthetic |

All games should feel part of Yaply but have distinct personalities.

## Implementation Notes
- Mobile-first responsive design
- Portrait-first for lobbies/social screens
- Landscape support for games when beneficial
- PWA-ready structure
- Minimal blur on budget devices consideration
- High contrast for readability
- Large touch targets (min 44x44px)

## Brand Identity
- **Name:** Yaply (replacing Cipher Draw references)
- **Tagline:** "Play with friends. Anytime. Anywhere."
- **Vibe:** Premium social gaming - fun without feeling childish, sophisticated without feeling corporate



The best way to implement **Design C — Premium Dark + Playful Games** is to give Yaply one recognizable design system while letting the homepage, Chain Reaction, and Skribbl have their own layouts and personalities.

The prompt below is designed for your existing OpenCode setup. It instructs the coding agent to inspect your monorepo first, preserve working multiplayer functionality, and implement the design across the three applications without blindly rebuilding everything.

It covers the visual system, mobile-first layouts, reusable components, individual game interfaces, animations, accessibility, PWA readiness, and testing.

Copy this entire prompt into OpenCode. It's written to make the agent work against your actual codebase rather than merely generate attractive mockups.

# YAPLY — PREMIUM DARK + PLAYFUL GAMING
## Complete Design System and Frontend Implementation Across the Monorepo

You are the lead product designer, senior frontend engineer, and UI architect for **Yaply**, a mobile-first social gaming platform.

Your task is to audit the existing repository and implement a cohesive, production-quality **Premium Dark + Playful Games** design across these three applications:

1. **Yaply Home:** `yaply.eu.org`
2. **Chain Reaction:** `chain.yaply.eu.org`
3. **Skribbl:** `skribbl.yaply.eu.org`

This is not a request to create three unrelated websites, a static Figma-style mockup, or a generic gaming dashboard.

Build a connected product experience with one recognizable brand, a shared design system, and distinct game interfaces.

The design direction combines:
- The deep purple atmosphere, gaming identity, and layered visual depth of premium gaming dashboards.
- The subtle borders, restrained translucency, and refined surfaces of glassmorphism.
- The colorful, expressive, playful character of social multiplayer games.
- The usability, responsiveness, and interaction patterns of well-designed mobile applications.

**The final product should feel like a premium social gaming app, not a game marketplace, a crypto dashboard, or a generic AI-generated website.**

---

# PHASE 0 — AUDIT THE EXISTING REPOSITORY FIRST

Before modifying anything, inspect the actual repository.

Do not assume that the current folder structure exactly matches the proposed architecture below.

Inspect:

- Root `package.json` and workspace configuration.
- Existing application directories.
- `apps/web`, if present.
- Existing Chain Reaction implementation, if present.
- Existing Skribbl implementation, if present.
- `apps/realtime`, if present.
- `packages/shared` and other shared packages.
- Existing routes, layouts, components, CSS, Tailwind configuration, and fonts.
- Existing game engines, room management, WebSocket clients, and event schemas.
- Existing authentication, session handling, and database integrations.
- Existing deployment configuration.
- Existing tests and build scripts.

Determine which components are already functional and which are placeholders.

Produce a short audit before implementing the changes.

Identify:

1. Which application is currently the main homepage.
2. Where Chain Reaction and Skribbl currently live.
3. Whether the applications are independently deployable.
4. Which components can be reused.
5. Which components need visual improvements.
6. Which features are implemented, incomplete, or nonfunctional.
7. Any architectural issues that could prevent the design from working.

## Architecture rules

The intended deployment architecture is:

- `apps/web`: main Yaply website.
- `apps/chain`: Chain Reaction frontend.
- `apps/skribbl`: Skribbl frontend.
- `apps/realtime`: shared multiplayer backend, if this is the existing backend architecture.
- `packages/shared`: common event types, schemas, and shared logic.
- `packages/ui`: reusable visual components, if appropriate.

If the repository currently uses a different structure, adapt the implementation to the real codebase.

Do not create duplicate applications or move working code unnecessarily.

Do not split the Git repository.

Do not create additional Vercel projects or backend services automatically.

Do not replace existing working game logic merely to make the UI easier to build.

If the applications have not yet been separated, propose the smallest safe migration required. Do not perform a risky large-scale extraction without first identifying the affected files and dependencies.

Once the audit is complete, proceed with implementation in small, verifiable phases.

---

# PHASE 1 — ESTABLISH THE YAPLY VISUAL IDENTITY

## 1.1 Core design philosophy

Yaply should communicate four things immediately:

- Premium quality.
- Playfulness.
- Social interaction.
- Fast access to multiplayer games.

Use a dark visual foundation, subtle depth, restrained glass surfaces, and vivid game-specific accents.

The design must feel intentional rather than decorative.

Avoid:
- Excessive gradients.
- Random neon effects.
- Excessive blur.
- Every element being inside a card.
- Huge rounded rectangles everywhere.
- Generic SaaS dashboard layouts.
- Unnecessary charts, statistics, and dashboard widgets.
- Random emojis used as substitutes for artwork.
- Fake friends, fake activity, fake online counts, or fabricated statistics.
- Placeholder buttons that look functional but do nothing.
- Overly large headings that push the actual content below the fold on mobile.
- Excessive animations that make the interface slow or distracting.

Use negative space, typography, alignment, contrast, and a few strong visual elements to create a premium appearance.

## 1.2 Color system

Create centralized design tokens instead of scattering arbitrary color values throughout the codebase.

Use the following palette as the starting point.

### Brand foundation

| Token | Value | Purpose |
|---|---|---|
| `brand-background` | `#100D18` | Main application background |
| `brand-surface` | `#191424` | Primary surface |
| `brand-surface-raised` | `#231C32` | Elevated panels and menus |
| `brand-surface-hover` | `#2D2440` | Hover and active surfaces |
| `brand-border` | `#382D4B` | Subtle borders |
| `brand-text` | `#F7F4FC` | Primary text |
| `brand-text-secondary` | `#B9B0C9` | Secondary text |
| `brand-text-muted` | `#898097` | Supporting information |

### Brand accents

| Token | Value | Purpose |
|---|---|---|
| `brand-violet` | `#9B6DFF` | Primary brand accent |
| `brand-violet-bright` | `#B69AFF` | Hover and highlight states |
| `brand-coral` | `#FF6B70` | Important actions and playful accents |
| `brand-blue` | `#65A8FF` | Informational accents |
| `brand-yellow` | `#FFD66B` | Highlights and selected game details |
| `brand-green` | `#54D6A0` | Success and positive status |
| `brand-danger` | `#FF647C` | Errors and destructive actions |

Treat these values as initial design tokens, not immutable constraints. Adjust them if necessary to achieve better contrast or a more cohesive visual result.

Do not use every accent color simultaneously on every screen.

Use violet as the recognizable Yaply accent. Use coral, blue, yellow, and green selectively.

## 1.3 Typography

Use:

- **Plus Jakarta Sans** for major headings and selected display text.
- **Inter** for body text, controls, labels, and most UI.

Use `next/font/google` only if appropriate for the existing application. Otherwise, use an existing font-loading strategy.

Prefer optimized local font delivery where supported.

Establish a consistent type scale.

Example:

- Display headings: approximately 32–48px on desktop, responsive on mobile.
- Section headings: approximately 22–30px.
- Card titles: approximately 16–20px.
- Body text: approximately 14–16px.
- Supporting labels: approximately 12–14px.

Do not make important game information excessively small.

Use appropriate font weights rather than making everything bold.

## 1.4 Shape, spacing, and surfaces

Use a consistent spacing scale based on 4px or 8px increments.

Recommended corner radii:

- Small controls: 8–12px.
- Standard cards: 14–20px.
- Feature panels: 20–28px.
- Pills: fully rounded where appropriate.

Do not give every component the same radius.

Use subtle borders, restrained shadows, and carefully controlled lighting.

Create a reusable glass surface treatment for selected elements.

A suitable starting point:

- Background: translucent dark violet.
- Border: thin, low-opacity lavender.
- Backdrop blur: moderate.
- Shadow: subtle and diffuse.

Use glass effects for floating menus, selected overlays, player panels, and occasional feature cards.

Keep important content surfaces sufficiently opaque to preserve readability.

Do not apply expensive backdrop filters to every element.

## 1.5 Buttons and interaction states

Create reusable button variants:

- Primary.
- Secondary.
- Outline.
- Ghost.
- Destructive.
- Icon button.

Primary actions should be visually obvious.

Use violet as the main brand action color, with coral reserved for selected game actions or important highlights.

Every interactive element must have:

- A default state.
- A hover state where applicable.
- A pressed state.
- A visible keyboard-focus state.
- A disabled state when appropriate.
- A loading state when performing an asynchronous action.

Provide immediate feedback when users create rooms, join games, copy room codes, or change settings.

Do not rely on color alone to communicate success, failure, or selection.

---

# PHASE 2 — BUILD A SHARED DESIGN SYSTEM

Implement reusable components in the most appropriate shared package.

If `packages/ui` already exists, evaluate and extend it.

Otherwise, create it only if the monorepo architecture supports sharing components cleanly.

Do not introduce unnecessary abstraction merely to make the folder structure look sophisticated.

## 2.1 Shared components

Build reusable components where they provide genuine value:

- `Button`
- `IconButton`
- `Input`
- `Dialog`
- `Sheet`
- `Tooltip`
- `Badge`
- `Avatar`
- `AvatarGroup`
- `Toast`
- `Skeleton`
- `Spinner`
- `GameCard`
- `PlayerCard`
- `RoomCodeDisplay`
- `CopyButton`
- `ConnectionStatus`
- `SectionHeading`
- `EmptyState`
- `ErrorState`

Use accessible HTML and appropriate ARIA attributes.

Use a consistent icon library, such as Lucide, if the project does not already have one.

Avoid mixing several icon libraries.

Do not use emoji characters as the primary icons for navigation, game cards, or important controls.

## 2.2 Shared layouts versus game-specific layouts

The applications should share the brand identity, but they should not be forced into the same layout.

Shared across all three applications:

- Typography.
- Design tokens.
- Buttons and form controls.
- Focus and interaction behavior.
- Dialog and toast patterns.
- General spacing principles.
- Brand logo and identity.
- Basic accessibility standards.

Specific to the homepage:

- Game discovery.
- Featured games.
- Platform navigation.
- Game availability indicators.

Specific to Chain Reaction:

- Board.
- Turn indicators.
- Player positions.
- Move controls.
- Game results.

Specific to Skribbl:

- Drawing canvas.
- Drawing tools.
- Chat.
- Hidden words.
- Round timer.
- Guessing and scoring interface.

Do not make the games look like copies of the homepage.

---

# PHASE 3 — REDESIGN THE MAIN YAPLY HOMEPAGE

Application: `apps/web`

Domain: `yaply.eu.org`

The homepage is the central entry point for the platform.

Its job is to help users discover games and enter multiplayer sessions quickly.

It is not a conventional dashboard and should not contain unnecessary administrative-style widgets.

## 3.1 Overall composition

Use a dark, premium, mobile-first layout.

The desktop version should feel spacious and editorial.

The mobile version should feel like a native-feeling social gaming application.

Use the following content hierarchy:

1. Brand navigation.
2. Hero section.
3. Primary play actions.
4. Featured game.
5. Available games.
6. Coming-soon games.
7. Footer.

You may adjust the precise arrangement if the result is more coherent.

Do not force all sections into oversized cards.

## 3.2 Navigation

Create a responsive navigation bar.

Desktop:

- Yaply logo on the left.
- Games.
- How to Play.
- About, if implemented.
- Profile or account controls when supported.

Mobile:

- Compact logo.
- Minimal actions.
- Optional profile button when authentication exists.
- Bottom navigation only if it improves the actual mobile experience.

Do not display a nonfunctional profile button or fake notification count.

If authentication is not implemented, do not pretend it exists.

Use a restrained translucent navigation surface where appropriate.

The navigation should remain legible and should not consume too much vertical space on mobile.

## 3.3 Hero section

The hero should communicate the product's identity in a few seconds.

Suggested messaging:

Headline:

"Good games. Better together."

Supporting text:

"Bring your friends, create a room, and play something fun."

Primary action:

"Explore Games"

Secondary action:

"Join a Room"

You may refine the wording if you can improve it without changing the intended message.

Use typography and a distinctive visual element to establish the hero.

Do not create a giant gradient blob and call it finished.

Use restrained violet lighting, layered game-inspired shapes, or a custom illustration that complements the platform.

If using CSS-generated decoration, ensure it is lightweight and does not interfere with interaction.

If using images, prefer suitable original assets or assets already in the repository. Do not reference nonexistent image paths.

## 3.4 Quick room actions

Make room creation and joining easy to discover.

Provide clear actions for:

- Creating a room.
- Joining a room using a code.

However, do not build a fake generic room creation workflow that cannot actually create a room in a specific game.

If room creation is game-specific, the user must select a game or choose the relevant game before the backend creates a room.

A possible flow:

1. User selects Create Room.
2. User selects an available game.
3. User enters the relevant room settings.
4. The application creates the room through the real backend.
5. The user is redirected to the appropriate game's room.

For joining:

1. User enters a room code.
2. The application validates the code through the backend.
3. The application determines which game owns the room.
4. The user is redirected to that game's domain and room route.

Implement this shared cross-game joining flow only if the backend can reliably identify the game's room.

Otherwise, provide clear game-specific join actions.

Do not fabricate room codes or successful joins.

## 3.5 Featured game

Create a visually prominent featured game section.

Use a composition that feels like a premium gaming product.

The section should contain:

- Game title.
- Short description.
- Distinctive artwork or visual treatment.
- Availability status.
- Primary play action.
- Optional secondary information.

Use a wide, layered composition on desktop and a compact, carefully arranged layout on mobile.

Do not force every game into the same rectangular card.

The featured game should be selected from real application data.

Do not invent player counts, popularity rankings, online activity, or reviews.

## 3.6 Game discovery grid

Initially display:

- Chain Reaction.
- Skribbl.

Prepare the registry to support future games such as Who's the Spy, Ludo, and Smash Karts, but do not present unavailable games as playable.

Use a reusable game registry, for example:

`apps/web/src/data/games.ts`

The exact path may differ depending on the current repository.

Each game entry should contain appropriate metadata, such as:

- Stable game ID.
- Display name.
- Short description.
- Availability status.
- Route or destination.
- Optional local artwork reference.
- Optional supported player count, if known.
- Optional estimated game duration, if known.

Use explicit statuses such as:

- `available`
- `coming-soon`
- `unavailable`

Render actions based on the actual status.

Available games should link to their real destinations.

Coming-soon games should not pretend to launch a working game.

Do not invent gameplay features to populate the cards.

## 3.7 Game card design

Give the cards a shared structure but individual visual personalities.

### Chain Reaction card

Use a geometric, board-inspired design.

Possible visual elements:

- Grid cells.
- Small glowing nodes.
- Connected clusters.
- Violet and blue accents.
- A subtle board pattern.

Keep decoration behind the content.

### Skribbl card

Use a more expressive, colorful design.

Possible visual elements:

- Canvas-like surfaces.
- Abstract drawing strokes.
- Bright coral, blue, yellow, and violet accents.
- Playful, hand-drawn details.

Do not use the same artwork for both games with only the title changed.

## 3.8 Responsive homepage layouts

Mobile:

- Compact navigation.
- Clear hero.
- Primary actions close to the top.
- Game cards arranged in one or two columns depending on available width.
- Touch-friendly controls.
- No horizontal page overflow.
- No excessive vertical padding.
- Important actions reachable without unnecessary scrolling.

Tablet:

- Balanced grid.
- Comfortable spacing.
- Larger featured game area.

Desktop:

- Centered content container with an appropriate maximum width.
- Spacious hero.
- More elaborate featured game composition.
- Two- or three-column game grid where appropriate.

Test at approximately:

- 320px.
- 360px.
- 390px.
- 430px.
- 768px.
- 1024px.
- 1440px.

Do not simply shrink the desktop layout until it fits a phone.

---

# PHASE 4 — DESIGN THE CHAIN REACTION APPLICATION

Application: `apps/chain`

Domain: `chain.yaply.eu.org`

Chain Reaction should feel more focused, competitive, and geometric than the main homepage.

Keep the premium dark brand foundation, but let the game board supply most of the visual character.

The game itself must remain the main focus.

## 4.1 Game entry screen

Create a polished game landing page with:

- Chain Reaction branding.
- A short description.
- Create Room.
- Join Room.
- Player name input if required by the existing identity system.
- Relevant room settings.
- Clear loading and error states.

Use a restrained grid-inspired background.

The page should not look like a duplicate of the homepage.

Keep the process short enough that a player can enter a room quickly.

## 4.2 Room layout

The main game room should contain:

- Room header.
- Room code and copy button.
- Player list.
- Game board.
- Current-turn indicator.
- Game status.
- Optional settings or menu.
- Results and rematch controls.

Use a balanced layout on desktop.

On mobile, prioritize the board and current-turn information.

The player list and less frequently used controls may move into a compact sheet or collapsible panel.

Do not force the mobile layout to use a desktop sidebar.

## 4.3 Game board

Create a visually clear board that uses:

- Dark board cells.
- Subtle grid borders.
- Distinct player colors.
- Clear current-player indicators.
- Appropriate selection feedback.
- Smooth but restrained animations.

Do not use glow effects so aggressively that cell boundaries become difficult to see.

Do not reduce the board size excessively to accommodate decorative side panels.

The board must fit the viewport and remain usable on smaller phones.

Preserve the actual board dimensions and rules implemented by the existing game engine.

Do not invent different game rules or change the authoritative state representation solely for visual reasons.

## 4.4 Turn and player indicators

Display:

- Whose turn it is.
- Which player is controlled by the current user.
- Whether the game is waiting, active, or finished.
- Any relevant move restrictions.
- The winner when the game ends.

Use text and clear visual indicators rather than color alone.

Avoid flashing or constantly pulsing elements.

## 4.5 Game animations

Use subtle transitions for:

- Cell selection.
- Accepted moves.
- State changes.
- Turn transitions.
- Win announcements.

Animations should be driven by authoritative state changes where appropriate.

Do not create a separate client-side simulation that can diverge from the server.

Respect `prefers-reduced-motion`.

Avoid animations that block the next move or make the board unresponsive.

## 4.6 Room creation and joining

Preserve existing multiplayer workflows.

Ensure:

- Create Room invokes the real backend.
- Join Room validates the room code.
- Players receive actual server state.
- Invalid actions produce useful feedback.
- Reconnection restores the appropriate room state.
- Finished rooms do not accept invalid new moves.

Do not implement fake multiplayer with hardcoded players.

---

# PHASE 5 — DESIGN THE SKRIBBL APPLICATION

Application: `apps/skribbl`

Domain: `skribbl.yaply.eu.org`

Skribbl should be the most colorful and expressive part of the platform.

The surrounding interface should retain the premium dark identity, but the canvas, drawing tools, guesses, and player reactions should feel playful.

The goal is to make the drawing area feel inviting without sacrificing readability or gameplay.

## 5.1 Lobby and entry screen

Include:

- Skribbl branding.
- Create Room.
- Join Room.
- Player name input if required.
- Room settings supported by the backend.
- Clear loading and error feedback.

Use colorful drawing-inspired decoration, but do not let it dominate the actual room actions.

## 5.2 Main game room

The room should include:

- Header and room code.
- Player list and scores.
- Current drawer.
- Word selection when appropriate.
- Drawing canvas.
- Drawing tools.
- Guess/chat interface.
- Hidden-word display.
- Round timer.
- Round results.
- Game results.

Use a responsive composition rather than a rigid desktop layout.

On desktop, the canvas can occupy the central area with the player list and chat alongside it.

On mobile, prioritize the canvas and current game information.

Move less frequently used controls into collapsible panels or bottom sheets where appropriate.

Do not hide essential information behind unnecessary menus.

## 5.3 Drawing canvas

The drawing canvas is the visual centerpiece.

Give it a clean, high-contrast surface that stands out from the dark application background.

Use a restrained frame and a subtle shadow.

The canvas itself should not be covered with glass effects.

Implement or preserve:

- Drawing strokes.
- Color selection.
- Brush size.
- Eraser, if supported.
- Clear canvas, if permitted.
- Touch and pointer input.
- Drawing synchronization.
- Canvas resizing behavior.
- State restoration for reconnecting players.

The interface must work with touchscreens and mouse input.

Avoid accidentally scrolling the page while a user is drawing.

Use suitable pointer-event handling and ensure drawing controls remain accessible.

If the existing game engine already supports only a subset of these features, do not add nonfunctional controls. Implement the actual behavior or leave the unsupported feature out of the interface.

## 5.4 Chat and guessing

The chat panel must distinguish between:

- Ordinary chat.
- Guesses.
- Correct guesses.
- System messages.
- Round transitions.

Use clear visual treatments without turning every message into a large card.

Make the input easy to use on mobile.

Ensure that opening the mobile keyboard does not completely obscure the drawing canvas or input controls.

Prevent duplicate submissions and provide clear feedback when a guess is rejected or a message cannot be sent.

Preserve any existing message validation and rate limiting.

## 5.5 Secret words and word selection

When a drawer chooses a word, display the selection interface clearly.

During the drawing round:

- The drawer sees the selected word.
- Other players see only the appropriate masked representation.
- The round timer is visible.
- The current drawer is identified.
- The game state remains synchronized.

**Never expose the secret word through public room snapshots, client-side shared state, logs visible to other players, or unfiltered WebSocket messages.**

This is a backend security requirement, not just a UI detail.

Do not let the design implementation weaken the existing privacy boundary.

## 5.6 Timers and scoring

Use a clear countdown display.

The timer should be easy to read without dominating the interface.

Use subtle visual feedback when time is running low, but do not rely only on color.

The backend must remain authoritative for round timing and scoring.

The frontend should display the server-provided state rather than deciding when the round has ended.

## 5.7 Mobile Skribbl experience

On narrow screens:

- Keep the drawing canvas large enough to use.
- Keep drawing controls close to the canvas.
- Make color and brush controls touch-friendly.
- Keep the guess input accessible.
- Avoid tiny player avatars.
- Avoid horizontal scrolling.
- Prevent the keyboard from covering the only way to submit a guess.
- Ensure that the player list does not consume too much screen space.
- Allow the room to adapt to portrait and landscape orientation.

Test the actual interaction on touch-sized viewports, not just the appearance of a screenshot.

---

# PHASE 6 — CONSISTENT BRANDING ACROSS ALL THREE APPLICATIONS

The three applications must feel like parts of the same product.

However, they should not look identical.

## 6.1 Shared identity

All three applications should share:

- Yaply's typography.
- Color tokens.
- Button styles.
- Border treatments.
- Focus states.
- Loading states.
- Error presentation.
- General spacing principles.
- Logo and brand identity.

Use consistent language for actions such as:

- Create Room.
- Join Room.
- Leave Room.
- Copy Code.
- Play Again.

## 6.2 Different personalities

### Main Yaply

Premium, social, inviting, and discovery-oriented.

### Chain Reaction

Geometric, strategic, focused, and competitive.

### Skribbl

Expressive, colorful, creative, and playful.

The main homepage should have the strongest overall brand identity.

The individual games should feel like specialized experiences within that brand.

Do not apply the same hero section, game cards, or landing-page composition to all three applications.

## 6.3 Cross-domain navigation

Ensure that navigation between applications uses the correct destination URLs.

Examples:

- Main homepage → Chain Reaction.
- Main homepage → Skribbl.
- Chain Reaction → Main homepage.
- Skribbl → Main homepage.

Preserve room codes when navigation is intended to enter a specific room.

Do not redirect players to the generic game homepage when they need to return to an active room.

Avoid creating unnecessary redirects between the three domains.

Do not assume `localStorage` is shared across subdomains.

If authentication or guest identity must persist between applications, use the existing secure identity mechanism or explicitly design one. Do not invent insecure cross-domain session sharing.

---

# PHASE 7 — RESPONSIVE DESIGN AND ACCESSIBILITY

This project is mobile-first.

Desktop is important, but it must not dictate the mobile design.

## 7.1 Layout requirements

- No horizontal page overflow at supported viewport sizes.
- No clipped primary actions.
- No overlapping dialogs.
- No fixed elements that cover essential controls.
- No game board that becomes unusably small.
- No unreadable text over decorative backgrounds.
- No layout jumps caused by images without dimensions.
- No controls that are only accessible through hover.

Use responsive CSS, grid, flexbox, and container-aware layouts where appropriate.

Do not create separate duplicated page implementations for desktop and mobile unless there is a compelling reason.

## 7.2 Accessibility

Implement:

- Semantic HTML.
- Keyboard navigation.
- Visible focus indicators.
- Appropriate labels for inputs.
- Accessible dialog behavior.
- Sufficient contrast.
- Reduced-motion support.
- Useful screen-reader labels for icon-only controls.
- Clear disabled and loading states.

Use approximately 44px or larger touch targets where practical.

Do not make the entire interface depend on visual color distinctions.

For the games themselves, provide accessible labels and controls wherever practical without disrupting gameplay.

## 7.3 Performance

Keep the applications responsive on budget mobile devices.

Avoid:

- Large unnecessary client bundles.
- Excessive backdrop filters.
- Expensive full-screen animation loops.
- Repeatedly mounting large component trees.
- Unoptimized images.
- Unnecessary polling.
- Re-rendering the entire drawing canvas for every pointer event.

Use server components by default where appropriate in Next.js.

Use client components only where interactivity requires them.

Keep the existing networking architecture and game engines intact.

---

# PHASE 8 — MICROINTERACTIONS AND MOTION

Use animation to improve feedback, not to decorate every interaction.

Suitable examples:

- A button subtly responds when pressed.
- A room code displays a brief copied confirmation.
- A dialog enters smoothly.
- A game card reveals a subtle hover effect on desktop.
- A Chain Reaction move animates clearly.
- Skribbl strokes render smoothly.
- A correct guess receives a brief visual highlight.
- A room connection indicator changes state smoothly.

Use CSS transitions for simple effects.

Use an animation library only if the repository already includes one or the benefit justifies the dependency.

Keep animation durations restrained.

Respect reduced-motion preferences.

Avoid:
- Constantly pulsing backgrounds.
- Excessive particle effects.
- Large animated gradients.
- Unnecessary parallax.
- Animations that delay gameplay.
- Decorative effects that consume substantial mobile CPU or battery.

The interface should feel responsive even when animations are disabled.

---

# PHASE 9 — LOADING, EMPTY, ERROR, AND CONNECTION STATES

A polished application must handle more than its ideal state.

Implement appropriate states for:

- Initial page loading.
- Game data loading.
- Room creation in progress.
- Joining a room.
- Connecting to the realtime backend.
- Reconnecting.
- Disconnected.
- Invalid room code.
- Room full.
- Room no longer available.
- Game finished.
- Unsupported action.
- Network failure.
- Backend failure.
- Rate limiting.
- Authentication failure, if applicable.

Use skeletons only where they improve perceived loading.

Provide clear, concise error messages.

Do not show raw stack traces or internal server errors to players.

Do not display an infinite spinner when a request has failed.

Provide a retry action when retrying is reasonable.

Do not mark the player as connected until the actual connection state supports it.

Do not fabricate a successful operation when the backend returns an error.

---

# PHASE 10 — PWA READINESS

Yaply should be designed so that it can become a Progressive Web App.

First inspect the current setup and determine whether PWA functionality already exists.

Do not add duplicate service workers or competing manifest configurations.

Where appropriate, implement:

- A valid web app manifest.
- App name and short name.
- Theme color.
- Background color.
- Appropriate application icons, using real assets.
- Installability requirements.
- A sensible standalone display mode.
- Appropriate mobile viewport settings.

Do not claim offline multiplayer functionality.

Do not cache authenticated data or live game-room state indiscriminately.

Do not introduce a service worker that breaks WebSocket connections, deployments, or updated frontend assets.

Offline support should be limited to functionality that can actually work offline, such as displaying a cached static shell if the caching strategy is implemented and tested safely.

---

# PHASE 11 — IMPLEMENTATION WORKFLOW

Work through the repository in the following order.

## Step 1: Audit

Inspect the existing codebase and report the current architecture.

Identify the files that will change.

## Step 2: Foundation

Establish the design tokens, typography, shared controls, and global styling.

Verify that existing functionality still works.

## Step 3: Main homepage

Implement the new homepage and game discovery interface.

Ensure that its game links point to the correct domains and that unavailable games are clearly marked.

## Step 4: Chain Reaction

Apply the shared visual system to the Chain Reaction application.

Preserve its game logic and multiplayer behavior.

Improve responsiveness and interaction feedback.

## Step 5: Skribbl

Apply the shared visual system to Skribbl.

Preserve drawing synchronization, guessing, word privacy, scoring, timers, and room behavior.

Improve mobile usability.

## Step 6: Cross-application consistency

Check all three applications for visual inconsistencies.

Verify shared components and navigation.

Ensure that the games retain their individual personalities.

## Step 7: Testing

Run the existing project checks and any new tests.

Test all three applications at mobile, tablet, and desktop sizes.

Use browser automation if available.

Test real application behavior, not only screenshots.

## Step 8: Final verification

Check the complete user journey:

1. Open `yaply.eu.org`.
2. Select Chain Reaction.
3. Open the Chain Reaction application.
4. Create or join a room.
5. Verify that gameplay works.
6. Return to the homepage.
7. Select Skribbl.
8. Create or join a room.
9. Verify that drawing, guessing, and scoring work.
10. Test the same workflows at a mobile viewport.
11. Check errors and reconnect behavior.

If any stage cannot be tested because a backend service is unavailable, state that limitation explicitly.

---

# PHASE 12 — ENGINEERING RULES

Follow these rules throughout implementation.

1. **Inspect before modifying.** Do not guess the repository structure.
2. **Preserve working functionality.** Do not rewrite game engines solely to simplify styling.
3. **Do not fabricate features.** Every visible control must work or be clearly marked as unavailable.
4. **Do not fake multiplayer.** Use the existing realtime backend.
5. **Do not weaken security.** Preserve server-authoritative game rules and secret-word isolation.
6. **Do not introduce unnecessary dependencies.** Reuse the existing stack where possible.
7. **Do not duplicate design systems.** Use shared tokens and components when appropriate.
8. **Do not force identical layouts.** The homepage, Chain Reaction, and Skribbl have different jobs.
9. **Do not break monorepo builds.** Respect workspace dependencies and the existing lockfile.
10. **Do not assume all code is client-side.** Use Next.js server components appropriately.
11. **Do not expose secrets.** Never place privileged API keys in public environment variables.
12. **Do not claim tests passed without running them.**
13. **Do not claim a deployment succeeded without verifying it.**
14. **Do not install paid services or require a credit card.** Keep the implementation compatible with the existing free-tier hosting plan.
15. **Do not stop after writing a design plan.** After the initial audit, implement the actual changes in manageable phases.

If a necessary change requires restructuring the repository, explain the reason and minimize the scope.

If a feature depends on unavailable infrastructure, implement the frontend state handling where appropriate, but clearly report what remains incomplete.

---

# PHASE 13 — DEFINITION OF DONE

The work is complete only when the following conditions have been met.

## Design

- All three applications follow the same brand identity.
- The homepage feels premium and social.
- Chain Reaction feels strategic and board-focused.
- Skribbl feels colorful and creative.
- Glass effects are restrained and readable.
- Typography, spacing, and controls are consistent.
- The design does not look like a generic SaaS dashboard.
- No unnecessary placeholder cards or decorative widgets remain.

## Functionality

- Homepage game links work.
- Available games open their actual destinations.
- Unavailable games are not presented as playable.
- Room actions invoke the actual backend.
- Existing game rules and multiplayer behavior remain intact.
- Connection and error states are handled.
- Navigation works across the applications.

## Mobile

- The layout works at 320px and larger supported widths.
- There is no unintended horizontal overflow.
- Primary actions are easy to reach.
- Touch controls work.
- The drawing canvas is usable on mobile.
- The Chain Reaction board remains readable and usable.
- The interface adapts to portrait and landscape where needed.

## Quality

- Type checking passes.
- Linting passes where configured.
- Production builds pass.
- Relevant tests pass.
- No obvious console errors remain.
- No broken image assets or links remain.
- The main multiplayer workflows have been tested.
- Any unverified functionality is documented honestly.

---

# FINAL INSTRUCTIONS

Begin by auditing the existing repository.

Then implement the design system and apply it across the homepage, Chain Reaction, and Skribbl.

Work incrementally, verify each phase, and preserve existing functionality.

Prioritize these outcomes, in order:

1. A coherent and recognizable Yaply brand.
2. An excellent mobile-first homepage.
3. A focused, polished Chain Reaction experience.
4. A playful, expressive Skribbl experience.
5. Reliable real multiplayer functionality.
6. Maintainable shared components and design tokens.
7. Performance, accessibility, and responsive behavior.

Do not merely describe what should be built. Make the changes in the existing codebase.

At the end, report:

- What you inspected.
- Which files you changed.
- Which shared components you created or updated.
- What changed in each application.
- Which functionality was preserved.
- Which tests and builds you actually ran.
- Any remaining bugs or incomplete features.
- Any deployment configuration still required.

**The intended result is one premium social gaming brand with three distinct experiences: a beautiful homepage, a strategic Chain Reaction game, and a colorful Skribbl game.**

## How I recommend running this prompt

**Don't ask OpenCode to change everything in one unverified pass.** Use the complete prompt as the master specification, then have it work through the repository in stages.

| Stage | What OpenCode should finish | What you verify |
|---|---|---|
| 1 | Repository audit and design plan | It understands the existing applications and backend |
| 2 | Shared design tokens and components | Typography, colors, buttons, and surfaces look consistent |
| 3 | Homepage redesign | Responsive layout and game navigation work |
| 4 | Chain Reaction redesign | Board and multiplayer interactions still work |
| 5 | Skribbl redesign | Canvas, chat, and room UI still work |
| 6 | Cross-application testing | Builds, mobile layouts, navigation, and multiplayer behavior |

### Three important instructions for your particular setup

- **Keep your existing architecture.** Your repository already has a shared realtime backend and shared packages. The agent should improve them only when needed, not create duplicates.
- **Keep the actual game interfaces distinct.** Chain Reaction should feel geometric and strategic; Skribbl should feel colorful and expressive. The premium dark design belongs to the overall brand, not necessarily every pixel of the game board or drawing canvas.
- **Verify the result in a browser.** A successful TypeScript build does not prove that the layout looks good or that real multiplayer still works.

The goal is to improve the experience across all three applications while retaining the existing implementation wherever it already works.