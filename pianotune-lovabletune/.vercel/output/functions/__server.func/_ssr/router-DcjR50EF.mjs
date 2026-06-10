import { Q as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { Q as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { c as createRouter, a as createRootRouteWithContext, u as useRouter, L as Link, O as Outlet, H as HeadContent, S as Scripts, b as createFileRoute, l as lazyRouteComponent } from "../_libs/tanstack__react-router.mjs";
import { r as reactExports, c as jsxDevRuntimeExports } from "../_libs/react.mjs";
import { T as Toaster } from "../_libs/sonner.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
const appCss = "/assets/styles-rPyuHTFC.css";
function reportLovableError(error, context = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error"
    }
  );
}
function NotFoundComponent() {
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h1", { className: "text-7xl font-bold text-foreground", children: "404" }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 20,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 21,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist or has been moved." }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 22,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "mt-6", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
      Link,
      {
        to: "/",
        className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        children: "Go home"
      },
      void 0,
      false,
      {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
        lineNumber: 26,
        columnNumber: 11
      },
      this
    ) }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 25,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
    lineNumber: 19,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
    lineNumber: 18,
    columnNumber: 5
  }, this);
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router = useRouter();
  reactExports.useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h1", { className: "text-xl font-semibold tracking-tight text-foreground", children: "This page didn't load" }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 48,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "mt-2 text-sm text-muted-foreground", children: "Something went wrong on our end. You can try refreshing or head back home." }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 51,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "button",
        {
          onClick: () => {
            router.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        },
        void 0,
        false,
        {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
          lineNumber: 55,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        },
        void 0,
        false,
        {
          fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
          lineNumber: 64,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 54,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
    lineNumber: 47,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
    lineNumber: 46,
    columnNumber: 5
  }, this);
}
const Route$3 = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "피아노 조율 시험용" },
      { name: "description", content: "피아노 조율 시험용 — 실시간 피치 감지, 스트로보 튜너, 88건반 조율 곡선 시각화" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "피아노 조율 시험용" },
      { property: "og:description", content: "피아노 조율 시험용" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "피아노 조율 시험용" },
      { name: "twitter:description", content: "피아노 조율 시험용" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe542297-b6f5-4cdf-9130-fe7ceac4cfc8/id-preview-ab550970--b20f6d88-b8ed-4cb5-81da-84a65617e250.lovable.app-1780969780023.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe542297-b6f5-4cdf-9130-fe7ceac4cfc8/id-preview-ab550970--b20f6d88-b8ed-4cb5-81da-84a65617e250.lovable.app-1780969780023.png" }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("html", { lang: "en", children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("head", { children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(HeadContent, {}, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 111,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 110,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("body", { children: [
      children,
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(Scripts, {}, void 0, false, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
        lineNumber: 115,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 113,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
    lineNumber: 109,
    columnNumber: 5
  }, this);
}
function RootComponent() {
  const { queryClient } = Route$3.useRouteContext();
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(Outlet, {}, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 127,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(Toaster, { richColors: true, position: "top-center" }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
      lineNumber: 128,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/__root.tsx",
    lineNumber: 125,
    columnNumber: 5
  }, this);
}
const $$splitComponentImporter$2 = () => import("./reset-password-C3FpkFRB.mjs");
const Route$2 = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{
      title: "비밀번호 재설정 — Piano Tuning Scope"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./manual-DUUc2Jeu.mjs");
const Route$1 = createFileRoute("/manual")({
  ssr: false,
  head: () => ({
    meta: [{
      title: "수동 조율 — Piano Tuning Scope"
    }, {
      name: "description",
      content: "목표 음을 하나씩 직접 조율하는 수동 모드. 중앙값/하부값/상부값 구간 별로 진행하며, 화면에 표시된 음과 일치할 때만 기록됩니다."
    }, {
      property: "og:title",
      content: "수동 조율 — Piano Tuning Scope"
    }, {
      property: "og:description",
      content: "구간별 단계 진행 수동 조율 모드 — 잘못된 음은 경고, 일치 시 자동 기록."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./index-9SfdlK1y.mjs");
const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [{
      title: "Piano Tuning Scope"
    }, {
      name: "description",
      content: "전문가용 피아노 조율 스코프 — 실시간 피치 감지, 스트로보 튜너, 88건반 조율 곡선 시각화."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const ResetPasswordRoute = Route$2.update({
  id: "/reset-password",
  path: "/reset-password",
  getParentRoute: () => Route$3
});
const ManualRoute = Route$1.update({
  id: "/manual",
  path: "/manual",
  getParentRoute: () => Route$3
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$3
});
const rootRouteChildren = {
  IndexRoute,
  ManualRoute,
  ResetPasswordRoute
};
const routeTree = Route$3._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router;
};
export {
  getRouter
};
