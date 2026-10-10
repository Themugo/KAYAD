# KAYAD Homepage — Slate Teal + Nairobi/KICC Hero

Date: 2026-09-26

## Scope
- Reworked the existing homepage presentation only; no new marketplace business capability was introduced.
- Replaced the sharp electric-blue visual treatment with a Slate Teal palette: graphite `#1F2937`, slate teal `#176B87`, aqua-teal `#13B8A6`, soft surfaces and muted borders.
- Default hero copy is **Drive Your Dream Today**. Existing backend Hero Editor content still overrides this fallback copy when an admin has configured a visible hero slide.
- Default hero background is a Nairobi skyline view from Uhuru Park that visibly includes KICC. The background is a remote Wikimedia Commons asset and should be replaced with a locally hosted/commercially licensed asset before a production deployment if desired.
- Hero vehicle behavior is now deterministic when there are no real Featured/Promoted listings: the page uses the admin-configured fallback showcase vehicles. Once real Featured/Promoted vehicles exist, those remain authoritative and take precedence.
- The fallback showcase is editable in the existing Home Page Admin panel: make, model, year, fuel, transmission, tagline and image URL. No source-code change is required to replace the sample cars.

## KICC background source
Wikimedia Commons: `Nairobi skyline from Uhuru Park.jpg`, which describes the view as showing the KICC building. The file is CC BY-SA 4.0.

## Safety of the change
- Existing inventory, filters, pagination, sidebar, 3/4/5 controls, save/compare, escrow and admin hero editor contracts remain intact.
- The fallback cars are marked non-featured internally; they are not inserted into the inventory feed or advertised as database listings.
