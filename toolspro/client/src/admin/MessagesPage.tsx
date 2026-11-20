import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CheckCheck, Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { EmptyState } from "../components/common/EmptyState";
import { InlineError } from "../components/common/InlineError";
import { LoadingIndicator } from "../components/common/LoadingIndicator";
import { CONTACT_RETENTION_DAYS } from "../data/site";
import { getErrorMessage } from "../services/api";
import { adminApi } from "./adminApi";
import { adminQueryDefaults, refreshAdminData, useAdminTitle } from "./hooks";
import { formatDateTime, replyHref } from "./messageUtils";
import type { AdminMessage } from "./types";
import { PageHeading, smallButtonClass } from "./ui";

const PAGE_SIZE = 20;

const tabClass = (active: boolean) =>
  `inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors ${
    active ? "border-primary bg-primary text-white" : "border-line bg-surface text-heading hover:bg-surface-muted"
  }`;

export default function MessagesPage() {
  useAdminTitle("Messages");
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  const unreadOnly = params.get("status") === "unread";

  const messages = useQuery({
    queryKey: ["admin", "messages", "list", { page, unreadOnly }],
    queryFn: () => adminApi.listMessages({ page, pageSize: PAGE_SIZE, unreadOnly }),
    placeholderData: keepPreviousData,
    ...adminQueryDefaults,
  });

  const toggleRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => adminApi.setMessageRead(id, read),
    onSuccess: () => refreshAdminData(queryClient),
  });
  const markAll = useMutation({
    mutationFn: () => adminApi.markAllMessagesRead(),
    onSuccess: () => refreshAdminData(queryClient),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteMessage(id),
    onSuccess: () => refreshAdminData(queryClient),
  });
  const busy = toggleRead.isPending || markAll.isPending || remove.isPending;

  function goToPage(next: number) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next <= 1) copy.delete("page");
        else copy.set("page", String(next));
        return copy;
      },
      { replace: true },
    );
  }

  function setUnreadOnly(value: boolean) {
    setParams(value ? { status: "unread" } : {}, { replace: true });
  }

  // Aakhri page ke saare messages hata diye to pichhle page par wapas aa jao
  const totalPages = messages.data?.totalPages ?? 1;
  useEffect(() => {
    if (messages.data && !messages.isPlaceholderData && page > totalPages) {
      setParams(
        (current) => {
          const copy = new URLSearchParams(current);
          if (totalPages <= 1) copy.delete("page");
          else copy.set("page", String(totalPages));
          return copy;
        },
        { replace: true },
      );
    }
  }, [messages.data, messages.isPlaceholderData, page, totalPages, setParams]);

  function confirmDelete(item: AdminMessage) {
    if (window.confirm(`Delete the message from ${item.name}?\n\nThis cannot be undone.`)) remove.mutate(item.id);
  }

  const unread = messages.data?.unread ?? 0;
  const actionError = toggleRead.error ?? markAll.error ?? remove.error;

  return (
    <>
      <PageHeading
        title="Messages"
        description={`Messages sent from the Contact page. They are deleted automatically after ${CONTACT_RETENTION_DAYS} days.`}
        actions={
          <button type="button" className={`${smallButtonClass} h-11`} disabled={busy || unread === 0} onClick={() => markAll.mutate()}>
            <CheckCheck aria-hidden="true" size={16} /> Mark all as read
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter messages">
        <button type="button" className={tabClass(!unreadOnly)} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>
          All
        </button>
        <button type="button" className={tabClass(unreadOnly)} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
          Unread{messages.data ? ` (${unread})` : ""}
        </button>
      </div>

      {actionError ? (
        <div className="mb-5">
          <InlineError message={getErrorMessage(actionError)} />
        </div>
      ) : null}

      {messages.isPending ? <LoadingIndicator /> : null}
      {messages.isError ? <InlineError message={getErrorMessage(messages.error)} onRetry={() => void messages.refetch()} /> : null}
      {messages.data && messages.data.items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? "No unread messages" : "No messages yet"}
          description={unreadOnly ? "You are all caught up." : "When someone uses the Contact page, their message will show up here."}
        />
      ) : null}

      {messages.data && messages.data.items.length > 0 ? (
        <>
          <p className="mb-2 text-sm">
            {messages.data.total} {messages.data.total === 1 ? "message" : "messages"}
          </p>
          <ul className={`space-y-4 ${messages.isPlaceholderData ? "opacity-60" : ""}`}>
            {messages.data.items.map((item) => (
              <li
                key={item.id}
                data-unread={item.read ? undefined : "true"}
                className={`rounded-xl border border-line bg-surface p-5 ${item.read ? "" : "border-l-4 border-l-primary"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-heading">
                      {item.name}
                      {item.read ? null : <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-primary">New</span>}
                    </p>
                    <p className="break-all text-sm">{item.email}</p>
                  </div>
                  <p className="text-sm">{formatDateTime(item.createdAt)}</p>
                </div>
                <h2 className="mt-3 break-words text-base font-semibold text-heading">{item.subject}</h2>
                <p className="mt-1 whitespace-pre-wrap break-words">{item.message}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a href={replyHref(item.email, item.subject)} className={smallButtonClass}>
                    <Reply aria-hidden="true" size={15} /> Reply by email
                  </a>
                  <button type="button" className={smallButtonClass} disabled={busy} onClick={() => toggleRead.mutate({ id: item.id, read: !item.read })}>
                    {item.read ? <Mail aria-hidden="true" size={15} /> : <MailOpen aria-hidden="true" size={15} />}
                    {item.read ? "Mark as unread" : "Mark as read"}
                  </button>
                  <button
                    type="button"
                    className={`${smallButtonClass} text-danger`}
                    disabled={busy}
                    onClick={() => confirmDelete(item)}
                    aria-label={`Delete message from ${item.name}`}
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {messages.data.totalPages > 1 ? (
            <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3">
              <button type="button" className={smallButtonClass} disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                <ChevronLeft aria-hidden="true" size={16} /> Previous
              </button>
              <p className="text-sm">
                Page {messages.data.page} of {messages.data.totalPages}
              </p>
              <button type="button" className={smallButtonClass} disabled={page >= messages.data.totalPages} onClick={() => goToPage(page + 1)}>
                Next <ChevronRight aria-hidden="true" size={16} />
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </>
  );
}
