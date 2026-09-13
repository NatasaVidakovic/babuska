# Story label and hero readability design

## Goal

Replace the generic public story fallback with a clear, localized live-atmosphere message and improve the legibility of both that label and the editable hero description over the homepage photograph.

## Public copy

The story fallback is selected by the existing public language state:

- Serbian Cyrillic: `Уживо из кафића Бабушка — погледајте тренутну атмосферу`
- English: `Live from Café Babuska — see the atmosphere right now`
- Russian Cyrillic: `Сейчас в кафе «Бабушка» — взгляните на атмосферу`

An administrator-provided localized story description continues to take precedence. Missing Russian story content continues to use the existing Serbian fallback behavior.

## Visual treatment

The story label remains on one line. It uses responsive type sized for the available viewport, a semibold deep-burgundy foreground, reduced letter spacing, and a subtle translucent cream capsule so it remains readable over the hero image. The label must not overflow at the supported 360 px minimum viewport.

The editable hero description, including the current `Добродошли у кафе Бабушка` content, uses a larger responsive font, a darker warm-brown foreground, stronger weight, and a restrained light text shadow. The treatment must preserve the existing italic editorial character and must not compete with the main heading or CTA.

## Scope

No database schema or admin workflow changes are required. The change affects the public fallback dictionary and homepage presentation only. Existing custom story descriptions and hero text remain editable through the admin.

## Verification

- Add or update a regression assertion for all three fallback translations.
- Assert the story label stays on one line and inside the viewport at supported responsive sizes.
- Run the full typecheck, unit-test, and production-build suite.
- Push `main`, wait for a successful Vercel deployment, and run the responsive smoke suite against production.
