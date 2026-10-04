import { Link } from "react-router-dom";
import { BulletList, ContentPage, ContentSection, contentLinkClass } from "../components/common/ContentPage";
import { LEGAL_LAST_UPDATED } from "../data/site";
import { usePageMeta } from "../hooks/usePageMeta";

// OWNER REVIEW before launch: have this text reviewed by a qualified legal professional.
// It is intentionally plain and does not name a governing law or jurisdiction.
export default function TermsPage() {
  usePageMeta("Terms of Service", "The terms for using ToolsPro, including acceptable use and how to treat tool results.");

  return (
    <ContentPage
      title="Terms of Service"
      updated={LEGAL_LAST_UPDATED}
      intro="These terms explain the rules for using ToolsPro. Please read them before you use the site."
    >
      <ContentSection id="using-toolspro" heading="Using ToolsPro">
        <p>By using ToolsPro, you agree to these terms. If you do not agree, please do not use the site.</p>
      </ContentSection>

      <ContentSection id="what-we-provide" heading="What ToolsPro provides">
        <p>
          ToolsPro offers free online tools. We may add, change, limit or remove tools or features at any time, and the
          site may sometimes be unavailable.
        </p>
      </ContentSection>

      <ContentSection id="acceptable-use" heading="Acceptable use">
        <p>When you use ToolsPro, you agree not to:</p>
        <BulletList
          items={[
            "Break the law, or harm, harass or deceive other people.",
            "Process content that you have no right to use.",
            "Try to overload or disrupt the site, gain unauthorised access to it, or get around its limits.",
            "Use automated scripts to send large numbers of requests or contact form messages.",
            "Send spam, malicious code or abusive messages through the contact form.",
          ]}
        />
        <p>We may limit or block access if we need to protect the site or other people.</p>
      </ContentSection>

      <ContentSection id="review-results" heading="Review your results">
        <p>
          Tools produce results automatically from what you enter. Results may contain mistakes or may not suit your
          situation. Please check them before you rely on them, especially for legal, financial, medical, academic or
          official purposes. ToolsPro does not provide professional advice. Keep a copy of any important data before you
          convert or change it.
        </p>
      </ContentSection>

      <ContentSection id="your-content" heading="Your content">
        <p>
          You keep ownership of anything you enter into a tool. For tools that run in your browser, your input stays on
          your device, as described in our{" "}
          <Link to="/privacy" className={contentLinkClass}>
            Privacy Policy
          </Link>
          . If you send us a message through the contact form, you allow us to read it and use it to respond to you and
          to improve ToolsPro. Only send content that you are allowed to share.
        </p>
      </ContentSection>

      <ContentSection id="no-warranty" heading="No warranty and limits of liability">
        <p>
          ToolsPro is provided "as is" and "as available", without promises of any kind, including that tools will be
          accurate, error-free or always available. To the extent the law allows, ToolsPro and its owner are not liable
          for any loss or damage that results from using, or not being able to use, the site or its results. Nothing in
          these terms limits any right you have that the law does not allow to be limited.
        </p>
      </ContentSection>

      <ContentSection id="changes" heading="Changes to these terms">
        <p>
          We may update these terms. The date at the top shows when they were last changed. If you keep using ToolsPro
          after a change, you accept the updated terms.
        </p>
      </ContentSection>

      <ContentSection id="contact" heading="Contact">
        <p>
          If you have a question about these terms, please use the{" "}
          <Link to="/contact" className={contentLinkClass}>
            contact form
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}