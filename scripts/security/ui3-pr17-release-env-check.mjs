#!/usr/bin/env node
/**
 * UI3 PR17 cutover gate. Read-only. Never prints credentials or recipient IDs.
 * Invoke against the intended Vercel Production environment BEFORE next build.
 * A successful output is not a substitute for authenticated browser acceptance.
 */
const requiredTrue=[
 "NEXT_PUBLIC_ROTEVO_APPEARANCE_ENABLED",
 "ROTEVO_APPEARANCE_ENABLED",
 "NEXT_PUBLIC_ROTEVO_CLIENT_ACTIONS_ENABLED",
 "ROTEVO_CLIENT_ACTIONS_ENABLED",
 "NEXT_PUBLIC_ROTEVO_NOTIFICATIONS_ENABLED",
 "ROTEVO_NOTIFICATIONS_ENABLED",
 "NEXT_PUBLIC_ROTEVO_WORKFLOW_APPROVALS_ENABLED",
 "ROTEVO_WORKFLOW_APPROVALS_ENABLED"
];
const violations=[];
for(const key of requiredTrue){
 if(process.env[key]!=="true")violations.push(key+": must be exactly true");
}
const raw=process.env.ROTEVO_NOTIFICATIONS_PILOT_USER_IDS??"";
const ids=raw.split(",").map(s=>s.trim()).filter(Boolean);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if(ids.length===0)violations.push("ROTEVO_NOTIFICATIONS_PILOT_USER_IDS: authorized nonempty pilot is required");
if(ids.some(id=>!uuid.test(id)))violations.push("ROTEVO_NOTIFICATIONS_PILOT_USER_IDS: invalid recipient ID format");
if(new Set(ids).size!==ids.length)violations.push("ROTEVO_NOTIFICATIONS_PILOT_USER_IDS: duplicate recipient IDs");
const collaboration=process.env.ROTEVO_PR17_COLLABORATION_RELEASE_MODE;
if(collaboration!=="enabled"&&collaboration!=="disabled"){
 violations.push("ROTEVO_PR17_COLLABORATION_RELEASE_MODE: explicitly choose enabled or disabled");
}else{
 const intended=collaboration==="enabled"?"true":"false";
 const publicFlag=process.env.NEXT_PUBLIC_ROTEVO_COLLABORATION_ENABLED??"false";
 const serverFlag=process.env.ROTEVO_COLLABORATION_ENABLED??"false";
 if(publicFlag!==intended||serverFlag!==intended){
  violations.push("Collaboration public/server flags do not match the declared release mode");
 }
}
if(violations.length){
 console.error("UI3 PR17 release configuration: BLOCKED");
 for(const v of violations)console.error("- "+v);
 process.exitCode=1;
}else{
 console.log("UI3 PR17 release configuration: PASS (flag presence/consistency only)");
 console.log("Authorized pilot recipients: "+ids.length+" (identities not printed)");
}
