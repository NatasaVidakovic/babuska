# Story Label and Hero Readability Implementation Plan

> **For codex:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the generic story fallback with approved Serbian, English, and Russian live-atmosphere copy, keep it on one readable line, and make the editable hero description visibly clearer over the photograph.

**Architecture:** Extend the existing `PUBLIC_COPY` dictionary rather than adding a new localization mechanism. Apply presentation changes through the existing semantic CSS classes, retaining administrator-provided story descriptions and hero content as the highest-priority data source.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Vitest, Playwright, Vercel.

---

### Task 1: Lock the three fallback translations with a regression test

**Objective:** Make the approved story fallback copy testable independently of rendered layout.

**Files:**
- Modify: `src/App.tsx`
- Create: `src/lib/public-copy.test.ts`

**Step 1: Write failing test**

Export the public-copy record and assert these exact values:

```ts
expect(PUBLIC_COPY.sr.stories).toBe(
  "Уживо из кафића Бабушка — погледајте тренутну атмосферу",
);
expect(PUBLIC_COPY.en.stories).toBe(
  "Live from Café Babuska — see the atmosphere right now",
);
expect(PUBLIC_COPY.ru.stories).toBe(
  "Сейчас в кафе «Бабушка» — взгляните на атмосферу",
);
```

**Step 2: Verify RED**

Run: `npx vitest run src/lib/public-copy.test.ts`

Expected: FAIL because the existing values are `Живот Бабушке`, `Babuska Life`, and `Жизнь Бабушки`.

**Step 3: Implement minimal dictionary change**

Replace only the three `stories` fallback values in `PUBLIC_COPY`. Preserve `openStories` and the existing rule that an administrator-provided localized story description takes precedence.

**Step 4: Verify GREEN**

Run: `npx vitest run src/lib/public-copy.test.ts`

Expected: PASS.

### Task 2: Improve story-label readability without wrapping

**Objective:** Keep the complete localized fallback on one line at every supported viewport without horizontal overflow.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `scripts/smoke-responsive.mjs`

**Step 1: Extend the failing browser assertion**

In the existing story measurement, collect the label rectangle, computed `white-space`, and line height. Require:

- `white-space: nowrap`;
- label left/right edges remain inside the viewport;
- rendered height is no more than one line plus vertical padding;
- label remains non-empty.

Run against current production:

```powershell
$env:SITE_URL='https://www.caffebabuska.com/'; npm run smoke:responsive
```

Expected: FAIL because the current story label permits wrapping and lacks the approved capsule treatment.

**Step 2: Add a semantic label class**

Set the visible text span to `className="site-hero__story-label"`.

**Step 3: Add the approved CSS**

Use a deep burgundy foreground, semibold weight, responsive type, reduced tracking, a translucent cream background, compact rounded padding, `white-space: nowrap`, and a viewport-safe maximum width. Keep the existing circle unchanged.

**Step 4: Verify locally**

Run the production build and a local preview using a normalized cached public snapshot. Measure the story ring, image, label bounds, and line count at 360 px and 973 px.

Expected: the ring and image remain square, the label is one line, and no horizontal overflow occurs.

### Task 3: Improve the hero description contrast and hierarchy

**Objective:** Make text such as `Добродошли у кафе Бабушка` easier to read without overpowering the heading or CTA.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `scripts/smoke-responsive.mjs`

**Step 1: Add failing computed-style assertions**

Require the hero description to have a responsive font size of at least 16 px at supported viewports, a weight of at least 500, and a non-empty text shadow.

Expected: current production fails at least the weight/shadow requirements.

**Step 2: Move presentation out of the inline color declaration**

Keep the existing font family and italic behavior, but let `.site-hero__description` own color, size, weight, line height, and text shadow.

**Step 3: Apply the approved treatment**

Use a dark warm-brown foreground, `clamp(...)` responsive sizing, weight 500, improved line height, and a restrained light shadow.

**Step 4: Re-run browser assertions**

Expected: PASS at 360×640, 390×844, 768×700, 1024×600, 1366×768, and 1440×900.

### Task 4: Full verification, commit, push, and deploy

**Objective:** Prove the change has no regressions and publish it to production.

**Files:**
- Modify only if a directly related verification issue is found.

**Step 1: Run local quality gates**

```powershell
npm run check
git diff --check
```

Expected: typecheck, all Vitest tests, production build, and whitespace validation pass.

**Step 2: Review and commit only task files**

```powershell
git status --short
git diff
git add src/App.tsx src/index.css src/lib/public-copy.test.ts scripts/smoke-responsive.mjs
git commit -m "fix: improve hero and story text readability"
```

Do not include unrelated workspace changes or secret files.

**Step 3: Push the explicitly requested current branch**

```powershell
git push origin main
```

**Step 4: Wait for Vercel success and verify production**

Check the GitHub commit status until the Vercel context reports `success`, then run:

```powershell
$env:SITE_URL='https://www.caffebabuska.com/'; npm run smoke:responsive
```

Expected: all six public viewports, language switching, story circle/label, hero-description readability, and the mobile admin route pass. Finish with `git status --branch --short` showing `main...origin/main` and no changes.

## Risks and tradeoffs

- The approved sentences are long, especially on a 360 px viewport. Font scaling and reduced tracking must preserve readability while honoring the single-line requirement.
- Administrator-provided story descriptions may be longer than the fallback. The one-line rule should apply to the displayed label without creating horizontal page overflow; unusually long custom descriptions may need viewport-safe shrinking or clipping behavior.
- Inline hero color currently overrides stylesheet rules and must be removed for the CSS treatment to take effect.
