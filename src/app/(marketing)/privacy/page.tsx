import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "How LTR Growth collects, uses and protects your information.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="[DATE]">
      <p>This Privacy Policy explains how LTRMarketing (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and shares information when you use LTR Growth (the &ldquo;Service&rdquo;).</p>
      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account information:</strong> name, email address and authentication details.</li>
        <li><strong>Business information:</strong> business profiles, brand kits, uploaded files and content you create in the Service.</li>
        <li><strong>Website data:</strong> publicly accessible information retrieved from websites you ask us to analyze.</li>
        <li><strong>Billing information:</strong> processed by our payment provider, Stripe. We do not store full card numbers.</li>
        <li><strong>Usage information:</strong> features used, AI credit consumption, device and log data.</li>
        <li><strong>Consultation requests:</strong> contact and business details you submit when requesting agency services.</li>
      </ul>
      <h2>How we use information</h2>
      <ul>
        <li>To provide, personalize and secure the Service, including generating AI outputs using your business context.</li>
        <li>To process payments and manage subscriptions.</li>
        <li>To respond to consultation and support requests.</li>
        <li>To send marketing communications only where you have consented; you can withdraw consent at any time.</li>
      </ul>
      <h2>AI processing</h2>
      <p>Content you submit to AI tools, together with relevant business profile information, is sent to our AI provider(s) to generate results. [Describe provider data-retention terms and whether data is used for training.]</p>
      <h2>Sharing</h2>
      <p>We share information with service providers that help us operate the Service (for example hosting, database, AI, payments and email), under contracts that restrict their use of it. We do not sell personal information. [Add jurisdiction-specific disclosures.]</p>
      <h2>Data retention and deletion</h2>
      <p>You can export your data and delete your account from Settings. Deleting your account permanently removes your workspace data, subject to records we must keep for legal or accounting purposes.</p>
      <h2>Security</h2>
      <p>We use access controls, encryption in transit, row-level database security and private storage with time-limited signed links to protect your information.</p>
      <h2>Your rights</h2>
      <p>Depending on where you live, you may have rights to access, correct, delete or port your information and to object to certain processing. Contact us at [PRIVACY EMAIL].</p>
      <h2>Contact</h2>
      <p>LTRMarketing, [ADDRESS], [EMAIL].</p>
    </LegalPage>
  );
}
