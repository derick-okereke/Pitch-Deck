import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function AuthShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <main className="auth-page">
    <section className="auth-brand-panel"><Link className="wordmark auth-wordmark" href="/">Pitch Deck<span className="wordmark-dot" /></Link><div><p className="eyebrow">A quieter route to investment readiness</p><h2>Build evidence.<br />Practise the story.<br />Meet the right people.</h2></div><p><ShieldCheck size={16} /> Authentication and private practice data are handled securely.</p></section>
    <section className="auth-form-panel"><div className="auth-form-wrap"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="auth-intro">{intro}</p>{children}</div></section>
  </main>;
}
