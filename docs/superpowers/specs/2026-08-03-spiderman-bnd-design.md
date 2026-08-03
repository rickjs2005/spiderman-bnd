# SPIDER-MAN: BRAND NEW DAY — Fan Concept (spec de design)

**Data:** 2026-08-03 · **Projeto:** `projetos/spiderman-bnd` · **Status:** aprovado pelo Rick

## O que é

Fan redesign cinematográfico da página do filme *Spider-Man: Brand New Day*
(estreia 31/07/2026 — o site sai no pico do hype). Experiência scroll-driven
no molde dos sites de premiação, pensada pra viralizar em vídeo: as pessoas
assistem até o fim pra ver as animações. **Não é site oficial** — conceito de
fã, sem afiliação com Marvel/Sony/Disney, e isso fica explícito na página.

Referências: site do Ousmane Dembélé (scroll cinematográfico), projetos
anteriores do portfólio (aurex-motors, TERRAL, kavita-institucional,
hyperframe) — de onde vêm os padrões técnicos e os gotchas já pagos.

## Decisões fechadas (com o porquê)

| Decisão | Escolha | Por quê |
|---|---|---|
| Mídia | **Stills/posters oficiais + efeitos**; trailer SÓ como embed do YouTube | Embed é seguro; re-hospedar footage é o cenário mais provável de takedown. Zoom+parallax bem feito sobre stills entrega o cinema sem o risco |
| Idioma | **Inglês** | Filme global; público que compartilha fan concepts (X, Awwwards, Reddit) é anglo. Divulgação BR vai legendada no post |
| Escopo | **6 seções** (enxugado das 9 originais) | Menos seções = mais polish por seção; vídeo de divulgação mais denso de "wow" (padrão TERRAL/one-piece) |
| Arquitetura | **Híbrido (plano C)**: Ato 1 em R3F, Ato 2 em DOM | O dinheiro 3D vai onde o vídeo viraliza (olho→máscara→swing); conteúdo fica em DOM sólido, legível e leve. 1 costura só, planejada |
| Assets | **Claude garimpa e baixa** os oficiais; Rick valida | Poster em alta res (IMP Awards/kits de imprensa), stills promocionais, ID do trailer |
| Nome | `spiderman-bnd` (pasta, repo, Vercel) | Curto; alias `.vercel.app` checado no deploy (gotcha TERRAL: alias pode estar tomado) |

## Conteúdo factual do filme (pra copy)

- Estreia: 31 de julho de 2026. Direção: Destin Daniel Cretton.
- Elenco: Tom Holland, Zendaya, Sadie Sink, Jacob Batalon, Jon Bernthal
  (Punisher, estreia no MCU), Tramell Tillman, Michael Mando (Scorpion),
  Mark Ruffalo (Hulk).
- Premissa: Peter luta contra o crime em tempo integral num mundo que não
  lembra quem ele é; a pressão de ver os amigos seguirem em frente desperta
  nele uma mudança que talvez não consiga controlar — e essa mudança pode
  ser a única coisa capaz de deter uma ameaça que ninguém consegue ver
  (vilão telepata que salta de corpo em corpo).
- Vilões: Scorpion, Tombstone, o vilão "invisível"; Punisher e Hulk como
  forças imprevisíveis.

## Estrutura narrativa (6 beats em 2 atos)

### Ato 1 — plano-sequência 3D (~40% do scroll, canvas R3F)

**1. "The Eye"** — tela preta; um reflexo surge; a câmera está a centímetros
da lente do olho da máscara (still oficial em alta res com relevo via normal
map derivada do próprio still). Scroll recua a câmera: olho → rosto → máscara
inteira contra fundo escuro. Título *SPIDER-MAN: BRAND NEW DAY* em tipografia
compatível com a identidade do filme + selo **FAN CONCEPT — NOT AFFILIATED
WITH MARVEL OR SONY** discreto mas visível desde o primeiro frame (aparece
também em qualquer vídeo de divulgação).

**2. "The Dive"** — a câmera continua recuando, gira e mergulha num diorama
2.5D de Nova York: 4-6 planos de prédios (stills tratados) em profundidades
diferentes com leve curvatura, Spidey em cutout balançando entre eles
(balanço senoidal no plano próprio), teias e poeira urbana em partículas
WebGL, fog escura entre camadas pra vender profundidade. A câmera acompanha
o swing em curva; no final acelera e a tela "estoura" numa retícula de HQ —
a transição pro DOM.

### Ato 2 — conteúdo em DOM (GSAP clássico)

**3. "The Story"** — painéis de HQ que se montam no scroll (bordas de
quadrinho, onomatopeias, halftone): a premissa em 4-5 painéis.

**4. "The Threats"** — vilões com transições fortes: Scorpion, Tombstone, e
o vilão invisível representado como distorção/glitch (SVG turbulence ou
shader leve num canvas LOCAL, não no global). Punisher e Hulk como wildcards.

**5. "Watch"** — embed do trailer oficial (YouTube) em frame cinematográfico
+ galeria de stills com hover/parallax leve.

**6. "The Legacy"** — timeline da era Holland (Homecoming → Far From Home →
No Way Home → Brand New Day) horizontal, scrubada pelo scroll, desembocando
no final: a máscara volta, teias fecham a tela, CTA de compartilhar +
créditos de fã + disclaimer completo.

## Arquitetura técnica

**Stack:** Next.js 16.2.x (App Router, client-side), React 19.2, React
Three Fiber 9.6 + drei 10.7, GSAP 3.15 ScrollTrigger, Lenis 1.3, Tailwind
v4 — versões pinadas do TERRAL, o molde mais recente provado em conjunto.
Gotchas já conhecidos: `y` vs `yPercent`, `@layer` no Tailwind v4, zona
morta do ScrollTrigger.

**Ato 1 (R3F):** um único `<Canvas>` fixo na viewport; página rola "por
baixo" (altura fantasma ~400vh dirige o progresso). Um ScrollTrigger com
scrub alimenta um `progress` dampado via rAF — **câmera 3D e HUD leem o
MESMO progress dampado** (lição kavita-institucional: interpolar separado
dessincroniza). Cena: plano do olho/máscara com normal map, diorama de NY
em planos texturizados, cutout do Spidey, partículas (linhas de teia +
poeira) em shader simples.

**Costura canvas→DOM:** a retícula de HQ é um overlay DOM fullscreen que
anima POR CIMA antes do canvas sair; o canvas só é liberado quando está
100% coberto. Nunca existe frame em que se vê a troca (técnica de scrim do
hyperframe) — mata a zona morta.

**Ato 2 (DOM):** seções GSAP com pin/scrub pontual (painéis pinados
enquanto montam; timeline horizontal com scrub).

## Performance e acessibilidade

- Stills em AVIF/WebP; `next/image` fora do canvas; `useTexture` com
  versões ≤2048px dentro dele.
- Teto de contagem de partículas; mobile recebe diorama com menos camadas.
- `prefers-reduced-motion`: desliga scrub/parallax, vira fade simples.
- Meta: Lighthouse 90+ e fluidez em celular médio.

## Assets e legal

- Claude garimpa: poster teaser em alta res, stills promocionais
  (elenco/vilões), ID do trailer oficial no YouTube. Tratamento local:
  recortes, normal map do olho, cutout do Spidey (remoção de fundo),
  versões otimizadas em `public/media/`.
- **Nada de footage re-hospedada.** Vídeo só via embed do YouTube.
- Disclaimer em 3 lugares: hero (curto), footer (completo: *"Fan concept —
  not affiliated with Marvel, Sony Pictures or Disney. All characters and
  images © their respective owners."*) e meta description.
- Sem anúncio, sem monetização, sem coleta de dados — tributo de portfólio.

## Verificação

Playwright headless com screenshots em pontos do scroll + inspeção VISUAL
dos prints (regra do projeto: nunca aprovar scroll-scrub só por code
review), repetida contra a URL de produção após o deploy — scrub que passa
local pode quebrar na CDN.

## Deploy

Padrão do Rick: push GitHub = entrega; `vercel --prod` só com pedido
explícito. Depois do deploy validado em produção: card no milweb como os
outros projetos. Vídeo de divulgação (pipeline Playwright+ffmpeg do
aurex-motors) é etapa opcional pós-lançamento, **fora deste spec**.

## Fora de escopo

- Vídeo de divulgação/reel (pós-lançamento, se o Rick pedir).
- Qualquer footage do filme re-hospedada ou scrubbed.
- Versão PT/bilíngue.
- CMS, backend, analytics — site 100% estático.
