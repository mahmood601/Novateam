import '@/features/shared/styles/designTokens.css';

interface Props {
  html: string;
  // Optional: lets a caller (e.g. LectureContent) get the rendered
  // element to run post-injection work (heading ids, image caching)
  // right after the HTML lands, instead of racing Solid's own effect.
  ref?: (el: HTMLDivElement) => void;
}

export default function LectureRender(props: Props) {
  return (
    <div
      dir='rtl'
      innerHTML={props.html}
      ref={props.ref}
    ></div>
  );
}