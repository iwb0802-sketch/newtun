## 문제

`https://pianotune-w.vercel.app/` 접속 시 Vercel edge에서 `404: NOT_FOUND` (`pdx1::cvb44-...`) 반환.
로컬에서 `VERCEL=1 bun run build`로 검증한 결과:
- `.vercel/output/config.json` — routes 정상 (`filesystem` → `/__server` fallback)
- `.vercel/output/functions/__server.func/index.mjs` — 생성됨
- `.vercel/output/static/assets/` — 생성됨

즉 빌드 산출물은 정상. 404는 Vercel 프로젝트 측에서 `.vercel/output`(Build Output API)을 사용하지 않고 있다는 신호입니다.

## 가설 (확인 필요)

### A. Vercel 프로젝트 설정 문제 (가장 유력)
Vercel 대시보드의 **Project Settings → Build & Development Settings**가 다음 중 하나로 잘못 잡혀 있을 가능성:
- Framework Preset이 "Vite"/"Other"가 아닌 자동 감지로 다른 프레임워크가 들어감
- Output Directory가 `dist`로 고정 → Vercel이 정적 폴더만 찾고 함수는 무시 → 매칭되는 경로 없어 404
- Build Command가 `vercel.json`의 것과 충돌

Build Output API (`.vercel/output`)를 쓸 때는 **Output Directory를 비워두고**, Framework Preset도 "Other"로 둬야 함.

### B. 최신 커밋이 Production에 반영되지 않음
- 이전(수정 전) 배포가 Production 상태로 남아있고, 새 푸시가 Preview로만 올라간 경우
- 또는 Git 연동 브랜치가 `lovabletune`이 아닌 다른 브랜치를 Production으로 보고 있음

## 사용자 확인 요청

배포 환경은 Lovable이 직접 제어할 수 없으므로, 다음 정보 필요:

1. **Vercel 대시보드 → 프로젝트 → Settings → Build & Development Settings 스크린샷**
   - Framework Preset
   - Build Command
   - Output Directory
   - Install Command
2. **Vercel → Deployments 탭 스크린샷**
   - 가장 최근 Production 배포 커밋 해시
   - 그 배포의 상태(Ready/Error/Building)

## 코드 측 안전장치 (선택적)

확인 결과에 따라 다음 중 하나를 적용:

### Case A 대응: `vercel.json` 보강
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "bun install --frozen-lockfile",
  "buildCommand": "VERCEL=1 bun run build && test -f .vercel/output/config.json && test -f .vercel/output/functions/__server.func/index.mjs",
  "outputDirectory": ".vercel/output"
}
```
- `VERCEL=1` 명시 — Vercel 자체 환경에서 `process.env.VERCEL`이 `"1"`로 들어오지만 일부 경우 보장 안 되므로 명시
- `outputDirectory` 명시 — Vercel이 Build Output API 위치를 확실히 인식

### Case B 대응
- Vercel 대시보드에서 해당 커밋을 "Promote to Production" 하거나 재배포

## 변경 파일 (Case A 확정 시)
- `vercel.json` — `buildCommand`에 `VERCEL=1` prefix 추가, `outputDirectory: ".vercel/output"` 추가

## 기대 결과
- `https://pianotune-w.vercel.app/`가 홈 화면을 정상 렌더링
- `/manual` 등 모든 라우트가 SSR + 클라이언트 라우팅 모두 동작
