// arena.html is written for the Claude artifact host (no <html>/<head>).
// Wrap it into a full document for Vercel.
const fs = require('fs');
const wrap = (src, out) => fs.writeFileSync(out,
  `<!doctype html>\n<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>\n` +
  fs.readFileSync(src, 'utf8').replace(/(<\/style>)/, '$1\n</head><body>') + '\n</body></html>\n');
wrap('arena.html', 'index.html');
