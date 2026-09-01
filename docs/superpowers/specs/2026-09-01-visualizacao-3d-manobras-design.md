# Visualização 3D das manobras — design

## Contexto e problema

O curso hoje é inteiramente texto (`docs/modules/*.md`). Cada módulo descreve uma manobra em BF3 (jato) em prosa, sem apoio visual. Como o conteúdo é essencialmente espacial (planos de curva, pitch/roll, trajetória), texto sozinho exige um esforço extra de tradução mental antes de a pessoa conseguir reproduzir a manobra no jogo.

O curso é lido diretamente no GitHub.com (não há GitHub Pages nem build de site). Qualquer solução de apoio visual precisa funcionar dentro dessa restrição: imagens e GIFs embutidos em markdown, sem HTML/JS ao vivo.

## Objetivo

Para cada módulo, complementar o texto com:
1. Um **storyboard** — 3 imagens 3D (início, meio, saída) anotadas com o vocabulário já usado no curso (velocidade, tendência, orientação, comando).
2. Um **GIF** da manobra completa, do ponto de vista de perseguição (chase camera), simulando a experiência de jogo.

## Não-objetivos (por enquanto)

- Visualizador 3D interativo no navegador. Fica para uma fase futura, condicionada a migrar a publicação do curso para GitHub Pages. A arquitetura abaixo é desenhada para não bloquear essa evolução, mas não a implementa agora.
- Modelo 3D realista de jato. Um modelo estilizado (formas geométricas simples) é suficiente nesta fase.
- Cobrir os 8 módulos de uma vez. Esta fase entrega o pipeline + o módulo 1 (Diagonal sustentada) como piloto; os outros 7 módulos são replicações do mesmo padrão, feitas depois de validar o piloto.

## Arquitetura

Pipeline de **geração estática, offline**: as cenas 3D são definidas em código (three.js) e renderizadas headless (Puppeteer controlando Chromium real) para produzir imagens e GIF, que são commitados no repositório e referenciados nos `.md`. Ninguém que lê o curso precisa de JS rodando no navegador — apenas quem cria/edita uma manobra roda o pipeline localmente.

Reaproveitamento futuro: a mesma definição de cena (trajetória, jato, câmera) usada para gerar o GIF hoje pode, mais tarde, rodar ao vivo num visualizador web — sem duplicar a modelagem da manobra.

### Estrutura de pastas

```
visuals/
  scenes/
    01-diagonal-sustentada.js   # trajetória + keyframes + anotações da manobra
    shared/
      jet.js                    # modelo estilizado do jato (reaproveitado por todas as cenas)
      camera-rigs.js             # câmera "chase" e câmera "tática"
  render/
    capture.js                  # Puppeteer: carrega a cena, varre o tempo, tira screenshots
    export.js                   # PNGs -> GIF via ffmpeg-static
  package.json                  # deps: three, puppeteer, ffmpeg-static
assets/
  maneuvers/
    01-diagonal-sustentada/
      storyboard-1.png
      storyboard-2.png
      storyboard-3.png
      loop.gif
```

### Modelo de dados da cena

Cada manobra é uma lista de keyframes correspondentes aos pontos já descritos no texto do módulo (início, transições, saída):

```js
// visuals/scenes/01-diagonal-sustentada.js
export default {
  id: "01-diagonal-sustentada",
  keyframes: [
    { t: 0,   pos: [0, 100, 0],  pitch: 0,  roll: 30, speed: 310, tendencia: "estável", comando: "manter",   nota: "Entrada no plano diagonal" },
    { t: 2.5, pos: [40, 90, 20], pitch: -5, roll: 30, speed: 300, tendencia: "caindo",  comando: "AB curto", nota: "Meio da curva — corrige leve queda" },
    { t: 5,   pos: [80, 100, 40], pitch: 0, roll: 30, speed: 312, tendencia: "subindo", comando: "conter",   nota: "Saída, plano estabilizado" },
  ],
};
```

- `pos/pitch/roll` alimentam a trajetória interpolada do jato estilizado.
- `speed/tendencia/comando/nota` usam exatamente os campos do modelo mental do README (velocidade atual → tendência → orientação → próximo comando) e viram as legendas do storyboard — texto fora do canvas 3D, não renderizado dentro da cena, para ficar fácil de editar e revisar.
- A câmera **não** é um campo da cena: ela é fixada pelo tipo de saída — storyboard sempre usa a câmera **tática** (visão externa mostrando o plano completo, por deixar a geometria mais clara) e o GIF sempre usa a câmera **chase** (atrás do jato, simula visão de jogo). Escolher por saída, e não por cena, se mostrou mais útil: toda manobra quer as duas visões. Não adicione um campo `camera` aos dados da cena — ele não é lido por nada.

### Pipeline de captura e exportação

`visuals/render/capture.js`:
1. Sobe uma página HTML mínima local que carrega three.js + a cena pedida via argumento (`node capture.js 01-diagonal-sustentada`).
2. Puppeteer abre essa página num Chromium headless e aguarda a cena montar.
3. **Storyboard**: pula direto para o `t` de cada keyframe e tira um screenshot do canvas por keyframe → `storyboard-1.png`, `storyboard-2.png`, `storyboard-3.png`.
4. **GIF**: varre `t` continuamente em passos pequenos (~1/15s), interpolando entre keyframes, tirando um screenshot por passo.

`visuals/render/export.js`:
- Recebe a sequência de PNGs do GIF e usa `ffmpeg-static` (binário do ffmpeg embutido via npm — sem exigir instalação no sistema) para montar `loop.gif` com paleta otimizada.
- Os PNGs de storyboard já são o artefato final; não há composição adicional.

Comando único por módulo:
```
node visuals/render/capture.js 01-diagonal-sustentada
node visuals/render/export.js 01-diagonal-sustentada
```

### Integração no markdown do módulo

No topo de cada `docs/modules/NN-*.md`, antes do texto corrido, uma nova seção:

```markdown
## Visualização

| Início | Meio | Saída |
|---|---|---|
| ![Início](../../assets/maneuvers/01-diagonal-sustentada/storyboard-1.png)<br>310, estável, —, manter | ![Meio](.../storyboard-2.png)<br>300, caindo, —, AB curto | ![Saída](.../storyboard-3.png)<br>312, subindo, —, conter |

![Manobra completa](../../assets/maneuvers/01-diagonal-sustentada/loop.gif)
```

GitHub.com renderiza tabelas, imagens e GIF nativamente — sem HTML/JS ao vivo. O texto corrido do módulo permanece abaixo, inalterado: a visualização complementa, não substitui a explicação.

## Testing / validação

Não há testes automatizados de conteúdo visual. O critério de "pronto" para o piloto (módulo 1):
1. O pipeline roda localmente sem erros (`capture.js` gera 3 PNGs + N frames de GIF; `export.js` produz um `loop.gif` válido).
2. O storyboard e o GIF refletem a geometria descrita no texto do módulo (plano diagonal estável, sem artefatos de interpolação/câmera).
3. O `.md` do módulo 1, visualizado no GitHub (preview local ou push em branch), fica legível — tabela e imagens bem posicionadas, sem quebra de layout.

## Riscos e decisões em aberto

- **Fidelidade do jato estilizado**: formas geométricas simples podem não deixar claro pitch/roll em ângulos de câmera não ideais. Mitigação: câmera tática para o storyboard prioriza clareza da geometria sobre realismo.
- **Tamanho dos GIFs**: GIFs de manobras mais longas (ex. módulo 6, "Diagonais encadeadas") podem gerar arquivos grandes. Se isso virar problema, considerar reduzir frame rate ou resolução antes de partir para MP4 (que exigiria migrar para Pages).
- **Dependência de Puppeteer/Chromium local**: quem for gerar/regenerar visuais precisa rodar `npm install` em `visuals/` (baixa um Chromium). Aceitável porque só afeta quem edita o curso, não quem lê.
