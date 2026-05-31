import "./UpdatePanel.css";
/**
 * UpdatePanel.tsx
 * ───────────────
 * درج جانبي يعرض التغييرات المعلّقة مثل GitHub commits
 * مع أزرار تطبيق لكل مادة أو تطبيق الكل
 */

import { For, Show, createSignal } from "solid-js";
import { Transition } from "solid-transition-group";
import {
  updateStore,
  setUpdateStore,
  totalChanges,
  type SubjectUpdate,
  type QuestionChange,
} from "../../stores/updateStore";
import { applyUpdate, applyAllUpdates } from "../../services/questionUpdates";
import toast from "solid-toast";

// ─── Badge (الزر الذي يفتح اللوحة) ───────────────────────────────────────────

export function UpdateBadge() {
  return (
    <Show when={updateStore.pending.length > 0}>
      <button
        onClick={() => setUpdateStore("panelOpen", true)}
        class="update-badge"
        title="يوجد تحديثات للأسئلة"
        aria-label={`${totalChanges()} تغيير متاح`}
      >
        <span class="update-badge__icon">↑</span>
        <span class="update-badge__count">{totalChanges()}</span>
      </button>
    </Show>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function UpdatePanel() {
  return (
    <>
      {/* Overlay */}
      <Show when={updateStore.panelOpen}>
        <div
          class="update-overlay"
          onClick={() => setUpdateStore("panelOpen", false)}
        />
      </Show>

      {/* Drawer */}
      <div
        class="update-drawer"
        classList={{ "update-drawer--open": updateStore.panelOpen }}
        dir="rtl"
      >
        {/* Header */}
        <div class="update-drawer__header">
          <div class="update-drawer__title-row">
            <span class="update-drawer__dot" />
            <h2 class="update-drawer__title">تحديثات الأسئلة</h2>
            <span class="update-drawer__badge">{totalChanges()} تغيير</span>
          </div>

          <div class="update-drawer__actions">
            <Show when={updateStore.pending.length > 1}>
              <button
                class="update-btn update-btn--primary"
                disabled={updateStore.applying}
                onClick={async () => {
                  await applyAllUpdates();
                  toast.success("تم تحديث جميع المواد ✓");
                  if (updateStore.pending.length === 0) {
                    setUpdateStore("panelOpen", false);
                  }
                }}
              >
                {updateStore.applying ? (
                  <span class="update-spinner" />
                ) : (
                  "تحديث الكل"
                )}
              </button>
            </Show>

            <button
              class="update-btn update-btn--ghost"
              onClick={() => setUpdateStore("panelOpen", false)}
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Subjects list */}
        <div class="update-drawer__body">
          <Show
            when={updateStore.pending.length > 0}
            fallback={
              <div class="update-empty">
                <span class="update-empty__icon">✓</span>
                <p>الأسئلة محدّثة</p>
              </div>
            }
          >
            <For each={updateStore.pending}>
              {(sub) => <SubjectCard sub={sub} />}
            </For>
          </Show>
        </div>
      </div>
    </>
  );
}

// ─── SubjectCard ──────────────────────────────────────────────────────────────

function SubjectCard(props: { sub: SubjectUpdate }) {
  const [applying, setApplying] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);

  const added = () => props.sub.changes.filter((c) => c.type === "added").length;
  const modified = () => props.sub.changes.filter((c) => c.type === "modified").length;
  const deleted = () => props.sub.changes.filter((c) => c.type === "deleted").length;

  const handleApply = async () => {
    setApplying(true);
    const ok = await applyUpdate(props.sub.subject);
    setApplying(false);
    if (ok) {
      toast.success(`تم تحديث ${props.sub.subjectName} ✓`);
    } else {
      toast.error("فشل التحديث، حاول مجدداً");
    }
  };

  return (
    <div class="update-card">
      {/* Card header */}
      <div class="update-card__header">
        <div class="update-card__meta">
          <h3 class="update-card__name">{props.sub.subjectName}</h3>
          <div class="update-card__pills">
            <Show when={added() > 0}>
              <span class="update-pill update-pill--added">+{added()} إضافة</span>
            </Show>
            <Show when={modified() > 0}>
              <span class="update-pill update-pill--modified">~{modified()} تعديل</span>
            </Show>
            <Show when={deleted() > 0}>
              <span class="update-pill update-pill--deleted">-{deleted()} حذف</span>
            </Show>
          </div>
        </div>

        <div class="update-card__btns">
          <button
            class="update-btn update-btn--ghost update-btn--sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded()}
          >
            {expanded() ? "إخفاء" : "التفاصيل"}
          </button>

          <button
            class="update-btn update-btn--primary update-btn--sm"
            disabled={applying()}
            onClick={handleApply}
          >
            {applying() ? <span class="update-spinner update-spinner--sm" /> : "تحديث"}
          </button>
        </div>
      </div>

      {/* Change list */}
      <Show when={expanded()}>
        <div class="update-card__changes">
          <For each={props.sub.changes}>
            {(change) => <ChangeRow change={change} />}
          </For>
        </div>
      </Show>
    </div>
  );
}

// ─── ChangeRow ────────────────────────────────────────────────────────────────

function ChangeRow(props: { change: QuestionChange }) {
  const label = () => {
    if (props.change.type === "added") return { text: "+", cls: "added" };
    if (props.change.type === "modified") return { text: "~", cls: "modified" };
    return { text: "-", cls: "deleted" };
  };

  return (
    <div class="update-change">
      <span class={`update-change__sym update-change__sym--${label().cls}`}>
        {label().text}
      </span>
      <p class="update-change__text">{props.change.question}</p>
    </div>
  );
}
