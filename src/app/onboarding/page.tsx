import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { accountHome, getCurrentAccount } from "@/lib/account";
import { OnboardingForm } from "./onboarding-form";
import styles from "./onboarding.module.css";

export default async function OnboardingPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/auth/sign-in");
  if (account.organizationName) redirect(accountHome(account));

  const founder = account.role !== "investor";
  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <Link className={styles.wordmark} href="/">Pitch Deck<span aria-hidden="true" /></Link>
        <div>
          <p>{founder ? "Founder workspace" : "Investor workspace"}</p>
          <h1>One detail, then the useful work begins.</h1>
          <p>{founder
            ? "Name the startup you are preparing to fundraise for. You can build the full case inside the workspace."
            : "Name your firm or investing organization. You can refine your thesis and filters later."}</p>
        </div>
        <ul>
          <li><Check size={15} /> Email confirmed</li>
          <li><Check size={15} /> Private workspace created</li>
          <li><Check size={15} /> You control what becomes public</li>
        </ul>
      </section>
      <section className={styles.panel}>
        <div>
          <span>Final setup</span>
          <h2>Complete your workspace</h2>
          <p>About one minute. Only the organization name is required now.</p>
        </div>
        <OnboardingForm
          defaultName={account.displayName}
          organizationLabel={founder ? "Startup name" : "Firm or organization"}
          recoveryKey={`pitch-deck:onboarding:${account.id}`}
        />
      </section>
    </main>
  );
}
