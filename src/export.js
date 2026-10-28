(() => {
function download(data, name, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function svgPNG(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth * 2; canvas.height = image.naturalHeight * 2;
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
function binary64(data, mime) { return new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: mime }); }
globalThis.RExport = { download, svgPNG, binary64 };
})();
