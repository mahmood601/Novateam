import { useParams } from "@solidjs/router";
import TiptapReviewEditor from "../tiptap/TiptapReviewEditor";

export default function EditorPage() {
  const params = useParams();
  const subjectId = params.subject;
  const seasonId = params.season;


  return <TiptapReviewEditor subjectId={subjectId ?? ""} seasonId={seasonId ?? ""} />;
}
