# Platform interface review — 2026-10-26

The owner explicitly authorized push, preview and production deployments for this interface update. No customer document publication, credential changes, access grants, migrations, financial changes or deletions are part of this release.

Production baseline: `dpl_B8SsWY4a66Krx5KY2JiPVNRkeRCe`, commit `8aba68153566456421a8f5b4e772fa239c55f3b3`. Project: `prj_tWUAryuFidBJhhPPwlW3J8rSt6xH`, team Rotevo Marketing, primary domain `app.rotevo.com.br`. The local baseline tree matches the deployed commit; main is not the production baseline. Retain this deployment as the rollback target.

Changes complete the existing pending interface batch: shared product tokens and typography; focused keyboard navigation; unsaved-change protection in client registration, editorial and meeting editors; exact project navigation; shared published-document projection; approval loading states; private image URL refresh; searchable document empty states; accessible drawers; consistent error and missing-page screens; and removal of an ineffective remember-session option. New-account password suggestions use cryptographic randomness without changing existing credentials.

Additional review fixes distinguish clients in identically titled project selectors and show readable list calendars on compact screens. The approved planning sidebar, adjacent document, insertion icons and circular project photo remain in place. Existing and future projects reuse these components; no bulk record rewrite is required.

Preview-only `/previa/responsivo` frames the real application at 360, 390, 768 or 1280 pixels. It does not bypass application authentication or copy sessions. `/previa/planejamento` remains an explicitly synthetic, in-memory editor demonstration. Both routes are unavailable in production through the existing preview gate.

Validation must distinguish static behavior/security tests, local unauthenticated HTTP rejection tests, synthetic in-memory demonstrations and authenticated read-only visual checks. This runtime has no local Supabase service; mutable authenticated database integration tests cannot be claimed as executed. No hosted customer record is a test fixture. Production deployment follows successful preview review and checks of the exact commit, project and environment.
