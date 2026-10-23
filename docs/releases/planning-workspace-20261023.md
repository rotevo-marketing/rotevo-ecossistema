# Planning workspace release — 2026-10-23

User explicitly approved production publication and the same layout for existing and future projects.

The existing project route now opens the connected block editor by default. The layout includes the strategist navigation and account menu, project photo and aligned metadata, document navigation with search/status filters, grouped insertion controls with Tabler icons, contextual properties, chart data rows, focus mode, reading mode, and the published snapshot. Review, approval, publication, assets, version conflicts and authorization use the existing endpoints. Schedule and execution editors remain connected to their existing persistence. Scope changes preserve stored documents.

The administrative customer preview displays only published snapshots within the selected/presented scope (or visible executive documents), and warns when the project is not published. The authenticated customer presentation route and its server-side projection are unchanged. The former fictional Aurora preview is no longer embedded in real projects.

The creation flow has the same shell and opens the newly created project by its exact returned ID. No database migration, bulk project rewrite or publication of draft customer documents is involved. Existing projects receive the layout through their shared route.

Validation: production build with synthetic local Supabase public configuration; TypeScript; targeted ESLint (no errors; existing warnings); 242 security/regression tests. Route-isolation tests now cover the connected document editor replacing the retired legacy editor mount. Mutating hosted records were not used as test fixtures. The local mutable API suite requires a local Supabase instance and was not run in this environment.

Production baseline: dpl_6jEg9ii3RgJbMrq74orQaLqo2i6N (d16fe2799891927ea65d360cc0cd32f2e8035623). Release is built from feature/strategic-workspace-preview; main is not the production baseline. Keep the previous deployment available for rollback.
