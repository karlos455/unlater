# Unlater

PWA mobile-first para dar um começo às atividades que o próprio utilizador anda a adiar, incluindo lazer. Interface em português de Portugal, inspirada no mockup aprovado de oito ecrãs.

## Docker / Unraid

Copiar esta pasta inteira para o Unraid, por exemplo `/mnt/user/appdata/unlater/app`, e executar nessa pasta:

```sh
docker compose up -d --build --wait
```

A aplicação fica disponível em `http://IP-DO-UNRAID:8088`. A porta é configurável com a variável `UNLATER_PORT` (por omissão 8088). O contentor usa a porta interna 8080, filesystem de leitura, tmpfs para diretórios temporários, healthcheck e rotação de logs.

```sh
docker compose ps
docker compose logs --tail=50
docker compose down
```

Para atualizar o código, substituir os ficheiros da app e repetir `docker compose up -d --build --wait`. A versão do service worker/cache deve ser incrementada ao publicar alterações ao shell.

### HTTPS e instalação no telemóvel

Para instalar e usar offline a partir da rede, colocar a aplicação atrás do reverse proxy HTTPS que já usas (Nginx Proxy Manager, Caddy ou equivalente), com um certificado aceite pelo dispositivo. Encaminhar o domínio para `IP-DO-UNRAID:8088`; a app deve ser servida na raiz do domínio, não num subdiretório.

HTTP num IP LAN permite abrir a app, mas não ativa o service worker nem a instalação PWA completa. `http://localhost:8088` é a exceção de desenvolvimento. Requisitos confirmados na [documentação MDN sobre instalação PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) e [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

Depois da primeira abertura online em HTTPS, o shell e os assets ficam disponíveis offline. As atividades e o cronómetro continuam locais. Em iOS, usar Partilhar → Adicionar ao ecrã principal; em Chromium, usar a opção de instalação do browser quando disponível.

## Onde ficam os dados

**IndexedDB no browser/dispositivo**, com fotografias e histórico. O contentor serve ficheiros estáticos e não contém dados pessoais; não precisa de volumes persistentes. Um volume Docker não faz backup dos dados do browser.

- Usar **Mais → Exportar os meus dados** para um JSON que inclui imagens e missão em curso.
- Importar noutro dispositivo ou para recuperar. O backup é validado e a substituição exige confirmação.
- Browser, perfil, protocolo, domínio e porta diferentes têm armazenamento diferente. Exportar antes de mudar o endereço da app, limpar dados do browser ou trocar de dispositivo.
- Nesta fase não há sincronização multi-dispositivo nem conflitos entre abas. Usar uma aba por dispositivo.
- Não há contas, notificações, tracking, fontes externas, bibliotecas de terceiros em runtime ou sugestões externas.
- A demonstração é opcional e só existe em memória. Sair ou recarregar regressa aos dados reais.

Fotos: upload local, JPEG até 1200 px; a entrada deve ter até 20 MB. Antes e depois são opcionais. Backups importados têm limite de 50 MB.

## Desenvolvimento e testes

Requer Node.js 22+; não há pacotes para instalar:

```sh
node server.mjs
node --test
node --check public/app.js
```

Servidor local: `http://localhost:4173`. Os testes cobrem elegibilidade/sorteio, tempo em background e pausa, conclusão parcial/completa, dupla conclusão, backup e validação de conteúdo, conquistas e datas locais.

Os oito ecrãs e decisões estão em [PLAN.md](PLAN.md). A origem e prompts dos assets estão em [ASSETS.md](ASSETS.md).

## Estrutura

```text
public/            App estática e PWA
  app.js           Interface, fluxos e ações
  core.js          Regras testáveis
  storage.js       IndexedDB
  sw.js            Cache offline
tests/             Testes Node nativos
compose.yaml       Stack para Docker/Unraid
Dockerfile         Nginx Alpine
nginx.conf         Servidor e headers
```
