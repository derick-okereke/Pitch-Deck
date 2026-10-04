import Link from "next/link";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import type { Startup } from "@/data/startups";
import type { DiscoveryCard } from "@/lib/marketplace";

export function StartupCard({ startup }: { startup: Startup | DiscoveryCard }) {
  const href = "slug" in startup ? `/startups/${startup.slug}` : `/startups/${startup.id}`;
  const isDemo = "isDemo" in startup ? startup.isDemo : true;
  return (
    <article className="startup-card">
      <div className="startup-card-topline">
        <span>{isDemo ? "Illustrative demo" : "Published profile"}</span>
        <span className={startup.verified ? "verified-badge" : "reviewed-badge"}>
          <Check size={14} aria-hidden="true" /> {startup.verified ? "Verified pitch-ready" : "Profile reviewed"}
        </span>
      </div>
      <div className="startup-card-main">
        <div>
          <p className="startup-sector">{startup.sector} · {startup.stage}</p>
          <h2>{startup.name}</h2>
          <p className="startup-tagline">{startup.tagline}</p>
        </div>
        <div className="score-tile" aria-label={`Pitch-Readiness Score ${startup.score} out of 100`}>
          <strong>{startup.score}</strong>
          <span>Readiness</span>
        </div>
      </div>
      <div className="startup-card-footer">
        <span><MapPin size={14} aria-hidden="true" />{startup.location}</span>
        <span>Raising {startup.ask}</span>
        <Link href={href}>View profile <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

