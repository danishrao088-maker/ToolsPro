import { useEffect, useMemo, useState } from "react";
import { svgToDataUrl } from "../../lib/image/dataUrl";
import { downloadBlob } from "../../lib/image/downloadBlob";
import {
  EMPTY_EDUCATION,
  EMPTY_EXPERIENCE,
  EMPTY_LINK,
  EMPTY_PROJECT,
  EMPTY_RESUME,
  RESUME_COLORS,
  RESUME_FONTS,
  RESUME_LIMITS,
  RESUME_PAPERS,
  layoutResume,
  pageToSvg,
  type EducationEntry,
  type ExperienceEntry,
  type ProjectEntry,
  type ResumeData,
  type ResumeFont,
  type ResumeLink,
  type ResumeMeasure,
  type ResumePaper,
} from "../../lib/resume/resumeLayout";
import { buildResumePdf, getResumeMeasure } from "../../lib/resume/resumePdf";

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-body";
const label = "block text-sm font-medium text-heading";
const hint = "mt-1 block text-xs font-normal text-body";
const small = "rounded-md border border-line px-3 py-1 text-sm text-heading disabled:opacity-40";

export default function ResumeBuilderTool() {
  const [data, setData] = useState<ResumeData>({
    ...EMPTY_RESUME,
    links: [{ ...EMPTY_LINK }],
    projects: [{ ...EMPTY_PROJECT }],
    education: [{ ...EMPTY_EDUCATION }],
  });
  const [touched, setTouched] = useState(false);
  const [measureFor, setMeasureFor] = useState<{ font: ResumeFont; measure: ResumeMeasure } | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Text ki chaurai naapne wala function font ke hisaab se tayyar hota hai (ek baar)
  useEffect(() => {
    let active = true;
    void getResumeMeasure(data.font).then((measure) => {
      if (active) setMeasureFor({ font: data.font, measure });
    });
    return () => {
      active = false;
    };
  }, [data.font]);

  const measure = measureFor && measureFor.font === data.font ? measureFor.measure : null;
  const layout = useMemo(() => (measure ? layoutResume(data, measure) : null), [data, measure]);
  const previews = useMemo(
    () => (layout && layout.ok ? Array.from({ length: layout.pages }, (_, i) => svgToDataUrl(pageToSvg(layout, i, data.font))) : []),
    [layout, data.font]
  );

  function update<K extends keyof ResumeData>(key: K, value: ResumeData[K]) {
    setTouched(true);
    setData((current) => ({ ...current, [key]: value }));
  }

  function updateLink(index: number, change: Partial<ResumeLink>) {
    update("links", data.links.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  function updateJob(index: number, change: Partial<ExperienceEntry>) {
    update("experience", data.experience.map((job, i) => (i === index ? { ...job, ...change } : job)));
  }

  function updateProject(index: number, change: Partial<ProjectEntry>) {
    update("projects", data.projects.map((project, i) => (i === index ? { ...project, ...change } : project)));
  }

  function updateSchool(index: number, change: Partial<EducationEntry>) {
    update("education", data.education.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  async function downloadPdf() {
    if (!layout || !layout.ok) return;
    setBusy(true);
    setDownloadError("");
    try {
      const bytes = await buildResumePdf(layout, data.font, `${data.name.trim()} - Resume`);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "resume.pdf");
    } catch {
      setDownloadError("The PDF could not be created. Please check the text and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <p className="rounded-md border border-line bg-surface-muted p-3 text-sm text-body">
          Your details stay in your browser and are not saved anywhere. If you close this page, they are gone, so download your PDF first. The PDF supports English (Latin) letters only.
        </p>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">About you</legend>
          <label className={label}>
            Full name
            <input className={`${field} mt-1`} value={data.name} maxLength={RESUME_LIMITS.field} onChange={(e) => update("name", e.target.value)} autoComplete="name" />
          </label>
          <label className={label}>
            Job title (optional)
            <input className={`${field} mt-1`} value={data.title} maxLength={RESUME_LIMITS.field} onChange={(e) => update("title", e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={label}>
              Email
              <input type="email" className={`${field} mt-1`} value={data.email} maxLength={RESUME_LIMITS.field} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
            </label>
            <label className={label}>
              Phone
              <input type="tel" className={`${field} mt-1`} value={data.phone} maxLength={RESUME_LIMITS.field} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" />
            </label>
            <label className={label}>
              City, country
              <input className={`${field} mt-1`} value={data.location} maxLength={RESUME_LIMITS.field} onChange={(e) => update("location", e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Links</legend>
          <p className="text-xs text-body">The resume shows only the name (for example LinkedIn). When someone clicks the name in the PDF, the web address opens. Leave the name empty and it is filled in for well-known sites such as LinkedIn and GitHub.</p>
          {data.links.map((item, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <label className={label}>
                  Name shown
                  <input className={`${field} mt-1`} value={item.label} maxLength={RESUME_LIMITS.label} onChange={(e) => updateLink(index, { label: e.target.value })} placeholder="LinkedIn" />
                </label>
                <label className={label}>
                  Web address
                  <input type="url" className={`${field} mt-1`} value={item.url} maxLength={RESUME_LIMITS.url} onChange={(e) => updateLink(index, { url: e.target.value })} placeholder="https://www.linkedin.com/in/yourname" />
                </label>
              </div>
              <button type="button" className={small} onClick={() => update("links", data.links.filter((_, i) => i !== index))}>
                Remove this link
              </button>
            </div>
          ))}
          <button type="button" className={small} disabled={data.links.length >= RESUME_LIMITS.links} onClick={() => update("links", [...data.links, { ...EMPTY_LINK }])}>
            Add a link
          </button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Summary</legend>
          <label className={label}>
            Summary (optional, one point per line)
            <textarea className={`${field} mt-1 min-h-28`} value={data.summary} maxLength={RESUME_LIMITS.summary} onChange={(e) => update("summary", e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Technical skills</legend>
          <label className={label}>
            Skills (one group per line)
            <textarea
              className={`${field} mt-1 min-h-28`}
              value={data.skills}
              maxLength={RESUME_LIMITS.skills}
              onChange={(e) => update("skills", e.target.value)}
              placeholder={"Frontend: HTML5, CSS3, React.js\nBackend: Node.js, Express.js\nDatabases: MongoDB, PostgreSQL"}
            />
            <span className={hint}>Write a group name, a colon, then the skills. The group name is shown in bold.</span>
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Projects</legend>
          {data.projects.map((project, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-line p-3">
              <label className={label}>
                Project name
                <input className={`${field} mt-1`} value={project.name} maxLength={RESUME_LIMITS.field} onChange={(e) => updateProject(index, { name: e.target.value })} />
              </label>
              <label className={label}>
                Technologies
                <input className={`${field} mt-1`} value={project.tech} maxLength={RESUME_LIMITS.bullets} onChange={(e) => updateProject(index, { tech: e.target.value })} placeholder="React, Node.js, MongoDB" />
              </label>
              <label className={label}>
                Description (one point per line)
                <textarea className={`${field} mt-1 min-h-24`} value={project.bullets} maxLength={RESUME_LIMITS.bullets} onChange={(e) => updateProject(index, { bullets: e.target.value })} />
              </label>
              <button type="button" className={small} onClick={() => update("projects", data.projects.filter((_, i) => i !== index))}>
                Remove this project
              </button>
            </div>
          ))}
          <button type="button" className={small} disabled={data.projects.length >= RESUME_LIMITS.projects} onClick={() => update("projects", [...data.projects, { ...EMPTY_PROJECT }])}>
            Add a project
          </button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Work experience (optional)</legend>
          {data.experience.map((job, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  Job title
                  <input className={`${field} mt-1`} value={job.role} maxLength={RESUME_LIMITS.field} onChange={(e) => updateJob(index, { role: e.target.value })} />
                </label>
                <label className={label}>
                  Company
                  <input className={`${field} mt-1`} value={job.company} maxLength={RESUME_LIMITS.field} onChange={(e) => updateJob(index, { company: e.target.value })} />
                </label>
              </div>
              <label className={label}>
                Dates
                <input className={`${field} mt-1`} value={job.dates} maxLength={RESUME_LIMITS.field} onChange={(e) => updateJob(index, { dates: e.target.value })} placeholder="Jan 2021 - Present" />
              </label>
              <label className={label}>
                What you did (one point per line)
                <textarea className={`${field} mt-1 min-h-24`} value={job.bullets} maxLength={RESUME_LIMITS.bullets} onChange={(e) => updateJob(index, { bullets: e.target.value })} />
              </label>
              <button type="button" className={small} onClick={() => update("experience", data.experience.filter((_, i) => i !== index))}>
                Remove this job
              </button>
            </div>
          ))}
          <button type="button" className={small} disabled={data.experience.length >= RESUME_LIMITS.experience} onClick={() => update("experience", [...data.experience, { ...EMPTY_EXPERIENCE }])}>
            Add a job
          </button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Education</legend>
          {data.education.map((item, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  Degree or course
                  <input className={`${field} mt-1`} value={item.degree} maxLength={RESUME_LIMITS.field} onChange={(e) => updateSchool(index, { degree: e.target.value })} />
                </label>
                <label className={label}>
                  School or university
                  <input className={`${field} mt-1`} value={item.school} maxLength={RESUME_LIMITS.field} onChange={(e) => updateSchool(index, { school: e.target.value })} />
                </label>
              </div>
              <label className={label}>
                Dates (optional)
                <input className={`${field} mt-1`} value={item.dates} maxLength={RESUME_LIMITS.field} onChange={(e) => updateSchool(index, { dates: e.target.value })} />
              </label>
              <label className={label}>
                Note (optional)
                <input className={`${field} mt-1`} value={item.note} maxLength={RESUME_LIMITS.field} onChange={(e) => updateSchool(index, { note: e.target.value })} />
              </label>
              <button type="button" className={small} onClick={() => update("education", data.education.filter((_, i) => i !== index))}>
                Remove this entry
              </button>
            </div>
          ))}
          <button type="button" className={small} disabled={data.education.length >= RESUME_LIMITS.education} onClick={() => update("education", [...data.education, { ...EMPTY_EDUCATION }])}>
            Add education
          </button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Strengths (optional)</legend>
          <label className={label}>
            Strengths (separate with commas)
            <textarea className={`${field} mt-1 min-h-16`} value={data.strengths} maxLength={RESUME_LIMITS.strengths} onChange={(e) => update("strengths", e.target.value)} placeholder="Problem Solving, Team Collaboration" />
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-base font-semibold text-heading">Look</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Paper
              <select className={`${field} mt-1`} value={data.paper} onChange={(e) => update("paper", e.target.value as ResumePaper)}>
                {RESUME_PAPERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Letter style
              <select className={`${field} mt-1`} value={data.font} onChange={(e) => update("font", e.target.value as ResumeFont)}>
                {RESUME_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {RESUME_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use colour ${color}`}
                aria-pressed={data.accent === color}
                onClick={() => update("accent", color)}
                style={{ backgroundColor: color }}
                className={`h-8 w-8 rounded-full border-2 ${data.accent === color ? "border-heading" : "border-line"}`}
              />
            ))}
            <input type="color" aria-label="Choose another colour" className="h-8 w-12 rounded-md border border-line bg-surface" value={data.accent} onChange={(e) => update("accent", e.target.value)} />
          </div>
          <p className="text-xs text-body">The colour is used for your name and the section headings.</p>
        </fieldset>
      </div>

      <div className="space-y-4">
        {!layout && <p className="text-body">Getting ready…</p>}
        {layout && !layout.ok && (
          <p className={touched ? "text-danger" : "text-body"} role={touched ? "alert" : undefined}>
            {layout.error}
          </p>
        )}
        {layout?.ok && (
          <>
            <div className="space-y-3 rounded-lg border border-line bg-surface-muted p-3">
              {previews.map((url, index) => (
                <img key={index} src={url} alt={`Resume preview, page ${index + 1}`} className="w-full border border-line bg-white shadow-sm" />
              ))}
            </div>
            <p className="text-sm text-body">
              {layout.pages} {layout.pages === 1 ? "page" : "pages"}. The preview is very close to the PDF, but small differences are possible. Links cannot be clicked in the preview, only in the PDF.
            </p>
            <button type="button" onClick={() => void downloadPdf()} disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-white disabled:opacity-50">
              {busy ? "Creating…" : "Download PDF"}
            </button>
            {downloadError && <p role="alert" className="text-danger">{downloadError}</p>}
            <p className="text-sm text-body">The PDF contains real text, so it can be selected, copied and searched. The link names are clickable.</p>
          </>
        )}
      </div>
    </div>
  );
}