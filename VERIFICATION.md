# Validação do protótipo

Executada em 16 de outubro de 2026, em Docker Desktop no Windows e no browser Chromium integrado. Não foi feita instalação num servidor Unraid real nem num telemóvel físico.

## Resultado

- `node --test`: **9 testes passaram**.
- Verificação de sintaxe dos módulos JavaScript.
- `docker compose config --quiet`: configuração aceite.
- Build e arranque reais da imagem Nginx Alpine, fixada por digest.
- Contentor `unlater-prototype-unlater-1`: **healthy**, porta 8088.
- `nginx -t`: configuração válida.
- `/health`, HTML, módulos JS, CSS, manifest, ícones e fotografias: HTTP 200.
- Headers CSP, `nosniff` e `no-cache` presentes na resposta do contentor.

## Fluxos exercitados no browser

- Demonstração opcional, seleção por categoria e sorteio da atividade elegível.
- «Agora não» → regresso ao início → retoma da mesma missão.
- Modo de cinco minutos, checklist, pausa, registo parcial e presença no calendário; atividade mantém-se pendente.
- Criação real de uma atividade fictícia de QA com descrição, categoria, passos e upload de fotografia local.
- Refresh mantém a atividade e a fotografia em IndexedDB.
- Aceitação de missão e refresh recuperam diretamente o cronómetro a contar.
- Conclusão com fotografia final retira a atividade dos pendentes e regista a sessão.
- Exportação e importação do mesmo backup fictício com fotos/histórico, mediante confirmação na interface.
- Paragem temporária do contentor e reload: shell, histórico e navegação de progresso funcionaram offline; contentor novamente iniciado no fim.
- Console da sessão de QA sem erros ou avisos nas verificações finais.
- Breakpoints de 320, 390 e 1280 px, sem overflow horizontal; revisão visual de início, cartões, missão e foco.

Os testes com dados persistentes foram executados na origem isolada `http://127.0.0.1:8088`, com uma atividade identificada como «Teste QA». A origem de entrega `http://localhost:8088` usa outro armazenamento. Os exemplos da demonstração nunca são escritos na base real.

## Limites de verificação

- Instalação em iOS/Android físico, certificados/reverse proxy HTTPS e deployment no Unraid dependem do ambiente final.
- A persistência é local ao browser. Não há backend, sincronização entre dispositivos ou coordenação de múltiplas abas.
- Offline foi validado por indisponibilidade real do servidor após cache inicial; a primeira visita precisa de ligação ao servidor e contexto seguro.
