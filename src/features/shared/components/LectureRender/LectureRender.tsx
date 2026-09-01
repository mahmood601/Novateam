import './pageStyles.css';

export default function LectureRender(props: { html: string }) {
  return <div dir='rtl' class="editor-render" innerHTML={props.html}></div>;
}