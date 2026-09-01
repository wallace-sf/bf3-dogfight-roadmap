# `visuals/` — geração das visualizações 3D das manobras

Pipeline **offline** que transforma a definição de uma manobra (uma lista de
keyframes em JS) nos artefatos que aparecem no curso:

- `assets/maneuvers/<scene-id>/storyboard-0.png` — painel de abertura em câmera
  **panorâmica** (a trajetória inteira num quadro, jato ampliado para contexto).
- `assets/maneuvers/<scene-id>/storyboard-1.png`, `-2.png`, `-3.png` — um PNG por
  keyframe, em câmera **tática**: uma visão externa 3/4 travada no jato *naquele
  instante* (curta distância fixa), de modo que a atitude — pitch/roll — fique
  legível. A linha de trajetória continua desenhada ao fundo.
- `assets/maneuvers/<scene-id>/loop.gif` — a manobra completa em câmera **chase**
  (atrás do jato, simula a visão de jogo).

Quem *lê* o curso não precisa de nada disso: os arquivos são commitados e
referenciados nos `.md`. Este toolchain só interessa a quem **cria ou edita** uma
manobra.

A câmera não é configurável por cena — ela é fixada pelo tipo de saída
(storyboard → panorâmica + tática, GIF → chase).

O caça é um modelo glTF de terceiros (`assets/models/fighter.glb`) sob licença
**CC-BY 3.0** — a atribuição em `assets/models/CREDITS.md` precisa acompanhar
qualquer redistribuição dos artefatos.

## Instalação

```
cd visuals
npm install
```

`npm install` baixa um build do Chromium via Puppeteer (algumas centenas de MB) e
o binário do `ffmpeg` via `ffmpeg-static` — não é preciso ter ffmpeg no sistema.

## Regenerar os artefatos de um módulo

Os três comandos, **nesta ordem**. O `--` é obrigatório: ele passa os argumentos
para o script em vez de para o `npm`.

```
cd visuals

# 1. Storyboard: 1 PNG por keyframe, em assets/maneuvers/<scene-id>/
npm run storyboard -- 01-diagonal-sustentada storyboard

# 2. Frames do GIF: ~15 fps em assets/maneuvers/<scene-id>/frames/
npm run frames -- 01-diagonal-sustentada gif

# 3. Monta o loop.gif e apaga frames/
npm run gif -- 01-diagonal-sustentada
```

Equivalente sem npm scripts:

```
node render/capture.js 01-diagonal-sustentada storyboard
node render/capture.js 01-diagonal-sustentada gif
node render/export.js  01-diagonal-sustentada
```

Sobre `frames/`:

- `capture.js … gif` **apaga** o diretório antes de recapturar, então frames
  antigos de uma versão mais longa da cena nunca vazam para o GIF novo.
- `export.js` **apaga** `frames/` (incluindo `palette.png`) depois de gerar o GIF
  com sucesso. Não é preciso limpar nada à mão. O diretório é gitignored de
  qualquer forma — só `storyboard-*.png` e `loop.gif` são commitados.

## Adicionar um módulo novo

1. Copie `scenes/01-diagonal-sustentada.js` para `scenes/NN-nome-da-manobra.js`.
2. Troque o `id` (precisa bater com o nome do arquivo, sem `.js`) e reescreva os
   `keyframes`. Cada keyframe precisa de **todos** estes campos:

   | campo | significado |
   |---|---|
   | `t` | tempo em segundos; crescente e sem repetição |
   | `pos` | `[x, y, z]` em unidades de mundo (`y` = altitude, grade em `y=0`) |
   | `pitch` | graus, **somado** à inclinação que a própria trajetória já tem (ângulo de ataque / comando de profundor); positivo = nariz para cima |
   | `roll` | graus de bank em torno do eixo do nariz; positivo = asa direita para baixo |
   | `speed`, `tendencia`, `comando`, `nota` | vocabulário do curso; viram as legendas no markdown |

   A orientação do jato vem da **trajetória** (o nariz aponta para a direção de
   voo); `pitch`/`roll` são offsets em cima disso. Não existe campo de yaw.
3. Rode `npm test` — `scenes/scenes.test.js` varre `scenes/*.js` sozinho e aplica
   as invariantes estruturais ao módulo novo, sem precisar de arquivo de teste.
4. Gere os artefatos com os três comandos acima.
5. Adicione a seção `## Visualização` no topo de `docs/modules/NN-*.md`, seguindo
   exatamente o padrão de `docs/modules/01-diagonal-sustentada.md`.

## Testes

```
cd visuals && npm test
```

Cobrem a interpolação de keyframes, as câmeras, o modelo do jato, o servidor
estático e a validade estrutural de toda cena em `scenes/`. Não há teste
automatizado do resultado visual — a verificação do render é olhar os PNGs e o
GIF gerados.

## Estrutura

```
assets/
  models/
    fighter.glb               modelo glTF do caça ("Jet" de jeremy, CC-BY 3.0)
    CREDITS.md                atribuição do(s) modelo(s)
scenes/
  NN-*.js                     dados da manobra (keyframes)
  scenes.test.js              valida TODA cena em scenes/
  shared/
    interpolate.js            interpolação linear entre keyframes
    jet.js                    URL + normalização do modelo (nariz = +Z local)
    cameraRigs.js             câmeras panorâmica, tática e chase
    assertValidScene.js       invariantes estruturais de uma cena
render/
  static-server.js            serve visuals/ em 127.0.0.1 durante a captura
  harness.html                página mínima com three.js
  harness-entry.js            monta a cena e expõe window.__applyFrame
  capture.js                  Puppeteer: varre o tempo e tira screenshots
  export.js                   PNGs -> GIF via ffmpeg-static
```
