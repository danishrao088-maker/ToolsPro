import { Suspense, lazy, useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InlineError } from "../components/common/InlineError";
import { LoadingIndicator } from "../components/common/LoadingIndicator";
import { ApiError, getErrorMessage } from "../services/api";
import { adminApi } from "./adminApi";
import { AdminLayout } from "./AdminLayout";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
import PostsPage from "./PostsPage";
import TaxonomyPage from "./TaxonomyPage";
import { ME_KEY, adminQueryDefaults, fetchSession, useAdminTitle, useNoIndex } from "./hooks";

// Editor (TipTap) bhari library hai, isliye sirf tab load hota hai jab post kholi jaye
const PostEditorPage = lazy(() => import("./PostEditorPage"));

function AdminNotFound() {
  useAdminTitle("Not found");
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-heading">Page not found</h1>
      <p className="mt-1">
        <Link to="/admin" className="font-medium text-link hover:underline">
          Back to the dashboard
        </Link>
      </p>
    </div>
  );
}

export default function AdminApp() {
  useNoIndex();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ME_KEY, queryFn: fetchSession, staleTime: Infinity, ...adminQueryDefaults });

  // Session khatam ho jaye (7 din baad) to koi bhi admin sawal 401 dega: tab login screen dikhao
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (
          event.type === "updated" &&
          event.action.type === "error" &&
          event.action.error instanceof ApiError &&
          event.action.error.status === 401 &&
          event.query.queryKey[0] === "admin" &&
          event.query.queryKey[1] !== "me"
        ) {
          queryClient.setQueryData(ME_KEY, null);
        }
      }),
    [queryClient],
  );

  const signOut = useMutation({
    mutationFn: adminApi.logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ["admin"], predicate: (query) => query.queryKey[1] !== "me" });
      queryClient.setQueryData(ME_KEY, null);
    },
  });

  if (session.isPending) return <LoadingIndicator label="Checking your session..." />;
  if (session.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <InlineError message={getErrorMessage(session.error)} onRetry={() => void session.refetch()} />
      </div>
    );
  }
  if (session.data === null) {
    return <LoginPage onSignedIn={(email) => queryClient.setQueryData(ME_KEY, { email })} />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout email={session.data.email} signingOut={signOut.isPending} onSignOut={() => signOut.mutate()} />}>
        <Route index element={<DashboardPage />} />
        <Route path="posts" element={<PostsPage />} />
        <Route
          path="posts/new"
          element={
            <Suspense fallback={<LoadingIndicator label="Loading editor..." />}>
              <PostEditorPage />
            </Suspense>
          }
        />
        <Route
          path="posts/:id"
          element={
            <Suspense fallback={<LoadingIndicator label="Loading editor..." />}>
              <PostEditorPage />
            </Suspense>
          }
        />
        <Route path="categories" element={<TaxonomyPage key="categories" kind="categories" />} />
        <Route path="tags" element={<TaxonomyPage key="tags" kind="tags" />} />
        <Route path="*" element={<AdminNotFound />} />
      </Route>
    </Routes>
  );
}
