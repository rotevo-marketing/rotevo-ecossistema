import type {StrategicPartial} from "./schema";
export function demoDocument(code:string,title:string):StrategicPartial[]{return [
 {type:"heading",props:{level:1},content:title},
 {type:"paragraph",content:[{type:"text",text:"Aurora Consultoria",styles:{bold:true}},{type:"text",text:" · Empresa fictícia | Documento "+code,styles:{}}]},
 {type:"paragraph",content:"Este documento demonstra a elaboração e a leitura de um planejamento estratégico. As informações, os indicadores e as decisões são fictícios, sem relação com clientes reais."},
 {type:"heading",props:{level:2},content:"Contexto e entendimento"},
 {type:"paragraph",content:"A Aurora Consultoria é uma empresa fictícia de serviços empresariais. Sua equipe deseja organizar as ofertas e tornar a geração de oportunidades mais previsível. O exemplo abaixo explora a estrutura editorial; não constitui uma análise metodológica validada."},
 {type:"image",props:{url:"/editor-demo/aurora-map.svg",caption:"Mapa ilustrativo de crescimento · Aurora Consultoria",name:"Mapa da estratégia",previewWidth:720}},
 {type:"heading",props:{level:2},content:"Principais constatações"},
 {type:"bulletListItem",content:"A aquisição está concentrada em indicações, sem previsibilidade demonstrada."},
 {type:"bulletListItem",content:"O portfólio precisa comunicar com clareza as entregas e os limites do serviço."},
 {type:"indicator",props:{label:"Oportunidades qualificadas",value:"18",context:"Exemplo fictício · mês de referência"}},
 {type:"strategicChart",props:{title:"Distribuição ilustrativa por origem",series:"Indicação:65;Conteúdo:20;Busca:15",unit:"%"}},
 {type:"heading",props:{level:2},content:"Organização das prioridades"},
 {type:"table",content:{type:"tableContent",rows:[{cells:["Prioridade","Responsável","Evidência esperada"]},{cells:["Organizar o portfólio","Equipe Aurora","Descrição das entregas"]},{cells:["Registrar oportunidades","Equipe comercial","Histórico consolidado"]},{cells:["Revisar a estratégia","Direção","Decisões registradas"]}]}},
 {type:"strategic",props:{kind:"decision",title:"Concentrar os primeiros esforços"},content:"Priorizar a clareza das ofertas e a organização do acompanhamento comercial antes de ampliar as iniciativas de aquisição."},
 {type:"strategic",props:{kind:"recommendation",title:"Validar antes de ampliar"},content:"Definir uma linha de base e revisar as hipóteses com a equipe. Os números deste protótipo não representam resultados ou metas aprovadas."},
 {type:"heading",props:{level:2},content:"Próximos passos"},
 {type:"numberedListItem",content:"Validar o entendimento com os responsáveis pela empresa."},
 {type:"numberedListItem",content:"Organizar as evidências e registrar as decisões aprovadas."},
 {type:"strategic",props:{kind:"conclusion",title:"Síntese do documento"},content:"Uma estrutura clara conecta contexto, evidências, decisões e execução. Esta conclusão é apenas um exemplo de composição editorial."},
 {type:"paragraph",content:""}
];}
