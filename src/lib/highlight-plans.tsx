import { type ReactNode } from "react";

export function highlightPlanNames(text: string): ReactNode {
  const parts = text.split(/(Standard Pro|Ultimate Video)/);
  return parts.map((part, i) => {
    if (part === "Standard Pro" || part === "Ultimate Video") {
      return <strong key={i} className="font-bold">{part}</strong>;
    }
    return part;
  });
}
