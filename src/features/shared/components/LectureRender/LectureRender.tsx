import './pageStyles.css';
import '@/features/shared/styles/designTokens.css';

export default function LectureRender(props: { html: string }) {
  return <div dir='rtl' class="lecture-body editor-render" innerHTML={props.html}></div>;
}