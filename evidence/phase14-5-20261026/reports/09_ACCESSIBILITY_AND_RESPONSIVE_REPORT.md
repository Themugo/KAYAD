# Accessibility and Responsive Report (mocked API, real bundle)
Run: 14 dealer sections + listing form (new/edit) at 1280px, 768px and 390px, axe-core serious/critical filter.
* Result: 0 crashes, 0 horizontal overflow, 0 serious/critical axe violations, 0 page errors (browser-run.txt).
* Keyboard/focus: remove confirmation moves focus to "Confirm remove"; Escape cancels with no request (verified in browser at desktop and mobile). Forms: labelled inputs, `aria-invalid`/`aria-describedby`, `role="alert"` errors, `role="status"` success, `aria-busy` on submit.
* Screenshots: `evidence/phase14-5-20261026/screenshots/` (inventory, new/edit listing, settings, team; desktop/tablet/mobile).
* Visual scope: only dealer dashboard Settings and Team panels changed (existing design tokens); no global styles or public/auction screens touched.
* Not covered: screen-reader testing with real assistive technology; real-data layouts.
