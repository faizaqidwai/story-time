# Level Access Layer — Complete Implementation Guide

## Overview

This guide explains every file to add or change to implement the full
Free vs Premium level access system. **Nothing in the existing system
is rewritten**: SyncEngine, StoryActivityContext, LevelProgressionService,
login and register flows are all untouched.

---

## What was designed

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW THIN LAYER                            │
│                                                              │
│  GET /user/levels  →  LevelAccessContext  →  home.jsx       │
│                              ↓                               │
│                       switchLevel(n)  ←  Levels.jsx         │
│                              ↓                               │
│              GET /levels/{n}/stories  →  stories displayed  │
└─────────────────────────────────────────────────────────────┘

Sync engine, StoryActivityContext, level progression → UNTOUCHED ✅
```

---

## Files to ADD

### Frontend (React Native / Expo)

| File | Location | Action |
|------|----------|--------|
| `LevelAccessContext.jsx` | `app/_contexts/` | New file — add it |
| `bookService.js` | `app/services/` | Replace existing file |

### Backend (Spring Boot)

| File | Location | Action |
|------|----------|--------|
| `LevelAccessController.java` | `controller/` | New file — add it |
| `LevelAccessService.java` | `service/` | New interface — add it |
| `LevelAccessServiceImpl.java` | `service/impl/` | New service — add it |
| `LevelAccessResponse.java` | `dto/level/` | New DTO — add it (create package) |

---

## Files to CHANGE

### Frontend

| File | Change |
|------|--------|
| `app/_layout.jsx` | Wrap with `<LevelAccessProvider>` (see `_layout_diff.js`) |
| `app/home.jsx` | Replace with the new `home.jsx` output |
| `app/components/Levels.jsx` | Replace with the new `Levels.jsx` output |

### Backend

| File | Change |
|------|--------|
| `UserAccount.java` | Add `subscription` field (`String` or enum) if not present |
| `BookRepository.java` | Verify `findAllByPlayLevel(int)` exists — it's already used |

### Unchanged

| File | Status |
|------|--------|
| `UserContext.jsx` | ✅ No change needed |
| `StoryActivityContext.jsx` | ✅ No change needed |
| `SyncEngine.js` | ✅ No change needed |
| `levelProgressionService.js` | ✅ No change needed |
| `BookController.java` | ✅ No change needed |
| `BookServiceImpl.java` | ✅ No change needed |
| `ProfileController.java` | ✅ No change needed |
| `LevelProgressionServiceImpl.java` | ✅ No change needed |

---

## Step-by-step integration

### Step 1 — Add `LevelAccessContext.jsx`

Copy `LevelAccessContext.jsx` to `app/_contexts/`.

This file:
- Calls `GET /user/levels?profileId={id}` when a profile is loaded
- Caches the level map in AsyncStorage under `@level_map_{profileId}`
- Exposes `loadedLevel`, `switchLevel()`, `canPlay()`, `canRead()`, `isStoryAccessible()`
- Falls back to cache when offline; falls back to `PLAY/FULL` for current level only if both fail

### Step 2 — Wrap `_layout.jsx` with `LevelAccessProvider`

```jsx
// app/_layout.jsx
import { LevelAccessProvider } from "./_contexts/LevelAccessContext";

// Inside your return:
<UserProvider>
  <LevelAccessProvider>       {/* ← ADD */}
    <StoryActivityProvider>
      <NotificationProvider>
        <Stack ... />
      </NotificationProvider>
    </StoryActivityProvider>
  </LevelAccessProvider>       {/* ← ADD */}
</UserProvider>
```

### Step 3 — Replace `bookService.js`

The new `bookService.js` adds ONE new method:
```js
bookService.getBooksByLevel(levelNumber)  // GET /levels/{n}/stories
```
The existing `bookService.getBooks(profileId)` is unchanged.

### Step 4 — Replace `home.jsx`

The new `home.jsx`:
- Calls `initForProfile(currentProfile)` when profile changes
- Calls `loadBooksForLevel(loadedLevel, ...)` — uses `getBooks` when on current level, `getBooksByLevel` otherwise
- Wraps story card press with `canPlay()` / `canRead()` / `isStoryAccessible()` guards
- Shows `AccessModeBanner` when not in PLAY mode on current level
- Shows a locked view (`viewOnlyContainer`) for VIEW_ONLY levels

**Important**: The `handleStoryPress` function in the new `home.jsx` uses an `alert()` for the upgrade prompt — replace this with your own upgrade/paywall modal when you have one ready.

### Step 5 — Replace `Levels.jsx`

The new `Levels.jsx`:
- Reads `levelMap` from `useLevelAccess()` to render visual states
- Calls `switchLevel(lvl)` when a level is tapped, then closes
- Shows: current (teal), viewing (yellow), preview pill, read pill, locked (grey)
- Locked levels are `disabled` — user cannot tap them

### Step 6 — Backend: create `dto/level/` package and add DTOs

```
src/main/java/.../dto/level/
  LevelAccessResponse.java   ← add
```

### Step 7 — Backend: add `LevelAccessService` and implementation

```
service/
  LevelAccessService.java       ← add interface
service/impl/
  LevelAccessServiceImpl.java   ← add implementation
```

**Important**: `LevelAccessServiceImpl.isFreeUser()` currently checks
`userAccount.getSubscription()`. You need to add a `subscription` field
to your `UserAccount` model if it doesn't exist, or adjust this method
to match however you track subscription tier.

### Step 8 — Backend: add `LevelAccessController`

```
controller/
  LevelAccessController.java   ← add
```

This controller is authenticated by your existing Spring Security filter.
No security config changes needed.

### Step 9 — Backend: verify `BookRepository`

The `getStoriesByLevel()` call in `LevelAccessServiceImpl` uses:
```java
bookRepository.findAllByPlayLevel(int level)
```
This method already exists in your codebase (used in `BookServiceImpl`).
No repository change needed. ✅

---

## API contracts

### GET /user/levels?profileId={id}

**Request**: JWT in Authorization header (existing), `profileId` as query param.

**Response**:
```json
{
  "currentLevel": 5,
  "subscription": "PREMIUM",
  "levels": [
    { "level": 1, "mode": "READ_ONLY",  "accessScope": "FULL"    },
    { "level": 2, "mode": "READ_ONLY",  "accessScope": "FULL"    },
    { "level": 3, "mode": "READ_ONLY",  "accessScope": "FULL"    },
    { "level": 4, "mode": "READ_ONLY",  "accessScope": "FULL"    },
    { "level": 5, "mode": "PLAY",       "accessScope": "FULL"    },
    { "level": 6, "mode": "VIEW_ONLY",  "accessScope": "NONE"    },
    ...
    { "level": 20,"mode": "VIEW_ONLY",  "accessScope": "NONE"    }
  ]
}
```

FREE tier example:
```json
{
  "currentLevel": 1,
  "subscription": "FREE",
  "levels": [
    { "level": 1, "mode": "PLAY",      "accessScope": "PARTIAL" },
    { "level": 2, "mode": "VIEW_ONLY", "accessScope": "NONE"    },
    { "level": 3, "mode": "VIEW_ONLY", "accessScope": "NONE"    },
    { "level": 4, "mode": "PLAY",      "accessScope": "PARTIAL" },
    ...
    { "level": 9, "mode": "PLAY",      "accessScope": "PARTIAL" },
    ...
    { "level": 20,"mode": "VIEW_ONLY", "accessScope": "NONE"    }
  ]
}
```

### GET /levels/{level}/stories

Returns `List<Book>` — same shape as the existing `/books/profile/{id}` response.
No auth changes needed.

---

## Access mode behaviour summary

| Mode | accessScope | User sees | User can read | User can do activities |
|------|-------------|-----------|---------------|----------------------|
| PLAY | FULL | All 8 stories | ✅ | ✅ |
| PLAY | PARTIAL | 1 story (index 0) | ✅ story 0 | ✅ story 0 |
| READ_ONLY | FULL | All stories | ✅ all | ❌ |
| VIEW_ONLY | NONE | Lock screen | ❌ | ❌ |

---

## Sync engine guard (already handled)

The SyncEngine already only syncs story activities for the profile's
**current play level** (`profile.playLevel`), not the loaded level.
No change to SyncEngine is needed — it naturally ignores browsed levels. ✅

From `SyncEngine.js`, the key check:
```js
// SyncEngine reads @story_activity_{profileId}_{storyId} keys
// These are ONLY created when the user starts a story via startStorySession()
// startStorySession() is ONLY called in handleStoryPress() in home.jsx
// handleStoryPress() is ONLY called when canPlay() === true
// canPlay() === true ONLY when loadedLevel === profile.playLevel AND mode === "PLAY"
// Therefore: SyncEngine naturally only ever sees activities from the current level ✅
```

---

## Edge cases handled

| Case | Handling |
|------|----------|
| User offline — level map not fetched | Uses AsyncStorage cache; falls back to current level = PLAY/FULL |
| User offline — switching to uncached level | `loadStoriesFromCache` returns null → `refreshBooksFromApi` fails → shows empty or previous state |
| Profile switch | `initForProfile()` called from `useEffect([currentProfile?.id])` — level map refreshed |
| Level progression | `refreshAfterProgression()` called from `handleLevelProgressComplete()` — map refreshed, `loadedLevel` updated to new level |
| Free user taps locked story in PARTIAL level | `alert()` shown — replace with your upgrade modal |
| Free user opens Levels screen | Levels 2,3,5-8,10+ shown as grey locked badges, non-tappable |
| Backend returns unexpected mode | Frontend treats unknown mode as VIEW_ONLY (defensive default in `buildContext`) |

---

## When to call `initForProfile()`

| Trigger | Where it's called |
|---------|-------------------|
| Login | `setLoginUserAccount` → `selectProfile` → `currentProfile` changes → `useEffect` in `home.jsx` |
| Profile switch | Same chain as above |
| App cold start | `loadStoredData` → sets `currentProfile` → `useEffect` in `home.jsx` |
| Level progression | `handleLevelProgressComplete` → calls `refreshAfterProgression` directly |

---

## Adding the `subscription` field to UserAccount

In `UserAccount.java`, add:
```java
private String subscription; // "FREE" or "PREMIUM"
```

Set it to `"FREE"` on new user registration in your auth service.
Set it to `"PREMIUM"` when the user upgrades (your billing flow — future work).

If you prefer an enum, use:
```java
private enums.Subscription subscription;
```
and add `FREE, PREMIUM` to your `enums.java`.

Then update `LevelAccessServiceImpl.isFreeUser()` accordingly.

---

## Summary of new files

```
Frontend:
  app/_contexts/LevelAccessContext.jsx     ← NEW
  app/services/bookService.js              ← UPDATED (adds getBooksByLevel)
  app/home.jsx                             ← UPDATED (uses level access)
  app/components/Levels.jsx                ← UPDATED (level selector)

Backend:
  dto/level/LevelAccessResponse.java       ← NEW
  service/LevelAccessService.java          ← NEW
  service/impl/LevelAccessServiceImpl.java ← NEW
  controller/LevelAccessController.java    ← NEW
```
