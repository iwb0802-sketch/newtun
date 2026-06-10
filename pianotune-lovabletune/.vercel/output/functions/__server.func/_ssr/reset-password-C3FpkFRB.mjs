import { r as reactExports, c as jsxDevRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { s as supabase } from "./client-RALsHCOQ.mjs";
import { t as toast } from "../_libs/sonner.mjs";
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
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.auth.updateUser({
      password
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("비밀번호가 변경되었습니다.");
    navigate({
      to: "/"
    });
  };
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4", children: /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("form", { onSubmit: handleSubmit, className: "w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6", children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "text-4xl mb-2", children: "🎹" }, void 0, false, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
        lineNumber: 34,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h1", { className: "text-2xl font-bold", children: "새 비밀번호 설정" }, void 0, false, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
        lineNumber: 35,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "text-sm text-muted-foreground mt-1", children: "새 비밀번호를 입력해 주세요." }, void 0, false, {
        fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
        lineNumber: 36,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
      lineNumber: 33,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("input", { type: "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "새 비밀번호 (6자 이상)", className: "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
      lineNumber: 40,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("button", { type: "submit", disabled: loading, className: "w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors", children: loading ? "변경 중..." : "비밀번호 변경" }, void 0, false, {
      fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
      lineNumber: 41,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
    lineNumber: 32,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/home/ubuntu/newtun/pianotune-lovabletune/src/routes/reset-password.tsx?tsr-split=component",
    lineNumber: 31,
    columnNumber: 10
  }, this);
}
export {
  ResetPasswordPage as component
};
