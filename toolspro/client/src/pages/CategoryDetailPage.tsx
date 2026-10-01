import { useParams } from "react-router-dom";
import { PageStub } from "../components/common/PageStub";

export default function CategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PageStub title="Category">
      <p>Category slug: {slug}</p>
    </PageStub>
  );
}