---
name: Demo image quota persistence
description: localStorage quota handling for user-uploaded base64 images in demo cars
---

## Rule
Demo car images uploaded as base64 can silently fail to persist when the 5 MB localStorage quota is exceeded. Two fixes are required together:

1. **Compress aggressively**: `MAX_EDGE=600`, `QUALITY=0.4` in `fileToBase64` keeps each upload ~30-50 KB.
2. **Rehydrate on load**: `loadDemoCars()` must merge loaded cars with `buildDemoCars()` seed data — if a stored car has an empty `images` array (stripped by quota compaction), restore its Unsplash URLs from the seed so the gallery isn't broken.

**Why:** The quota compaction strip in `saveDemoCars` removes Unsplash URLs to save space, but `loadDemoCars` (before fix) returned stored data as-is, leaving those cars permanently imageless until a manual reset.

**How to apply:** In `loadDemoCars`, after parsing stored JSON, do:
```js
const seed = buildDemoCars();
const seedMap = new Map(seed.map(c => [c._id, c]));
return parsed.map(c =>
  (!c.images || c.images.length === 0)
    ? { ...c, images: seedMap.get(c._id)?.images || [] }
    : c
);
```
