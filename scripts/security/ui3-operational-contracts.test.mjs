import test from "node:test";
import assert from "node:assert/strict";
import {meetingInterval,meetingIntervalsOverlap} from "../../src/lib/googleCalendar/meetingTiming.ts";
import {readFileSync} from "node:fs";
import {campaignResources,validCampaignLinks,validCampaignRecords} from "../../src/lib/security/campaignMetricsValidation.ts";
import {
 canTransitionEditorial, canTransitionClientAction, isFormalDecisionDue,
 resultOfFormalDecision, validateEditorialDates, validateTaskDates,
 assignedToClient, isLegacyIdeaPending, validLocalDate
} from "../../src/lib/workflow/ui3OperationalContracts.ts";

test("idea approval does not automatically start production",()=>{
 assert.equal(resultOfFormalDecision("idea","approved"),"idea_approved");
 assert.equal(canTransitionEditorial("idea","production"),false);
 assert.equal(canTransitionEditorial("idea_approved","production"),true);
});
test("idea correction is distinct from final correction",()=>{
 assert.equal(resultOfFormalDecision("idea","changes_requested"),"idea_changes");
 assert.equal(resultOfFormalDecision("final","changes_requested"),"changes_requested");
 assert.equal(canTransitionEditorial("idea_changes","idea"),true);
 assert.equal(canTransitionEditorial("awaiting_client","idea_approved"),false);
});
test("legacy pending state is read-compatible, never a new transition",()=>{
 assert.equal(isLegacyIdeaPending("idea_pending"),true);
 assert.equal(canTransitionEditorial("idea","idea_pending"),false);
 assert.equal(isFormalDecisionDue("idea","idea",true),true);
 assert.equal(isFormalDecisionDue("idea_pending","idea",true),true);
 assert.equal(isFormalDecisionDue("idea","idea",false),false);
 assert.equal(isFormalDecisionDue("idea","final",true),false);
});
test("assignments require account identity, not visibility",()=>{
 assert.equal(assignedToClient("client-user-1","client-user-1"),true);
 assert.equal(assignedToClient("client-user-1","client-user-2"),false);
 assert.equal(assignedToClient(null,"client-user-1"),false);
});
test("client submission cannot approve or publish global content",()=>{
 assert.equal(canTransitionClientAction("pending","submitted"),true);
 assert.equal(canTransitionClientAction("submitted","validated"),true);
 assert.equal(canTransitionClientAction("submitted","correction_requested"),true);
 assert.equal(canTransitionClientAction("validated","submitted"),false);
 assert.equal(canTransitionEditorial("production","published"),false);
});
test("dates are independent and launch is optional",()=>{
 assert.deepEqual(validateEditorialDates({deadlineDate:"2026-11-18",publishDate:"2026-11-20"}),[]);
 assert.deepEqual(validateTaskDates({dueDate:"2026-11-16",launchDate:null}),[]);
 assert.deepEqual(validateTaskDates({dueDate:"2026-11-18",launchDate:"2026-11-20"}),[]);
 assert.equal(validateEditorialDates({deadlineDate:"2026-11-21",publishDate:"2026-11-20"}).length,1);
 assert.equal(validateTaskDates({dueDate:"2026-11-21",launchDate:"2026-11-20"}).length,1);
 assert.equal(validLocalDate("2026-02-29"),false);
 assert.equal(validLocalDate("2028-02-29"),true);
});

test("task launch is optional, stored independently and never drives overdue alerts",()=>{
 const tasks=readFileSync(new URL("../../src/Components/admin/CentralTarefas.tsx",import.meta.url),"utf8");
 const timeline=readFileSync(new URL("../../src/Components/cliente/ProjectTimeline.tsx",import.meta.url),"utf8");
 const api=readFileSync(new URL("../../src/app/api/admin/project/update/route.ts",import.meta.url),"utf8");
 assert.match(timeline,/launchDate\?:string/);
 assert.match(tasks,/launchDate:draft\.launchDate\|\|undefined/);
 assert.match(tasks,/launchDate:detailDraft\.launchDate\|\|undefined/);
 assert.match(tasks,/validateTaskDates\(\{dueDate:draft\.dueDate,launchDate:draft\.launchDate\}\)/);
 assert.match(tasks,/task\.dueDate<today\(\)/);
 assert.match(tasks,/visibleColumns\.launch/);
 assert.match(tasks,/Lançamento de \$\{task\.title\}/);
 assert.match(api,/task\.dueDate>task\.launchDate/);
 assert.match(api,/task\.launchDate===prior\?\.launchDate&&task\.dueDate===prior\?\.dueDate/);
});

test("campaign links select existing active records from their own project",()=>{
 const before={
  editorialCalendar:[{id:"editorial",title:"Publicação",status:"scheduled"},{id:"removed",title:"Rascunho",deletedAt:"2026-11-16"}],
  executionTimeline:[{id:"task",title:"Editar vídeo",status:"in_progress"}],
  marketingCampaigns:[{id:"existing",contentIds:["removed"]}]
 };
 assert.deepEqual(campaignResources(before.editorialCalendar),[{id:"editorial",title:"Publicação",status:"scheduled"}]);
 const campaign=(id,contentIds,taskIds=[])=>({marketingCampaigns:[{id,contentIds,taskIds}]});
 assert.equal(validCampaignLinks(campaign("existing",["editorial","removed"],["task"]),before),true);
 assert.equal(validCampaignLinks(campaign("new",["removed"]),before),false);
 assert.equal(validCampaignLinks(campaign("new",["external"]),before),false);
 assert.equal(validCampaignLinks(campaign("new",["task"]),before),false);
 assert.equal(validCampaignLinks(campaign("existing",[],["editorial"]),before),false);
});
test("campaign storage accepts historical campaigns and rejects duplicate links",()=>{
 const legacy={id:"campaign",title:"Campanha",status:"draft",platform:"Outro",objective:"",notes:"",resultLabel:"Leads",dashboardUrl:"",startDate:"",endDate:""};
 assert.equal(validCampaignRecords([legacy]),true);
 assert.equal(validCampaignRecords([{...legacy,contentIds:["creative"],taskIds:["task"]}]),true);
 assert.equal(validCampaignRecords([{...legacy,contentIds:["creative","creative"]}]),false);
});

test("meeting timing validates local ranges and uses the supplied time zone",()=>{
 const timing={endDate:"2026-11-18",endTime:"18:00",timeZone:"America/Sao_Paulo",allDay:false};
 const interval=meetingInterval("2026-11-18","17:30",timing);
 assert.equal(interval.minutes,30);
 assert.equal(new Date(interval.start).toISOString(),"2026-11-18T20:30:00.000Z");
 assert.equal(meetingInterval("2026-11-18","18:00",timing),null);
 assert.equal(meetingInterval("2026-11-18","17:30",{...timing,timeZone:"Invalid/Zone"}),null);
 assert.equal(meetingInterval("2026-11-18","",{...timing,endTime:"",allDay:true}).minutes,1440);
 assert.equal(meetingIntervalsOverlap(interval,{start:interval.end,end:interval.end+1000}),false);
});

test("Google Calendar connection credentials and availability stay server-side",()=>{
 const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
 const oauth=read("src/app/api/admin/google-calendar/route.ts");
 const callback=read("src/app/api/admin/google-calendar/callback/route.ts");
 const available=read("src/app/api/admin/google-calendar/availability/route.ts");
 const sql=read("docs/security/sql/ui3-google-calendar-connection-PROPOSAL-ONLY.sql");
 assert.match(oauth,/attempt\.userId!==userId/);
 assert.match(oauth,/code_challenge_method:"S256"/);
 assert.match(callback,/attempt\.state===state/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/from public,anon,authenticated/);
 assert.match(available,/return json\(\{busy:calendar\.busy\.length>0\}\)/);
});
