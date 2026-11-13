import test from "node:test";
import assert from "node:assert/strict";
import {validEcosystemDocumentTransition as valid} from "../../src/lib/security/ecosystemDocumentTransitions.ts";

const at="2026-10-16T12:00:00.000Z";
const later="2026-10-16T13:00:00.000Z";
const wrap=(doc)=>({ecosystem2027:{version:1,documents:doc?{"07.05":doc}:{}}});
const draft={content:"Planejamento editorial",updatedAt:at,reviewStatus:"draft"};
const reviewing={...draft,reviewStatus:"review"};
const approved={...draft,reviewStatus:"approved"};
const published={...approved,publishedContent:draft.content,publishedAt:later};

test("document workflow requires draft, review and approval in that order",()=>{
 assert.equal(valid(wrap(),wrap(draft)),true);
 assert.equal(valid(wrap(draft),wrap(reviewing)),true);
 assert.equal(valid(wrap(reviewing),wrap(approved)),true);
 assert.equal(valid(wrap(approved),wrap(published)),true);
 assert.equal(valid(wrap(draft),wrap(approved)),false);
 assert.equal(valid(wrap(),wrap(approved)),false);
 assert.equal(valid(wrap(reviewing),wrap(published)),false);
});

test("publication cannot leak changed, unapproved or stale draft content",()=>{
 assert.equal(valid(wrap(approved),wrap({...published,publishedContent:"Not approved"})),false);
 assert.equal(valid(wrap(approved),wrap({...approved,publishedContent:draft.content,publishedAt:"invalid"})),false);
 assert.equal(valid(wrap(approved),wrap({...approved,content:"Edited",publishedContent:"Edited",publishedAt:later})),false);
});

test("editing a released document preserves published version until approved again",()=>{
 const revised={...published,content:"Updated draft",updatedAt:later,reviewStatus:"draft"};
 assert.equal(valid(wrap(published),wrap(revised)),true);
 assert.equal(valid(wrap(revised),wrap({...revised,reviewStatus:"review"})),true);
 assert.equal(valid(wrap(revised),wrap({...revised,publishedContent:"Updated draft"})),false);
 assert.equal(valid(wrap(published),wrap({...published,publishedContent:"Unauthorized edit"})),false);
});

test("published documents cannot disappear or be created already published",()=>{
 assert.equal(valid(wrap(published),wrap()),false);
 assert.equal(valid(wrap(),wrap(published)),false);
 assert.equal(valid(wrap(draft),wrap({...draft,reviewStatus:"unknown"})),false);
});
