# APEX Performance System - TODO

## Infraestrutura e Banco de Dados
- [x] Schema de usuários com roles (admin, líder, capitão, colaborador)
- [x] Schema de colaboradores (employees) com níveis N1-N5
- [x] Schema de ciclos de avaliação (evaluation_cycles)
- [x] Schema de avaliações (evaluations) com indicadores
- [x] Schema de ocorrências (incidents)
- [x] Schema de faturamento (revenues)
- [x] Schema de bandeiras (flags) parametrizáveis
- [x] Schema de indicadores (indicators)

## Autenticação e Permissões
- [x] Sistema de roles: Admin/Sócio, Líder, Capitão, Colaborador
- [x] Proteção de rotas por role
- [x] Middleware de autorização

## Ciclos Mensais
- [x] Criação automática do ciclo do mês corrente
- [x] Encerramento de ciclo (apenas Admin)
- [x] Congelamento de dados ao encerrar
- [x] Histórico de ciclos

## Sistema de Bandeiras
- [x] Configuração de faixas parametrizáveis
- [x] Cálculo automático da bandeira atual
- [x] Exibição em tempo real

## Faturamento Contínuo
- [x] Lançamento de faturamento a qualquer momento
- [x] Edição e exclusão de lançamentos
- [x] Soma automática do mês
- [x] Recálculo de bandeira em tempo real
- [x] Congelamento ao encerrar ciclo

## Avaliação Contínua
- [x] Tela "Avaliar Agora" para Líder/Capitão
- [x] 5 indicadores (20 pts cada): Pontualidade, 5S, Produtividade, Qualidade, Comportamento
- [x] Registro de atrasos no mês
- [x] Registro de ocorrências (retrabalho, advertência, acidente, falta)
- [x] Marcar avaliação como oficial
- [x] Múltiplas avaliações por mês, apenas 1 oficial

## Plano de Carreira N1-N5
- [x] Exibição do nível atual do colaborador
- [x] Histórico de notas oficiais
- [x] Cálculo de elegibilidade para promoção
- [x] Status: Pronto para promoção / Não elegível
- [x] Notas mínimas: N1→N2: 70, N2→N3: 75, N3→N4: 80, N4→N5: 85

## Regras de Berlinda
- [x] Nota < 50 = Berlinda automática
- [x] Nota < 70 por 2 meses = Berlinda
- [ ] PDI para saída da berlinda

## Regras de Premiação
- [x] Nota mínima 70/100
- [x] 3 atrasos = perde premiação
- [x] Advertência pode bloquear
- [x] Critérios individuais (50%) + coletivos (50%)

## Dashboards
- [x] Dashboard Admin (Estratégico): KPIs, gráficos, TOP 5
- [x] Dashboard Líder (Tático): Avaliados, pendentes, atenção
- [x] Dashboard Colaborador (Individual): Nota, histórico, promoção

## Telas do Sistema
- [x] Tela Avaliar Agora
- [x] Painel do Colaborador
- [x] Tela Faturamento do Mês
- [x] Tela Avaliações do Mês (Admin)
- [x] Gestão de Colaboradores
- [x] Configurações de Bandeiras e Indicadores
- [x] Histórico de Ciclos
- [x] Navegação baseada em role
- [x] Sidebar dinâmico por role
- [x] Tema visual profissional
- [x] Responsividade mobile

## Testes
- [x] Testes de API para ciclos
- [x] Testes de API para avaliações
- [x] Testes de cálculo de bandeiras
- [x] Testes de elegibilidade de promoção
- [x] Testes de controle de acesso por role

## Correções e Melhorias v1.1
- [x] Avaliações acumulativas - múltiplas por dia com média mensal
- [x] Placar geral de todos os colaboradores
- [x] Exportação do placar para PDF
- [x] Corrigir navegação "Meu Painel" que não funciona
- [x] Remover sistema de departamentos (obra/fábrica)
- [x] Corrigir erro ao criar novos indicadores

## Correções e Melhorias v1.2
- [x] Histórico de avaliações com visualização individual
- [x] Edição de avaliações existentes
- [x] Exclusão de colaboradores

## Correções e Melhorias v1.3
- [x] Média das avaliações como nota oficial do colaborador
- [x] Atualizar dashboards para usar média
- [x] Atualizar placar para usar média

## Correções e Melhorias v1.4
- [x] Remover conceito de avaliação oficial/rascunho (média é a nota oficial)
- [x] Remover botão "Marcar como Oficial" da tela de avaliações
- [x] Link direto para avaliação ao clicar em colaborador pendente

## Correções e Melhorias v1.5
- [x] Tela de administração de usuários
- [x] Alterar permissões de usuários (Admin, Líder, Capitão, Colaborador)
- [x] Vincular usuário a colaborador
- [x] Listar todos os usuários do sistema

## Correções e Melhorias v1.6
- [x] Corrigir erro ao acessar pelo celular (mobile)
- [x] Adicionar médias detalhadas por indicador no PDF do placar
- [x] Análise vertical: Pontualidade, Organização, Produtividade, Qualidade, Comportamento

## Correções e Melhorias v1.7
- [x] Trocar indicador "Comportamento" por "Segurança"

## Correções v1.8
- [x] Corrigir layout do placar para exibir "Segurança" corretamente

## Correções v1.9
- [x] Corrigir legenda do PDF do placar que ainda mostra "Comportamento"
