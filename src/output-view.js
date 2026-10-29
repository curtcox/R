(() => {
const escape = text => String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function markdown(source) {
  // Escape before formatting; protocols and attributes are never accepted as HTML.
  return String(source).split('\n').map(line => {
    let html = escape(line).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const heading = /^(#{1,6}) (.*)$/.exec(html);
    if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`;
    if (/^[-*] /.test(html)) return '<div>• ' + html.slice(2) + '</div>';
    return '<div>' + (html || '<br>') + '</div>';
  }).join('');
}
class OutputView {
  constructor(container, gotoLine) { this.container = container; this.gotoLine = gotoLine; this.urls = []; this.zooms = []; this.observers = []; this.text = ''; }
  clear() {
    this.urls.forEach(url => URL.revokeObjectURL(url)); this.urls = [];
    this.observers.forEach(observer => observer.disconnect()); this.observers = [];
    this.zooms.forEach(zoom => zoom.destroy()); this.zooms = [];
    this.text = ''; this.current = null; this.container.replaceChildren();
  }
  add(item) {
    if (item.type === 'text') {
      this.text += String(item.text);
      const pre = document.createElement('pre'); pre.className = 'console ' + (item.stream === 'stderr' ? 'stderr' : '');
      const parts = String(item.text).split(/(main\.R:\d+)/g);
      for (const part of parts) {
        const line = /main\.R:(\d+)/.exec(part);
        if (line) { const link = document.createElement('button'); link.className = 'traceback-link'; link.textContent = part; link.onclick = () => this.gotoLine(Number(line[1])); pre.append(link); }
        else pre.append(document.createTextNode(part));
      }
      const previous = this.container.lastElementChild;
      if (previous?.className === pre.className && previous.tagName === 'PRE') previous.append(...pre.childNodes); else this.container.append(pre);
      this.container.scrollTop = this.container.scrollHeight; return;
    }
    const block = document.createElement('section'); block.className = 'output-item';
    if (['html', 'markdown'].includes(item.type)) {
      const iframe = document.createElement('iframe'); iframe.setAttribute('sandbox', ''); iframe.title = item.type === 'html' ? 'R HTML output' : 'R Markdown output';
      iframe.srcdoc = '<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data: https:; font-src data:"><style>body{font:14px system-ui;color:#172c3c;margin:16px}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #d9e2ea}pre,code{white-space:pre-wrap}</style>' + (item.type === 'html' ? String(item.data) : markdown(item.data));
      const expand = document.createElement('button'); expand.textContent = 'Expand'; expand.onclick = () => { iframe.classList.toggle('expanded'); expand.textContent = iframe.classList.contains('expanded') ? 'Collapse' : 'Expand'; };
      block.append(expand, iframe);
    } else if (['svg','figure','png','jpeg'].includes(item.type)) {
      const image = document.createElement('img'); image.alt = 'R ' + item.type + ' output'; image.className = 'figure';
      const svg = item.type === 'figure' ? item.svg : item.type === 'svg' ? item.data : null;
      const blob = svg ? new Blob([svg], { type: 'image/svg+xml' }) : RExport.binary64(item.data, 'image/' + item.type);
      const url = URL.createObjectURL(blob); this.urls.push(url); image.src = url; block.append(image);
      this.current = { svg, png: item.png || (item.type === 'png' ? item.data : null), blob };
      if (svg && globalThis.svgPanZoom) {
        image.onload = () => {
          const ns = 'http://www.w3.org/2000/svg';
          const canvas = document.createElement('div'); canvas.className = 'figure-canvas';
          const vector = document.createElementNS(ns, 'svg');
          vector.setAttribute('viewBox', `0 0 ${image.naturalWidth || 800} ${image.naturalHeight || 600}`);
          vector.setAttribute('role', 'img'); vector.setAttribute('aria-label', image.alt);
          const picture = document.createElementNS(ns, 'image');
          picture.setAttribute('href', url); picture.setAttribute('width', image.naturalWidth || 800); picture.setAttribute('height', image.naturalHeight || 600);
          vector.append(picture); canvas.append(vector); image.replaceWith(canvas);
          const zoom = svgPanZoom(vector, { controlIconsEnabled: false, fit: true, center: true }); this.zooms.push(zoom);
          const controls=document.createElement('div'); controls.className='output-controls';
          for(const [label,text,action] of [['Zoom in','+',()=>zoom.zoomIn()],['Reset plot view','Reset',()=>{zoom.fit();zoom.center();}],['Zoom out','−',()=>zoom.zoomOut()]]){
            const button=document.createElement('button');button.textContent=text;button.setAttribute('aria-label',label);button.onclick=action;controls.append(button);
          }
          canvas.after(controls);
          const observer = new ResizeObserver(() => { zoom.resize(); zoom.fit(); zoom.center(); }); observer.observe(canvas); this.observers.push(observer);
        };
      } else image.onclick = () => image.classList.toggle('zoomed');
    } else return;
    this.container.append(block);
  }
}
if (typeof module !== 'undefined') module.exports = { markdown }; else globalThis.OutputView = OutputView;
})();
