# Route and Bootstrap Map

Static entry-point candidates: **259**

Entry-point rows were selected using filename and directory heuristics plus static imports. This is not a complete runtime route graph: framework-discovered routes, generated entry points, dynamically registered handlers, and conditional bootstraps require manual confirmation. No routes or middleware were changed.

High-value next checks: reconcile frontend bootstrap with router config; reconcile backend bootstrap with route registration and middleware order; trace auth, auction, payment, webhook, upload, and socket entry points using framework-specific parsers and tests.
