import test from "node:test";
import assert from "node:assert/strict";
import {parseResource,parseMessageBody,resourceIsVisible,requiredModule,canAccessConversation} from "../../src/lib/collaboration/guards.ts";

const projectId="123e4567-e89b-42d3-a456-426614174000";
const data={executionTimeline:[{id:"t1",visibleToClient:true},{id:"private",visibleToClient:false}],editorialCalendar:[{id:"c1",visibleToClient:true},{id:"draft",visibleToClient:false}]};
const base={role:"client",userClientId:"client-a",projectClientId:"client-a",workspaceModules:["execution","content"],projectData:data,resourceType:"task",resourceId:"t1"};
test("parse resource accepts only supported scoped identifiers",()=>{
 assert.deepEqual(parseResource({projectId,resourceType:"task",resourceId:"t1"}),{projectId,resourceType:"task",resourceId:"t1"});
 for(const bad of [{projectId:"bad",resourceType:"task",resourceId:"t1"},{projectId,resourceType:"finance",resourceId:"t1"},{projectId,resourceType:"task",resourceId:"../t1"},{projectId,resourceType:"task",resourceId:""},{projectId,resourceType:"task",resourceId:"x".repeat(101)}])assert.equal(parseResource(bad),null);
});
test("message content is bounded and sanitized by callers as plain text",()=>{
 assert.equal(parseMessageBody("  Olá cliente  "),"Olá cliente");
 assert.equal(parseMessageBody(""),null);
 assert.equal(parseMessageBody("x".repeat(3001)),null);
 assert.equal(parseMessageBody("\u0000"),null);
});
test("only explicitly shared items can have client-facing discussion",()=>{
 assert.equal(resourceIsVisible(data,"task","t1"),true);
 assert.equal(resourceIsVisible(data,"content","c1"),true);
 assert.equal(resourceIsVisible(data,"task","private"),false);
 assert.equal(resourceIsVisible(data,"content","draft"),false);
 assert.equal(resourceIsVisible(data,"task","missing"),false);
 assert.equal(resourceIsVisible({}, "task", "t1"),false);
 assert.equal(requiredModule("task"),"execution");
 assert.equal(requiredModule("content"),"content");
});
test("client is denied another tenant, disabled module and private resource",()=>{
 assert.equal(canAccessConversation(base),true);
 assert.equal(canAccessConversation({...base,projectClientId:"client-b"}),false);
 assert.equal(canAccessConversation({...base,userClientId:null}),false);
 assert.equal(canAccessConversation({...base,workspaceModules:[]}),false);
 assert.equal(canAccessConversation({...base,resourceId:"private"}),false);
 assert.equal(canAccessConversation({...base,resourceType:"content",resourceId:"c1"}),true);
 assert.equal(canAccessConversation({...base,resourceType:"content",resourceId:"c1",workspaceModules:["execution"]}),false);
});
test("staff requires active membership, explicit assignment and read permission",()=>{
 const staff={...base,role:"staff",teamActive:true,assigned:true,permissions:["projects.read"]};
 assert.equal(canAccessConversation(staff),true);
 assert.equal(canAccessConversation({...staff,teamActive:false}),false);
 assert.equal(canAccessConversation({...staff,assigned:false}),false);
 assert.equal(canAccessConversation({...staff,permissions:[]}),false);
});
test("strategist cannot read unpublished resource; unknown roles are denied",()=>{
 assert.equal(canAccessConversation({...base,role:"strategist"}),true);
 assert.equal(canAccessConversation({...base,role:"strategist",teamActive:false}),false);
 assert.equal(canAccessConversation({...base,role:"strategist",resourceId:"private"}),false);
 assert.equal(canAccessConversation({...base,role:"anonymous"}),false);
});
