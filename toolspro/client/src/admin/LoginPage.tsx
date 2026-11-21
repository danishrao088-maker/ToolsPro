import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { InlineError } from "../components/common/InlineError";
import { getErrorMessage } from "../services/api";
import { SITE_NAME } from "../data/site";
import { adminApi } from "./adminApi";
import { useAdminTitle } from "./hooks";

export default function LoginPage({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  useAdminTitle("Sign in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => adminApi.login(email.trim(), password),
    onSuccess: (data) => onSignedIn(data.email),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!login.isPending) login.mutate();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-xl font-bold text-heading">{SITE_NAME} Admin</h1>
          <p className="mt-1 text-sm">Sign in to manage blog posts.</p>
        </div>
        {login.isError ? <InlineError message={getErrorMessage(login.error)} /> : null}
        <FormField id="admin-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="username" />
        <FormField id="admin-password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <Button type="submit" className="w-full" disabled={login.isPending || email.trim() === "" || password === ""}>
          {login.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
