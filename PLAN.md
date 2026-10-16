# Unlater — protótipo 0.1

Referência visual: mockup de oito ecrãs fornecido pelo utilizador em 16 de outubro de 2026. Paleta creme, pastel, roxo, fotografia, baralho de cartões, tipografia pesada e pequenas ilustrações lúdicas.

## Fluxos implementados

1. **Início:** escolher disponibilidade (15/30/60 minutos), energia máxima e categoria opcional. Apenas atividades pessoais pendentes entram no sorteio.
2. **Primeira missão:** escolher uniformemente uma atividade elegível e persistir imediatamente o compromisso. «Agora não» guarda a mesma missão; regressar não volta a sortear.
3. **Foco:** aceitar duração estimada ou modo de cinco minutos, pausar/retomar e assinalar passos opcionais. O relógio deriva de timestamps, recuperando após refresh/background. Não há alarmes ou notificações.
4. **Conclusão:** indicar atividade concluída ou passo parcial, estado de espírito, fotografia final e nota opcionais. Uma sessão parcial mantém a atividade pendente.
5. **Pendentes:** pesquisar/filtrar, criar e editar atividades. Criação exige confirmação de que é algo que o próprio utilizador adia; inclui lazer. Foto opcional, descrição, tempo, esforço, categoria, data desde que adia e passos.
6. **Calendário:** navegar meses, escolher dia, consultar sessões, notas e antes/depois.
7. **Conquistas:** marcos calculados a partir do histórico; sem rankings ou penalizações.
8. **Progresso:** total de atividades concluídas, categorias e tempo real acumulado.

As definições incluem backup, restauro e instruções de instalação. A demonstração é explicitamente opcional, usa dados fictícios em memória e nunca escreve na base real.

## Arquitetura

- HTML/CSS/ES Modules sem dependências de runtime; Node nativo para desenvolvimento/testes.
- Nginx em Docker para servir a aplicação. Sem backend, credenciais ou serviços externos.
- IndexedDB no dispositivo para dados e imagens. App shell em Cache Storage, servido por service worker.
- Fotografias importadas são convertidas localmente para JPEG até 1200 px e guardadas na base do browser.
- Edição, importação e eliminação têm validação; ações destrutivas exigem confirmação na interface.

## Limites e decisões reversíveis

- Persistência local significa **browser/dispositivo**, não uma base de dados no Unraid. Backup JSON permite transporte manual. Sincronização multi-dispositivo exigiria uma fase com backend e autenticação.
- Usar uma instância aberta por dispositivo; nesta fase não há resolução de conflitos entre várias abas.
- O protótipo segue a hierarquia, cores e padrões do mockup. Fotografias próprias e ilustrações SVG/CSS substituem os assets raster do mockup; não é uma reprodução pixel a pixel.
- Domínio, reverse proxy, certificados, autenticação e publicação externa ficam por configurar no ambiente final, após escolha do utilizador.

## Próxima decisão de arquitetura

Validar a experiência e escolher entre manter os dados por dispositivo ou introduzir armazenamento no servidor para partilhar entre telemóvel e desktop. Não há migração destrutiva nesta entrega.
