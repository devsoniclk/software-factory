# 1024 Studio — Design System

*"Simplicity is not the absence of clutter; it's the presence of order."* — Jonathan Ive

---

## DESIGN PHILOSOPHY

### The Five Principles (From Apple's Design Language)

**1. Essentialism**
> Remove everything that isn't essential. What remains is the product.

Every pixel in 1024 serves a purpose. No decoration for decoration's sake. If removing an element doesn't break the experience, it shouldn't exist.

**2. Materiality**
> Materials behave as they are. Glass is glass. Light is light.

The liquid glass surface isn't a visual effect — it's a material. It has depth, translucency, and responds to what's behind it. Light catches its edges. It feels physical.

**3. Restraint**
> The hardest design decision is what not to add.

We use 3 font sizes, 2 accent colors, 1 border radius. Constraint creates clarity. When everything can be customized, nothing feels designed.

**4. Inevitability**
> Great design feels like it couldn't have been any other way.

The user should never think about the interface. They should think about their software project. The UI disappears. The work remains.

**5. Delight**
> Small moments of pleasure create emotional connection.

A subtle shimmer when AI generates requirements. A gentle bounce when a task completes. A soft glow when knowledge connects. These aren't features — they're feelings.

---

## VISUAL LANGUAGE

### The Glass Material

```
┌─────────────────────────────────────────────────────────────┐
│  GLASS LAYERS (z-depth)                                      │
│                                                              │
│  Layer 3: Raised Glass (modals, popovers, command palette)   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  backdrop-filter: blur(40px) saturate(180%)              │ │
│  │  background: rgba(12, 12, 20, 0.85)                     │ │
│  │  border: 1px solid rgba(255, 255, 255, 0.08)            │ │
│  │  box-shadow: 0 24px 80px rgba(0,0,0,0.4)               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 2: Surface Glass (cards, panels, sidebar)             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  backdrop-filter: blur(20px) saturate(150%)              │ │
│  │  background: rgba(12, 12, 20, 0.6)                      │ │
│  │  border: 1px solid rgba(255, 255, 255, 0.06)            │ │
│  │  box-shadow: 0 8px 32px rgba(0,0,0,0.2)                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 1: Base Glass (subtle containers)                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  backdrop-filter: blur(12px)                             │ │
│  │  background: rgba(12, 12, 20, 0.4)                      │ │
│  │  border: 1px solid rgba(255, 255, 255, 0.04)            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Layer 0: Canvas (the void behind everything)                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  background: #06060A                                     │ │
│  │  Subtle radial gradient: #0A0A14 at center               │ │
│  │  Micro-noise texture at 2% opacity                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Color Palette

```
FOUNDATIONS (the glass)
─────────────────────────────────────────────────
Void          #06060A     The space behind everything
Canvas        #0A0A14     Main background (barely lighter)
Surface       rgba(12, 12, 20, 0.6)     Glass panels
Elevated      rgba(18, 18, 30, 0.8)     Raised glass

BORDERS (light catching edges)
─────────────────────────────────────────────────
Subtle        rgba(255, 255, 255, 0.04)  Barely visible
Default       rgba(255, 255, 255, 0.08)  Standard edge
Active        rgba(255, 255, 255, 0.12)  Focused/hovered
Bright        rgba(255, 255, 255, 0.16)  Emphasized

TEXT (readability hierarchy)
─────────────────────────────────────────────────
Primary       #E8E8ED     Main content (not pure white)
Secondary     #8B8B9E     Supporting text
Tertiary      #5A5A6E     Labels, timestamps
Disabled      #3A3A4E     Inactive elements
Inverse       #0A0A14     Text on light backgrounds

ACCENTS (the glow through glass)
─────────────────────────────────────────────────
Indigo        #6366F1     Primary action, links, focus
Indigo-glow   rgba(99, 102, 241, 0.15)   Ambient glow
Indigo-dim    rgba(99, 102, 241, 0.08)   Subtle highlight
Cyan          #06B6D4     AI-generated content, info
Cyan-glow     rgba(6, 182, 212, 0.15)    AI ambient glow

SEMANTIC (meaning through color)
─────────────────────────────────────────────────
Success       #10B981     Completed, approved, passed
Warning       #F59E0B     Attention, pending review
Error         #EF4444     Failed, blocked, critical
Info          #3B82F6     Informational, draft
```

### Typography

```
FONT STACK
─────────────────────────────────────────────────
Primary:    "Inter", -apple-system, BlinkMacSystemFont, sans-serif
Mono:       "JetBrains Mono", "SF Mono", "Fira Code", monospace

SCALE (1.250 — Major Third)
─────────────────────────────────────────────────
Display     36px / 40px / 600    Page titles (rare)
H1          28px / 34px / 600    Section headers
H2          22px / 28px / 600    Card titles
H3          18px / 24px / 500    Subsection headers
Body        14px / 21px / 400    Main content
Small       13px / 18px / 400    Supporting text
Caption     12px / 16px / 400    Labels, timestamps
Code        13px / 20px / 400    Inline code (mono)

WEIGHTS (only 3)
─────────────────────────────────────────────────
Regular     400    Body text, descriptions
Medium      500    Labels, navigation, emphasis
Semibold    600    Headings, buttons, titles

LETTER SPACING
─────────────────────────────────────────────────
Headings    -0.02em    Slightly tighter (Apple style)
Body        0          Normal
Labels      +0.04em    Slightly open (uppercase labels)
```

### Spacing Scale (4px base)

```
─── 4px     Inline spacing, icon gaps
──── 8px    Small padding, between related items
───── 12px  Input padding, compact gaps
────── 16px Standard padding, card padding
──────── 24px Section spacing, card gaps
────────── 32px Major section breaks
──────────── 48px Page sections
────────────── 64px Hero spacing
```

### Border Radius

```
── 4px     Small elements (badges, chips, code blocks)
─── 8px    Medium elements (inputs, buttons, cards)
──── 12px  Large elements (modals, panels)
───── 16px Extra large (hero cards, image containers)
────── 24px Full round (avatars, status indicators)
```

---

## COMPONENT LIBRARY

### Sidebar

```
┌─────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Glass Layer 2
│  ░                         ░│
│  ░  1024                   ░│  ← Logo: Inter 600, 18px, gradient text
│  ░                         ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ◉  Dashboard    │   ░│  ← Active: indigo-dim bg, indigo text
│  ░  └─────────────────┘   ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Requirements │   ░│  ← Default: transparent bg, secondary text
│  ░  └─────────────────┘   ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Blueprints   │   ░│
│  ░  └─────────────────┘   ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Work Orders  │   ░│
│  ░  └─────────────────┘   ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Tests        │   ░│
│  ░  └─────────────────┘   ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Feedback     │   ░│
│  ░  └─────────────────┘   ░│
│  ░                         ░│
│  ░  ─────────────────────  ░│  ← Divider: 1px rgba(255,255,255,0.04)
│  ░                         ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Knowledge    │   ░│
│  ░  │    Graph        │   ░│
│  ░  └─────────────────┘   ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Audit Trail  │   ░│
│  ░  └─────────────────┘   ░│
│  ░                         ░│
│  ░  ─────────────────────  ░│
│  ░                         ░│
│  ░  ┌─────────────────┐   ░│
│  ░  │ ○  Model Mgr    │   ░│
│  ░  └─────────────────┘   ░│
│  ░                         ░│
│  ░  ┌─────────────────┐   ░│  ← Bottom: settings + user
│  ░  │ ⚙  Settings     │   ░│
│  ░  └─────────────────┘   ░│
│  ░                         ░│
│  ░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────┘
  Width: 240px (fixed)
  Padding: 16px
  Gap between items: 2px
  Item height: 36px
  Item radius: 8px
  Hover: subtle bg lightening (0.03 opacity increase)
  Active: indigo-dim background + left accent bar (2px indigo)
```

### Glass Card

```
┌──────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░                                              ░│
│  ░  Requirement Title                   P3  ●  ░│  ← Title: 14px/500, badges right
│  ░                                              ░│
│  ░  Brief description of what this             ░│  ← Body: 13px/400, secondary color
│  ░  requirement entails and why it              ░│
│  ░  matters for the project.                    ░│
│  ░                                              ░│
│  ░  ✓ Criterion one                            ░│  ← Acceptance criteria: 12px, tertiary
│  ░  ✓ Criterion two                            ░│
│  ░  ✓ Criterion three                          ░│
│  ░                                              ░│
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────┘

Surface: Layer 2 glass
Padding: 20px
Radius: 12px
Gap: 16px between cards
Hover: border brightens to 0.10, subtle translateY(-1px)
Shadow on hover: 0 12px 40px rgba(0,0,0,0.25)
Transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
```

### Buttons

```
PRIMARY (Indigo)
┌────────────────────┐
│   Generate with AI │   bg: #6366F1  text: white  radius: 8px
└────────────────────┘   height: 36px  padding: 0 16px
Hover: bg brightens 10%, subtle glow shadow
Active: scale(0.98), bg darkens 5%
Transition: 150ms ease

SECONDARY (Glass)
┌────────────────────┐
│   Add Requirement  │   bg: rgba(255,255,255,0.06)  border: 1px rgba(255,255,255,0.08)
└────────────────────┘   text: primary  radius: 8px
Hover: bg rgba(255,255,255,0.10)

GHOST (Text only)
┌────────────────────┐
│   Cancel           │   bg: transparent  text: secondary
└────────────────────┘   Hover: text primary

DANGER
┌────────────────────┐
│   Delete           │   bg: rgba(239,68,68,0.15)  text: #EF4444  border: rgba(239,68,68,0.2)
└────────────────────┘   Hover: bg rgba(239,68,68,0.25)

ICON BUTTON (Square)
┌──────┐
│  +   │   36×36px  radius: 8px  icon: 18px
└──────┘   Same variants as above

ALL BUTTONS
- Font: 13px/500
- Focus ring: 2px indigo, 2px offset, 4px blur
- Disabled: 0.4 opacity, cursor: not-allowed
```

### Inputs

```
TEXT INPUT
┌──────────────────────────────────────────┐
│  Project name                            │   bg: rgba(255,255,255,0.04)
│                                          │   border: 1px rgba(255,255,255,0.08)
└──────────────────────────────────────────┘   radius: 8px  height: 40px  padding: 0 14px
Focus: border indigo, subtle indigo glow
Error: border #EF4444, error text below
Placeholder: tertiary color, 13px/400

TEXTAREA
┌──────────────────────────────────────────┐
│                                          │
│  Describe your project...                │   Same styling, min-height: 120px
│                                          │   Resize: vertical only
│                                          │
└──────────────────────────────────────────┘

SELECT / DROPDOWN
┌──────────────────────────────────────────┐
│  Select a project              ▼         │   Same as input + dropdown icon
└──────────────────────────────────────────┘
Dropdown: Layer 3 glass, max-height: 240px, scroll

LABEL
  Project name                              12px/500, uppercase, +0.04em spacing
                                            tertiary color, margin-bottom: 6px

HELPER TEXT
  This will be visible to your team.        12px/400, tertiary color
                                            margin-top: 6px
```

### Badges

```
PRIORITY
  P1  bg: rgba(239,68,68,0.15)    text: #EF4444     (Critical)
  P2  bg: rgba(245,158,11,0.15)   text: #F59E0B     (High)
  P3  bg: rgba(99,102,241,0.15)   text: #6366F1     (Medium)
  P4  bg: rgba(139,139,158,0.15)  text: #8B8B9E     (Low)
  P5  bg: rgba(90,90,110,0.15)    text: #5A5A6E     (Lowest)

STATUS
  Draft       bg: rgba(139,139,158,0.15)  text: #8B8B9E
  Review      bg: rgba(245,158,11,0.15)   text: #F59E0B
  Approved    bg: rgba(16,185,129,0.15)   text: #10B981
  Completed   bg: rgba(16,185,129,0.15)   text: #10B981
  Failed      bg: rgba(239,68,68,0.15)    text: #EF4444
  Blocked     bg: rgba(239,68,68,0.15)    text: #EF4444

AI GENERATED
  ✦ AI        bg: rgba(6,182,212,0.15)    text: #06B6D4    (cyan glow)

ALL BADGES
  height: 24px  padding: 0 8px  radius: 6px  font: 11px/500  uppercase  +0.04em
```

### Modal / Slide-over

```
MODAL (Centered)
┌─────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← Overlay: rgba(0,0,0,0.6) + blur(8px)
│  ▓                                                   ▓  │
│  ▓  ┌─────────────────────────────────────────────┐ ▓  │
│  ▓  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▓  │  ← Glass Layer 3
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░  Create Requirement              ✕      ░ │ ▓  │  ← Header: 16px/600 + close button
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░  ─────────────────────────────────────  ░ │ ▓  │
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░  [Title input]                          ░ │ ▓  │
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░  [Description textarea]                 ░ │ ▓  │
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░  [Priority select]                      ░ │ ▓  │
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░  ─────────────────────────────────────  ░ │ ▓  │
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░              [Cancel]  [Create]         ░ │ ▓  │  ← Footer: ghost + primary button
│  ▓  │ ░                                         ░ │ ▓  │
│  ▓  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▓  │
│  ▓  └─────────────────────────────────────────────┘ ▓  │
│  ▓                                                   ▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└─────────────────────────────────────────────────────────┘

  Max width: 520px
  Padding: 24px
  Radius: 16px
  Enter: overlay fades in 200ms, modal scales from 0.96 + fades in 250ms
  Exit: reverse
  Focus trap: yes
  Close on overlay click: yes
  Close on Escape: yes

SLIDE-OVER (Right Panel)
  Width: 480px
  Slides from right edge
  Enter: translateX(100%) → translateX(0), 300ms
  Exit: reverse
  Same glass treatment as modal
```

### Command Palette (Cmd+K)

```
┌──────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ▓  ┌────────────────────────────────────────────────┐ ▓  │
│  ▓  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▓  │
│  ▓  │ ░  🔍  Search commands...                     ░ │ ▓  │  ← Input: full width, no border
│  ▓  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▓  │
│  ▓  │ ░                                            ░ │ ▓  │
│  ▓  │ ░  NAVIGATION                                 ░ │ ▓  │  ← Section label: 11px uppercase
│  ▓  │ ░  ┌──────────────────────────────────────┐  ░ │ ▓  │
│  ▓  │ ░  │  📄  Go to Requirements         ⌘1   │  ░ │ ▓  │  ← Results: 13px, shortcut right
│  ▓  │ ░  └──────────────────────────────────────┘  ░ │ ▓  │
│  ▓  │ ░  ┌──────────────────────────────────────┐  ░ │ ▓  │
│  ▓  │ ░  │  🏗  Go to Blueprints           ⌘2   │  ░ │ ▓  │
│  ▓  │ ░  └──────────────────────────────────────┘  ░ │ ▓  │
│  ▓  │ ░                                            ░ │ ▓  │
│  ▓  │ ░  ACTIONS                                    ░ │ ▓  │
│  ▓  │ ░  ┌──────────────────────────────────────┐  ░ │ ▓  │
│  ▓  │ ░  │  ✦  Generate Requirements with AI    │  ░ │ ▓  │  ← AI actions: cyan accent
│  ▓  │ ░  └──────────────────────────────────────┘  ░ │ ▓  │
│  ▓  │ ░  ┌──────────────────────────────────────┐  ░ │ ▓  │
│  ▓  │ ░  │  ✦  Generate Blueprint with AI       │  ░ │ ▓  │
│  ▓  │ ░  └──────────────────────────────────────┘  ░ │ ▓  │
│  ▓  │ ░                                            ░ │ ▓  │
│  ▓  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ▓  │
│  ▓  └────────────────────────────────────────────────┘ ▓  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└──────────────────────────────────────────────────────────┘

  Position: centered, top: 20%
  Max width: 560px
  Max height: 400px (scrollable)
  Selected item: indigo-dim background
  Fuzzy search with highlighted matches
```

### Empty State

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
│                                                          │
│                     ┌─────────┐                          │
│                     │         │                          │
│                     │   📄    │  ← Subtle illustration   │
│                     │         │     (monochrome, 64px)    │
│                     └─────────┘                          │
│                                                          │
│                  No requirements yet                      │  ← Title: 16px/500
│                                                          │
│        Define what your software needs to do.            │  ← Description: 13px, secondary
│        Start manually or let AI generate them.           │
│                                                          │
│            [  + Add Requirement  ]  [ ✦ AI Generate ]   │  ← CTAs: secondary + primary
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘

  Vertically centered in available space
  Illustration: 48-64px, monochrome, 30% opacity
  Max width: 360px for text
```

### Loading States

```
SKELETON (While loading lists)
┌──────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░  ████████████████           █████  ░░                 ░│  ← Shimmer gradient moves left→right
│  ░  █████████████████████████████████████████            ░│
│  ░  ████████████████████                                 ░│
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────────────┘
  Background: rgba(255,255,255,0.04)
  Shimmer: linear-gradient, 2000ms infinite, ease
  Radius: matches real content

AI GENERATING (Inline indicator)
┌──────────────────────────────────────────────────────────┐
│  ░  ✦ Generating requirements...                        ░│
│  ░    ● ● ●  (pulsing dots, staggered 200ms)            ░│
│  ░    ████████████░░░░░░░░░░░  4/10 generated           ░│
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└──────────────────────────────────────────────────────────┘
  Cyan accent color for AI operations
  Progress bar: indigo gradient, animated width

SPINNER (Button loading)
  Replaces button text with rotating icon
  Button dims to 0.7 opacity, pointer-events: none
```

---

## PAGE LAYOUTS

### Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                     │
│ │          │  ┌────────────────────────────────────────────────┐ │
│ │  SIDEBAR │  │                                                │ │
│ │          │  │  Good morning, Lakshitha                 ⌘K  │ │  ← Greeting + command palette trigger
│ │          │  │                                                │ │
│ │  ◉ Dash  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│ │  ○ Req   │  │  │ 📄 12    │ │ 🏗 3     │ │ 📋 24    │     │ │  ← Stats: glass cards, count + label
│ │  ○ BP    │  │  │ Require- │ │ Blue-    │ │ Work     │     │ │
│ │  ○ WO    │  │  │ ments    │ │ prints   │ │ Orders   │     │ │
│ │  ○ Test  │  │  └──────────┘ └──────────┘ └──────────┘     │ │
│ │  ○ FB    │  │  ┌──────────┐ ┌──────────┐                   │ │
│ │          │  │  │ ✓ 8/12   │ │ ✦ 85%    │                   │ │
│ │ ──────── │  │  │ Tests    │ │ AI       │                   │ │
│ │ ○ Graph  │  │  │ Passed   │ │ Accuracy │                   │ │
│ │ ○ Audit  │  │  └──────────┘ └──────────┘                   │ │
│ │          │  │                                                │ │
│ │ ──────── │  │  Quick Actions                                │ │
│ │ ○ Models │  │  ┌──────────────────────────────────────────┐│ │
│ │          │  │  │ ✦ Generate Requirements with AI      →  ││ │  ← Action cards: glass, hover glow
│ │          │  │  └──────────────────────────────────────────┘│ │
│ │ ⚙ Sett  │  │  ┌──────────────────────────────────────────┐│ │
│ │          │  │  │ ✦ Generate Blueprint with AI         →  ││ │
│ │          │  │  └──────────────────────────────────────────┘│ │
│ │          │  │                                                │ │
│ │          │  │  Recent Activity                              │ │
│ │          │  │  ┌──────────────────────────────────────────┐│ │
│ │          │  │  │ ● 2min ago  Requirement "Auth System"    ││ │  ← Audit feed: timeline
│ │          │  │  │   created (AI generated)                 ││ │
│ │          │  │  │ ● 15min ago Blueprint "v2" updated       ││ │
│ │          │  │  │ ● 1hr ago   Work Order "API Layer"       ││ │
│ │          │  │  │   completed                              ││ │
│ │          │  │  └──────────────────────────────────────────┘│ │
│ │          │  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Module Page (Requirements example)

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                     │
│ │          │  ┌────────────────────────────────────────────────┐ │
│ │  SIDEBAR │  │                                                │ │
│ │          │  │  Requirements                         ⌘K      │ │
│ │          │  │                                                │ │
│ │          │  │  ┌──────────────────────────────────────────┐  │ │
│ │          │  │  │ 🔍  Filter requirements...          ▼   │  │ │  ← Search + filter bar
│ │          │  │  └──────────────────────────────────────────┘  │ │
│ │          │  │                                                │ │
│ │          │  │            [+ Add]  [✦ AI Generate]            │ │  ← Action buttons (top right)
│ │          │  │                                                │ │
│ │          │  │  ┌──────────────────────────────────────────┐  │ │
│ │          │  │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │ │
│ │          │  │  │ ░  User Authentication          P5  ●  ░│  │ │  ← Card: glass layer 2
│ │          │  │  │ ░                                    ░│  │ │
│ │          │  │  │ ░  Users must be able to sign up,   ░│  │ │
│ │          │  │  │ ░  log in, and manage sessions.     ░│  │ │
│ │          │  │  │ ░                                    ░│  │ │
│ │          │  │  │ ░  ✓ Email/password auth            ░│  │ │
│ │          │  │  │ ░  ✓ JWT session management         ░│  │ │
│ │          │  │  │ ░  ✓ Password reset flow            ░│  │ │
│ │          │  │  │ ░                                    ░│  │ │
│ │          │  │  │ ░              ✦ AI    🕐 2min ago   ░│  │ │  ← Meta: AI badge + timestamp
│ │          │  │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │ │
│ │          │  │  └──────────────────────────────────────────┘  │ │
│ │          │  │                                                │ │
│ │          │  │  ┌──────────────────────────────────────────┐  │ │
│ │          │  │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │ │
│ │          │  │  │ ░  Payment Processing          P4  ●  ░│  │ │
│ │          │  │  │ ░                                    ░│  │ │
│ │          │  │  │ ░  Integrate Stripe for one-time    ░│  │ │
│ │          │  │  │ ░  and subscription payments.       ░│  │ │
│ │          │  │  │ ░                                    ░│  │ │
│ │          │  │  │ ░  ✓ Stripe Checkout integration    ░│  │ │
│ │          │  │  │ ░  ✓ Webhook handling               ░│  │ │
│ │          │  │  │ ░                                    ░│  │ │
│ │          │  │  │ ░              ✦ AI    🕐 2min ago   ░│  │ │
│ │          │  │  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  │ │
│ │          │  │  └──────────────────────────────────────────┘  │ │
│ │          │  │                                                │ │
│ │          │  │  Showing 12 requirements                       │ │  ← Footer: count
│ │          │  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Knowledge Graph

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                     │
│ │          │  ┌────────────────────────────────────────────────┐ │
│ │  SIDEBAR │  │                                                │ │
│ │          │  │  Knowledge Graph                       ⌘K    │ │
│ │          │  │                                                │ │
│ │          │  │  ┌──────────────────────────────────────────┐  │ │
│ │          │  │  │                                          │  │ │
│ │          │  │  │        ○ Auth System                     │  │ │  ← Canvas: nodes + edges
│ │          │  │  │       / \                                │  │ │
│ │          │  │  │      /   \                               │  │ │
│ │          │  │  │  ○ JWT  ○ Session                        │  │ │  ← Nodes: colored by type
│ │          │  │  │     \   /                                │  │ │
│ │          │  │  │      \ /                                 │  │ │
│ │          │  │  │   ○ Payment                              │  │ │
│ │          │  │  │      |                                   │  │ │
│ │          │  │  │   ○ Stripe                               │  │ │
│ │          │  │  │                                          │  │ │
│ │          │  │  └──────────────────────────────────────────┘  │ │
│ │          │  │                                                │ │
│ │          │  │  ● Requirement  ● Blueprint  ● Work Order     │ │  ← Legend
│ │          │  │  ● Decision     ● Component  ● Test Case      │ │
│ │          │  │                                                │ │
│ │          │  │  [Zoom In] [Zoom Out] [Fit] [Filter]          │ │  ← Controls
│ │          │  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

  Canvas: full available space
  Nodes: circles with labels, colored by type
  Edges: curved lines, labeled with relationship
  Hover: node glows, connected edges highlight
  Click: opens detail slide-over
  Zoom: mouse wheel + pinch
  Pan: click + drag on canvas
  Layout: force-directed (auto-arranges)
```

---

## ANIMATION SYSTEM

### Principles

**1. Purposeful** — Every animation communicates something
- Enter: "Something new appeared"
- Exit: "Something is gone"
- State change: "Something updated"
- Loading: "Something is happening"

**2. Fast** — Never make the user wait for an animation
- Micro-interactions: 150-200ms
- Transitions: 200-300ms
- Page transitions: 300-400ms
- Nothing over 500ms (except loading indicators)

**3. Natural** — Physics-based easing, not linear
- Default: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out)
- Enter: `cubic-bezier(0, 0, 0.2, 1)` (decelerate)
- Exit: `cubic-bezier(0.4, 0, 1, 1)` (accelerate)
- Spring: `spring(1, 80, 10)` (for bouncy interactions)

**4. Subtle** — If you notice the animation, it's too much
- Movement: 4-16px max
- Scale: 0.96-1.0 max
- Opacity: 0-1 (never partial for text)
- Rotation: never (except spinners)

### Animation Catalog

```
MICRO-INTERACTIONS (150-200ms)
─────────────────────────────────────────────────
Button hover        background lightens + translateY(-1px)
Button active       scale(0.98)
Card hover          border brightens + shadow deepens
Input focus         border → indigo + subtle glow
Badge appear        scale from 0.8 + fade in
Checkbox check      scale bounce (1.0 → 1.15 → 1.0)
Toggle switch       slide + color transition
Tooltip appear      fade in + translateY(4px)
Dropdown open       fade in + translateY(-8px)
Tab switch          underline slides horizontally

LIST ANIMATIONS (staggered)
─────────────────────────────────────────────────
Items enter         fade in + translateY(8px), stagger 50ms
Items exit          fade out + translateY(-4px), stagger 30ms
Reorder             smooth position transition (layout animation)
Delete              fade out + scale(0.95), 200ms

PAGE TRANSITIONS (300-400ms)
─────────────────────────────────────────────────
Route change        content fades out (150ms) → new content fades in (250ms)
Modal open          overlay fades (200ms) → modal scale(0.96→1) + fade (250ms)
Modal close         reverse
Slide-over open     translateX(100%→0) + fade (300ms)
Slide-over close    reverse

AI OPERATIONS (special)
─────────────────────────────────────────────────
Generating          pulsing dots (staggered 200ms)
Progress bar        width animates smoothly
Result appear       items cascade in (stagger 100ms) + subtle glow
Completion          gentle pulse of success color
Knowledge graph     nodes pop in with spring physics

LOADING STATES
─────────────────────────────────────────────────
Skeleton shimmer    gradient slides left→right, 2000ms, infinite
Spinner             rotate 360°, 800ms, infinite, linear
Progress bar        width transition, ease-out, matches ETA
```

### Framer Motion Variants (Implementation)

```typescript
// Shared animation configs
export const spring = { type: "spring", stiffness: 300, damping: 30 }
export const ease = [0.4, 0, 0.2, 1]

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, transition: { duration: 0.15, ease } },
}

export const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease } },
}

export const slideIn = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease } },
  exit: { opacity: 0, x: 24, transition: { duration: 0.2, ease } },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15, ease } },
}

export const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
}

export const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
}

// Card hover
export const cardHover = {
  rest: { scale: 1, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" },
  hover: {
    scale: 1.005,
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
    transition: { duration: 0.2, ease },
  },
}

// AI generation cascade
export const aiCascade = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.3, delay: i * 0.1, ease },
  }),
}
```

---

## RESPONSIVE BEHAVIOR

```
BREAKPOINTS
─────────────────────────────────────────────────
Desktop     ≥1280px    Full sidebar + main content
Tablet      768-1279px Collapsed sidebar (icons only) + main
Mobile      <768px     Bottom nav + full-width content

SIDEBAR STATES
─────────────────────────────────────────────────
Desktop     Expanded (240px) with labels
Tablet      Collapsed (64px) with icons only
Mobile      Hidden (accessed via hamburger menu)

CONTENT ADAPTATION
─────────────────────────────────────────────────
Desktop     2-3 column card grid
Tablet      2 column card grid
Mobile      Single column, full-width cards

MODALS
─────────────────────────────────────────────────
Desktop     Centered, max 520px
Tablet      Centered, max 480px
Mobile      Full-screen slide-up
```

---

## ACCESSIBILITY

```
FOCUS MANAGEMENT
─────────────────────────────────────────────────
Focus ring      2px solid indigo, 2px offset, always visible
Focus trap      Modals, command palette, dropdowns
Tab order       Logical, left-to-right, top-to-bottom
Skip link       "Skip to main content" (hidden until focused)

COLOR CONTRAST
─────────────────────────────────────────────────
Primary text    #E8E8ED on #0A0A14 = 15.8:1 (AAA)
Secondary text  #8B8B9E on #0A0A14 = 5.2:1 (AA)
Indigo accent   #6366F1 on #0A0A14 = 5.1:1 (AA)
All badges      Text meets 4.5:1 on their backgrounds

SCREEN READERS
─────────────────────────────────────────────────
All images      alt text
All icons       aria-label or sr-only text
All interactive role attributes
Live regions    aria-live="polite" for AI generation progress
Status changes  Announced to screen readers

MOTION
─────────────────────────────────────────────────
prefers-reduced-motion: reduce
  → All animations disabled except opacity fades
  → No parallax, no scale, no rotation
  → Transitions become instant or 100ms max

KEYBOARD
─────────────────────────────────────────────────
⌘K              Command palette
⌘1-9            Navigate to pages
⌘N              Create new (context-dependent)
⌘⇧P             Switch project
Escape          Close modal/palette/slide-over
Tab/Shift+Tab   Navigate focusable elements
Enter/Space     Activate buttons/links
Arrow keys      Navigate lists, cards, tabs
```

---

## DESIGN TOKENS (CSS Custom Properties)

```css
:root {
  /* Glass layers */
  --glass-void: #06060A;
  --glass-canvas: #0A0A14;
  --glass-surface: rgba(12, 12, 20, 0.6);
  --glass-elevated: rgba(18, 18, 30, 0.8);
  --glass-blur-sm: blur(12px);
  --glass-blur-md: blur(20px);
  --glass-blur-lg: blur(40px);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.08);
  --border-active: rgba(255, 255, 255, 0.12);
  --border-bright: rgba(255, 255, 255, 0.16);

  /* Text */
  --text-primary: #E8E8ED;
  --text-secondary: #8B8B9E;
  --text-tertiary: #5A5A6E;
  --text-disabled: #3A3A4E;

  /* Accents */
  --accent: #6366F1;
  --accent-glow: rgba(99, 102, 241, 0.15);
  --accent-dim: rgba(99, 102, 241, 0.08);
  --accent-ai: #06B6D4;
  --accent-ai-glow: rgba(6, 182, 212, 0.15);

  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Fira Code", monospace;

  /* Shadows */
  --shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 24px 80px rgba(0, 0, 0, 0.4);

  /* Transitions */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

---

## WHAT THIS FEELS LIKE

When a user opens 1024 for the first time:

1. **The app launches** — dark canvas fades in, sidebar slides from left (300ms)
2. **They see the dashboard** — stats cards cascade in (staggered 50ms)
3. **They click "AI Generate"** — a modal materializes (scale + fade, 250ms)
4. **They type a description** — input border glows indigo on focus
5. **They click Generate** — button shows a subtle pulse, then items appear one by one (cascade, 100ms each)
6. **Each requirement card** — slides up from below, glass surface catches the light
7. **They hover a card** — it lifts slightly, shadow deepens, border brightens
8. **They click to expand** — detail panel slides in from the right (300ms)
9. **They switch to Knowledge Graph** — page cross-fades (200ms), nodes pop in with spring physics
10. **They press ⌘K** — command palette materializes centered, fuzzy search responds instantly

**Every interaction feels like touching glass.** Smooth, responsive, inevitable. The interface never competes with the work. It recedes. What remains is clarity.

---

*"True simplicity is derived from so much more than just the absence of clutter and ornamentation. It's about bringing order to complexity."* — Jonathan Ive
