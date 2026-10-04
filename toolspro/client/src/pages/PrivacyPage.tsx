import { Link } from "react-router-dom";
import { BulletList, ContentPage, ContentSection, contentLinkClass } from "../components/common/ContentPage";
import { CONTACT_RETENTION_DAYS, LEGAL_LAST_UPDATED } from "../data/site";
import { usePageMeta } from "../hooks/usePageMeta";

// OWNER REVIEW before launch: confirm the retention period, the hosting log details,
// and how deletion requests will be handled. Update this page when email notifications (SMTP),
// analytics, or tools that use our server are added.
export default function PrivacyPage() {
  usePageMeta(
    "Privacy Policy",
    "How ToolsPro handles your information: what stays in your browser, what the contact form stores, and for how long."
  );

  return (
    <ContentPage
      title="Privacy Policy"
      updated={LEGAL_LAST_UPDATED}
      intro="This page explains what happens to your information when you use ToolsPro. You do not need an account to use the site."
    >
      <ContentSection id="summary" heading="In short">
        <BulletList
          items={[
            "ToolsPro has no accounts, logins or registration.",
            "Tools that run in your browser process your input on your own device. It is not sent to our server.",
            `The only information we store on purpose is what you send through the contact form. It is deleted automatically after ${CONTACT_RETENTION_DAYS} days.`,
            "ToolsPro does not currently use analytics, advertising or third-party tracking scripts.",
          ]}
        />
      </ContentSection>

      <ContentSection id="browser-vs-server" heading="Browser tools and server tools">
        <p>Every tool page shows one of two labels:</p>
        <BulletList
          items={[
            "Runs in your browser: what you type, paste or choose is processed on your device. It is not sent to our server, and we cannot see it.",
            "Processed on our server: the information you enter has to be sent to our server to produce the result. The tool page explains what is sent.",
          ]}
        />
        <p>
          Even for tools that run in your browser, your browser still downloads the page and the tool's code from our
          server. That is normal website traffic, described under Server logs below.
        </p>
      </ContentSection>

      <ContentSection id="contact-form" heading="The contact form">
        <p>When you send a message through the contact form, we collect:</p>
        <BulletList items={["Your name", "Your email address", "The subject", "Your message"]} />
        <p>
          We use these only to read and respond to your message. They are stored in our database together with the date
          and time the message was sent. Messages are deleted automatically after {CONTACT_RETENTION_DAYS} days.
        </p>
        <p>To reduce spam:</p>
        <BulletList
          items={[
            "The form contains a hidden field that real visitors never see. Automated programs often fill it in. Its content is not stored.",
            "Our server temporarily keeps your IP address in memory to limit repeated submissions. It is not saved with your message.",
          ]}
        />
        <p>Please do not include passwords, payment details or other sensitive information in your message.</p>
      </ContentSection>

      <ContentSection id="browser-storage" heading="Information stored in your browser">
        <p>
          If you switch between the light and dark theme, ToolsPro remembers your choice using your browser's local
          storage. This stays on your device and is not sent to us. ToolsPro does not currently set cookies of its own.
          You can remove the saved theme at any time by clearing your site data in your browser settings.
        </p>
      </ContentSection>

      <ContentSection id="server-logs" heading="Server logs">
        <p>
          Like most websites, the server and hosting service that deliver ToolsPro may keep standard technical logs of
          requests, such as the IP address, date and time, the page requested and the type of browser. These are used to
          keep the site running and secure. The exact logs and how long they are kept depend on our hosting setup.
        </p>
      </ContentSection>

      <ContentSection id="third-parties" heading="Analytics and third parties">
        <p>
          ToolsPro does not currently use analytics, advertising networks or third-party tracking scripts. The site's
          fonts and code are served from ToolsPro itself. If this changes, we will update this policy.
        </p>
      </ContentSection>

      <ContentSection id="your-choices" heading="Your choices">
        <p>
          If you would like to ask about a message you sent, or ask for it to be removed before the automatic deletion,
          use the{" "}
          <Link to="/contact" className={contentLinkClass}>
            contact form
          </Link>{" "}
          and mention the email address you used.
        </p>
      </ContentSection>

      <ContentSection id="changes" heading="Changes to this policy">
        <p>
          We may update this policy as ToolsPro changes. The date at the top shows when it was last updated. Please
          also see our{" "}
          <Link to="/terms" className={contentLinkClass}>
            Terms of Service
          </Link>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}