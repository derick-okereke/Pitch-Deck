import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, AudioLines, Check, CircleCheck, Info, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { IntroRequestPanel } from "@/components/intro-request-panel";
import { startups } from "@/data/startups";
import { getIntroState } from "@/lib/conversation-data";
import { getInvestorAccess, getStartupDetail } from "@/lib/marketplace-data";
import { profileCategoryKeys, profileCategoryWeights, type ProfileCategoryKey } from "@/lib/profile-review";

const ratingSchema = z.array(z.object({ key: z.enum(["clarity", "market", "traction", "team", "business_model", "competition"]), rating: z.number().int().min(0).max(4) }).passthrough());
const labels: Record<ProfileCategoryKey, string> = { clarity: "Clarity", market: "Market", traction: "Traction", team: "Team", business_model: "Business model", competition: "Competition" };

function illustrativeCategoryScores(contentScore: number): Array<[string, number, number]> {
  const scores = profileCategoryKeys.map((key) => ({ key, max: profileCategoryWeights[key], value: Math.floor(contentScore * profileCategoryWeights[key] / 90) }));
  let remaining = contentScore - scores.reduce((sum, item) => sum + item.value, 0);
  for (const item of scores) {
    if (remaining === 0) break;
    if (item.value < item.max) { item.value += 1; remaining -= 1; }
  }
  return scores.map(({ key, value, max }) => [labels[key], value, max]);
}

export function generateStaticParams() { return startups.map(({ slug }) => ({ slug })); }

export default async function StartupPage({ params }: { params: Promise<{ slug: string }> }) {
  const access = await getInvestorAccess();
  if (access.status === "anonymous") redirect("/auth/sign-in?next=/discover");
  if (access.status === "onboarding") redirect("/onboarding");
  if (access.status === "wrong_role") redirect("/auth/sign-in?role=investor&next=/discover");
  if (access.status === "profile_required") redirect("/investor/profile?setup=1");

  const { slug } = await params;
  const fixture = startups.find((item) => item.slug === slug);
  const storedResult = fixture ? null : await getStartupDetail(slug);
  if (!fixture && storedResult?.status === "not_found") notFound();
  if (!fixture && storedResult?.status === "limit_reached") {
    const reset = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(storedResult.usage.reset_at));
    return <div className="page-canvas"><div className="page-shell"><section className="app-panel startup-detail-panel"><SiteHeader investorWorkspace activeInvestorPage="discover" workspaceHref="/investor/profile" workspaceLabel="Investor workspace" /><Link className="back-link" href="/discover"><ArrowLeft size={16} /> Back to discovery</Link><div className="detail-limit-state"><LockKeyhole size={25} /><h1>Your monthly profile allowance is complete.</h1><p>You have opened {storedResult.usage.used_count} distinct startup profiles this month. Profiles you already viewed remain available; new profiles reopen on {reset}.</p><div><Link className="button button-dark" href="/discover">Return to discovery</Link><span>Investor Pro preview · unlimited profile views</span></div></div></section><SiteFooter /></div></div>;
  }
  const stored = storedResult?.status === "ok" ? storedResult.detail : null;
  if (!fixture && !stored) notFound();
  const introState = stored ? await getIntroState(stored.id) : { existingConversationId: null, canRequest: false };

  const profile = stored?.profile;
  const name = fixture?.name ?? stored!.name;
  const tagline = fixture?.tagline ?? stored!.tagline;
  const sector = fixture?.sector ?? stored!.sector;
  const stage = fixture?.stage ?? stored!.stage;
  const score = fixture?.score ?? stored!.score;
  const verified = fixture?.verified ?? stored!.verified;
  const location = fixture?.location ?? stored!.location;
  const ask = fixture?.ask ?? stored!.ask;
  const problem = fixture?.problem ?? profile!.problem;
  const solution = fixture?.solution ?? profile!.solution;
  const traction = fixture?.traction ?? (profile!.traction.evidence_note || "No traction evidence was included in this published revision.");
  const reviewedAt = stored ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(stored.reviewedAt)) : "24 Sep 2026";
  const parsedRatings = stored ? ratingSchema.safeParse(stored.ratings) : null;
  const ratings = parsedRatings?.success ? parsedRatings.data : null;
  const fixtureScores = fixture ? illustrativeCategoryScores(fixture.score - fixture.deliveryPoints) : [];
  const categoryScores: Array<[string, number, number]> = ratings
    ? ratings.map((rating) => [labels[rating.key], profileCategoryWeights[rating.key] * rating.rating / 4, profileCategoryWeights[rating.key]])
    : fixtureScores;

  return (
    <div className="page-canvas"><div className="page-shell">
      <section className="app-panel startup-detail-panel">
        <SiteHeader investorWorkspace activeInvestorPage="discover" workspaceHref="/investor/profile" workspaceLabel="Investor workspace" />
        <Link className="back-link" href="/discover"><ArrowLeft size={16} /> Back to discovery</Link>
        <div className="startup-hero">
          <div>
            <div className="detail-badges"><span>{fixture ? `Illustrative demo · Founder ${fixture.tier === "pro" ? "Pro" : "Free"}` : stored?.isDemo ? "Illustrative demo" : "Published profile"}</span>{verified && <span className="verified-badge"><Check size={14} aria-hidden="true" /> Verified pitch-ready</span>}</div>
            <p className="startup-sector">{sector} · {stage}</p><h1>{name}</h1>
            <p className="startup-detail-tagline">{tagline}</p>
            <div className="detail-meta"><span><MapPin size={15} />{location}</span><span>Raising <strong>{ask}</strong></span></div>
          </div>
          <aside className="score-panel">
            <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><div><strong>{score}</strong><span>/ 100</span></div></div>
            <p>Pitch-Readiness Score</p><span className="score-date">Reviewed {reviewedAt}</span>
          </aside>
        </div>
      </section>

      <main className="detail-layout">
        <div className="detail-main">
          <section className="detail-section"><p className="section-number">THE CASE</p><h2>The problem</h2><p>{problem}</p><h2>The solution</h2><p>{solution}</p></section>
          <section className="detail-section"><p className="section-number">EVIDENCE</p><h2>Traction and proof</h2><p>{traction}</p>{profile?.team.length ? <><h2>Team</h2><div className="detail-team">{profile.team.map((member) => <article key={`${member.name}-${member.role}`}><strong>{member.name}</strong><span>{member.role}</span><p>{member.relevant_experience}</p></article>)}</div></> : null}<div className="evidence-note"><Info size={18} /><p><strong>{fixture || stored?.isDemo ? "Demo data is labelled." : "Claims are self-reported."}</strong> The profile passed a pitch-readiness review. Peekytoe has not independently verified business performance or investment outcomes.</p></div></section>
          <section className="detail-section">
            <p className="section-number">READINESS BREAKDOWN</p>
            <div className="score-breakdown">
              {categoryScores.map(([label, value, max]) => <div className="score-row" key={label}><span>{label}</span><div><i style={{ width: `${Number(value) / Number(max) * 100}%` }} /></div><strong>{value} / {max}</strong></div>)}
              <div className="score-row"><span>Delivery</span><div><i style={{ width: `${(fixture?.deliveryPoints ?? 0) * 10}%` }} /></div><strong>{fixture?.deliveryPoints ?? 0} / 10</strong></div>
            </div>
            <p className="score-explainer"><ShieldCheck size={18} />The score measures pitch readiness against the published rubric. It does not predict returns, certify the founder, or verify every business claim.</p>
          </section>
        </div>
        <aside className="intro-card">
          <h2>Start a private introduction.</h2>
          <p>A thoughtful note opens an in-app conversation immediately, without exposing either party’s contact details.</p>
          <IntroRequestPanel startupId={stored?.id ?? slug} startupName={name} existingConversationId={introState.existingConversationId} canRequest={introState.canRequest} illustrative={Boolean(fixture)} />
          <ul><li><LockKeyhole size={15} /> Contact details stay private</li><li><CircleCheck size={15} /> Founders will always reply for free</li></ul><hr />
          <div className="audio-preview"><AudioLines size={20} /><div><strong>Founder pitch recording</strong><span>{stored ? "No public recording selected" : "Illustrative preview unavailable"}</span></div></div>
        </aside>
      </main>
      <SiteFooter />
    </div></div>
  );
}
