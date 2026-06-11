#!/usr/bin/env node
// SPA 빌드 후 dist/client/index.html 자동 생성
import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const clientDir = 'dist/client/assets';
const files = readdirSync(clientDir);

const cssFile = files.find(f => f.endsWith('.css'));
const clientJs = files.find(f => f.startsWith('index-') && f.endsWith('.js') && !f.includes('BMx') && !f.includes('B0v'));

// hydrateRoot/createRoot가 있는 진입점 JS 찾기
import { readFileSync } from 'fs';
let entryJs = null;
for (const f of files) {
  if (!f.endsWith('.js')) continue;
  const content = readFileSync(join(clientDir, f), 'utf8');
  if (content.includes('hydrateRoot') || content.includes('createRoot') || content.includes('StartClient')) {
    entryJs = f;
    break;
  }
}

if (!entryJs) {
  // fallback: index-*.js 중 가장 작은 것
  const indexFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'));
  entryJs = indexFiles.sort((a, b) => {
    const sa = readFileSync(join(clientDir, a)).length;
    const sb = readFileSync(join(clientDir, b)).length;
    return sa - sb;
  })[0];
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Piano Tuning Scope</title>
  <meta name="description" content="전문가용 피아노 조율 스코프 — 실시간 피치 감지, 스트로보 튜너, 88건반 조율 곡선 시각화."/>
  ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}"/>` : ''}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/${entryJs}"></script>
</body>
</html>`;

writeFileSync('dist/client/index.html', html);
console.log(`✓ dist/client/index.html 생성 완료 (entry: ${entryJs})`);
