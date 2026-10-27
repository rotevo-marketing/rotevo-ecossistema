// Component interaction test in JSDOM, without production accounts or a browser session.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const {JSDOM} = require('jsdom');
const rootDir = path.resolve(__dirname, '../..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...rest) {
  if (name.startsWith('@/')) name = path.join(rootDir, 'src', name.slice(2));
  return resolve.call(this, name, ...rest);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{jsx:ts.JsxEmit.ReactJSX, module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, esModuleInterop:true}});
  module._compile(result.outputText, filename);
};
require.extensions['.css'] = () => {};
const dom = new JSDOM('<!doctype html><div id="test-root"></div>', {url:'http://localhost/'});
global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;
global.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function() {this.open = true;};
dom.window.HTMLDialogElement.prototype.close = function() {this.open = false;};
const React = require('react');
const {createRoot} = require('react-dom/client');
const VisualHtmlBlock = require('../../src/Components/strategic-editor/VisualHtmlBlock.tsx').default;
const {visualTemplates} = require('../../src/lib/planning/visualHtml.ts');
const node = document.getElementById('test-root');
const root = createRoot(node);
const click = async label => {
  const button = [...node.querySelectorAll('button')].find(b => b.textContent === label);
  assert.ok(button, label);
  await React.act(async () => button.dispatchEvent(new window.MouseEvent('click', {bubbles:true})));
};

test('editing a visual block previews a template and applies it to the document only on request', async () => {
  let applied;
  await React.act(async () => root.render(React.createElement(VisualHtmlBlock, {props:visualTemplates[0].props,editable:true,onChange:value => {applied=value;}})));
  await click('Editar HTML');
  assert.ok(node.querySelector('dialog[open]'));
  assert.equal(node.querySelectorAll('textarea').length,3);
  await click('Mapa mental');
  assert.equal(applied,undefined);
  assert.match(node.querySelector('.visual-html-preview iframe').srcdoc, /<svg/);
  await click('Aplicar ao documento');
  assert.equal(applied.label,'Mapa de prioridades');
  assert.match(applied.markup, /viewBox/);
  assert.equal(node.querySelector('dialog'),null);
});

test('client reading renders the same isolated visual without editing controls', async () => {
  await React.act(async () => root.render(React.createElement(VisualHtmlBlock, {props:visualTemplates[1].props,editable:false,onChange:() => {throw Error('Must not edit from reading mode');}})));
  assert.equal(node.querySelectorAll('button, dialog, textarea').length,0);
  const frame = node.querySelector('iframe');
  assert.equal(frame.getAttribute('sandbox'),'');
  assert.equal(frame.title,'Mapa de prioridades');
  assert.equal(frame.style.height,'480px');
  assert.match(frame.srcdoc,/script-src 'none'/);
  assert.ok(node.querySelector('figcaption').textContent.includes('oferta, aquisição e operação'));
  await React.act(async () => root.unmount());
});
