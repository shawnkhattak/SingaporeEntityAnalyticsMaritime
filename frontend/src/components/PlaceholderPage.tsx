import type { LucideIcon } from "lucide-react";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

export function PlaceholderPage({ eyebrow, title, body, icon: Icon }: PlaceholderPageProps) {
  return (
    <>
      <section className="hero compact" aria-labelledby={`${eyebrow}-title`}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id={`${eyebrow}-title`}>{title}</h1>
        <p className="lede">{body}</p>
      </section>
      <section className="surface-grid">
        <article>
          <Icon aria-hidden="true" />
          <h2>Backend API available</h2>
          <p>This surface has a read API in place and is ready for the next frontend implementation pass.</p>
        </article>
      </section>
    </>
  );
}
