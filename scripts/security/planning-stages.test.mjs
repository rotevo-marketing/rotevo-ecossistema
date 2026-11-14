import test from 'node:test';
import assert from 'node:assert/strict';
import {validPlanningStages,validStageDate} from '../../src/lib/planning/stages.ts';
const stage={id:'diagnosis',title:'Diagnóstico',dueDate:'2028-02-29',status:'pending',visibleToClient:true};
test('planning dates require an actual calendar day',()=>{for(const date of ['','2028-02-29','2026-10-20'])assert.equal(validStageDate(date),true);for(const date of ['2026-02-29','2026-04-31','2026-13-01','20/10/2026',null])assert.equal(validStageDate(date),false);});
test('planning stages accept an empty schedule and valid bounded stages',()=>{assert.equal(validPlanningStages([]),true);assert.equal(validPlanningStages([stage]),true);});
test('planning rejects duplicate IDs and malformed visibility or status',()=>{for(const rows of [[stage,stage],[{...stage,id:''}],[{...stage,status:'published'}],[{...stage,visibleToClient:'true'}],[{...stage,title:' '}],[{...stage,dueDate:'2026-02-30'}]])assert.equal(validPlanningStages(rows),false);});
test('planning stage limit is enforced instead of silently truncating writes',()=>{assert.equal(validPlanningStages(Array.from({length:16},(_,i)=>({...stage,id:String(i)}))),false);assert.equal(validPlanningStages({}),false);});
