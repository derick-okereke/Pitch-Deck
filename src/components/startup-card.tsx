import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Startup } from "@/data/startups";

export function StartupCard({ startup }: { startup: Startup }) {
  return (
    <article className="startup-card">
      <div className="startup-card-topline">
        <span>Illustrative demo</span>
        <span className={startup.verified ? "verified-badge" : "reviewed-badge"}>
          <i aria-hidden="true" /> {startup.verified ? "Verified pitch-ready" : "Profile reviewed"}
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
        <Link href={`/startups/${startup.slug}`}>View profile <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

