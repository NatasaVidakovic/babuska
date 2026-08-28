# Dogfood QA Report

**Target:** http://127.0.0.1:4300/
**Date:** 2026-08-28
**Scope:** Responsive header, hero, „Istraži meni“ CTA, public menu, menu book, gallery and footer
**Tester:** codex Agent (automated exploratory QA)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 1 |
| 🟡 Medium | 0 |
| 🔵 Low | 2 |
| **Total** | **3** |

**Overall Assessment:** Header and all lower public sections adapt without overlap or horizontal overflow, but the primary hero CTA is clipped on several common short-height screens, including 1366×768 laptops.

---

## Issues

### Issue #1: Hero CTA is clipped on short mobile, tablet and laptop viewports

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Category** | Visual / Functional |
| **URL** | http://127.0.0.1:4300/ |

**Description:**
The red „Истражи Мени“ button is correctly styled and functional when visible, but it is pushed below the hero boundary on short-height screens. The hero has `overflow-hidden`, so the button cannot be reached by scrolling within the hero. The issue occurs at 360×640, 768×700, 1024×600 and 1366×768. It passes at 390×844, 412×915, 768×1024, 820×1180, 1440×900 and 1920×1080.

The direct cause is the wordmark asset's 512×768 transparent canvas. At desktop breakpoints its rendered box is 320×480 even though the visible lettering occupies only a small part of that canvas. The large transparent box, together with the responsive title size and margins, pushes the description and CTA outside the fixed-height hero.

**Steps to Reproduce:**
1. Open `http://127.0.0.1:4300/`.
2. Set the viewport to 1366×768 or 360×640.
3. Observe the bottom of the hero section.

**Expected Behavior:**
The complete hero copy and primary red CTA remain visible and usable on supported screen sizes.

**Actual Behavior:**
At 1366×768 the CTA starts at y=765 and ends at y=808 while the hero ends at y=768. At 360×640 the CTA starts at y=645 and ends at y=688 while the hero ends at y=640. At 1024×600 even the lower title/copy is clipped.

**Screenshots:**

MEDIA:C:\Users\vidakovicn\Desktop\Master\babuska\.codex\qa\responsive-header\screenshots\desktop-1366x768.png

MEDIA:C:\Users\vidakovicn\Desktop\Master\babuska\.codex\qa\responsive-header\screenshots\mobile-360x640.png

MEDIA:C:\Users\vidakovicn\Desktop\Master\babuska\.codex\qa\responsive-header\screenshots\landscape-1024x600.png

**Console Errors:** None.

---

### Issue #2: Header language controls have undersized touch targets

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Accessibility / UX |
| **URL** | http://127.0.0.1:4300/ |

**Description:**
The header does not overlap or overflow at any tested width, but the visible SR/EN controls measure approximately 25×23 and 26×23 pixels. These targets are small for touch interaction, particularly on tablets where the desktop header appears at 768 px. The hamburger is 40×40, while opened mobile navigation links are a comfortable full-width 45 px high.

**Steps to Reproduce:**
1. Open the page at 390×844 or 768×1024.
2. Inspect the SR and EN buttons in the fixed header.
3. Compare their clickable boxes with the mobile navigation links.

**Expected Behavior:**
Frequently used language controls provide a comfortable touch target while preserving the same visual typography.

**Actual Behavior:**
The text remains legible but the clickable boxes are only 23 px high.

**Screenshot:**

MEDIA:C:\Users\vidakovicn\Desktop\Master\babuska\.codex\qa\responsive-header\screenshots\mobile-390x844.png

**Console Errors:** None.

---

### Issue #3: Local demo marker is visible as public menu content

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Category** | Content |
| **URL** | http://127.0.0.1:4300/#menu |

**Description:**
Every seeded drink renders the technical marker `Café Babuska local demo content` as its public fact text. The marker is useful to the seed script for identifying demo records, but it reads like internal test content on the customer-facing site.

**Steps to Reproduce:**
1. Open the homepage.
2. Click „Истражи мени“.
3. Inspect any menu card below its description.

**Expected Behavior:**
The optional fact field contains customer-facing copy or remains empty.

**Actual Behavior:**
The seed marker is shown below every demo drink.

**Screenshot:**

MEDIA:C:\Users\vidakovicn\Desktop\Master\babuska\.codex\qa\responsive-header\screenshots\desktop-1440-menu.png

**Console Errors:** None.

---

## Issues Summary Table

| # | Title | Severity | Category | URL |
|---|-------|----------|----------|-----|
| 1 | Hero CTA is clipped on short viewports | High | Visual / Functional | `/` |
| 2 | Header language controls have undersized touch targets | Low | Accessibility / UX | `/` |
| 3 | Local demo marker is visible as public menu content | Low | Content | `/#menu` |

## Responsive Matrix

| Viewport | Header overlap | Horizontal overflow | CTA fully inside hero |
|----------|----------------|---------------------|-----------------------|
| 360×640 | No | No | **No** |
| 390×844 | No | No | Yes |
| 412×915 | No | No | Yes |
| 767×700 | No | No | Yes |
| 768×700 | No | No | **No** |
| 768×1024 | No | No | Yes |
| 820×1180 | No | No | Yes |
| 1024×600 | No | No | **No** |
| 1366×768 | No | No | **No** |
| 1440×900 | No | No | Yes |
| 1920×1080 | No | No | Yes |

## Testing Coverage

### Pages Tested
- Public homepage `/`
- Public menu anchor `/#menu`
- Gallery anchor `/#gallery`
- Footer/visit anchor `/#visit`

### Features Tested
- Fixed desktop and mobile header
- Breakpoint transition immediately below and at 768 px
- Mobile navigation open/close and all three anchor links
- SR/EN switch and hero geometry comparison
- Red CTA color, visibility and smooth-scroll behavior
- Dynamic category filters and six items in the selected category
- One-column mobile and two-column desktop menu layouts
- Mobile menu book
- Gallery grid and image loading
- Desktop and mobile footer layout and links
- Horizontal overflow, broken images and browser console errors

### Not Tested / Out of Scope
- Administrator forms and authentication
- Destructive CRUD operations
- Production Vercel/Supabase environment

### Blockers
- None.

---

## Notes

- Frontend and local Supabase responded with HTTP 200 on ports 4300 and 54321.
- No JavaScript warnings or errors appeared during navigation, language switching or responsive checks.
- SR/EN switching preserved the exact hero image source, 50%/50% focal point and measured geometry.
- The CTA uses the intended Babuska red `rgb(140, 21, 19)`, white text, and scrolls precisely to the menu when it is visible.
- Menu, book, gallery and footer are structurally responsive. The mixed-aspect gallery logo is cropped by `object-cover` on large screens; this is content-dependent and was recorded as an observation rather than a confirmed defect.
