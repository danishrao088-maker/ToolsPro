import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Button } from "../components/common/Button";
import { Container } from "../components/common/Container";
import { FormField } from "../components/common/FormField";
import { InlineError } from "../components/common/InlineError";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  CONTACT_FIELDS,
  LIMITS,
  serverErrorsToFields,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactFields,
} from "../lib/contactValidation";
import { ApiError, getErrorMessage } from "../services/api";
import { sendContactMessage } from "../services/contactService";

type Status = "idle" | "sending" | "success";

const emptyValues: ContactFields = { name: "", email: "", subject: "", message: "" };

function focusFirstInvalid(errors: ContactErrors): void {
  const first = CONTACT_FIELDS.find((field) => errors[field]);
  if (first) document.getElementById(`contact-${first}`)?.focus();
}

export default function ContactPage() {
  usePageMeta("Contact", "Send a question, bug report or suggestion to ToolsPro.");

  const [values, setValues] = useState<ContactFields>(emptyValues);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === "success") successHeading.current?.focus();
  }, [status]);

  const setField = (field: ContactField) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;

    setFormError(null);
    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(found);
      return;
    }

    setStatus("sending");
    try {
      await sendContactMessage({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
        website: honeypot,
      });
      setValues(emptyValues);
      setHoneypot("");
      setStatus("success");
    } catch (err) {
      setStatus("idle"); // user ka likha hua text wese hi rehta hai
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        const fromServer = serverErrorsToFields(err.details);
        setErrors(fromServer);
        if (Object.keys(fromServer).length > 0) {
          focusFirstInvalid(fromServer);
          return;
        }
      }
      setFormError(getErrorMessage(err));
    }
  };

  const sending = status === "sending";

  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Contact" }]} />
      <h1 className="text-3xl font-bold text-heading">Contact</h1>
      <p className="mt-2 max-w-2xl">
        Have a question, a bug report or a suggestion for a tool? Send us a message using the form.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {status === "success" ? (
            <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <CircleCheck aria-hidden="true" size={18} />
                Message sent
              </p>
              <h2
                ref={successHeading}
                tabIndex={-1}
                className="mt-2 text-xl font-bold text-heading focus:outline-none"
              >
                Thank you for your message
              </h2>
              <p className="mt-2">Your message has been received.</p>
              <Button variant="outline" className="mt-5" onClick={() => setStatus("idle")}>
                Send another message
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => void onSubmit(e)}
              noValidate
              className="relative space-y-5 rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6"
            >
              <p className="text-sm">All fields are required.</p>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  id="contact-name"
                  label="Name"
                  value={values.name}
                  onChange={setField("name")}
                  error={errors.name}
                  autoComplete="name"
                />
                <FormField
                  id="contact-email"
                  label="Email"
                  type="email"
                  value={values.email}
                  onChange={setField("email")}
                  error={errors.email}
                  autoComplete="email"
                />
              </div>

              <FormField
                id="contact-subject"
                label="Subject"
                value={values.subject}
                onChange={setField("subject")}
                error={errors.subject}
              />

              <FormField
                id="contact-message"
                label="Message"
                multiline
                value={values.message}
                onChange={setField("message")}
                error={errors.message}
                hint={`${values.message.length.toLocaleString("en-US")} of ${LIMITS.message.toLocaleString("en-US")} characters`}
              />

              {/* Honeypot: insaan ko nazar nahi aata aur Tab se nahi milta. Bots isay bhar dete hain. */}
              <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="contact-website">Website (leave this field empty)</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {formError ? <InlineError message={formError} /> : null}

              <Button type="submit" disabled={sending}>
                {sending ? (
                  <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
                ) : (
                  <Send aria-hidden="true" size={18} />
                )}
                {sending ? "Sending..." : "Send message"}
              </Button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-heading">Tips for a useful message</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>Name the tool and describe what you expected to happen.</li>
              <li>For a bug, say which browser you use and what you saw.</li>
              <li>Use a working email address if you would like a reply.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-heading">Your privacy</h2>
            <p className="mt-2 text-sm">
              Messages are stored for 90 days and then deleted automatically. See our{" "}
              <Link to="/privacy" className="font-medium text-link underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}