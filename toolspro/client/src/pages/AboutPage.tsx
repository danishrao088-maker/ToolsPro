import { Link } from "react-router-dom";
import { BulletList, ContentPage, ContentSection, contentLinkClass } from "../components/common/ContentPage";
import { usePageMeta } from "../hooks/usePageMeta";

export default function AboutPage() {
  usePageMeta("About ToolsPro", "ToolsPro offers simple free online tools that work without an account.");

  return (
    <ContentPage
      title="About ToolsPro"
      intro="ToolsPro is a collection of simple, free online tools for everyday tasks. There is no registration and there are no hidden charges."
    >
      <ContentSection id="mission" heading="Mission">
        <p>
          Many everyday jobs, such as converting text, formatting data or working out a date, should not need an account,
          an installation or a payment. ToolsPro aims to make these jobs quick and clear, so you can get a result and
          get on with your day.
        </p>
      </ContentSection>

      <ContentSection id="how-it-works" heading="How the platform works">
        <BulletList
          items={[
            "Choose a tool from the home page, from a category, or by searching.",
            "Enter your input, then use the tool's buttons to get a result.",
            "Copy the result or download it, depending on the tool.",
            "Tools are added one at a time. A tool appears on the site only after it has been built and tested.",
          ]}
        />
        <p>
          Each tool page says whether the tool runs in your browser or on our server, so you always know where your
          input is processed.
        </p>
      </ContentSection>

      <ContentSection id="accessible-tools" heading="Accessible tools">
        <p>We design ToolsPro to be comfortable to use for as many people as possible. That includes:</p>
        <BulletList
          items={[
            "Pages that work on phones, tablets and computers.",
            "Full keyboard use, with a visible outline on the item you have selected.",
            "Clear labels and error messages that do not rely on colour alone.",
            "A light and a dark theme, which you can switch at any time.",
          ]}
        />
        <p>
          If something is hard to use, please{" "}
          <Link to="/contact" className={contentLinkClass}>
            tell us
          </Link>{" "}
          and we will look into it.
        </p>
      </ContentSection>

      <ContentSection id="privacy-approach" heading="Privacy approach">
        <p>
          Whenever possible, tools process what you enter inside your own browser, so it never has to be sent to us.
          The only information we store is what you choose to send through the contact form. You can read the details in
          our{" "}
          <Link to="/privacy" className={contentLinkClass}>
            Privacy Policy
          </Link>{" "}
          and the{" "}
          <Link to="/terms" className={contentLinkClass}>
            Terms of Service
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}