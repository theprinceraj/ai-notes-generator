// Render Mermaid diagrams only after the handwriting font has loaded, so text is measured correctly.
mermaid.initialize({
  startOnLoad: false,
  look: 'handDrawn',
  handDrawnSeed: 7,
  theme: 'base',
  flowchart: { useMaxWidth: false },
  themeVariables: {
    fontFamily: 'Kalam',
    fontSize: '18px',
    primaryColor: '#fff8c4',
    primaryBorderColor: '#1f3f94',
    primaryTextColor: '#1c1c1c',
    lineColor: '#c62828',
    edgeLabelBackground: '#fdfbf3',
  },
});

// Pour the blocks of #content onto A4 sheets in order, starting a new sheet when one is full.
// Long lists are split between sheets item by item; a heading never ends a sheet on its own.
function paginate() {
  const src = document.getElementById('content');
  const { date, dateLabel, pageLabel } = document.body.dataset;
  const blocks = [...src.children];
  src.remove();

  let body;
  let count = 0;
  const newPage = () => {
    count++;
    const page = document.createElement('section');
    page.className = 'page';
    page.innerHTML = `<div class="pg">${dateLabel}: ${date} &nbsp;|&nbsp; ${pageLabel}: ${count}</div>`;
    body = document.createElement('div');
    body.className = 'body';
    page.append(body);
    document.body.append(page);
  };
  const fits = () => body.scrollHeight <= body.clientHeight;
  const isHeading = (el) => el && /^H[12]$/.test(el.tagName);

  // Moves a trailing heading (if any) from the full sheet onto a fresh one.
  const breakPage = () => {
    const last = body.lastElementChild;
    const carry = isHeading(last) && body.children.length > 1 ? last : null;
    if (carry) carry.remove();
    newPage();
    if (carry) body.append(carry);
  };

  const place = (el) => {
    body.append(el);
    if (fits()) return;
    el.remove();

    if (el.tagName === 'UL' && el.children.length > 1) {
      const part = el.cloneNode(false);
      body.append(part);
      while (el.firstElementChild) {
        part.append(el.firstElementChild);
        if (!fits()) {
          el.prepend(part.lastElementChild);
          break;
        }
      }
      if (part.children.length) {
        newPage();
        place(el);
        return;
      }
      part.remove();
    }

    breakPage();
    body.append(el);
  };

  newPage();
  blocks.forEach(place);
}

// A broken diagram must not stop the notes from being laid out.
document.fonts.ready
  .then(() => mermaid.run())
  .catch((err) => console.error('mermaid:', err))
  .then(paginate)
  .catch((err) => console.error('paginate:', err))
  .finally(() => { window.__ready = true; });
