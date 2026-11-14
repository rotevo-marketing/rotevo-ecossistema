import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React, {act} from 'react';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const source=path=>readFileSync(new URL('../../src/'+path,import.meta.url),'utf8');
function compile(text,mocks={}){
 const output=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(output,{module,exports:module.exports,require:id=>id in mocks?mocks[id]:require(id),window,document,HTMLElement:window.HTMLElement,console,crypto:globalThis.crypto});
 return module.exports;
}
async function mount(Component,props,run){
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
 const previous={window:globalThis.window,document:globalThis.document,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT};
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const {createRoot}=await import('react-dom/client');
 const root=createRoot(document.getElementById('root'));
 try{await act(async()=>root.render(React.createElement(Component(),props)));await run(dom.window);}finally{await act(async()=>root.unmount());dom.window.close();Object.assign(globalThis,previous);}
}
const noop=()=>null;
test('failed client directory query reports unavailable totals and retries without writing',async()=>{
 let calls=0;
 await mount(()=>compile(source('Components/admin/ClientsDirectory.tsx'),{
  'next/link':{default:noop},'@/lib/operations/api':{request:async(path,method='GET')=>{
   assert.equal(path,'/api/admin/clients');assert.equal(method,'GET');calls++;
   if(calls===1)throw new Error('Consulta indisponível');
   return {clients:[]};
  }},'@/hooks/useUnsavedChanges':{confirmDiscardChanges:()=>true,useUnsavedChanges:()=>{}},
  '@/Components/RotevoTablerIcon':{RotevoTablerIcon:noop},'./ClientWorkspaceManager':{default:noop},'@/Components/operations/AssetUpload':{default:noop},'@/Components/ui/DialogFocus':{default:noop}
 }).default,{projects:[]},async win=>{
  assert.equal(document.querySelectorAll('.rv-ui2-stat').length,3);
  for(const stat of document.querySelectorAll('.rv-ui2-stat'))assert.match(stat.textContent,/Indisponível/);
  assert.doesNotMatch(document.body.textContent,/Nenhum cliente encontrado/);
  const retry=[...document.querySelectorAll('button')].find(e=>e.textContent==='Tentar novamente');
  assert.ok(retry);await act(async()=>retry.dispatchEvent(new win.MouseEvent('click',{bubbles:true})));
  assert.equal(calls,2);assert.match(document.body.textContent,/Nenhum cliente encontrado/);
  assert.equal(document.querySelector('[role="alert"]'),null);
 });
});
test('project picker supports keyboard navigation and Escape returns focus to labelled trigger',async()=>{
 const full=source('Components/admin/CentralTarefas.tsx');
 const picker=full.slice(full.indexOf('function ProjectPicker('),full.indexOf('export default function CentralTarefas'));
 const isolated='import {useState,useRef,useEffect} from "react";const TaskAvatar=()=>null;const RotevoTablerIcon=()=>null;const getClient=p=>Array.isArray(p.clients)?p.clients[0]:p.clients;'+picker+';export default ProjectPicker;';
 await mount(()=>compile(isolated).default,{projects:[{id:'p1',title:'Projeto sintético',clients:{id:'c1',name:'Cliente sintético'}}],value:'all',allowAll:true,onChange:()=>{}},async win=>{
  const trigger=document.querySelector('button');assert.equal(trigger.getAttribute('aria-label'),'Filtrar projeto');
  await act(async()=>trigger.click());
  const input=document.querySelector('input');
  await act(async()=>input.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true})));
  const options=document.querySelectorAll('[role="option"]');assert.equal(document.activeElement,options[0]);
  await act(async()=>options[0].dispatchEvent(new win.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true})));
  assert.equal(document.activeElement,options[1]);
  await act(async()=>options[1].dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
  assert.equal(document.querySelector('[role="listbox"]'),null);assert.equal(document.activeElement,trigger);
 });
});
test('planning mobile navigation closes on Escape and restores trigger focus',async()=>{
 await mount(()=>compile(source('Components/admin/PlanningAdminShell.tsx'),{
  'next/link':{default:noop},'@/Components/RotevoLogo':{RotevoLogo:noop},'@/Components/RotevoTablerIcon':{RotevoTablerIcon:noop},
  './AdminUserMenu':{default:noop},'@/lib/supabase':{supabase:{auth:{getUser:async()=>({data:{user:null}})}}},'@/Components/strategic-editor/workspace-preview.css':{}
 }).default,{children:'Synthetic content'},async win=>{
  const trigger=document.querySelector('[aria-label="Abrir menu do estrategista"]');
  await act(async()=>trigger.click());assert.equal(trigger.getAttribute('aria-expanded'),'true');
  await act(async()=>win.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(trigger.getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,trigger);
 });
});
