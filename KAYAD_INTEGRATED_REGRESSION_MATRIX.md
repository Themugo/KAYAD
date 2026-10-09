# Integrated Regression Matrix — Landing/Auction/Admin Config

| Area | Source evidence | Local tests | Staging/production |
|---|---|---|---|
| Root Marketplace route | Existing initial state was Marketplace; stale query persistence traced and fixed with `navLocationFor` | Four focused helper tests added; execution pending | Not run |
| Intentional auction deep link | Existing query navigation preserved | Covered by helper test | Not run |
| Auction scheduled list | Controller requires published `auction_setups`; migration exists in archive | Existing mocked partial-failure tests remain; no new backend fix claimed | Not run; deployed cause unconfirmed |
| Platform content settings | Existing PlatformConfig/CMS API and admin UI found | No new CMS behavior claimed | Not run |
| Dealer white-label | No complete tenant-scoped settings + canonical receipt renderer contract established | Not implemented | Not run |
| Support/identity/financial regressions | Existing source preserved except navigation setter | Full suite pending | Not run |

Environment at audit: Node `v22.16.0`; project `.nvmrc` specifies `22.22.2`; dependencies are not installed in the fresh extraction.
