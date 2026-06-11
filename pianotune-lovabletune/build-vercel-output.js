#!/usr/bin/env node
// Vercel Build Output API 형식으로 정적 SPA 배포 구조 생성
// https://vercel.com/docs/build-output-api/v3
import { mkdirSync, writeFileSync, cpSync, existsSync } from 'fs';
import { join } from 'path';

const outputDir = '.vercel/output';
const staticDir = join(outputDir, 'static');

// 기존 .vercel/output 정리 후 재생성
mkdirSync(staticDir, { recursive: true });

// dist/client 파일들을 .vercel/output/static으로 복사
cpSync('dist/client', staticDir, { recursive: true });
console.log('✓ dist/client → .vercel/output/static 복사 완료');

// config.json 생성 - 정적 사이트 + SPA 라우팅
const config = {
  version: 3,
  routes: [
    {
      src: '/assets/(.*)',
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      continue: true
    },
    {
      handle: 'filesystem'
    },
    {
      src: '/(.*)',
      dest: '/index.html'
    }
  ]
};

writeFileSync(join(outputDir, 'config.json'), JSON.stringify(config, null, 2));
console.log('✓ .vercel/output/config.json 생성 완료');
console.log('✓ Vercel 정적 SPA 배포 준비 완료');
