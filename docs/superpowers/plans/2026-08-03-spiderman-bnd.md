# SPIDER-MAN: BRAND NEW DAY — Fan Concept — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site cinematográfico scroll-driven (fan concept do filme *Spider-Man: Brand New Day*) com Ato 1 em R3F (olho→máscara→mergulho em NY 2.5D) e Ato 2 em DOM (painéis HQ, vilões, trailer, timeline), pronto pra push no GitHub.

**Architecture:** Um `<Canvas>` R3F fixo dirigido por um progress dampado compartilhado (padrão kavita-institucional: ScrollTrigger escreve `raw`, useFrame propaga com damping, HUD e câmera leem o MESMO valor). Costura canvas→DOM por overlay de retícula HQ que cobre 100% antes do canvas ser liberado (técnica de scrim do hyperframe). Ato 2 é GSAP ScrollTrigger clássico sobre DOM.

**Tech Stack:** Next 16.2.11 · React 19.2.4 · @react-three/fiber 9.6 · @react-three/drei 10.7 · three 0.185 · gsap 3.15 · lenis 1.3.25 · Tailwind v4 · sharp (build de mídia) · Playwright (verificação visual).

## Global Constraints

- **Copy 100% em inglês** (spec: público global). Textos ficam TODOS em `src/lib/content.ts`.
- **Disclaimer em 3 lugares**: badge no hero (`FAN CONCEPT — NOT AFFILIATED WITH MARVEL OR SONY`), footer completo (`Fan concept — not affiliated with Marvel, Sony Pictures or Disney. All characters and images © their respective owners.`), meta description.
- **NADA de footage re-hospedada.** Vídeo só como embed do YouTube (trailer oficial). Imagens: material promocional oficial (posters/stills) + fotos livres (Unsplash/Pexels) pros prédios de NY.
- **Versões pinadas** (provadas juntas no TERRAL): `next@16.2.11`, `react@19.2.4`, `react-dom@19.2.4`, `@react-three/fiber@^9.6.1`, `@react-three/drei@^10.7.7`, `three@^0.185.1`, `gsap@^3.15.0`, `lenis@^1.3.25`, `tailwindcss@^4`.
- **Next 16 não é o Next do treino** — ler `node_modules/next/dist/docs/` na dúvida (AGENTS.md do kavita).
- **`prefers-reduced-motion`**: Ato 1 vira hero estático; Ato 2 vira fades simples. **`pointer: coarse`**: sem Lenis (scroll nativo), diorama com menos camadas.
- **Verificação visual OBRIGATÓRIA**: scroll-scrub nunca é aprovado só por code review — capturar screenshots com Playwright e OLHAR (regra do projeto, memória `feedback-visual-verify-scroll-features`).
- **Deploy**: entrega = push GitHub. `vercel --prod` SÓ quando o Rick pedir explicitamente.
- Texturas dentro do canvas ≤2048px. Partículas com teto fixo. Lighthouse alvo ≥90.

## File Structure

```
spiderman-bnd/
├─ package.json / next.config.ts / postcss.config.mjs / tsconfig.json
├─ scripts/
│  ├─ prepare-media.mjs        # sharp: resize/webp + normal map do olho
│  └─ capture.mjs              # Playwright: screenshots em pontos do scroll
├─ public/media/               # assets processados (webp/jpg finais)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx            # fonts, metadata EN + disclaimer na description
│  │  ├─ globals.css           # Tailwind v4, palette, utilitários halftone
│  │  └─ page.tsx              # <Act1/> <Story/> <Threats/> <Watch/> <Legacy/> <Footer/>
│  ├─ lib/
│  │  ├─ content.ts            # TODA a copy EN + dados (vilões, timeline, YT id)
│  │  └─ act1-store.ts         # journeyState + damp (padrão kavita)
│  └─ components/
│     ├─ smooth-scroll.tsx     # Lenis + ticker GSAP (padrão kavita, verbatim)
│     ├─ nav.tsx               # topbar mínima + badge FAN CONCEPT
│     ├─ footer.tsx            # disclaimer completo + créditos
│     ├─ act1/
│     │  ├─ act1.tsx           # container 400vh + sticky + ScrollTrigger→raw + skip + fallback estático
│     │  ├─ scene.tsx          # <Canvas> + rig de câmera (lê progress dampado)
│     │  ├─ eye-mask.tsx       # plano do olho/máscara com normal map
│     │  ├─ dive.tsx           # diorama NY (4-6 planos) + cutout do Spidey
│     │  ├─ webs.tsx           # linhas de teia + poeira (Points + shader)
│     │  └─ halftone-burst.tsx # overlay DOM da costura canvas→DOM
│     └─ act2/
│        ├─ story.tsx          # painéis HQ pinados
│        ├─ threats.tsx        # vilões + distorção do vilão invisível
│        ├─ watch.tsx          # facade do trailer + galeria
│        └─ legacy.tsx         # timeline horizontal + finale (teias fecham + CTA)
```

---

### Task 1: Scaffold do projeto + copy + shell (nav/footer/disclaimers)

**Files:**
- Create: `package.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/lib/content.ts`, `src/components/nav.tsx`, `src/components/footer.tsx`

**Interfaces:**
- Produces: `content.ts` exporta `SITE`, `STORY_PANELS`, `VILLAINS`, `WILDCARDS`, `TIMELINE`, `GALLERY_CAPTIONS`, `FINALE` — consumidos por todas as seções do Ato 2. `globals.css` define as CSS vars `--red`, `--blue`, `--ink`, `--paper` e a utility `.halftone`.

- [ ] **Step 1: Scaffold com as versões pinadas**

```bash
cd C:\Users\rickj\projetos\spiderman-bnd
npx create-next-app@16.2.11 . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm --yes
npm install @react-three/fiber@^9.6.1 @react-three/drei@^10.7.7 three@^0.185.1 gsap@^3.15.0 @gsap/react@^2.1.2 lenis@^1.3.25
npm install -D @types/three@^0.185.1 sharp@^0.35.3 playwright@^1.49.0
```

Se o create-next-app reclamar de pasta não-vazia (tem `docs/` e `.git`), rodar num temp e mover os arquivos gerados pra cá preservando `docs/`.

- [ ] **Step 2: AGENTS.md + CLAUDE.md (aviso Next 16, mesmo padrão kavita)**

```markdown
# AGENTS.md
# This is NOT the Next.js you know
This version has breaking changes — read `node_modules/next/dist/docs/` before writing code.
Project rules: all user-facing copy in ENGLISH and centralized in src/lib/content.ts.
Never re-host movie footage; trailer is a YouTube embed only.
```

`CLAUDE.md` contém só `@AGENTS.md`.

- [ ] **Step 3: `src/lib/content.ts` com a copy real (inglês)**

```ts
export const SITE = {
  title: "SPIDER-MAN: BRAND NEW DAY",
  tagline: "A fan-made cinematic concept",
  badge: "FAN CONCEPT — NOT AFFILIATED WITH MARVEL OR SONY",
  disclaimer:
    "Fan concept — not affiliated with Marvel, Sony Pictures or Disney. All characters and images © their respective owners.",
  metaDescription:
    "A fan-made cinematic scroll experience for Spider-Man: Brand New Day (2026). Not affiliated with Marvel, Sony Pictures or Disney.",
  releaseLine: "In theaters July 31, 2026 · Directed by Destin Daniel Cretton",
};

export const STORY_PANELS = [
  { sfx: "GONE!", title: "New York has moved on.", body: "Nobody remembers Peter Parker. Not his friends. Not the city he saves every night." },
  { sfx: "THWIP!", title: "Crime never sleeps. Neither does he.", body: "Full-time hero. No name, no credit, no way back." },
  { sfx: "CRACK!", title: "Watching your friends move on without you…", body: "…changes a person. Even one with great power." },
  { sfx: "HRRM…", title: "Something is waking up inside him.", body: "A change he may not have the power to control." },
  { sfx: "??!", title: "And the city's newest threat?", body: "You can't fight what you can't see." },
] as const;

export const VILLAINS = [
  { key: "scorpion", name: "SCORPION", actor: "Michael Mando", line: "Venom in his tail. Vengeance on his mind." },
  { key: "tombstone", name: "TOMBSTONE", actor: "Marvin Jones III", line: "Unbreakable. Unforgiving." },
  { key: "unseen", name: "THE UNSEEN", actor: "?????", line: "A mind that jumps from host to host. You never see it coming." },
] as const;

export const WILDCARDS = [
  { key: "punisher", name: "THE PUNISHER", actor: "Jon Bernthal", line: "One bad day away from becoming him." },
  { key: "hulk", name: "HULK", actor: "Mark Ruffalo", line: "The strongest one there is." },
] as const;

export const TIMELINE = [
  { year: "2017", title: "Homecoming", line: "The kid from Queens." },
  { year: "2019", title: "Far From Home", line: "The world needs a next Iron Man." },
  { year: "2021", title: "No Way Home", line: "The world forgets." },
  { year: "2026", title: "Brand New Day", line: "A brand new day." },
] as const;

export const FINALE = {
  headline: "Every legend needs a witness.",
  cta: "Share this concept",
  credits: "A fan tribute built with Next.js, Three.js and GSAP.",
};
```

- [ ] **Step 4: `globals.css` — Tailwind v4, palette e utilitários**

```css
@import "tailwindcss";

:root {
  --red: #e42618;
  --blue: #1d3a8f;
  --ink: #0a0a0f;
  --paper: #f4efe6;
}

@layer utilities {
  .halftone {
    background-image: radial-gradient(circle, rgb(0 0 0 / 0.55) 1.2px, transparent 1.3px);
    background-size: 7px 7px;
  }
  .comic-border {
    border: 3px solid var(--ink);
    box-shadow: 6px 6px 0 var(--ink);
  }
}
```

(Gotcha Tailwind v4 já conhecido: utilities custom SEMPRE dentro de `@layer utilities`.)

- [ ] **Step 5: `layout.tsx` com fonts e metadata**

Fonts via `next/font/google`: `Anton` (display do título), `Bangers` (onomatopeias HQ), `Inter` (corpo). Metadata: `title: "Spider-Man: Brand New Day — Fan Concept"`, `description: SITE.metaDescription`, `openGraph` básico. `<html lang="en">`, body `bg-[var(--ink)] text-[var(--paper)]`.

- [ ] **Step 6: `nav.tsx` e `footer.tsx`**

Nav: fixa no topo, transparente, logo-texto "BRAND NEW DAY" (Anton) à esquerda e badge `SITE.badge` à direita em `text-[10px] tracking-widest opacity-70`. Footer: `SITE.disclaimer` completo + `FINALE.credits` + link "Official movie site" pra `https://www.marvel.com/movies/spider-man-brand-new-day`.

- [ ] **Step 7: `page.tsx` provisório** montando Nav + um `<main>` com placeholder de cada seção (`<section id="act1" className="h-screen grid place-items-center">ACT 1</section>` etc.) + Footer, pra navegação já existir de ponta a ponta.

- [ ] **Step 8: Verificar build e dev**

```bash
npm run build 2>&1 | tail -5   # deve compilar sem erro
npm run lint                    # limpo
```

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next 16 + copy EN + shell com disclaimers"
```

---

### Task 2: Assets — garimpo, pipeline sharp e manifest

**Files:**
- Create: `scripts/prepare-media.mjs`, `src/lib/media.ts`, `public/media/*` (gerados), `assets-raw/` (fora do git — adicionar ao `.gitignore`)

**Interfaces:**
- Produces: `src/lib/media.ts` exporta `MEDIA` (paths tipados de todos os assets) e `TRAILER_YT_ID: string`. Todos os componentes visuais consomem daqui — nunca path hardcoded.

- [ ] **Step 1: Garimpar os originais** (executor faz via WebSearch/curl — deliverables exatos):

| Arquivo em `assets-raw/` | O que é | Fonte candidata | Mínimo |
|---|---|---|---|
| `poster.jpg` | Poster teaser oficial | IMP Awards (`impawards.com/2026/spider_man_brand_new_day*`) | 1500px de largura |
| `mask-closeup.jpg` | Close da máscara/olho (pode ser crop do poster se não houver still dedicado) | kit de imprensa / poster | 2000px na região do olho após crop |
| `spidey-action.jpg` | Spidey de corpo inteiro em pose de swing | still promocional | 1200px de altura |
| `villain-scorpion.jpg`, `villain-tombstone.jpg`, `punisher.jpg`, `hulk.jpg` | Stills promocionais dos personagens | material de divulgação | 1000px |
| `still-1.jpg` … `still-6.jpg` | Galeria | stills promocionais | 1200px |
| `nyc-1.jpg` … `nyc-5.jpg` | Prédios/skyline NY (LIVRES — Unsplash/Pexels, não oficial) | unsplash.com | 2000px |
| `timeline-*.jpg` (4) | Posters dos 4 filmes da era Holland | IMP Awards | 800px |

Fallback definido: qualquer still de personagem que não exista em qualidade → usar crop do poster com tratamento (zoom + grade duotone). Se `spidey-action.jpg` não existir de jeito nenhum → o cutout do Dive vira silhueta vetorial (SVG path de pose de swing, preenchimento vermelho/azul com rim light), que também funciona esteticamente.

- [ ] **Step 2: Achar o ID do trailer oficial no YouTube** (canal Sony Pictures Entertainment ou Marvel Entertainment; WebSearch "Spider-Man Brand New Day official trailer youtube") e gravar em `src/lib/media.ts` como `export const TRAILER_YT_ID = "<id real>";`.

- [ ] **Step 3: `scripts/prepare-media.mjs`** — processa `assets-raw/` → `public/media/`:

```js
// node scripts/prepare-media.mjs
// - redimensiona (teto 2048px pro canvas, 1600px pro DOM), converte pra webp q80
// - gera o crop do olho (mask-eye.jpg 2048px, jpg q90 -- textura R3F)
// - gera normal map do olho por sobel da luminância
import sharp from "sharp";
import { mkdirSync } from "node:fs";
mkdirSync("public/media", { recursive: true });

const jobs = [
  ["assets-raw/mask-closeup.jpg", "public/media/mask-eye.jpg", { width: 2048, format: "jpeg", quality: 90 }],
  ["assets-raw/poster.jpg", "public/media/poster.webp", { width: 1600 }],
  ["assets-raw/spidey-action.jpg", "public/media/spidey.webp", { width: 1200 }],
  // ... (uma linha por asset da tabela do Step 1; nyc-N com width 2048)
];
for (const [inp, out, opt] of jobs) {
  let img = sharp(inp).resize({ width: opt.width, withoutEnlargement: true });
  img = opt.format === "jpeg" ? img.jpeg({ quality: opt.quality ?? 80 }) : img.webp({ quality: 80 });
  await img.toFile(out);
  console.log("ok", out);
}

// normal map do olho: greyscale -> sobel X/Y -> RGB(nx, ny, 255)
const { data, info } = await sharp("public/media/mask-eye.jpg").greyscale().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const px = (x, y) => data[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
const out = Buffer.alloc(w * h * 3);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const dx = px(x + 1, y) - px(x - 1, y);
  const dy = px(x, y + 1) - px(x, y - 1);
  const i = (y * w + x) * 3;
  out[i] = 128 + dx / 2; out[i + 1] = 128 + dy / 2; out[i + 2] = 255;
}
await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile("public/media/mask-eye-normal.png");
console.log("ok normal map");
```

- [ ] **Step 4: Cutout do Spidey** — remover fundo do `spidey-action.jpg` (ferramenta de remoção de fundo disponível na sessão, ex. Higgsfield `remove_background`; alternativa: sharp com chroma se o fundo for liso) → `public/media/spidey.webp` com alpha. Validar visualmente que a silhueta está limpa.

- [ ] **Step 5: `src/lib/media.ts`**

```ts
export const MEDIA = {
  maskEye: "/media/mask-eye.jpg",
  maskEyeNormal: "/media/mask-eye-normal.png",
  poster: "/media/poster.webp",
  spidey: "/media/spidey.webp",
  nyc: ["/media/nyc-1.webp", "/media/nyc-2.webp", "/media/nyc-3.webp", "/media/nyc-4.webp", "/media/nyc-5.webp"],
  villains: { scorpion: "/media/villain-scorpion.webp", tombstone: "/media/villain-tombstone.webp", unseen: "/media/poster.webp" },
  wildcards: { punisher: "/media/punisher.webp", hulk: "/media/hulk.webp" },
  gallery: ["/media/still-1.webp", "/media/still-2.webp", "/media/still-3.webp", "/media/still-4.webp", "/media/still-5.webp", "/media/still-6.webp"],
  timeline: ["/media/timeline-homecoming.webp", "/media/timeline-ffh.webp", "/media/timeline-nwh.webp", "/media/timeline-bnd.webp"],
} as const;
export const TRAILER_YT_ID = "PREENCHIDO_NO_STEP_2"; // substituído pelo ID real no Step 2
```

- [ ] **Step 6: Rodar o pipeline e verificar**

```bash
node scripts/prepare-media.mjs
node -e "const fs=require('fs');const m=require('./src/lib/media.ts');" # não roda TS -- em vez disso:
ls public/media   # conferir que TODOS os arquivos do manifest existem
```

Abrir 3-4 dos webp gerados e OLHAR (nitidez, crop do olho bem enquadrado, cutout limpo).

- [ ] **Step 7: Commit** (`assets-raw/` fica FORA do git via `.gitignore`; `public/media/` entra)

```bash
git add -A && git commit -m "feat: pipeline de assets (sharp) + manifest de midia + trailer id"
```

---

### Task 3: SmoothScroll + store do Ato 1 + shell do Ato 1 + capture script

**Files:**
- Create: `src/components/smooth-scroll.tsx`, `src/lib/act1-store.ts`, `src/components/act1/act1.tsx`, `scripts/capture.mjs`
- Modify: `src/app/page.tsx` (Act1 no lugar do placeholder), `src/app/layout.tsx` (montar `<SmoothScroll/>`)

**Interfaces:**
- Produces: `act1State = { raw, progress, mouseX, mouseY }` e `damp(current, target, lambda, dt)` em `act1-store.ts`; `<Act1>` aceita `children` (a cena R3F entra na Task 4 como filho do frame sticky). `window.__lenis` exposto (padrão kavita). `scripts/capture.mjs <url> <out-dir>` captura screenshots em N pontos de scroll.

- [ ] **Step 1: `smooth-scroll.tsx`** — copiar VERBATIM o padrão kavita (Lenis + `lenis.on("scroll", ScrollTrigger.update)` + `gsap.ticker.add` + `lagSmoothing(0)`, desligado em `pointer: coarse` e `prefers-reduced-motion`, expõe `window.__lenis`).

- [ ] **Step 2: `act1-store.ts`** — copiar o padrão do kavita `journeyState`/`damp` (renomeado `act1State`).

- [ ] **Step 3: `act1.tsx`** — container `style={{height: "400vh"}}`, moldura `sticky top-0 h-screen overflow-hidden`, `ScrollTrigger.create({ trigger, start: "top top", end: "bottom bottom", onUpdate: s => { act1State.raw = s.progress } })`, botão "Skip intro" (scrollTo via `window.__lenis`, fallback `window.scrollTo`), fallback `prefers-reduced-motion` = hero estático com `MEDIA.poster` + título + badge. Overlay de título/badge DOM lê `act1State.progress` via rAF direto no style (SEM setState por frame).

- [ ] **Step 4: `scripts/capture.mjs`**

```js
// node scripts/capture.mjs http://localhost:3000 shots/
import { chromium } from "playwright";
const [,, url = "http://localhost:3000", outDir = "shots"] = process.argv;
const points = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(url, { waitUntil: "networkidle" });
const total = await page.evaluate(() => document.body.scrollHeight - innerHeight);
for (const p of points) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * p));
  await page.waitForTimeout(900); // damp assentar (headless roda lento -- gotcha kavita)
  await page.screenshot({ path: `${outDir}/${String(Math.round(p * 100)).padStart(3, "0")}.png` });
}
await browser.close();
```

- [ ] **Step 5: Verificar** — `npm run dev` em background, `node scripts/capture.mjs`, OLHAR os shots 000–040: título aparece e some conforme progresso; skip funciona (testar manual). `npm run build` limpo.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: lenis + store dampado + shell do ato 1 + capture script"`

---

### Task 4: Ato 1 cena A — "The Eye" (canvas, rig de câmera, olho→máscara)

**Files:**
- Create: `src/components/act1/scene.tsx`, `src/components/act1/eye-mask.tsx`
- Modify: `src/components/act1/act1.tsx` (montar `<Scene/>` dentro da moldura sticky)

**Interfaces:**
- Consumes: `act1State`/`damp`; `MEDIA.maskEye`, `MEDIA.maskEyeNormal`.
- Produces: `<Scene>` com rig: `useFrame` faz `act1State.progress = damp(act1State.progress, act1State.raw, 4.5, dt)` e posiciona a câmera por fases. Fases do progress (constantes exportadas de `scene.tsx`): `PHASE_EYE = [0, 0.35]`, `PHASE_CROSS = [0.35, 0.45]`, `PHASE_DIVE = [0.45, 0.95]`, `PHASE_BURST = [0.95, 1]`.

- [ ] **Step 1: `scene.tsx`** — `<Canvas gl={{ antialias: true, powerPreference: "high-performance" }} dpr={[1, 1.75]}>`, fog preta, luz ambiente fraca + spot frio. Componente `Rig`: no `PHASE_EYE`, câmera recua de `z=0.55` a `z=4.2` com leve tilt (`rotation.z` de 0.04→0) e drift de mouse dampado (mesmo lambda). Easing das fases por `THREE.MathUtils.smoothstep` local do trecho.

- [ ] **Step 2: `eye-mask.tsx`** — `<mesh>` plano 4×4 com `meshStandardMaterial({ map: maskEye, normalMap: maskEyeNormal, normalScale: 1.4, roughness: 0.55 })`, `useTexture` do drei. No `PHASE_CROSS`, opacity 1→0 (material `transparent`).

- [ ] **Step 3: Overlay de título** (já no act1.tsx) sincronizado: título entra em p≈0.22 (fim do recuo), some em p≈0.42. Badge FAN CONCEPT visível desde p=0.

- [ ] **Step 4: Verificar visual** — capture 000–045, OLHAR: p0 = macro do olho SEM bordas visíveis do plano; recuo suave; título nítido; nenhuma zona morta.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(act1): cena do olho com normal map + rig de camera por fases"`

---

### Task 5: Ato 1 cena B — "The Dive" (diorama NY + Spidey)

**Files:**
- Create: `src/components/act1/dive.tsx`
- Modify: `src/components/act1/scene.tsx` (montar `<Dive/>`)

**Interfaces:**
- Consumes: `MEDIA.nyc` (5 camadas), `MEDIA.spidey`, fases de `scene.tsx`.
- Produces: grupo `<Dive>` com planos em `z = -2, -5, -8, -11, -14`, câmera viaja `z: 4.2 → -12` no `PHASE_DIVE` com sway senoidal em `x` (amplitude 0.8, 2 ciclos) seguindo o Spidey.

- [ ] **Step 1:** Planos NY: `planeGeometry(10, 6)` com leve curvatura via `geometry.attributes.position` (dobra parabólica nas bordas, ±0.35 em z) — vende volume sem custo de malha. Textura com `color` escurecida por camada (mais fundo = mais escuro/azulado). Duotone vermelho/azul via `material.color` + fog.
- [ ] **Step 2:** Spidey cutout: plano 1.2×1.8 com alpha, órbita pendular: `x = sin(t*2π*2) * 2.2`, `y = -|cos| * 0.8 + baseline`, `rotation.z` acompanha a tangente. `t` = progresso local do PHASE_DIVE.
- [ ] **Step 3:** Crossfade PHASE_CROSS: máscara some (Task 4), diorama surge (opacity das camadas 0→1) e fog abre.
- [ ] **Step 4:** Mobile (`pointer: coarse` detectado no mount): renderizar só 3 camadas NY.
- [ ] **Step 5: Verificar visual** — capture 035–095, OLHAR: sensação de profundidade real; Spidey nunca "cola" numa camada; fog esconde os limites dos planos; fps fluido no dev (checar overlay de fps do próprio Chrome se necessário).
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(act1): diorama 2.5D de NY com spidey em pendulo"`

---

### Task 6: Ato 1 — teias e poeira (partículas)

**Files:**
- Create: `src/components/act1/webs.tsx`
- Modify: `src/components/act1/scene.tsx` (montar `<Webs/>`)

**Interfaces:**
- Consumes: fases; ativo só no `PHASE_DIVE`.
- Produces: `<Webs>` = (a) 3-4 linhas de teia (`Line` do drei, curvas quadráticas entre pontos fora da tela e o pendulo do Spidey, opacity pulsada no ritmo do swing) e (b) 400 partículas de poeira (`<points>` + `PointsMaterial size 0.02`, drift lento, TETO FIXO 400 — constraint global).

- [ ] **Step 1:** Implementar linhas de teia sincronizadas com a fase do pêndulo (a teia "dispara" quando o Spidey inverte a direção).
- [ ] **Step 2:** Poeira: BufferGeometry com posições random em caixa 12×8×16, `useFrame` desloca z levemente contra a câmera (sensação de velocidade).
- [ ] **Step 3: Verificar visual** — capture 045–095 e OLHAR; conferir que partículas não viram "neve" (tamanho/opacity contidos).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(act1): teias sincronizadas + poeira urbana"`

---

### Task 7: A costura — halftone burst (canvas→DOM sem frame visível)

**Files:**
- Create: `src/components/act1/halftone-burst.tsx`
- Modify: `src/components/act1/act1.tsx` (montar overlay por cima do canvas)

**Interfaces:**
- Consumes: `act1State.progress` (rAF direto no DOM).
- Produces: overlay fullscreen que em `PHASE_BURST` (p 0.95→1) escala uma retícula radial de 0 a cobrir 100% da tela (clip-path circle + `.halftone` + flash vermelho). REGRA DURA: o canvas só deixa de ser visível quando o overlay está em cobertura total — o overlay anima por cima ANTES, e o fim do container (400vh) coincide com cobertura 100%, então o scroll natural já entrega o DOM do Ato 2 por baixo (scrim do hyperframe: nunca existe frame da troca).

- [ ] **Step 1:** Implementar overlay com `clip-path: circle(R% at 50% 45%)` dirigido por rAF; R vai de 0 a 150 no PHASE_BURST com easing quadrático.
- [ ] **Step 2:** No p=1.0 o overlay fica opaco e o próximo scroll revela `<Story/>` (primeira seção DOM) que já está logo abaixo no fluxo do documento; o overlay faz fade-out em 300ms quando o container sai da viewport (IntersectionObserver).
- [ ] **Step 3: Verificar visual (CRÍTICO)** — capture com pontos densos `0.92, 0.94, 0.96, 0.98, 1.0` + scroll manual devagar: NENHUM frame pode mostrar borda de canvas, fundo vazando ou salto. OLHAR cada shot.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: costura canvas->DOM com burst de reticula HQ"`

---

### Task 8: Ato 2 — "The Story" (painéis HQ)

**Files:**
- Create: `src/components/act2/story.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `STORY_PANELS` do content.ts; fontes Bangers/Anton; utilities `.halftone`/`.comic-border`.
- Produces: seção `id="story"`, container pinado (`ScrollTrigger pin: true, end: "+=250%"`) onde os 5 painéis entram um a um (slide+rotate leve, stagger via timeline scrubbed), onomatopeia (`sfx`) estoura com `scale` elástico. Gotcha aurex: usar `yPercent` nos painéis (não `y`) pra ser responsivo.

- [ ] **Step 1:** Implementar timeline scrubbed com os 5 painéis (grid assimétrico tipo página de HQ, fundo `--paper` com `.halftone`, texto `--ink`).
- [ ] **Step 2: Verificar visual** — capture da faixa da seção, OLHAR: legibilidade AA (contraste), painéis nunca sobrepõem texto de forma ilegível, pin sem jump.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(act2): historia em paineis de HQ pinados"`

---

### Task 9: Ato 2 — "The Threats" (vilões)

**Files:**
- Create: `src/components/act2/threats.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `VILLAINS`, `WILDCARDS`, `MEDIA.villains`, `MEDIA.wildcards`.
- Produces: seção `id="threats"` — um painel fullscreen por vilão com transição forte (wipe diagonal via `clip-path` + still com zoom lento Ken Burns + nome gigante em Anton). O "The Unseen" NÃO usa still: usa o efeito de distorção — `<feTurbulence>` + `<feDisplacementMap>` SVG animado sobre um frame escuro do poster, com o nome glitchando (2-3 layers de texto com offsets RGB). Wildcards (Punisher/Hulk) em meia-tela lado a lado no fim.

- [ ] **Step 1:** Implementar painéis com ScrollTrigger (um pin curto por vilão, `end: "+=100%"` cada).
- [ ] **Step 2:** Implementar o glitch do Unseen (filter SVG local — NUNCA no canvas global, constraint do spec).
- [ ] **Step 3: Verificar visual** — capture + OLHAR: transições sem flash branco, glitch legível, stills sem esticar (object-cover).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(act2): viloes com wipes + glitch do vilao invisivel"`

---

### Task 10: Ato 2 — "Watch" (trailer + galeria)

**Files:**
- Create: `src/components/act2/watch.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `TRAILER_YT_ID`, `MEDIA.gallery`, `MEDIA.poster`.
- Produces: seção `id="watch"` — facade do trailer (poster + botão play; iframe `youtube-nocookie.com/embed/` SÓ é injetado no clique — performance e privacidade) em moldura cinematográfica (letterbox + vinheta), e grid de galeria 3×2 com hover parallax leve (translate ±6px via mousemove, `will-change: transform`).

- [ ] **Step 1:** Implementar facade + injeção do iframe no clique (`allow="autoplay"` no iframe pra dar play imediato).
- [ ] **Step 2:** Galeria com `next/image` (sizes corretos) + hover.
- [ ] **Step 3: Verificar** — clicar play roda o trailer; `npm run build` limpo; capture + OLHAR.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(act2): facade do trailer oficial + galeria"`

---

### Task 11: Ato 2 — "The Legacy" (timeline + finale)

**Files:**
- Create: `src/components/act2/legacy.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `TIMELINE`, `MEDIA.timeline`, `FINALE`, `SITE.disclaimer`.
- Produces: seção `id="legacy"` — trilho horizontal scrubbed (container pin, `x` do trilho de 0 a `-(scrollWidth - innerWidth)`, gotcha aurex: medir no `refresh` do ScrollTrigger, não no mount) com 4 cards de filme (poster + ano + linha). Desemboca no finale: fundo escurece, teias em SVG fecham das bordas (stroke-dashoffset animado), a máscara (crop do poster) surge ao centro, `FINALE.headline` + botão de share (Web Share API com fallback de copiar URL) + créditos.

- [ ] **Step 1:** Timeline horizontal com pin + medição no refresh.
- [ ] **Step 2:** Finale com teias SVG (4 paths desenhados das quinas, `getTotalLength` pra dash) + share (`navigator.share` com fallback `clipboard.writeText` + toast "Link copied").
- [ ] **Step 3: Verificar visual** — capture + OLHAR: trilho sem overshoot no fim (zona morta), teias fecham suave, share funciona nos dois caminhos.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(act2): timeline da era holland + finale com teias e share"`

---

### Task 12: Performance, mobile e acessibilidade

**Files:**
- Modify: componentes conforme achados; `src/app/layout.tsx` (preload da textura do olho); `scripts/prepare-media.mjs` (gerar também `public/media/mask-eye-sm.jpg` em 1024px pro mobile)

- [ ] **Step 1:** `prefers-reduced-motion` no Ato 2: envolver os ScrollTriggers num check — com reduce, seções viram blocos estáticos com fade simples (mesma info, sem pin/scrub).
- [ ] **Step 2:** Mobile: conferir Ato 1 com 3 camadas; textura do olho servida em 1024px pra `pointer: coarse` (segunda versão gerada no prepare-media: `mask-eye-sm.jpg`); tipografia fluida (clamp) nas seções.
- [ ] **Step 3:** `next/image` com `sizes` corretos em toda imagem DOM; `loading="lazy"` fora da dobra; `priority` só no que aparece no primeiro paint.
- [ ] **Step 4:** Rodar Lighthouse (Chrome headless) em `next build && next start` — alvo ≥90 em Performance/A11y/Best Practices/SEO. Corrigir o que aparecer (contraste, aria-labels nos botões skip/play/share, alt text em toda imagem).
- [ ] **Step 5: Verificar** build + capture completo desktop E viewport 390px, OLHAR ambos.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "perf: reduced-motion, mobile trim, lighthouse >=90"`

---

### Task 13: Verificação final visual + README + push GitHub

**Files:**
- Create: `README.md`
- Modify: o que a verificação apontar

- [ ] **Step 1:** `npm run build && npm run start` (NÃO dev — gotcha: dev turbopack trava no Windows e produção se comporta diferente), capture completo (16 pontos + os 5 densos da costura), **OLHAR TODOS os shots** e corrigir qualquer defeito visual encontrado (repetir até limpo).
- [ ] **Step 2:** `README.md` — o que é (fan concept, disclaimer), stack, como rodar, pipeline de assets (`assets-raw/` não versionado + como regenerar), crédito das fontes de imagem (Marvel/Sony material promocional; Unsplash pros prédios com atribuição).
- [ ] **Step 3:** Criar repo e push:

```bash
gh repo create rickjs2005/spiderman-bnd --public --source . --push
```

- [ ] **Step 4:** Commit final se sobrou algo + confirmar `git status` limpo. **PARAR AQUI** — deploy na Vercel só quando o Rick pedir.
