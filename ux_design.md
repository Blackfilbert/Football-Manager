# UX Specification — Football Manager Tycoon (Exact Copy)

## Overview
This is an EXACT COPY of the existing app at `/home/ubuntu/football_manager_source/`. The development agent must copy all source files verbatim and ONLY change the bundle identifier to `com.footballmanager.testcopy`.

## Critical Instruction
**DO NOT recreate or rewrite any code.** Copy the entire project from `/home/ubuntu/football_manager_source/` and modify ONLY:
1. `app.json` / `app.config.js` — change `ios.bundleIdentifier` and `android.package` to `com.footballmanager.testcopy`
2. Nothing else. Every screen, component, asset, plugin, dependency, and configuration must remain identical.

## Existing Screen Structure (for reference only — do not redesign)

### Navigation
- `app/_layout.tsx` — Root layout with GameProvider + ErrorBoundary
- `app/index.tsx` — Splash screen redirecting to /tabs
- `app/tabs/_layout.tsx` — Bottom tab navigator (6 visible tabs: Home, Transfers, Team, Scout, Activity, Shop; 5 hidden tabs: Settings, Ratings, Career, Street Cup, Valor GP)

### Screens (all under app/tabs/)
1. **Home** (`index.tsx`) — Live match simulation with Skia graphics, upgrade cards, idle income display
2. **Transfers** (`transfers.tsx`) — Player marketplace for buying/selling
3. **My Team** (`team.tsx`) — 4-4-2 formation management
4. **Scout** (`scout.tsx`) — 10-level scout training system
5. **Activity** (`activity.tsx`) — Hub linking to Career, Street Cup, Valor GP
6. **Shop** (`shop.tsx`) — IAP store, chests, passes
7. **Settings/Manager** (`settings.tsx`) — Team customization, logout
8. **Ratings** (`ratings.tsx`) — League standings table
9. **Career** (`career.tsx`) — Player career mode
10. **Street Cup** (`streetcup.tsx`) — 16-team knockout tournament
11. **Valor Grand Prix** (`valorgp.tsx`) — 5v5 tournament mode

### Key Modules (copy as-is)
- `src/context/GameContext.tsx` — 1696-line game state context
- `src/types.ts`, `src/constants.ts`, `src/theme.ts`, `src/utils.ts`, `src/streetCupHelpers.ts`
- `src/components/` — 19 components
- `src/services/` — ads, analytics, appsflyer, iap services
- `src/valorGP/` — Valor Grand Prix module
- `src/utils/feedback.ts`
- `assets/` — 63 files (images, sounds, icons)
- `plugins/` — 3 custom Expo plugins

## Bundle ID Change Locations
- `app.json` or `app.config.js`: set `expo.ios.bundleIdentifier` to `com.footballmanager.testcopy`
- `app.json` or `app.config.js`: set `expo.android.package` to `com.footballmanager.testcopy`
- If any custom plugin references the bundle ID, update there too
- Do NOT change display name, slug, or any other identifier unless it conflicts with the new bundle ID