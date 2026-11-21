import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Trash2, Upload } from "lucide-react";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { InlineError } from "../components/common/InlineError";
import { LoadingIndicator } from "../components/common/LoadingIndicator";
import { SelectField } from "../components/common/SelectField";
import { ApiError, getErrorMessage } from "../services/api";
import { adminApi } from "./adminApi";
import { FIELD_LIMITS, SEO_HINTS, checkImageFile, emptyPostForm, formatDate, postToForm, postUrl, slugify } from "./editorUtils";
import { adminQueryDefaults, refreshAdminData, useAdminTitle } from "./hooks";
import { RichTextEditor } from "./RichTextEditor";
import { TermPicker } from "./TermPicker";
import type { AdminPostDetail, PostPayload, PostStatus } from "./types";
import { confirmLeave, setUnsavedChanges } from "./unsaved";
import { Panel, smallButtonClass } from "./ui";

// Editor ke andar se aane wali image ko upload karna (jaanch pehle yahin, phir server par)
async function uploadForEditor(file: File): Promise<string> {
  const problem = checkImageFile(file);
  if (problem) throw new ApiError("VALIDATION_ERROR", problem, 400);
  return (await adminApi.uploadImage(file)).url;
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Your sign-in has expired. Open /admin in a new tab and sign in again, then come back here and press Save. Your changes are still on this page.";
  }
  return getErrorMessage(error);
}

interface PostFormProps {
  initial: PostPayload;
  detail: AdminPostDetail | null;
}

function PostForm({ initial, detail }: PostFormProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const featuredInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<PostPayload>(initial);
  const [saved, setSaved] = useState<PostPayload>(initial);
  const [slugTouched, setSlugTouched] = useState(detail !== null);
  const [savedNotice, setSavedNotice] = useState((location.state as { created?: boolean } | null)?.created === true);
  const [formError, setFormError] = useState("");

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  useEffect(() => {
    setUnsavedChanges(dirty);
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      setUnsavedChanges(false);
    };
  }, [dirty]);

  function update<K extends keyof PostPayload>(key: K, value: PostPayload[K]) {
    setSavedNotice(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onTitle(value: string) {
    setSavedNotice(false);
    setForm((current) => ({ ...current, title: value, slug: slugTouched ? current.slug : slugify(value) }));
  }

  const save = useMutation({
    mutationFn: (payload: PostPayload) => (detail ? adminApi.updatePost(detail.id, payload) : adminApi.createPost(payload)),
    onSuccess: (result) => {
      queryClient.setQueryData(["admin", "post", result.id], result);
      for (const key of ["posts", "stats", "terms"]) void queryClient.invalidateQueries({ queryKey: ["admin", key] });
      if (detail) {
        const next = postToForm(result);
        setForm(next);
        setSaved(next);
        setSavedNotice(true);
      } else {
        navigate(`/admin/posts/${result.id}`, { replace: true, state: { created: true } });
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deletePost(id),
    onSuccess: async () => {
      setUnsavedChanges(false);
      await refreshAdminData(queryClient);
      navigate("/admin/posts", { replace: true });
    },
  });

  const upload = useMutation({
    mutationFn: uploadForEditor,
    onSuccess: (url) => update("featuredImageUrl", url),
  });

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (save.isPending) return;
    if (form.title.trim() === "") {
      setFormError("Please enter a title.");
      return;
    }
    setFormError("");
    save.mutate({ ...form, title: form.title.trim(), slug: form.slug.trim() });
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      submit();
    }
  }

  function onFeaturedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) upload.mutate(file);
  }

  function confirmDelete() {
    if (detail && window.confirm(`Delete "${detail.title}"?\n\nThis cannot be undone.`)) remove.mutate(detail.id);
  }

  const busy = save.isPending || remove.isPending;

  return (
    <form onSubmit={submit} onKeyDown={onKeyDown} noValidate>
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-line bg-page px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Link to="/admin/posts" onClick={(e) => !confirmLeave() && e.preventDefault()} className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline">
          <ArrowLeft aria-hidden="true" size={16} /> Posts
        </Link>
        <h1 className="text-lg font-bold text-heading">{detail ? "Edit post" : "New post"}</h1>
        <div className="ml-auto flex items-center gap-3">
          {dirty ? (
            <span className="text-sm font-medium text-warning">Unsaved changes</span>
          ) : savedNotice ? (
            <span role="status" className="text-sm font-medium text-success">
              Saved
            </span>
          ) : null}
          <Button type="submit" disabled={busy}>
            {save.isPending ? "Saving..." : detail ? "Save changes" : "Create post"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {formError ? <InlineError message={formError} /> : null}
          {save.isError ? <InlineError message={saveErrorMessage(save.error)} /> : null}
          {remove.isError ? <InlineError message={getErrorMessage(remove.error)} /> : null}

          <FormField id="post-title" label="Title" value={form.title} onChange={onTitle} hint={`${form.title.length} / ${FIELD_LIMITS.title} characters`} />
          <RichTextEditor value={form.contentHtml} onChange={(html) => update("contentHtml", html)} onUploadImage={uploadForEditor} />
          <FormField
            id="post-excerpt"
            label="Short summary (excerpt)"
            value={form.excerpt}
            onChange={(value) => update("excerpt", value)}
            multiline
            rows={3}
            required={false}
            hint={`${form.excerpt.length} / ${FIELD_LIMITS.excerpt} characters. Shown on blog lists and in search results.`}
          />
        </div>

        <aside className="space-y-6">
          <Panel title="Publish">
            <SelectField
              id="post-status"
              label="Status"
              value={form.status}
              onChange={(value: PostStatus) => update("status", value)}
              options={[
                { value: "draft", label: "Draft (hidden)" },
                { value: "published", label: "Published (live)" },
              ]}
              hint={
                detail?.publishedAt
                  ? `First published ${formatDate(detail.publishedAt)}.`
                  : form.status === "published"
                    ? "This post goes live on the blog when you save."
                    : "Drafts are not visible on the blog."
              }
            />
            {detail ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {detail.status === "published" ? (
                  <a href={postUrl(detail.slug)} target="_blank" rel="noreferrer" className={smallButtonClass}>
                    <ExternalLink aria-hidden="true" size={15} /> View post
                  </a>
                ) : null}
                <button type="button" className={`${smallButtonClass} text-danger`} disabled={busy} onClick={confirmDelete}>
                  <Trash2 aria-hidden="true" size={15} /> Delete
                </button>
              </div>
            ) : null}
            {detail ? <p className="mt-3 text-sm">Last updated {formatDate(detail.updatedAt)}.</p> : null}
          </Panel>

          <TermPicker kind="categories" title="Categories" selected={form.categoryIds} onChange={(ids) => update("categoryIds", ids)} />
          <TermPicker kind="tags" title="Tags" selected={form.tagIds} onChange={(ids) => update("tagIds", ids)} />

          <Panel title="Featured image">
            {form.featuredImageUrl ? <img src={form.featuredImageUrl} alt="" className="mb-3 aspect-video w-full rounded-lg bg-surface-muted object-cover" /> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={smallButtonClass} disabled={upload.isPending} onClick={() => featuredInput.current?.click()}>
                <Upload aria-hidden="true" size={15} /> {upload.isPending ? "Uploading..." : "Upload picture"}
              </button>
              {form.featuredImageUrl ? (
                <button type="button" className={smallButtonClass} onClick={() => update("featuredImageUrl", "")}>
                  Remove
                </button>
              ) : null}
            </div>
            <input ref={featuredInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFeaturedFile} />
            {upload.isError ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {getErrorMessage(upload.error)}
              </p>
            ) : null}
            <div className="mt-4 space-y-4">
              <FormField
                id="post-image-url"
                label="Image address"
                value={form.featuredImageUrl}
                onChange={(value) => update("featuredImageUrl", value)}
                required={false}
                hint="Upload a picture above, or paste an https:// address."
              />
              <FormField
                id="post-image-alt"
                label="Image description (alt text)"
                value={form.featuredImageAlt}
                onChange={(value) => update("featuredImageAlt", value)}
                required={false}
                hint="Describe the picture in a few words."
              />
            </div>
          </Panel>

          <Panel title="Address and search results">
            <div className="space-y-4">
              <FormField
                id="post-slug"
                label="Address (slug)"
                value={form.slug}
                onChange={(value) => {
                  setSlugTouched(true);
                  update("slug", value.toLowerCase().replace(/\s+/g, "-"));
                }}
                required={false}
                hint={detail ? `Live address: /${form.slug || "..."}/ . Changing it breaks links that point to the old address.` : `Address: /${form.slug || "..."}/`}
              />
              <FormField
                id="post-meta-title"
                label="SEO title"
                value={form.metaTitle}
                onChange={(value) => update("metaTitle", value)}
                required={false}
                hint={`${form.metaTitle.length} characters. Google usually shows about ${SEO_HINTS.title}. Empty uses the post title.`}
              />
              <FormField
                id="post-meta-description"
                label="SEO description"
                value={form.metaDescription}
                onChange={(value) => update("metaDescription", value)}
                multiline
                rows={3}
                required={false}
                hint={`${form.metaDescription.length} characters. Google usually shows about ${SEO_HINTS.description}. Empty uses the summary.`}
              />
            </div>
          </Panel>
        </aside>
      </div>
    </form>
  );
}

export default function PostEditorPage() {
  const { id } = useParams();
  useAdminTitle(id ? "Edit post" : "New post");

  // gcTime 0: editor band hone par copy nahi rakhte, taake dobara kholne par hamesha taza post aaye
  const post = useQuery({
    queryKey: ["admin", "post", id],
    queryFn: () => adminApi.getPost(id ?? ""),
    enabled: id !== undefined,
    staleTime: Infinity,
    gcTime: 0,
    ...adminQueryDefaults,
  });

  if (id === undefined) return <PostForm key="new" initial={emptyPostForm()} detail={null} />;
  if (post.isPending) return <LoadingIndicator label="Loading post..." />;
  if (post.isError) {
    return (
      <div className="space-y-4">
        <InlineError message={getErrorMessage(post.error)} onRetry={() => void post.refetch()} />
        <Link to="/admin/posts" className="font-medium text-link hover:underline">
          Back to posts
        </Link>
      </div>
    );
  }
  return <PostForm key={post.data.id} initial={postToForm(post.data)} detail={post.data} />;
}
