"use client";

import {useMemo, useRef, useState, useEffect} from "react";
import {cleanVisualMarkup, validVisualHtmlProps, visualFrameDocument, visualTemplates, VISUAL_HTML_LIMIT, VISUAL_CSS_LIMIT, type VisualHtmlProps} from "@/lib/planning/visualHtml";
import "./visual-html.css";
import {useUnsavedChanges} from "@/hooks/useUnsavedChanges";

export function VisualHtmlFrame({props}: {props: VisualHtmlProps}) {
  const source = useMemo(() => visualFrameDocument(props), [props]);
  return <figure className="visual-html-figure">
    <iframe title={props.label} srcDoc={source} sandbox="" referrerPolicy="no-referrer" loading="lazy" style={{height: Math.min(2400, Math.max(160, props.height))}} />
    <figcaption>{props.description}</figcaption>
  </figure>;
}

function VisualHtmlDialog({initial, onApply, onClose}: {initial: VisualHtmlProps; onApply: (props: VisualHtmlProps) => void; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(initial);
  const [preview, setPreview] = useState(initial);
  const [notice, setNotice] = useState("");
  useEffect(() => {const dialog = ref.current; dialog?.showModal(); return () => dialog?.close();}, []);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChanges(changed);
  function close() {if (!changed || window.confirm("Descartar as alterações deste elemento HTML?")) onClose();}
  function prepare() {
    if (!validVisualHtmlProps(draft)) {setNotice("Preencha o título e a descrição. A altura deve ficar entre 160 e 2400 px."); return null;}
    const markup = cleanVisualMarkup(draft.markup);
    if (!markup.trim()) {setNotice("Insira conteúdo visual em HTML ou SVG."); return null;}
    const result = {...draft, markup};
    setNotice(markup !== draft.markup ? "O conteúdo foi ajustado para exibir somente HTML e SVG estáticos. Use o campo CSS para os estilos." : "Prévia atualizada.");
    setPreview(result);
    return result;
  }
  return <dialog ref={ref} className="visual-html-dialog" aria-label="Editar HTML personalizado" onCancel={event => {event.preventDefault(); close();}}>
    <header><div><h2>HTML personalizado</h2><p>Crie um elemento visual dentro deste documento.</p></div><button type="button" aria-label="Fechar editor HTML" onClick={close}>✕</button></header>
    <div className="visual-html-templates"><span>Começar com:</span>{visualTemplates.map(template => <button type="button" key={template.name} onClick={() => {if (draft.markup !== initial.markup && !window.confirm("Substituir o conteúdo deste elemento pelo exemplo?")) return; setDraft(template.props); setPreview(template.props); setNotice("Exemplo ilustrativo. Ajuste os textos e valores antes de aplicar.");}}>{template.name}</button>)}</div>
    <div className="visual-html-columns"><div className="visual-html-source">
      <label>Título do elemento<input autoFocus maxLength={140} value={draft.label} onChange={event => setDraft({...draft, label: event.target.value})}/></label>
      <label>HTML ou SVG<textarea spellCheck={false} maxLength={VISUAL_HTML_LIMIT} value={draft.markup} onChange={event => setDraft({...draft, markup: event.target.value})}/></label>
      <label>CSS do elemento<textarea spellCheck={false} maxLength={VISUAL_CSS_LIMIT} value={draft.stylesheet} onChange={event => setDraft({...draft, stylesheet: event.target.value})}/></label>
      <label>Descrição para leitura e acessibilidade<textarea className="visual-html-description" maxLength={4000} value={draft.description} onChange={event => setDraft({...draft, description: event.target.value})}/></label>
      <label>Altura da visualização (px)<input type="number" min={160} max={2400} step={10} value={draft.height} onChange={event => setDraft({...draft, height: Number(event.target.value)})}/></label>
    </div><section className="visual-html-preview" aria-label="Prévia do elemento"><h3>Prévia</h3><p>Confira também a leitura no celular. O conteúdo pode usar CSS responsivo.</p><VisualHtmlFrame props={preview}/></section></div>
    <p className="visual-html-help">Use HTML, CSS e SVG estáticos. Scripts, incorporações e recursos externos não são executados. Gráficos devem trazer valores, escala e descrição.</p>
    {notice && <p role="status">{notice}</p>}
    <footer><button type="button" onClick={close}>Cancelar</button><button type="button" onClick={prepare}>Atualizar prévia</button><button type="button" className="visual-html-primary" onClick={() => {const result = prepare(); if (result) onApply(result);}}>Aplicar ao documento</button></footer>
  </dialog>;
}

export default function VisualHtmlBlock({props, editable, onChange}: {props: VisualHtmlProps; editable: boolean; onChange: (props: VisualHtmlProps) => void}) {
  const [editing, setEditing] = useState(false);
  return <div className="visual-html-block">
    {editable && <div className="visual-html-toolbar"><span>HTML personalizado · {props.label}</span><button type="button" onClick={() => setEditing(true)}>Editar HTML</button></div>}
    {props.markup.trim() ? <VisualHtmlFrame props={props}/> : <p>Adicione HTML, CSS ou um modelo visual.</p>}
    {editing && editable && <VisualHtmlDialog initial={props} onClose={() => setEditing(false)} onApply={value => {onChange(value); setEditing(false);}}/>}
  </div>;
}
