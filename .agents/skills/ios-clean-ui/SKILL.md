---
name: ios-clean-ui
description: >-
  Guidelines and specifications for building iOS-inspired, minimal, clean white UI/UX.
  Enforces squircle cards, SF Symbols iconography (strictly no Lucide React),
  Apple San Francisco typography, micro-widgets, and floating pill navigation.
---

# iOS Minimal Clean White UI/UX Skill Guide

This skill guides the design and implementation of clean, modern, iOS-style web interfaces inspired by Apple Human Interface Guidelines (HIG).

---

## 1. Visual Foundation & Color Palette

The interface features an airy, distraction-free, light-mode palette with ultra-soft contrast:

| Token | CSS Value | Usage |
| :--- | :--- | :--- |
| **Canvas Background** | `#F2F2F7` or `#F7F7FA` | Primary page backdrop |
| **Card / Widget Surface** | `#FFFFFF` | Elevated squircle cards |
| **Subtle Card Tint** | `#F6F6F9` | Secondary nested panels & inactive pills |
| **Primary Label** | `#000000` / `#1C1C1E` | High-contrast numbers, titles, headings |
| **Secondary Label** | `#8E8E93` | Units (`kcal`, `ml`, `hrs`, `kg`), timestamps, helper text |
| **Tertiary Label** | `#C7C7CC` | Disabled states, subtle borders |
| **Card Border** | `1px solid rgba(0, 0, 0, 0.04)` | Ultra-subtle boundary definition |
| **Accent / System Blue** | `#007AFF` | Primary active actions & badges |
| **Accent Active Pill** | `#E5E5EA` or `#EAEAEF` | Active tab pill background |

### Shadow & Elevation
Avoid heavy shadows. Use high-blur, low-opacity ambient micro-shadows:
```css
box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.03), 0 2px 6px -1px rgba(0, 0, 0, 0.02);
```

---

## 2. Card & Widget Architecture

- **Squircle Corners:** `border-radius: 24px` to `28px` on main cards; `16px` to `20px` on nested cards.
- **Padding:** Generous internal breathing room (`padding: 20px` to `24px`).
- **Layout:** 2-column or 3-column responsive widget grid with consistent `gap: 16px`.
- **Card Header:** Icon (top-left) aligned with category title in medium weight.
- **Metric Presentation:**
  - Large bold numeric figure (`font-size: 28px - 32px`, `font-weight: 700`, `letter-spacing: -0.5px`).
  - Unit text placed directly below the number in muted secondary gray (`font-size: 13px - 14px`, `font-weight: 500`).
- **Visual Anchor (Right side of card):**
  - Circular progress ring (SVG stroke with soft grey track and dark/accent progress).
  - Micro sparkline path chart.
  - Micro vertical bar indicators with highlighted active bars.

---

## 3. Iconography Standard: SF Symbols (STRICT RULE)

> [!IMPORTANT]
> **DO NOT USE `lucide-react`, Feather, or generic Material Icons.**
> All iconography MUST follow **Apple SF Symbols** geometry, optical weight, and visual language.

### How to Implement SF Symbols in React / Web:
1. **SF Symbols SVG Component:**
   Create an SVG component library (e.g., `components/icons/SFSymbol.tsx`) that renders Apple SF Symbols vector paths.
   Common symbols to map:
   - `flame.fill` (Calories / Urgency)
   - `drop.fill` (Water / Status)
   - `moon.fill` (Sleep / Night)
   - `figure.walk` / `figure.run` (Activity / Progress)
   - `doc.text.fill` (Plans / Lesson Drafts)
   - `chart.line.uptrend.xyaxis` (Progress / Analytics)
   - `calendar` / `clock.fill` (Consultations / Schedules)
   - `checkmark.circle.fill` (Approval / Saved receipts)
   - `ellipsis` (More menu)
2. **Icon Styling:**
   - Default to monochrome dark `#1C1C1E` or system gray `#8E8E93`.
   - Optical size: `18px` to `22px` within widgets; `20px` to `24px` in navigation.
   - Consistent stroke weight matching SF Pro text weights (regular or medium).

---

## 4. Typography

Use Apple's system font stack with negative tracking on bold headings:
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## 5. Floating Pill Navigation / Dock

As seen in the bottom dock of the reference:
- Floating pill container anchored near the viewport bottom (`bottom: 24px`, `margin: 0 auto`).
- Background: Frosted glass effect with high blur:
  ```css
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 9999px;
  padding: 8px 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  ```
- Individual tab items: Vertical stack (SF Symbol icon on top, 10px label below).
- Active tab pill: Soft capsule container around the active item (`background: #E8E8ED; border-radius: 9999px; padding: 8px 16px;`).
- Separate standalone circular "More" action button (`ellipsis`).

---

## 6. Assistant Panel & Card Implementation in ClassAssist

When rendering assistant workflows (consultation bookings, assessment reviews, confirmation):
1. **Assistant Chat Bubbles:**
   - Teacher/Student messages in clean rounded bubbles (`border-radius: 20px`).
   - Agent responses presented inside an iOS widget card container.
2. **Structured Proposal & Confirmation Cards:**
   - Displayed as squircle cards (`border-radius: 24px`, `#FFFFFF` on `#F2F2F7` background).
   - SF Symbols next to details (e.g., `calendar` for date, `clock` for time, `person.crop.circle` for teacher, `mappin.and.ellipse` for location).
   - Status chips: Pill-shaped badges (`border-radius: 9999px`, e.g. `Checked availability → Awaiting confirmation → Booked`).
3. **Action Buttons:**
   - Full-width or inline rounded pill buttons (`border-radius: 9999px`, high-contrast black/primary blue for confirm, soft grey for cancel/alternatives).
