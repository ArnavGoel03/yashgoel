# Release availability reconciliation, 18 September 2026

| Project | Availability checked | Record reconciliation |
|---|---|---|
| Review record | 503 DEPLOYMENT_PAUSED | Recorded; PR4 |
| CUTROOM | 503 DEPLOYMENT_PAUSED | Merged PR2, 0747f0b |
| Q Branch | 503 DEPLOYMENT_PAUSED | Merged PR2, 28b80de |
| Library Walk | 503 DEPLOYMENT_PAUSED | Merged PR2, 23a6be3 |
| Gondilal | Home/shop: 503 DEPLOYMENT_PAUSED | Recorded; PR25 |
| Buzz | 503 DEPLOYMENT_PAUSED | Pushed main d77ffc1 |
| Power Grid | Article and 10 frames: 200, matching source | Merged PR3, f348341 |
| Collab | Home/sign-in: 503 DEPLOYMENT_PAUSED | Pushed main a29f360 |
| Watch Together | 503 DEPLOYMENT_PAUSED | Pushed main bd3507b |
| Stature | Current alias: 503 paused; obsolete alias: 404 | Merged PR2, b38f1de |
| Seen | Home/health: 503 DEPLOYMENT_PAUSED | Pushed main ec7cc3b |

HTTP receipt: `docs/receipts/web-availability-2026-09-18.json`.
No local browsers launched, no provider settings changed and no repeated build/test
gates run for these record-only corrections. Historical browser receipts remain
separate from current availability and from unmeasured cross-device performance.

## Remaining regression gaps

- Review record: browser currentSrc, cover dimensions and layout comparison.
- CUTROOM: reel/keyboard/mobile rendered interactions after gate removal.
- Q Branch: first/repeat/offline, 3D interactions and responsiveness.
- Library Walk: gameplay, accessibility, offline reload and classroom behavior.
- Gondilal: real iPhone Safari layout/tour/focus and cache-change interactions.
- Buzz: live map tiles, production RLS and native devices; fixture browser cases pass.
- Power Grid: Chromium desktop/phone comparison passes on unchanged sources;
  no WebKit/Firefox, physical-device or Web Vitals guarantee.
- Collab: latest combined UI/auth flow in a browser and real two-founder use.
- Watch Together: protected-provider playback and signed-in real participants.
- Stature: real persistence/order/payment and rendered checkout interactions.
- Seen: real-member hosting/security obligations and recommendation validation;
  the verified fictional-demo source remains unchanged.

Historical successful runs rechecked through GitHub: Buzz 35253752112, Power Grid
35168433667, Watch Together 35256998101, Seen 34706064261 and 34706405621.
The affected app sources match those receipts, so no duplicate gates were run.
Only public Power Grid could serve its current source: all ten frame attributes
and every frame document's complete bytes match the local files.
