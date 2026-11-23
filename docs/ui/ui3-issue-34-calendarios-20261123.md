# Rotevo UI 3.0 | Candidato da issue #34

Base homologada `ef9bc84880d331b027d94b3c46bb6d1cc15ee29b`. Branch `fix/ui3-overview-meetings-calendar-20261123`.

As Visões Gerais montam os componentes de Reuniões em modo incorporado, com a grade mensal e os cards existentes. A data inicial usa São Paulo. A seleção de um dia atualiza a agenda lateral, e a navegação muda a seleção junto com o mês. Em telas pequenas, os mesmos painéis ficam empilhados.

O estrategista consulta a agenda de seus projetos e sua agenda privada pela mesma API autenticada. A ação Ver na agenda abre o módulo Reuniões. Criação, gerenciamento e conexão Google ficam disponíveis na página completa. O cliente acessa apenas compromissos compartilhados e pode abrir os detalhes no diálogo existente. Todos os links exibidos na agenda passam pelo validador HTTPS do projeto.

As Centrais de Tarefas, as aprovações, a projeção de dados do cliente e as APIs continuam na base da issue #33. O workflow usa autenticação e dados sintéticos em Supabase descartável, incluindo agenda privada de outro usuário e duas contas de cliente distintas. O teste visual compara o posicionamento dos painéis em desktop e mobile nos dois temas. A instalação usa o lockfile existente.

Sem alteração de `main`, configuração de publicação, migração de produção ou deployment. Qualquer publicação depende de aprovação expressa.
