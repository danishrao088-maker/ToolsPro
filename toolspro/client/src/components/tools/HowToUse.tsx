interface HowToUseProps {
  steps: string[];
  limitations?: string[];
}

export function HowToUse({ steps, limitations }: HowToUseProps) {
  return (
    <section aria-labelledby="how-to-use" className="mt-10">
      <h2 id="how-to-use" className="text-xl font-bold text-heading">
        How to use this tool
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {limitations && limitations.length > 0 ? (
        <>
          <h3 className="mt-6 font-semibold text-heading">Good to know</h3>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}