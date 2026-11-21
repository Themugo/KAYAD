# Admin visual / accessibility harness (test tooling — not production code)

Used to produce the Super Admin completion screenshot, axe and keyboard-interaction evidence.

* `admin-visual-harness.cjs` drives Chromium (Playwright) against a running `vite preview` of the built app
  (`npm run build && npx vite preview --host 127.0.0.1 --port 4173`). Every `/api/**` request is answered from clearly
  labelled **test fixtures** (scenarios: populated, empty, error, forbidden, slow). Screenshots are therefore fixture
  screenshots, never production screenshots.
* `undefined-classes.cjs` lists CSS utility classes used in source that have no definition.
* `aggregate-final.py` summarises a results directory (`python3 aggregate-final.py <dir>`; needs Pillow).

No dependency is added to this repository's manifests. Run the harness from a folder that has `playwright` and `axe-core`
installed (e.g. `npm i playwright axe-core` in a scratch directory, outside the project) and set `NODE_PATH` to it.
