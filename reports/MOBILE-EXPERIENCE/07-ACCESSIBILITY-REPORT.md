# 07 — Accessibility report
Done: touch targets raised (carousel controls 36px, card CTA 40px, favourite 34px); card CTA remains a real button with text; footer logo decorative (alt="") beside text; reduced-motion rules untouched. Dark mode left disabled (theme layer inert behind `data-dark-ready`; remaining work: public pages half-styled).
NOT RE-RUN in this pass: axe-core scan, keyboard/focus walk, 200% zoom/text scaling, modal focus trap. `ci/browser/audit.mjs` exists for the axe scan — run before release. Favourite button at 34px is below the 44px guideline.
