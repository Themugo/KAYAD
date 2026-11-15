import fs from 'node:fs';
import assert from 'node:assert/strict';

const controller = fs.readFileSync('backend/controllers/favoriteController.js', 'utf8');
const routes = fs.readFileSync('backend/routes/favoriteRoutes.js', 'utf8');
const tests = fs.readFileSync('backend/tests/regression/favoriteToggleVisibility.test.js', 'utf8');

const toggle = controller.slice(controller.indexOf('export const toggleFavorite'));
assert.match(toggle, /select\("title price images brand status deletedAt"\)/, 'Toggle must load listing visibility status');
assert.match(toggle, /if \(!existing && \(!PUBLIC_CAR_STATUSES\.has\(car\.status\) \|\| \(car\.deletedAt \?\? car\.deleted_at\)\)\)/, 'New saves must obey the public listing visibility policy');
assert.match(toggle, /if \(existing\) \{[\s\S]*?existing\.deleteOne\(\)/, 'Existing hidden listings must remain removable');
assert.match(routes, /router\.use\(protect\)/, 'Favorites must remain authenticated');
assert.match(tests, /refuses a new favorite for a soft-deleted listing/);
assert.match(tests, /allows an existing favorite to be removed after its listing becomes hidden/);
console.log('PASS: saved vehicle toggle respects public visibility while preserving removal');
