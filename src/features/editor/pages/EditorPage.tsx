import Editor from "@/features/editor/components/Editor";
import { useParams } from "@solidjs/router";

export default function EditorPage() {
  const params = useParams();
  const subjectId = params.subject;
  const seasonId = params.season;


  return <Editor subjectId={subjectId ?? ""} seasonId={seasonId ?? ""} />;
}
