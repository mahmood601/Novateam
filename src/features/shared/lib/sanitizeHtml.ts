// features/shared/lib/sanitizeHtml.ts
//
// أدوات حقن HTML الآمن. القاعدة العامة التي يطبّقها هذا الملف:
//   • نص عادي داخل قالب HTML          → escapeHtml()   (لا نحتاج DOMPurify)
//   • HTML كامل جاء من قاعدة البيانات   → sanitizeHtml()  (يُطبَّق عند الحقن لا عند التخزين)
//   • سلسلة style مكتوبة يدويًا         → cleanStyleString()
//
// لماذا لا نكتفي بـ escapeHtml دائمًا؟ لأن محتوى المحاضرة HTML حقيقي (عناوين، جداول، صور)
// ولا يمكن تهريبه كله كنص. هنا يأتي DOMPurify: يُبقي الوسوم المألوفة ويحذف الباقي.
import DOMPurify from "dompurify";

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** يهرّب نصًا ليوضع داخل HTML (داخل عنصر أو داخل قيمة خاصية بين علامتي اقتباس). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESC[c]!);
}

// ── style ───────────────────────────────────────────────────────────────────
// المحرر يخزّن تنسيق كل كتلة كسلسلة CSS خام (NovaBlockStyle)، فنحتاج تنظيفها.
// نمنع ما يستطيع طلب موارد خارجية أو تغطية الواجهة، ونُبقي كل ما عدا ذلك
// (padding, flex, background-color, calc(), var()...) كي لا نكسر التنسيق المشروع.
const BAD_VALUE =
  /\b(url|src|image-set|image|cross-fade|element|paint)\s*\(|@import|expression\s*\(|javascript:|-moz-binding|behavior\s*:|\\/i;
const BAD_PROP = new Set(["content", "behavior", "-moz-binding"]);

export function cleanStyleString(css: string): string {
  if (!css) return "";
  const kept: string[] = [];
  for (const raw of css.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) { // التعليقات قد تُستعمل لإخفاء الرموز
    const decl = raw.trim();
    const i = decl.indexOf(":");
    if (i < 1) continue;
    const prop = decl.slice(0, i).trim(); // نُبقي حالة الأحرف: أسماء المتغيرات --Foo حساسة لها
    const val = decl.slice(i + 1).trim();
    const lower = prop.toLowerCase();
    if (BAD_PROP.has(lower) || BAD_VALUE.test(val)) continue;
    // fixed/sticky يخرجان العنصر من مكانه ويغطيان الصفحة (انتحال واجهة)
    if (lower === "position" && /^(fixed|sticky)$/i.test(val)) continue;
    kept.push(`${prop}: ${val}`); // نفس صيغة stringifyStyle في المحرر
  }
  return kept.join("; ");
}

// ── DOMPurify ───────────────────────────────────────────────────────────────
// DOMPurify يحذف أي خاصية فيها "-->" أو "]]>" أو "</style" (حماية من حيل التعليقات)، ولا يسمح
// لأي خطاف بتجاوز ذلك. لكن "-->" هو سهم المخططات الأساسي (A --> B)، فكان سيمحو data-content
// لكل مخطط ويترك فراغًا. الحل: نستثني بالضبط div من نوع diagram/mermaid، في HTML عادي، وبحجم معقول:
// نخبّئ قيمته الأصلية ونعطي DOMPurify نسخة مموّهة لا تثير الفحص، ثم نعيد الأصل بعد انتهائه.
// هذه القيمة لا تُحقن أبدًا كـ HTML: يقرؤها الكود بـ getAttribute ويمرّرها لـ Pele الذي يهرّب النصوص.
const MAX_DIAGRAM_SOURCE = 30_000;
// عناصر تُحلَّل محتوياتها بقواعد مختلفة (نص خام/RCDATA/فضاء أسماء آخر): لا نستثني ما بداخلها أبدًا
const RAW_CONTEXTS =
  "svg, math, title, noscript, template, xmp, textarea, style, script, iframe, noembed, noframes";
const stash = new WeakMap<Element, string>();

function isDiagramSourceAttr(node: Element, name: string, value: string): boolean {
  return (
    name === "data-content" &&
    node.tagName === "DIV" &&
    ["diagram", "mermaid"].includes(node.getAttribute("data-type") ?? "") &&
    !node.closest(RAW_CONTEXTS) &&
    value.length <= MAX_DIAGRAM_SOURCE
  );
}

let hooked = false;
function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("uponSanitizeAttribute", (node: Element, data) => {
    if (isDiagramSourceAttr(node, data.attrName, data.attrValue)) {
      stash.set(node, data.attrValue);
      data.attrValue = data.attrValue.replace(/[<>\]]/g, "_"); // يكفي لتجاوز فحص "-->" و"]]>" و"</style"
    }
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node: Element) => {
    const original = stash.get(node);
    if (original !== undefined) {
      stash.delete(node);
      if (node.hasAttribute("data-content")) node.setAttribute("data-content", original);
    }
    if (node.hasAttribute?.("style")) {
      const cleaned = cleanStyleString(node.getAttribute("style") ?? "");
      if (cleaned) node.setAttribute("style", cleaned);
      else node.removeAttribute("style");
    }
    // الروابط التي تفتح تبويبًا جديدًا تحتاج rel دائمًا
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
}

/**
 * يعقّم HTML قادمًا من مصدر غير موثوق.
 * يحذف: script وأي on*، وروابط javascript:، وiframe/form/style وما شابه.
 * يُبقي: الوسوم العادية وdata-* وclass وstyle (منظّفًا) وtarget على الروابط.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  ensureHooks();
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true },
    ADD_ATTR: ["target"],
    FORBID_TAGS: [
      "style", "form", "input", "button", "textarea", "select", "option",
      "iframe", "frame", "frameset", "object", "embed", "link", "meta", "base",
      "title", "noscript", "template", "xmp", "noembed", "noframes",
    ],
  }) as string;
}
