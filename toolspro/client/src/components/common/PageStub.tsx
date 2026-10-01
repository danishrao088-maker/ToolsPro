import type { ReactNode} from "react";
import {Container} from "./Container";

interface PageStubProps {
  title: string;
  children: ReactNode;
}
export function PageStub({ title, children}: PageStubProps) {
    return(
        <Container className= "py-12">
            <h1 className="text-3xl font-bold text-heading">{title}</h1>
            {children ? <div className = "mt-4">{children}</div>: null}
        </Container>
    );
}