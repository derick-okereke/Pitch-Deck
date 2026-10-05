import Link from "next/link";
import { ArrowLeft, Menu, ShieldCheck } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { InvestorProfileForm } from "./profile-form";
import { signOut } from "@/app/auth/actions";
import styles from "./profile.module.css";
import { BrandMark } from "@/components/brand-mark";

export default async function InvestorProfilePage() {
  const account = await getCurrentAccount();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("investor_profiles").select("*").maybeSingle();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/"><BrandMark /></Link>
        <nav aria-label="Investor workspace"><Link href="/discover">Discovery</Link><Link href="/inbox">Inbox</Link><Link aria-current="page" href="/investor/profile">Investment profile</Link></nav>
        <div className={styles.account}><span>{account?.displayName}</span><form action={signOut}><button type="submit">Sign out</button></form></div>
        <details className={styles.mobileMenu}>
          <summary aria-label="Open investor menu"><Menu size={20} /><span className="sr-only">Investor menu</span></summary>
          <nav aria-label="Mobile investor workspace">
            <Link href="/discover">Discovery</Link>
            <Link href="/inbox">Inbox</Link>
            <Link aria-current="page" href="/investor/profile">Investment profile</Link>
            <form action={signOut}><button type="submit">Sign out</button></form>
          </nav>
        </details>
      </header>
      <div className={styles.titleRow}>
        <div>
          <Link className={styles.back} href="/discover"><ArrowLeft size={15} /> Discovery</Link>
          <h1>Set the lens you invest through.</h1>
          <p>Your preferences shape your workspace now and will support better matching later. They are not shown publicly.</p>
        </div>
        <div className={styles.privacyNote}><ShieldCheck size={18} /><span><strong>Private by default</strong>Your email and direct contact details are never shown to founders.</span></div>
      </div>
      <InvestorProfileForm accountName={account?.displayName ?? ""} profile={profile} />
    </main>
  );
}
