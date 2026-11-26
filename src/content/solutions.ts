/**
 * SEO landing pages. Copy is descriptive of product capabilities only — no
 * customer counts, performance claims or testimonials.
 */
export type Solution = {
  slug: string;
  navLabel: string;
  title: string; // <title>
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  problem: { heading: string; body: string };
  capabilities: { title: string; body: string }[];
  steps: string[];
  faqs: { q: string; a: string }[];
  relatedTool: string;
};

export const SOLUTIONS: Solution[] = [
  {
    slug: "ai-marketing-software",
    navLabel: "AI marketing software",
    title: "AI Marketing Software for Growing Businesses",
    metaDescription: "LTR Growth is AI marketing software that creates ads, social content, SEO audits, competitor research and marketing strategies personalized to your business.",
    eyebrow: "AI marketing software",
    h1: "AI marketing software that works like a full marketing team",
    intro: "Most businesses juggle a separate tool for ads, another for social media, another for SEO and a spreadsheet for everything else. LTR Growth puts strategy, creation, analysis and tracking in one platform that understands your business.",
    problem: { heading: "Generic AI tools give generic marketing", body: "A blank chat box doesn't know your offer, your audience, your competitors or your brand voice. LTR Growth stores a business profile and brand kit once, then uses that context in every tool so results are specific to you." },
    capabilities: [
      { title: "Ad Studio", body: "Copy, headlines, hooks, video and UGC scripts, audience ideas and campaign structures for six ad platforms." },
      { title: "Website and SEO audits", body: "Checks based on data retrieved from your site and Google PageSpeed Insights, with transparent scoring." },
      { title: "Marketing strategy", body: "30, 60 and 90-day plans with budget allocation, channel priorities and weekly tasks on your dashboard." },
      { title: "Content and email", body: "Social calendars, captions, scripts, email sequences and SMS templates in your brand voice." },
      { title: "Competitor intelligence", body: "Side-by-side comparisons of public positioning, offers and messaging, with source URLs and dates." },
      { title: "Campaigns and performance", body: "Plan campaigns, record real results and get recommendations grounded in your actual numbers." },
    ],
    steps: ["Create your business profile in a few minutes", "Run a free audit to see where you stand", "Generate ads, content and a strategy built for your business", "Track tasks, campaigns and results in one dashboard"],
    faqs: [
      { q: "Is LTR Growth a replacement for a marketing agency?", a: "For many small teams it covers the planning and creation work. If you want experts to execute, LTRMarketing offers managed services you can request from inside the platform." },
      { q: "Which AI model does LTR Growth use?", a: "LTR Growth uses a configurable AI provider through secure server-side requests. Your business profile and brand kit are added to every request so outputs stay specific to you." },
    ],
    relatedTool: "/app",
  },
  {
    slug: "ai-ad-generator",
    navLabel: "AI advertisement generator",
    title: "AI Ad Generator for Meta, Google, TikTok and More",
    metaDescription: "Generate ad copy, headlines, hooks, video scripts, audiences and A/B variations for Meta, Google, TikTok, Instagram, YouTube and LinkedIn with LTR Growth.",
    eyebrow: "AI advertisement generator",
    h1: "Create complete ad campaigns, not just ad copy",
    intro: "Tell LTR Growth what you're promoting, who it's for and what you want people to do. The Ad Studio returns platform-ready copy along with the hooks, scripts, audiences and test plan you need to launch.",
    problem: { heading: "Good ads need more than a headline", body: "A campaign that performs needs an angle, variations to test, the right audience, a sensible budget and a landing page that matches the promise. The Ad Studio produces all of it together so nothing is left to guesswork." },
    capabilities: [
      { title: "Six platforms", body: "Meta, Google, TikTok, Instagram, YouTube and LinkedIn, each with platform-appropriate formats and character limits." },
      { title: "Copy and creative direction", body: "Primary text, headlines, descriptions, hooks and creative concepts aligned to your brand kit." },
      { title: "Video, UGC and voiceover scripts", body: "Short-form scripts with scene direction you can hand to a creator or film yourself." },
      { title: "Audiences and structure", body: "Suggested audience segments, campaign structure and a starting budget based on what you tell us." },
      { title: "A/B variations", body: "Distinct angles to test against each other, with regeneration for any single section." },
      { title: "Creative briefs", body: "Export a clean brief for your designer, editor or agency." },
    ],
    steps: ["Choose a platform and objective", "Describe the offer, audience and budget", "Review, edit and regenerate sections", "Save the campaign or export a creative brief"],
    faqs: [
      { q: "Will LTR Growth run my ads?", a: "No. You publish ads in your own ad accounts. If you want them launched and managed for you, LTRMarketing's team can help." },
      { q: "Does it make claims about my product?", a: "The generator uses the approved claims in your brand kit and avoids restricted terms. Always review ads against your platform's policies before publishing." },
    ],
    relatedTool: "/app/ads",
  },
  {
    slug: "ai-social-media-content-generator",
    navLabel: "AI social media content generator",
    title: "AI Social Media Content Generator and Content Calendar",
    metaDescription: "Plan and create Instagram, Facebook, TikTok, LinkedIn, YouTube and X content with AI. Generate captions, carousels, reel scripts and 30-day content calendars.",
    eyebrow: "AI social media content generator",
    h1: "A month of on-brand social content in one sitting",
    intro: "Generate 7, 14 or 30-day content strategies with captions, carousel outlines, short-form scripts, hooks and hashtags. Organize everything on a drag-and-drop calendar and export it when you're ready to post.",
    problem: { heading: "Consistency is the hard part", body: "Most businesses know they should post regularly but run out of ideas or time. LTR Growth plans a balanced mix of educational, promotional and engagement content around your goals and seasons." },
    capabilities: [
      { title: "Six networks", body: "Instagram, Facebook, TikTok, LinkedIn, YouTube and X, each with platform-native formats." },
      { title: "Every content type", body: "Captions, carousels, reels, stories, product announcements and seasonal campaigns." },
      { title: "Content strategies", body: "7, 14 or 30-day plans that mix content pillars intentionally." },
      { title: "Interactive calendar", body: "Drag posts between days and track draft, approved, scheduled and published status." },
      { title: "Brand consistency", body: "Your voice, preferred terminology and brand assets are applied automatically." },
      { title: "Export and post", body: "Download your content and publish it manually on your own accounts." },
    ],
    steps: ["Pick platforms and a plan length", "Generate a content strategy", "Edit posts in the calendar", "Export and publish on your schedule"],
    faqs: [
      { q: "Does it post to my accounts automatically?", a: "Not in the initial release. You export content and publish it yourself, and LTR Growth never marks a post as published on a platform unless an authorized integration confirms it." },
    ],
    relatedTool: "/app/social",
  },
  {
    slug: "ai-marketing-strategy-generator",
    navLabel: "AI marketing strategy generator",
    title: "AI Marketing Strategy Generator — 30, 60 and 90-Day Plans",
    metaDescription: "Generate a personalized 30, 60 or 90-day marketing plan with positioning, personas, channels, budget allocation, weekly tasks and KPIs using LTR Growth.",
    eyebrow: "AI marketing strategy generator",
    h1: "A marketing plan built for your business, with the tasks to execute it",
    intro: "LTR Growth turns your business profile, goals and budget into a structured plan: positioning, personas, channel priorities, budget allocation, weekly tasks and the metrics to watch.",
    problem: { heading: "Plans that never leave the document", body: "A strategy only matters if it gets done. Every LTR Growth strategy becomes a set of weekly tasks on your dashboard that you can assign, complete and track." },
    capabilities: [
      { title: "Positioning and personas", body: "Clear positioning statements and customer personas grounded in what you told us." },
      { title: "Channel recommendations", body: "Where to focus first, and why, given your budget and goals." },
      { title: "Budget allocation", body: "A suggested split of your monthly budget, clearly marked as a starting point to test." },
      { title: "SEO, social and email", body: "Channel-specific plans that connect to the rest of the platform." },
      { title: "Weekly tasks", body: "Actionable tasks that appear on your dashboard and can be marked complete." },
      { title: "KPIs and testing roadmap", body: "The metrics that matter and the order to run tests in." },
    ],
    steps: ["Choose a 30, 60, 90-day or custom plan", "Confirm your goals and budget", "Review and edit the strategy", "Work through weekly tasks on your dashboard"],
    faqs: [
      { q: "Are the budget recommendations guaranteed to work?", a: "No. They are a reasoned starting point based on your inputs. LTR Growth recommends testing and adjusting based on your real results." },
    ],
    relatedTool: "/app/strategy",
  },
  {
    slug: "ai-seo-audit-tool",
    navLabel: "AI SEO audit tool",
    title: "AI SEO Audit Tool — Free Website and SEO Audit",
    metaDescription: "Run a website and SEO audit based on real data: page speed, mobile, titles, meta descriptions, headings, alt text, sitemap, robots.txt, structured data and conversion signals.",
    eyebrow: "AI SEO audit tool",
    h1: "A website audit built on real data, with fixes you can act on",
    intro: "Enter your URL and LTR Growth checks your site's performance, technical SEO, content and conversion readiness. Every finding comes with a priority, a difficulty estimate and clear instructions.",
    problem: { heading: "Audit tools that guess", body: "Some tools show traffic and keyword numbers they can't actually know. LTR Growth only reports what it retrieved from your site and verified sources, and marks anything it couldn't check as unverified." },
    capabilities: [
      { title: "Performance and mobile", body: "Load performance and mobile data from Google PageSpeed Insights when configured." },
      { title: "On-page SEO", body: "Titles, meta descriptions, heading structure, image alt text and internal links." },
      { title: "Technical checks", body: "HTTPS, sitemap, robots.txt, structured data and broken links within the scanned scope." },
      { title: "Conversion readiness", body: "Calls to action, contact information and lead capture opportunities." },
      { title: "Local SEO signals", body: "Location, contact and service-area signals for local businesses." },
      { title: "Transparent scoring", body: "Scores are calculated from completed checks only, and the criteria are shown." },
    ],
    steps: ["Enter your website URL", "Review the preview results", "Create a free account for the full report", "Work through prioritized recommendations"],
    faqs: [
      { q: "Will the audit show my keyword rankings or traffic?", a: "No. LTR Growth doesn't invent traffic, rankings, backlinks or search volumes. It reports what can be verified from your site and connected data sources." },
      { q: "Can I export the report?", a: "Yes. Paid plans can export branded PDF reports." },
    ],
    relatedTool: "/free-audit",
  },
  {
    slug: "ai-competitor-analysis",
    navLabel: "AI competitor analysis",
    title: "AI Competitor Analysis Tool for Small Businesses",
    metaDescription: "Compare competitor positioning, services, public pricing, offers and messaging side by side. Find market gaps and differentiation opportunities, with cited sources.",
    eyebrow: "AI competitor analysis",
    h1: "See how you compare, and where you can win",
    intro: "Add competitor names and websites. LTR Growth reviews their publicly available information and builds a side-by-side comparison of positioning, offers, messaging and website quality.",
    problem: { heading: "Competitive research takes hours", body: "Clicking through competitor sites and taking notes is slow and easy to skip. LTR Growth does the first pass for you and cites every source URL and retrieval date." },
    capabilities: [
      { title: "Positioning and messaging", body: "How each competitor describes themselves and who they target." },
      { title: "Services and public pricing", body: "What they offer and any publicly listed pricing." },
      { title: "Offers and calls to action", body: "Promotions, guarantees and how they ask for the sale." },
      { title: "Website quality", body: "A comparison of clarity, trust signals and conversion elements." },
      { title: "Market gaps", body: "Differentiation opportunities and stronger offer ideas for you." },
      { title: "Cited sources", body: "Source URLs and retrieval dates for every factual statement." },
    ],
    steps: ["Add competitors and their websites", "Run the analysis", "Review the side-by-side comparison", "Save competitors and rerun anytime"],
    faqs: [
      { q: "Will it show competitor revenue or ad spend?", a: "No. That information isn't public, and LTR Growth never invents it. Analysis is limited to publicly available information." },
    ],
    relatedTool: "/app/competitors",
  },
  {
    slug: "small-business-marketing-software",
    navLabel: "Marketing software for small businesses",
    title: "Marketing Software for Small Businesses",
    metaDescription: "Affordable all-in-one marketing software for small businesses: AI ads, social content, email, SEO audits and strategy, personalized to your business.",
    eyebrow: "Small business marketing software",
    h1: "Enterprise-grade marketing for small businesses",
    intro: "You don't need a marketing department to market like you have one. LTR Growth gives small teams the planning, creative and analysis tools that used to require an agency retainer.",
    problem: { heading: "Too many tools, not enough time", body: "Small business owners wear every hat. LTR Growth replaces a stack of disconnected tools with one workspace and a clear list of what to do next." },
    capabilities: [
      { title: "Start free", body: "A free plan with a website audit, readiness report and AI generations to try the platform." },
      { title: "One business profile, every tool", body: "Describe your business once. Every tool uses it." },
      { title: "Clear next steps", body: "Your dashboard shows prioritized opportunities and weekly tasks." },
      { title: "Brand kit", body: "Keep your logo, colors, voice and approved claims consistent everywhere." },
      { title: "Honest numbers", body: "Calculators use deterministic formulas and the dashboard only shows real data." },
      { title: "Expert help when you want it", body: "Request a consultation with LTRMarketing from anywhere in the platform." },
    ],
    steps: ["Sign up free", "Complete your business profile", "Run your audit and follow your next steps", "Upgrade when you need more tools or credits"],
    faqs: [
      { q: "How much does LTR Growth cost?", a: "There's a free plan, and paid plans start at Starter. See the pricing page for current plans and credit allowances." },
    ],
    relatedTool: "/pricing",
  },
  {
    slug: "local-business-marketing-software",
    navLabel: "Local business marketing software",
    title: "Local Business Marketing Software — Google Business Profile, Reviews and Local SEO",
    metaDescription: "Marketing software for local service businesses: Google Business Profile recommendations, review responses, local landing pages and service-area content.",
    eyebrow: "Local business marketing software",
    h1: "Win more customers in the areas you serve",
    intro: "The Local Marketing Center helps service businesses improve their Google Business Profile, respond to real reviews, request new ones the right way and create content for every service area.",
    problem: { heading: "Local search is won on the details", body: "Complete profiles, regular posts, genuine reviews and service-area pages all add up. LTR Growth helps you keep up with each one without spending your evenings on it." },
    capabilities: [
      { title: "Google Business Profile", body: "Optimization recommendations, business and service descriptions and post ideas, with step-by-step instructions." },
      { title: "Review responses", body: "Personalized responses to your genuine reviews in your brand voice." },
      { title: "Review requests", body: "Email and SMS templates that ask for honest reviews and respect platform rules." },
      { title: "Local landing pages", body: "Service-area and location pages written for local search." },
      { title: "Local keywords", body: "Keyword ideas that match how people search for your services nearby." },
      { title: "Local promotions", body: "Seasonal and referral campaign ideas for your community." },
    ],
    steps: ["Add your location and service areas", "Get Google Business Profile recommendations", "Respond to and request reviews", "Publish local pages and posts"],
    faqs: [
      { q: "Will LTR Growth write reviews for my business?", a: "Never. LTR Growth does not generate fake reviews or encourage review manipulation. It helps you respond to real reviews and request honest feedback." },
    ],
    relatedTool: "/app/local",
  },
  {
    slug: "ecommerce-marketing-software",
    navLabel: "E-commerce marketing software",
    title: "E-commerce Marketing Software — Ads, Email and Product Content",
    metaDescription: "AI marketing software for e-commerce brands: product ads, UGC scripts, abandoned cart emails, product descriptions, social content and performance tracking.",
    eyebrow: "E-commerce marketing software",
    h1: "Launch products and campaigns faster",
    intro: "From product descriptions to ad creative and abandoned cart flows, LTR Growth helps e-commerce brands produce the marketing every product launch needs, using your real product photos and approved claims.",
    problem: { heading: "Every product needs a lot of content", body: "Listings, ads, emails, social posts and creative for every SKU and season. LTR Growth produces it consistently in your brand voice." },
    capabilities: [
      { title: "Product ads and UGC scripts", body: "Ad copy, hooks and UGC scripts for Meta, TikTok and Instagram." },
      { title: "Email flows", body: "Welcome, abandoned cart, post-purchase and win-back sequences." },
      { title: "Product descriptions", body: "Conversion-focused descriptions that only use the facts you provide." },
      { title: "Creative Studio", body: "Branded graphics using your own product photos, with accurate text overlays." },
      { title: "Seasonal campaigns", body: "Sale announcements and promotional calendars." },
      { title: "Performance tracking", body: "Import your ad and sales data to see ROAS, CPA and trends." },
    ],
    steps: ["Add your products and brand kit", "Generate ads, emails and descriptions", "Create on-brand graphics", "Track results from your real data"],
    faqs: [
      { q: "Will it invent product features?", a: "No. Generators only use product details and claims you provide or approve. Before-and-after layouts use your genuine images only." },
    ],
    relatedTool: "/app/ads",
  },
];

export function getSolution(slug: string) {
  return SOLUTIONS.find((s) => s.slug === slug);
}
