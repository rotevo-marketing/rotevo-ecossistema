import DOMPurify from "isomorphic-dompurify";

export const VISUAL_HTML_LIMIT = 80000;
export const VISUAL_CSS_LIMIT = 20000;
export type VisualHtmlProps = {
  label: string;
  markup: string;
  stylesheet: string;
  description: string;
  height: number;
};

// Static document visuals only. No embeds, remote resources, forms or executable SVG.
const tags = ["div", "section", "article", "header", "footer", "main", "aside", "figure", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "strong", "b", "em", "i", "u", "s", "small", "br", "hr", "ul", "ol", "li", "dl", "dt", "dd", "blockquote", "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col", "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "title", "desc"];
const attributes = ["class", "style", "role", "aria-label", "aria-labelledby", "id", "colspan", "rowspan", "scope", "width", "height", "viewBox", "xmlns", "d", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "points", "transform", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "font-size", "font-family", "font-weight", "text-anchor", "dominant-baseline", "preserveAspectRatio"];

export function cleanVisualMarkup(source: string): string {
  return DOMPurify.sanitize(source.slice(0, VISUAL_HTML_LIMIT), {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: attributes,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "foreignObject", "use", "image", "animate", "set", "a", "link", "meta", "base"],
  }) as string;
}

export function visualPlainText(source: string): string {
  const cleaned = cleanVisualMarkup(source)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr|text|figcaption)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return cleaned.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#x[0-9a-f]+|#[0-9]+);/gi, entity => {
    const named: Record<string, string> = {"&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"', "&apos;":"'", "&#39;":"'", "&nbsp;":" "};
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = entity.toLowerCase().startsWith("&#x") ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  }).trim();
}

export function validVisualHtmlProps(value: unknown): value is VisualHtmlProps {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  return typeof p.label === "string" && p.label.trim().length > 0 && p.label.length <= 140
    && typeof p.markup === "string" && p.markup.length <= VISUAL_HTML_LIMIT
    && typeof p.stylesheet === "string" && p.stylesheet.length <= VISUAL_CSS_LIMIT
    && typeof p.description === "string" && p.description.trim().length > 0 && p.description.length <= 4000
    && typeof p.height === "number" && Number.isInteger(p.height) && p.height >= 160 && p.height <= 2400;
}

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const VISUAL_CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

export function visualFrameDocument(props: VisualHtmlProps): string {
  // Escaping '<' keeps CSS from closing the style element. The frame isolates all selectors;
  // its CSP blocks URL loads, imports, scripts and requests, including CSS resource URLs.
  const css = props.stylesheet.slice(0, VISUAL_CSS_LIMIT).replace(/</g, "\\3c ");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${VISUAL_CSP}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(props.label)}</title><style>*{box-sizing:border-box}html{color-scheme:light}body{margin:0;padding:16px;background:#fff;color:#0b152b;font:15px/1.6 Arial,sans-serif;overflow-wrap:anywhere}svg{display:block;max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}p{margin:0 0 12px}h1,h2,h3{line-height:1.25}th,td{padding:8px;text-align:left} ${css}</style></head><body>${cleanVisualMarkup(props.markup)}</body></html>`;
}

export const visualTemplates: {name: string; props: VisualHtmlProps}[] = [
  {name: "Fluxo", props: {
    label: "Fluxo de relacionamento", description: "Exemplo ilustrativo: origem dos contatos, relacionamento comercial e entrega. Substitua pelos dados do planejamento.", height: 300,
    markup: '<h2>Do primeiro contato à entrega</h2><p>Exemplo ilustrativo. Substitua pelo fluxo real.</p><div class="flow"><section><small>01 · ORIGEM</small><h3>Primeiro contato</h3><p>Indicação, conteúdo e busca.</p></section><span aria-label="Segue para">→</span><section><small>02 · RELACIONAMENTO</small><h3>Conversa comercial</h3><p>Necessidade, proposta e decisão.</p></section><span aria-label="Segue para">→</span><section><small>03 · ENTREGA</small><h3>Experiência do cliente</h3><p>Onboarding, execução e acompanhamento.</p></section></div>',
    stylesheet: '.flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:14px;align-items:center}.flow section{padding:18px;background:#f4f0ff;border:1px solid #ddd2ff;border-radius:14px}.flow small{color:#6735d5;font-weight:bold}.flow h3{margin:8px 0}.flow p{margin:0}@media(max-width:600px){.flow{grid-template-columns:1fr}.flow>span{text-align:center;transform:rotate(90deg)}}',
  }},
  {name: "Mapa mental", props: {
    label: "Mapa de prioridades", description: "Mapa ilustrativo com três frentes: oferta, aquisição e operação, conectadas ao crescimento do negócio.", height: 480,
    markup: '<h2>Mapa de prioridades</h2><p>Exemplo ilustrativo para organizar relações.</p><svg viewBox="0 0 760 340" role="img" aria-label="Crescimento conectado a oferta, aquisição e operação"><path d="M280 170 L470 60 M280 170 L470 170 M280 170 L470 280" fill="none" stroke="#b29bdf" stroke-width="3"/><rect x="20" y="125" width="260" height="90" rx="18" fill="#743ddb"/><text x="150" y="178" fill="white" text-anchor="middle" font-size="22" font-weight="bold">Crescimento</text><rect x="470" y="20" width="270" height="80" rx="14" fill="#f0eaff"/><text x="605" y="67" text-anchor="middle" font-size="20">Oferta</text><rect x="470" y="130" width="270" height="80" rx="14" fill="#f0eaff"/><text x="605" y="177" text-anchor="middle" font-size="20">Aquisição</text><rect x="470" y="240" width="270" height="80" rx="14" fill="#f0eaff"/><text x="605" y="287" text-anchor="middle" font-size="20">Operação</text></svg>', stylesheet: '',
  }},
  {name: "Gráfico com escala", props: {
    label: "Maturidade por dimensão", description: "Dados ilustrativos em escala fixa de 1 a 5: estratégia 1, oferta 2 e operação 2. Não representam a avaliação de um cliente.", height: 320,
    markup: '<h2>Maturidade por dimensão</h2><p>Dados ilustrativos · Escala fixa de 1 a 5</p><div class="bars"><span>Estratégia</span><div><i style="width:20%"></i></div><strong>1 / 5</strong><span>Oferta</span><div><i style="width:40%"></i></div><strong>2 / 5</strong><span>Operação</span><div><i style="width:40%"></i></div><strong>2 / 5</strong></div><p class="note">A largura da barra corresponde ao valor dividido por 5.</p>',
    stylesheet: '.bars{display:grid;grid-template-columns:minmax(85px,1fr) 3fr auto;gap:18px 12px;align-items:center}.bars>div{height:18px;background:#f0ecf7;border-radius:6px;overflow:hidden}.bars i{display:block;height:100%;background:#7c52d5}.note{margin-top:20px;font-size:13px;color:#63708a}',
  }},
];
