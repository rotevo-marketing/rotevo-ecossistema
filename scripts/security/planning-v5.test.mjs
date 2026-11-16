import test from "node:test";
import assert from "node:assert/strict";
import { isPlanningV5, planningV5Stages, PLANNING_V5 } from "../../src/lib/planning/v5.ts";
import { projectForPresentation } from "../../src/lib/security/projectForPresentation.ts";

const project = { id: "v5", client_id: "owner", title: "Sintético", slug: "synthetic",
  description: null, status: "draft", clients: null };
const draftData = {
  planningStructureVersion: PLANNING_V5,
  planningClientAccessEnabled: true,
  investigation: { f01: "private intake" },
  executionTimeline: [
    { id: "shared", title: "Shared", visibleToClient: true, internalNote: "private note" },
    { id: "private", title: "Private", visibleToClient: false },
    { id: "archived", title: "Archived", visibleToClient: true, archivedAt: "2026-11-15" },
  ],
};

test("V5 registry has 3 internal items and 16 unique presentation pages", () => {
  assert.deepEqual(planningV5Stages.map(stage => stage.pages.length), [3, 6, 4, 4, 2]);
  assert.deepEqual(planningV5Stages.filter(stage => stage.internal).map(stage => stage.code), ["01"]);
  assert.equal(new Set(planningV5Stages.flatMap(stage => stage.pages.map(page => page.code))).size, 19);
  assert.equal(isPlanningV5(draftData), true);
  assert.equal(isPlanningV5({ planningStructureVersion: "5" }), false);
  assert.equal(isPlanningV5({ ecosystem2027: { version: 1 } }), false);
});

test("V5 draft stays private and presentation only projects explicitly shared timeline rows", () => {
  assert.equal(projectForPresentation({ ...project, data: draftData }, false, ["planning", "execution"]), null);
  const published = { ...project, status: "published", data: draftData };
  assert.deepEqual(projectForPresentation(published, false, ["planning", "execution"]).data, {
    planningStructureVersion: PLANNING_V5,
    timeline: { executionTimeline: [{ id: "shared", title: "Shared", visibleToClient: true }] },
  });
  assert.equal(projectForPresentation(published, false, ["planning"]).data.timeline, null);
  assert.equal(projectForPresentation({ ...published, data: { ...draftData, portalModules: ["execution"] } }, false), null);
});

test("existing planning publication still reads released documents through its existing projection", () => {
  const legacy = { ...project, status: "published", data: { ecosystem2027: {
    version: 1, selectedDocumentCodes: ["01.02"], presentedDocumentCodes: ["01.02"],
    documents: { "01.02": { content: "current draft", publishedContent: "published copy", publishedAt: "2026-11-15" } },
  } } };
  const result = projectForPresentation(legacy, false, ["planning"]);
  assert.equal(result.data.planningStructureVersion, undefined);
  assert.deepEqual(result.data.ecosystem2027.documents, { "01.02": { content: "published copy" } });
  assert.strictEqual(projectForPresentation(legacy, true), legacy);
});
