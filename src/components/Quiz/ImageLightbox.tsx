/**
 * ImageLightbox.tsx
 * ─────────────────
 * عرض الصورة في وسط الشاشة مع blur خلفي
 * الضغط خارجها يغلقها
 */


export default function ImageLightbox(props: {
  src: string;
  onClose: () => void;
}) {
  return (
    <div
      class="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ "background": "rgba(0,0,0,0.6)", "backdrop-filter": "blur(8px)" }}
      onClick={props.onClose}
    >
      <img
        src={props.src}
        alt="صورة السؤال"
        class="max-h-[85dvh] max-w-[92vw] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
