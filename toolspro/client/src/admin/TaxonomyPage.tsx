import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { FormField } from "../components/common/FormField";
import { InlineError } from "../components/common/InlineError";
import { LoadingIndicator } from "../components/common/LoadingIndicator";
import { getErrorMessage } from "../services/api";
import { adminApi } from "./adminApi";
import { refreshAdminData, useAdminTitle, useTerms } from "./hooks";
import type { AdminTerm, TermKind, TermPayload } from "./types";
import { PageHeading, Panel, smallButtonClass } from "./ui";

interface TermFormProps {
  idPrefix: string;
  initial: TermPayload;
  submitLabel: string;
  busy: boolean;
  error: unknown;
  onSubmit: (payload: TermPayload) => void;
  onCancel?: () => void;
}

function TermForm({ idPrefix, initial, submitLabel, busy, error, onSubmit, onCancel }: TermFormProps) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy) onSubmit({ name: name.trim(), slug: slug.trim(), description: description.trim() });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <InlineError message={getErrorMessage(error)} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}-name`} label="Name" value={name} onChange={setName} />
        <FormField id={`${idPrefix}-slug`} label="Address (slug)" value={slug} onChange={setSlug} required={false} hint="Leave empty to make it from the name." />
      </div>
      <FormField id={`${idPrefix}-desc`} label="Description" value={description} onChange={setDescription} multiline rows={2} required={false} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || name.trim() === ""}>
          {busy ? "Saving..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export default function TaxonomyPage({ kind }: { kind: TermKind }) {
  const singular = kind === "categories" ? "category" : "tag";
  const plural = kind === "categories" ? "Categories" : "Tags";
  useAdminTitle(plural);

  const queryClient = useQueryClient();
  const terms = useTerms(kind);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [formVersion, setFormVersion] = useState(0);

  const create = useMutation({
    mutationFn: (payload: TermPayload) => adminApi.createTerm(kind, payload),
    onSuccess: async () => {
      setFormVersion((v) => v + 1); // add form saaf
      await refreshAdminData(queryClient);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TermPayload }) => adminApi.updateTerm(kind, id, payload),
    onSuccess: async () => {
      setEditingId(null);
      await refreshAdminData(queryClient);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteTerm(kind, id),
    onSuccess: () => refreshAdminData(queryClient),
  });

  function confirmDelete(term: AdminTerm) {
    const note = term.postCount > 0 ? ` It will be removed from ${term.postCount} ${term.postCount === 1 ? "post" : "posts"} (the posts themselves stay).` : "";
    if (window.confirm(`Delete the ${singular} "${term.name}"?${note}`)) remove.mutate(term.id);
  }

  const needle = filter.trim().toLowerCase();
  const visible = (terms.data ?? []).filter((term) => needle === "" || term.name.toLowerCase().includes(needle) || term.slug.includes(needle));

  return (
    <>
      <PageHeading title={plural} description={kind === "categories" ? "Group posts by topic. The first category of a post is its main one." : "Small labels to connect related posts."} />

      <Panel title={`Add a ${singular}`}>
        <TermForm key={formVersion} idPrefix="new-term" initial={{ name: "", slug: "", description: "" }} submitLabel={`Add ${singular}`} busy={create.isPending} error={create.error} onSubmit={(payload) => create.mutate(payload)} />
      </Panel>

      <div className="mt-8">
        {terms.isPending ? <LoadingIndicator /> : null}
        {terms.isError ? <InlineError message={getErrorMessage(terms.error)} onRetry={() => void terms.refetch()} /> : null}
        {remove.isError ? (
          <div className="mb-4">
            <InlineError message={getErrorMessage(remove.error)} />
          </div>
        ) : null}

        {terms.data && terms.data.length === 0 ? <EmptyState title={`No ${plural.toLowerCase()} yet`} description={`Add your first ${singular} above.`} /> : null}

        {terms.data && terms.data.length > 0 ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm">
                {terms.data.length} {plural.toLowerCase()}
              </p>
              <div>
                <label htmlFor="term-filter" className="sr-only">
                  Filter {plural.toLowerCase()}
                </label>
                <input
                  id="term-filter"
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={`Filter ${plural.toLowerCase()}...`}
                  className="h-10 w-56 rounded-lg border border-line bg-surface px-3 text-base text-heading placeholder:text-body"
                />
              </div>
            </div>
            {visible.length === 0 ? (
              <p>Nothing matches “{filter.trim()}”.</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {visible.map((term) => (
                  <li key={term.id} className="p-4">
                    {editingId === term.id ? (
                      <TermForm
                        idPrefix={`term-${term.id}`}
                        initial={{ name: term.name, slug: term.slug, description: term.description }}
                        submitLabel="Save changes"
                        busy={update.isPending}
                        error={update.error}
                        onSubmit={(payload) => update.mutate({ id: term.id, payload })}
                        onCancel={() => {
                          setEditingId(null);
                          update.reset();
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-heading">{term.name}</p>
                          <p className="text-sm">
                            {term.slug} · {term.postCount} {term.postCount === 1 ? "post" : "posts"}
                          </p>
                          {term.description ? <p className="mt-1 text-sm">{term.description}</p> : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={smallButtonClass}
                            onClick={() => {
                              update.reset();
                              setEditingId(term.id);
                            }}
                          >
                            <Pencil aria-hidden="true" size={15} /> Edit
                          </button>
                          <button type="button" className={`${smallButtonClass} text-danger`} disabled={remove.isPending} onClick={() => confirmDelete(term)} aria-label={`Delete ${term.name}`}>
                            <Trash2 aria-hidden="true" size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
