import Link from "next/link";
import React from "react";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  if (trail.length === 0) return null;

  return (
    <nav className="demoBreadcrumbs" aria-label="Breadcrumb">
      {trail.map((crumb, idx) => {
        const isLast = idx === trail.length - 1;
        const node = crumb.href && !isLast ? (
          <Link href={crumb.href}>{crumb.label}</Link>
        ) : (
          <span className={isLast ? "demoBreadcrumbs__current" : undefined}>{crumb.label}</span>
        );

        return (
          <React.Fragment key={`${crumb.label}-${idx}`}>
            {node}
            {!isLast ? <span className="demoBreadcrumbs__sep" aria-hidden>›</span> : null}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
