import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service", description: "The terms that govern your use of LTR Growth.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="[DATE]">
      <p>These Terms govern your access to and use of LTR Growth, provided by LTRMarketing. By creating an account you agree to these Terms.</p>
      <h2>Accounts</h2>
      <p>You must provide accurate information and keep your credentials secure. You are responsible for activity under your account.</p>
      <h2>Subscriptions and billing</h2>
      <ul>
        <li>Paid plans renew monthly until cancelled. You can cancel at any time from the billing portal; access continues until the end of the paid period.</li>
        <li>AI credits are allocated per billing period and do not roll over unless purchased as additional credits. [Confirm refund policy.]</li>
        <li>We may change prices with advance notice.</li>
      </ul>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use the Service to create misleading advertising, fake reviews, or content that violates advertising platform policies or law.</li>
        <li>Only analyze websites and upload content you are permitted to use.</li>
        <li>Do not attempt to disrupt, reverse engineer or gain unauthorized access to the Service.</li>
      </ul>
      <h2>AI-generated content</h2>
      <p>AI outputs may be inaccurate or incomplete. You are responsible for reviewing outputs before use. The Service does not guarantee any financial, advertising or business results.</p>
      <h2>Your content</h2>
      <p>You retain ownership of content you upload and create. You grant us a limited license to process it to provide the Service.</p>
      <h2>Disclaimers and limitation of liability</h2>
      <p>[To be drafted by counsel.]</p>
      <h2>Termination</h2>
      <p>You may delete your account at any time. We may suspend accounts that violate these Terms.</p>
      <h2>Contact</h2>
      <p>LTRMarketing, [ADDRESS], [EMAIL].</p>
    </LegalPage>
  );
}
