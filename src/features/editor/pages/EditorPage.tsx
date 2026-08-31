import Editor from "@/features/lectures/components/Editor";
import { useParams } from "@solidjs/router";

export default function EditorPage() {
  const params = useParams();
  const subjectId = params.subject;
  const seasonId = params.season;


  return <Editor subjectId={subjectId ?? ""} seasonId={seasonId ?? ""} />;
}
