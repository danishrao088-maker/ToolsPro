import type { ReactNode} from "react";
import {Container} from "./Container";
import { usePageMeta } from "../../hooks/usePageMeta";

interface PageStubProps {
  title: string;
  children?: ReactNode;
}
export function PageStub({ title, children}: PageStubProps) {
    usePageMeta(title, "Free online tools from ToolsPro.");
    return(
        <Container className= "py-12">
            <h1 className="text-3xl font-bold text-heading">{title}</h1>
            {children ? <div className = "mt-4">{children}</div>: null}
        </Container>
    );
}