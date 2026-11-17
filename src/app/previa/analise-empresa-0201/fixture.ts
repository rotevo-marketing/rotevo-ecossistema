import {EMPTY_COMPANY_ANALYSIS_V2,type CompanyAnalysisV2} from "@/lib/planning/companyAnalysis";
/** Curated synthetic example. No client/project record and no automatic Notion import. */
export function syntheticCompanyAnalysis():CompanyAnalysisV2{
 const v=structuredClone(EMPTY_COMPANY_ANALYSIS_V2);
 v.identity={displayName:"Consultoria Horizonte · empresa sintética",description:"<p>Consultoria empresarial com atuação em <strong>orientação financeira</strong>, educação e assessoria patrimonial.</p><p>Exemplo fictício para homologação, sem vínculo com registros de clientes.</p>",founded:"01/2023",referenceLocation:"Vila Velha · ES",geographicScope:"Atuação nacional",operatingMode:"Online e presencial"};
 v.history.milestones=[
 {id:"m1",period:"2023",title:"Início da operação",description:"<p>Estruturação inicial conduzida pela fundadora.</p>"},
 {id:"m2",period:"2023–2026",title:"Dedicação compartilhada",description:"<p>Período com atuação executiva externa e menor disponibilidade para a empresa.</p>"},
 {id:"m3",period:"2026",title:"Retomada e organização",description:"<p>Reorganização da atuação e das responsabilidades.</p>"}];
 v.organization={leadership:{name:"Marina Costa · pessoa sintética",role:"Fundadora e consultora",description:"<p>Concentra a operação e as decisões do negócio.</p>"},workstreams:[
 {id:"w1",title:"Consultoria empresarial",description:"<p>Orientação para negócios.</p>"},
 {id:"w2",title:"Educação financeira",description:"<p>Mentoria e ferramentas de apoio.</p>"},
 {id:"w3",title:"Assessoria patrimonial",description:"<p>Frente de negócio, sem presumir departamento.</p>"}],responsibilities:[{id:"r1",title:"Gestão e atendimento",responsible:"Fundadora",description:"<p>Coordenação das entregas e acompanhamento das relações com clientes.</p>"}],externalSupports:[
 {id:"e1",title:"Tecnologia",supportType:"Parceria externa",description:"<p>Suporte ao aplicativo, sem vínculo empregatício inferido.</p>"},
 {id:"e2",title:"Contabilidade",supportType:"Serviço especializado",description:"<p>Apoio contábil sob demanda.</p>"}]};
 v.governance.summary="<p>Decisões concentradas na fundadora, com apoio especializado externo. Não foram informadas relações hierárquicas entre as frentes.</p>";
 v.conditions={stage:"<p>Negócio em <strong>organização e retomada</strong>. Experiência individual e maturidade empresarial são dimensões diferentes.</p>",capacities:[{id:"c1",title:"Conhecimento especializado",description:"<p>Experiência e repertório aplicados ao atendimento.</p>"}],constraints:[{id:"c2",title:"Disponibilidade da liderança",description:"<p>A operação depende da agenda da fundadora.</p>"}],limitations:[{id:"c3",title:"Documentação de resultados",description:"<p>As informações disponíveis não sustentam métricas de desempenho ou pontuações de maturidade.</p>"}]};
 v.synthesis={conclusion:"<p>A empresa articula frentes complementares sob uma liderança central. Sua organização deve ser compreendida a partir das condições observadas, sem confundir experiência individual com estrutura empresarial consolidada.</p>",findings:[
 {id:"f1",title:"Centralização operacional",description:"<p>A fundadora reúne decisões e execução.</p>"},
 {id:"f2",title:"Apoios especializados",description:"<p>Parcerias ampliam recursos sem constituir equipe interna automaticamente.</p>"},
 {id:"f3",title:"Limites de evidência",description:"<p>A documentação exige cautela ao caracterizar resultados e capacidade.</p>"}],implication:"<p>O planejamento deve considerar a disponibilidade da liderança e as responsabilidades existentes. Estas condições contextualizam os estudos seguintes.</p>"};
 return v;
}
