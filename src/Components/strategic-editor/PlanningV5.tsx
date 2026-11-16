"use client";

import { useState, type ReactNode } from "react";
import CompanyAnalysis0201 from "./CompanyAnalysis0201";
import type {CompanyAnalysis} from "@/lib/planning/companyAnalysis";
import ProjectTimeline, { type ExecutionItem } from "@/Components/cliente/ProjectTimeline";
import { RotevoTablerIcon } from "@/Components/RotevoTablerIcon";
import { planningV5Stages, V5_TIMELINE_PAGE } from "@/lib/planning/v5";
import styles from "./PlanningV5.module.css";

export type PlanningV5Timeline = {
  executionTimeline?: ExecutionItem[];
};

type Props = {
  project: { id: string; title: string };
  timeline?: PlanningV5Timeline | null;
  companyAnalysis?: CompanyAnalysis | null;
  onSaveCompanyAnalysis?: (value:CompanyAnalysis)=>Promise<void>;
  editingTimeline?: ReactNode;
  preview?: boolean;
  onPreviewChange?: (value: boolean) => void;
};

const visibleStages = planningV5Stages.filter(stage => !stage.internal);

export default function PlanningV5({
  project, timeline, editingTimeline, companyAnalysis, onSaveCompanyAnalysis, preview = true, onPreviewChange,
}: Props) {
  const [selection, setSelection] = useState<string>(onPreviewChange ? "01.01" : "02.01");
  const [expanded, setExpanded] = useState<string | null>(selection.slice(0, 2));
  const stages = preview ? visibleStages : planningV5Stages;
  const expandedStage = preview && expanded === "01" ? "02" : expanded;
  const stage = stages.find(item => item.pages.some(page => page.code === selection));
  const page = stage?.pages.find(item => item.code === selection);
  const activeTimeline = page?.code === V5_TIMELINE_PAGE;

  return <section className={`rv-ui3 ${styles.workspace}`} aria-label="Planejamento Rotevo V5">
    {onPreviewChange && <div className={styles.modes} role="group" aria-label="Modo do planejamento">
      <button type="button" aria-pressed={!preview} onClick={() => onPreviewChange(false)}>Editar</button>
      <button type="button" aria-pressed={preview} onClick={() => onPreviewChange(true)}>Visualizar</button>
    </div>}
    <div className={styles.columns}>
      <nav className={styles.navigation} aria-label="Etapas do planejamento">
        {stages.map(item => <div className={styles.stage} key={item.code}>
          <button type="button" className={styles.stageButton} aria-expanded={expandedStage === item.code}
            onClick={() => setExpanded(expandedStage === item.code ? null : item.code)}>
            <span>{item.code} | {item.title}</span>
            <RotevoTablerIcon name={expandedStage === item.code ? "chevron-up" : "chevron-down"} size={16}/>
          </button>
          {expandedStage === item.code && <ul className={styles.pages}>
            {item.pages.map(candidate => <li key={candidate.code}>
              <button type="button" aria-current={candidate.code === selection ? "page" : undefined}
                onClick={() => setSelection(candidate.code)}>
                <span className={styles.code}>{candidate.code}</span>{candidate.title}
              </button>
            </li>)}
          </ul>}
        </div>)}
      </nav>
      <div className={styles.panel}>
        {page && <header className={styles.heading}>
          <p>{stage?.code} | {stage?.title} · {page.code}</p>
          <h2>{page.title}</h2>
        </header>}
        {page?.code === "02.01" && <CompanyAnalysis0201 key={project.id+"-02.01"} value={companyAnalysis} preview={preview} onSave={onSaveCompanyAnalysis}/>}
        {editingTimeline && <div hidden={preview || !activeTimeline}>{editingTimeline}</div>}
        {activeTimeline && preview && timeline
          ? <ProjectTimeline projects={[{ ...project, data: timeline }]}/>
          : (page?.code !== "02.01" && (!activeTimeline || preview || !editingTimeline)) && <div className={styles.placeholder}>
              {!page ? "Selecione uma página da apresentação."
                : preview ? "Página ainda não disponível." : "Área reservada para preenchimento."}
            </div>}
      </div>
    </div>
  </section>;
}
