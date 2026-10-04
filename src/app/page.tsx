import Link from "next/link";
import { ArrowDown, ArrowRight, AudioLines, CircleCheck, Compass, LineChart, Mic2, ShieldCheck } from "lucide-react";
import { HeroImageLoop } from "@/components/hero-image-loop";
import { OfficeChairField } from "@/components/office-chair-field";
import { PathwayInfographic } from "@/components/pathway-infographic";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StartupCard } from "@/components/startup-card";
import { startups } from "@/data/startups";
import { accountHome, getCurrentAccount } from "@/lib/account";

export default async function Home() {
  const account = await getCurrentAccount();
  const workspaceHref = account
    ? account.organizationName ? accountHome(account) : "/onboarding"
    : null;
  const practiceHref = account
    ? account.role === "founder" && account.organizationName ? "/simulator/new" : workspaceHref ?? "/onboarding"
    : "/auth/sign-in?next=/simulator/new";
  const investorHref = account
    ? account.role === "investor" ? account.organizationName ? "/discover" : "/onboarding" : "/auth/sign-in?role=investor&next=/discover"
    : "/auth/sign-in?role=investor&next=/discover";
  const workspaceLabel = account?.role === "investor" ? "Investor workspace" : "Founder dashboard";

  return (
    <div className="page-canvas home-page">
      <div className="page-shell">
        <section className="hero-panel">
          <SiteHeader investorHref={investorHref} workspaceHref={workspaceHref} workspaceLabel={workspaceLabel} />
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>Pitch smarter and get discovered by the right investors</h1>
              <p className="hero-lede">Practise with an AI investor panel, understand where your story needs work, and become easier for the right investors to discover.</p>
              <div className="hero-actions role-paths">
                <div className="role-path role-path-founder">
                  <span className="role-path-label">For founders</span>
                  <svg className="role-path-line" viewBox="0 0 220 46" aria-hidden="true">
                    <path className="role-path-route" d="M2 7 C70 2 112 2 132 20 C141 28 142 35 142 44" />
                    <path className="role-path-tip" d="M137 38 L142 44 L147 38" />
                  </svg>
                  <Link className="button button-dark" href={practiceHref}>Practise my pitch <ArrowRight size={17} /></Link>
                </div>
                <div className="role-path role-path-investor">
                  <span className="role-path-label">For investors</span>
                  <svg className="role-path-line" viewBox="0 0 220 46" aria-hidden="true">
                    <path className="role-path-route" d="M2 7 C70 2 112 2 132 20 C141 28 142 35 142 44" />
                    <path className="role-path-tip" d="M137 38 L142 44 L147 38" />
                  </svg>
                  <Link className="button button-light" href={investorHref}>Discover startups <Compass size={17} /></Link>
                </div>
              </div>
              <p className="hero-note">Built for founders from idea to growth · Free practice available</p>
            </div>
            <HeroImageLoop />
          </div>
          <a className="scroll-cue" href="#how-it-works">See the full loop <ArrowDown size={15} /></a>
        </section>

        <section className="capability-strip" aria-label="Product capabilities">
          <span><Mic2 size={17} /> Live pitch practice</span>
          <span><AudioLines size={17} /> Actionable feedback</span>
          <span><LineChart size={17} /> Readiness-based discovery</span>
          <span><ShieldCheck size={17} /> Private introductions</span>
        </section>

        <section className="content-panel process-panel" id="how-it-works">
          <div className="section-heading centered-heading">
            <p className="eyebrow">The structured pathway</p>
            <h2>Prepare better. Pitch clearly.<br />Get discovered.</h2>
          </div>
          <PathwayInfographic />
        </section>

        <section className="content-panel simulator-section" id="for-founders">
          <div className="section-copy">
            <p className="eyebrow">Live pressure testing</p>
            <h2>Practise for the questions that matter.</h2>
            <p>Enter a focused boardroom with three fictional investor personas, pitch aloud, answer two follow-up questions from different panel members, and leave with evidence instead of vague encouragement.</p>
            <ul className="check-list">
              <li><CircleCheck size={18} /> Questions tied to what you actually said</li>
              <li><CircleCheck size={18} /> Pacing and filler metrics after recording</li>
              <li><CircleCheck size={18} /> Specific next actions from each perspective</li>
            </ul>
            <Link className="inline-link" href={practiceHref}>Set up a practice session <ArrowRight size={16} /></Link>
          </div>
          <OfficeChairField />
        </section>

        <section className="content-panel discovery-preview" id="for-investors">
          <div className="section-heading split-heading">
            <div><p className="eyebrow">Substantiated deal flow</p><h2>Look past the polished idea.</h2></div>
            <div><p>Filter by sector, stage, geography, funding ask, and a readiness signal whose components are visible.</p><Link className="inline-link" href={investorHref}>Explore discovery <ArrowRight size={16} /></Link></div>
          </div>
          <div className="preview-card-wrap"><StartupCard startup={startups[0]} /></div>
        </section>

        <section className="closing-panel">
          <p className="eyebrow">Choose your side of the table</p>
          <h2>Your next useful conversation<br />starts with better signal.</h2>
          <div className="hero-actions">
            <Link className="button button-dark" href={practiceHref}>{account?.role === "founder" ? "Continue practising" : "I’m a founder"} <ArrowRight size={17} /></Link>
            <Link className="button button-light" href={investorHref}>I’m an investor <ArrowRight size={17} /></Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    </div>
  );
}
