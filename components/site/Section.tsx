import React from "react";

type SectionProps = Omit<React.ComponentPropsWithoutRef<"section">, "title"> & {
  eyebrow?: string;
  title?: React.ReactNode;
};

export function Section({ eyebrow, title, children, ...props }: SectionProps) {
  return (
    <section {...props}>
      {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}
