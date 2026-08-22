# AGENTS.md

Translate Lens is a Tauri v2 desktop app (SolidJS + Rust) that translates text or images from the clipboard or user input.

## Setup commands

- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Run Tauri in dev mode: `pnpm tauri dev`
- Build frontend: `pnpm build`
- Build full app: `pnpm tauri build`
- Rust only (from src-tauri): `cargo build`

## Tech stack

- Frontend: SolidJS + TypeScript + Tailwind CSS v4 + Vite
- Backend: Rust + Tauri v2
- Fonts: JetBrains Mono (mono), Space Grotesk (sans)
- Package manager: pnpm

## Code style

- TypeScript strict mode enabled
- Use Tailwind utility classes for styling
- Theme colors via CSS custom properties (--color-bg, --color-main, --color-caret, etc.)
- Icons from lucide-solid
- Follow existing component patterns in src/components/

### Tailwind class order

Always sort and group Tailwind classes using `cn([...])` with one array element per category. Each element groups related classes of the same category. Empty categories are skipped.

```tsx
<div class={cn([
  "flex items-center",              // Layout / Flexbox
  "p-4 gap-2",                      // Spacing
  "bg-main rounded-lg",             // Backgrounds + Borders
  "shadow-sm",                      // Effects
  "text-white font-mono",           // Typography
  "transition-opacity",             // Transitions
  "hover:opacity-80",               // Interactivity
])}>
```

Category ordering (priority 1-14):

1. Layout — `block`, `inline-flex`, `relative`, `fixed`, `z-10`, `overflow-hidden`
2. Flexbox & Grid — `flex`, `grid`, `items-center`, `justify-between`, `gap-2`
3. Spacing — `p-4`, `m-2`, `px-6`, `mt-auto`, `gap-4`
4. Sizing — `w-full`, `h-screen`, `min-w-0`, `max-w-md`, `size-8`
5. Typography — `text-sm`, `font-bold`, `leading-tight`, `tracking-wide`, `text-center`
6. Backgrounds — `bg-white`, `bg-main/50`, `bg-gradient-to-r`
7. Borders — `border`, `rounded-lg`, `border-main/12`, `ring-2`
8. Effects — `shadow-sm`, `opacity-80`, `backdrop-blur-sm`
9. Filters — `blur-sm`, `brightness-110`, `grayscale`
10. Tables — `border-collapse`, `table-fixed`
11. Transitions & Animation — `transition-colors`, `duration-200`, `animate-spin`
12. Transforms — `scale-105`, `rotate-45`, `translate-x-2`
13. Interactivity — `cursor-pointer`, `select-none`, `focus:outline-none`
14. SVG — `fill-current`, `stroke-2`

## Project structure

- `src/` - SolidJS frontend (App.tsx, components/Popup.tsx)
- `src-tauri/` - Rust backend (lib.rs, main.rs)
- `mockup/` - Design reference HTML (Monkeytype 9009 theme)

## State management

- When a component owns 3+ related signals plus their async handlers, group them into one `createStore` object (`solid-js/store`) colocated at the top of the component file (see the `ByokState` store in `src/components/ByokSettingsPanel.tsx`). State stays in the store; expose named actions (`select…`, `save`, `test`, `clear…`, `init`) beside it.
- Components never touch `invoke`/IPC directly — all side effects live in store actions or `src/lib/`.
- Use context (`PreferencesProvider` pattern in `src/stores/preferences.tsx`) only when 2+ components share the state; single-consumer state stays colocated, no `src/stores/` file.

## Testing

- No test framework configured yet
- TypeScript type checking: ensure no type errors
- Rust: `cargo clippy` and `cargo check` from src-tauri/

## Skills to use

- **i-have-adhd**: Load for all AI output formatting. Shape output for ADHD readers: lead with next action, number multi-step work, restate state, suppress tangents, give time estimates, make wins visible.
- **karpathy-guidelines**: Load for all coding tasks. Think before coding, simplify first, make surgical changes, define verifiable success criteria.

## PR instructions

- Run `pnpm build` to verify frontend compiles
- Run `cargo check` in src-tauri/ to verify Rust compiles
- Match existing code style and Tailwind patterns
