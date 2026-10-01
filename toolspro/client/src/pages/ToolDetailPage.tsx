import { useParams } from "react-router-dom";
import { PageStub } from "../components/common/PageStub";

export default function ToolDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PageStub title="Tool">
      <p>Tool slug: {slug}</p>
    </PageStub>
  );
}