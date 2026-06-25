/**
 * diagnostics.ts
 * ──────────────
 * يجمع معلومات الجهاز/المتصفح + آخر رسائل console (log/warn/error)
 * في نص واحد جاهز للنسخ. الهدف: مساعدة المستخدم على إرسال معلومات
 * دقيقة عن جهازه عند مواجهة سلوك غير معتاد (ليس بالضرورة خطأ صريح) —
 * مثل مشاكل توافقية، بطء، أو أي استفسار تقني.
 *
 * لا يحتاج لأي اتصال خارجي — فقط Clipboard API.
 */

type LogEntry = {
  level: "log" | "warn" | "error";
  args: string;
  time: string;
};

const MAX_LOGS = 50;
const logBuffer: LogEntry[] = [];

function serializeArg(arg: unknown): string {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
  }
  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function pushLog(level: LogEntry["level"], args: unknown[]) {
  logBuffer.push({
    level,
    args: args.map(serializeArg).join(" "),
    time: new Date().toLocaleTimeString("ar-SY"),
  });
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
}

/**
 * يجب استدعاؤها مرة واحدة عند بدء التطبيق (في index.tsx) — تعترض
 * console.log/warn/error لتسجيلها في الذاكرة دون كسر سلوكها الطبيعي،
 * بالإضافة لأخطاء JS غير المعالجة (خارج أي ErrorBoundary).
 */
let initialized = false;
export function initDiagnostics() {
  if (initialized) return;
  initialized = true;

  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  console.log = (...args: unknown[]) => {
    pushLog("log", args);
    original.log(...args);
  };
  console.warn = (...args: unknown[]) => {
    pushLog("warn", args);
    original.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    pushLog("error", args);
    original.error(...args);
  };

  window.addEventListener("error", (e) => {
    pushLog("error", [`Uncaught: ${e.message}`, e.error?.stack ?? ""]);
  });
  window.addEventListener("unhandledrejection", (e) => {
    pushLog("error", [`Unhandled Promise Rejection: ${String(e.reason)}`]);
  });
}

// ─── معلومات الجهاز/المتصفح ──────────────────────────────────────────────────

async function getStorageEstimate(): Promise<string> {
  try {
    if (!navigator.storage?.estimate) return "غير متاح";
    const { usage, quota } = await navigator.storage.estimate();
    const usageMB = usage ? (usage / 1024 / 1024).toFixed(1) : "?";
    const quotaMB = quota ? (quota / 1024 / 1024).toFixed(1) : "?";
    return `${usageMB} MB / ${quotaMB} MB`;
  } catch {
    return "غير متاح";
  }
}

async function getDeviceInfo(): Promise<string> {
  const nav = navigator as any;
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

  const lines = [
    `الوقت: ${new Date().toLocaleString("ar-SY")}`,
    `الرابط الحالي: ${location.href}`,
    `User Agent: ${navigator.userAgent}`,
    `اللغة: ${navigator.language}`,
    `حجم الشاشة: ${window.screen.width}x${window.screen.height} (DPR: ${window.devicePixelRatio})`,
    `حجم النافذة: ${window.innerWidth}x${window.innerHeight}`,
    `متصل بالإنترنت: ${navigator.onLine ? "نعم" : "لا (Offline)"}`,
    `الوضع: ${window.matchMedia("(display-mode: standalone)").matches ? "مُثبَّت كـ PWA" : "متصفح عادي"}`,
    `الثيم المفضّل للنظام: ${window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light"}`,
  ];

  if (conn) {
    lines.push(
      `نوع الاتصال: ${conn.effectiveType ?? "غير معروف"} (${conn.downlink ?? "?"} Mbps, RTT: ${conn.rtt ?? "?"}ms)`,
    );
  }

  if (nav.deviceMemory) lines.push(`ذاكرة الجهاز التقريبية: ${nav.deviceMemory} GB`);
  if (nav.hardwareConcurrency) lines.push(`أنوية المعالج: ${nav.hardwareConcurrency}`);

  try {
    lines.push(`localStorage متاح: ${!!window.localStorage}`);
    lines.push(`IndexedDB متاح: ${!!window.indexedDB}`);
    lines.push(`Service Worker مسجّل: ${!!navigator.serviceWorker?.controller}`);
    lines.push(`مساحة التخزين المستخدمة: ${await getStorageEstimate()}`);
  } catch {
    // ignore
  }

  // إصدار التطبيق المنشور حالياً (إن وُجد كمتغير بيئة عند البناء)
  const appVersion = (import.meta as any).env?.VITE_APP_VERSION;
  if (appVersion) lines.push(`إصدار التطبيق: ${appVersion}`);

  return lines.join("\n");
}

/**
 * يبني تقرير تشخيصي كامل كنص واحد، جاهز للنسخ.
 * errorInfo: تفاصيل خطأ معيّن إن وُجد (اختياري — التقرير مفيد حتى بدونه)
 */
export async function buildDiagnosticsReport(errorInfo?: {
  message: string;
  stack?: string;
}): Promise<string> {
  const sections = [
    "════ تقرير تشخيص Nova/Synqa ════",
    "",
    "📱 معلومات الجهاز والمتصفح:",
    await getDeviceInfo(),
  ];

  if (errorInfo) {
    sections.push("", "🔴 تفاصيل الخطأ:", errorInfo.message, errorInfo.stack ?? "(بدون stack trace)");
  }

  sections.push(
    "",
    `📋 آخر ${logBuffer.length} رسالة console:`,
    logBuffer.length === 0
      ? "(لا توجد رسائل مسجّلة)"
      : logBuffer.map((l) => `[${l.time}] ${l.level.toUpperCase()}: ${l.args}`).join("\n"),
    "",
    "════════════════════════════════",
  );

  return sections.join("\n");
}

/**
 * ينسخ التقرير إلى الحافظة، يرجع true/false حسب النجاح
 */
export async function copyDiagnosticsToClipboard(errorInfo?: {
  message: string;
  stack?: string;
}): Promise<boolean> {
  const report = await buildDiagnosticsReport(errorInfo);
  try {
    await navigator.clipboard.writeText(report);
    return true;
  } catch {
    // Fallback لبعض متصفحات الموبايل القديمة التي لا تدعم Clipboard API
    try {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
