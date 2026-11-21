import { useState, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckboxField } from "../components/common/CheckboxField";
import { SelectField } from "../components/common/SelectField";
import { getErrorMessage } from "../services/api";
import { adminApi } from "./adminApi";
import { moveToFront, toggleId } from "./editorUtils";
import { useTerms } from "./hooks";
import type { TermKind } from "./types";
import { Panel, smallButtonClass } from "./ui";

interface TermPickerProps {
  kind: TermKind;
  title: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}

// Post ke liye categories/tags chunna. Naya naam yahin se bhi bana sakte hain.
export function TermPicker({ kind, title, selected, onChange }: TermPickerProps) {
  const singular = kind === "categories" ? "category" : "tag";
  const queryClient = useQueryClient();
  const terms = useTerms(kind);
  const [filter, setFilter] = useState("");
  const [newName, setNewName] = useState("");

  const create = useMutation({
    mutationFn: (name: string) => adminApi.createTerm(kind, { name, slug: "", description: "" }),
    onSuccess: (term) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "terms"] });
      onChange([...selected, term.id]);
      setNewName("");
    },
  });

  const all = terms.data ?? [];
  const needle = filter.trim().toLowerCase();
  const visible = all.filter((term) => needle === "" || term.name.toLowerCase().includes(needle));
  const chosen = selected.map((id) => all.find((term) => term.id === id)).filter((term) => term !== undefined);

  function addNew() {
    const name = newName.trim();
    if (name !== "" && !create.isPending) create.mutate(name);
  }

  function onNewKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault(); // post ka form submit na ho
      addNew();
    }
  }

  return (
    <Panel title={title}>
      {terms.isPending ? <p className="text-sm">Loading...</p> : null}
      {terms.isError ? (
        <p role="alert" className="text-sm text-danger">
          {getErrorMessage(terms.error)}{" "}
          <button type="button" className="font-medium underline" onClick={() => void terms.refetch()}>
            Try again
          </button>
        </p>
      ) : null}

      {all.length > 8 ? (
        <div className="mb-3">
          <label htmlFor={`${kind}-filter`} className="sr-only">
            Filter {kind}
          </label>
          <input
            id={`${kind}-filter`}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Filter ${kind}...`}
            className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-base text-heading placeholder:text-body"
          />
        </div>
      ) : null}

      {all.length > 0 ? (
        <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
          {visible.map((term) => (
            <CheckboxField key={term.id} id={`${kind}-${term.id}`} label={term.name} checked={selected.includes(term.id)} onChange={() => onChange(toggleId(selected, term.id))} />
          ))}
          {visible.length === 0 ? <p className="text-sm">Nothing matches.</p> : null}
        </div>
      ) : null}

      {kind === "categories" && chosen.length > 1 ? (
        <div className="mt-4">
          <SelectField
            id="main-category"
            label="Main category"
            value={selected[0] ?? ""}
            onChange={(id) => onChange(moveToFront(selected, id))}
            options={chosen.map((term) => ({ value: term.id, label: term.name }))}
            hint="Shown first on the post and used for its breadcrumb."
          />
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <label htmlFor={`${kind}-new`} className="sr-only">
          New {singular} name
        </label>
        <input
          id={`${kind}-new`}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={onNewKey}
          placeholder={`New ${singular}...`}
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-base text-heading placeholder:text-body"
        />
        <button type="button" className={smallButtonClass} disabled={create.isPending || newName.trim() === ""} onClick={addNew}>
          Add
        </button>
      </div>
      {create.isError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {getErrorMessage(create.error)}
        </p>
      ) : null}
    </Panel>
  );
}
