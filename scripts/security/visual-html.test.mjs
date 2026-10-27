import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {cleanVisualMarkup, visualPlainText, visualFrameDocument, validVisualHtmlProps, visualTemplates, VISUAL_HTML_LIMIT, VISUAL_CSS_LIMIT, VISUAL_HEIGHT_SCRIPT} from '../../src/lib/planning/visualHtml.ts';
import {validRichContent, richText} from '../../src/lib/planning/richContent.ts';
import {validEcosystemDocumentTransition} from '../../src/lib/security/ecosystemDocumentTransitions.ts';

const props = () => structuredClone(visualTemplates[0].props);
const rich = (p = props()) => ({format:'blocknote-v1', blocks:[{id:'visual-a', type:'visualHtml', props:p, children:[]}]});
const document = (value) => ({content:richText(value), richContent:value, reviewStatus:'draft', updatedAt:'2026-10-27T18:00:00Z'});
const root = (doc) => ({ecosystem2027:{documents:{'01.05':doc}}});

test('templates preserve semantic HTML, inline CSS and static SVG with readable text', () => {
  for (const template of visualTemplates) {
    assert.ok(validVisualHtmlProps(template.props));
    assert.ok(validRichContent(rich(template.props)));
    const cleaned = cleanVisualMarkup(template.props.markup);
    assert.match(cleaned, /<h2>/);
    assert.equal(cleanVisualMarkup(cleaned), cleaned);
    assert.ok(richText(rich(template.props)).includes(template.props.description));
    assert.ok(!richText(rich(template.props)).includes('<svg'));
  }
  const svg = cleanVisualMarkup(visualTemplates[1].props.markup);
  assert.match(svg, /viewBox="0 0 760 340"/);
  assert.match(svg, /<path/);
  assert.match(svg, /aria-label="Crescimento/);
  assert.match(svg, /<text[^>]*>Crescimento<\/text>/);
});

test('sanitizer removes scripts, event handlers, interactive SVG and remote embeds', () => {
  const dirty = '<script>alert(1)</script><iframe src="https://example.test"></iframe><img src="https://example.test"><div onclick="alert(1)">Texto</div><a href="javascript:alert(1)">Link</a><svg onload="alert(1)"><foreignObject><input autofocus onfocus="alert(1)"></foreignObject><use href="https://example.test/icon.svg#x"/><animate attributeName="href" values="javascript:alert(1)"/><text x="20">Seguro</text></svg>';
  const cleaned = cleanVisualMarkup(dirty);
  assert.doesNotMatch(cleaned, /script|iframe|img|onclick|onload|onfocus|foreignObject|<input|<use|<animate|javascript:|https:/i);
  assert.match(cleaned, /Texto/);
  assert.match(cleaned, /Seguro/);
});

test('plain document fallback includes visual text, values and descriptions without leaking source code', () => {
  const p = {...props(),markup:'<h2>Diagnóstico &amp; prioridades</h2><p>Estratégia: 1 / 5</p><script>secret()</script><p>Oferta: 2 / 5</p>',stylesheet:'body{color:purple}'};
  const plain = richText(rich(p));
  assert.ok(plain.includes('Diagnóstico & prioridades'));
  assert.ok(plain.includes('Estratégia: 1 / 5'));
  assert.ok(plain.includes('Oferta: 2 / 5'));
  assert.ok(plain.includes(p.description));
  assert.doesNotMatch(plain, /<h2|secret|color:purple/);
  assert.equal(visualPlainText('<p>&#x1F9E0; &lt; 5</p>'),'🧠 < 5');
});

test('frame retains CSP even when CSS or labels try to close their containing elements', () => {
  const source = visualFrameDocument({...props(), label:'</title><script>alert(1)</script>', stylesheet:'</style><script>alert(1)</script><style>@import "https://example.test/a.css";body{background:url(https://example.test)}'});
  const dom = new JSDOM(source).window.document;
  assert.equal(dom.querySelectorAll('iframe, object, embed, base, form').length, 0);
  assert.equal(dom.querySelectorAll('script').length,1);
  assert.equal(dom.querySelector('script').textContent,VISUAL_HEIGHT_SCRIPT);
  assert.equal(dom.querySelectorAll('style').length, 1);
  const policy = dom.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
  for (const directive of ["default-src 'none'", "img-src 'none'", "connect-src 'none'", "base-uri 'none'", "form-action 'none'"]) assert.ok(policy.includes(directive));
  assert.equal(dom.title, '</title><script>alert(1)</script>');
  assert.ok(policy.includes("script-src 'sha256-"+createHash('sha256').update(VISUAL_HEIGHT_SCRIPT).digest('base64')+"'"));
});

test('new visual block rejects malformed data and resource exhaustion while old blocks remain valid', () => {
  assert.ok(validRichContent({format:'blocknote-v1',blocks:[{id:'p',type:'paragraph',content:[{type:'text',text:'Documento existente'}]}]}));
  for (const changes of [{height:159},{height:2401},{height:200.5},{height:'400'},{description:''},{label:''},{markup:'x'.repeat(VISUAL_HTML_LIMIT+1)},{stylesheet:'x'.repeat(VISUAL_CSS_LIMIT+1)}]) assert.equal(validRichContent(rich({...props(),...changes})),false);
  assert.equal(validRichContent({format:'blocknote-v1',blocks:[{...rich().blocks[0],content:'unsupported'}]}),false);
});

test('visual HTML follows review and publication rules and changed CSS preserves the released copy', () => {
  const draft = document(rich());
  const review = {...draft, reviewStatus:'review'};
  const approved = {...review, reviewStatus:'approved'};
  const published = {...approved, publishedContent:approved.content, publishedRichContent:structuredClone(approved.richContent), publishedAt:'2026-10-27T18:01:00Z'};
  assert.equal(validEcosystemDocumentTransition(root(draft),root(review)),true);
  assert.equal(validEcosystemDocumentTransition(root(review),root(approved)),true);
  assert.equal(validEcosystemDocumentTransition(root(approved),root(published)),true);
  const edited = structuredClone(published);
  edited.richContent.blocks[0].props.stylesheet += '\nh2{color:purple}';
  assert.equal(validEcosystemDocumentTransition(root(published),root(edited)),false);
  edited.reviewStatus = 'draft';
  assert.equal(validEcosystemDocumentTransition(root(published),root(edited)),true);
  assert.deepEqual(edited.publishedRichContent,published.richContent);
  edited.publishedRichContent = edited.richContent;
  assert.equal(validEcosystemDocumentTransition(root(published),root(edited)),false);
});

test('small and extensive HTML/CSS survive exact JSON serialization with unicode and SVG',()=>{
 for(const markup of ['<p>Ação 🧠 &amp; decisão</p>', '<section>'+('<p>Dimensão: 2 / 5 · ação 🧠</p>'.repeat(2100))+'</section>']){
  const value=rich({...props(),markup,stylesheet:'.card{color:#743ddb}\n'.repeat(600)});
  assert.ok(validRichContent(value));
  const reopened=JSON.parse(JSON.stringify(value));
  assert.deepEqual(reopened,value);
  assert.ok(validRichContent(reopened));
  assert.ok(richText(reopened).includes('ação')||richText(reopened).includes('Ação'));
 }
});
