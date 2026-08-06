import { BookOpen, Braces, ChartNoAxesCombined, CircleHelp, FileText, HandHeart, Landmark, Newspaper, Scale, ShieldCheck, Users } from "lucide-react";

export const pillars = [
  { title: "Service before status", body: "Proof of Seva makes contribution visible without turning care into competition.", icon: HandHeart },
  { title: "Evidence before claims", body: "Treasury research separates verified facts, estimates, classifications, and corrections.", icon: ShieldCheck },
  { title: "Open by default", body: "Architecture, roadmaps, issues, and institutional decisions are prepared for public inspection.", icon: Braces },
  { title: "Humans remain responsible", body: "AI supports research and coordination. People retain authority, consent, and accountability.", icon: Users },
];

export const productCards = [
  { title: "Treasury Intelligence", body: "A read-only research system for public Bitcoin, Litecoin, and Stellar treasury evidence.", href: "/treasury", label: "Explore the methodology", icon: ChartNoAxesCombined },
  { title: "Lunch Time Conversations", body: "A daily public-interest newspaper connecting markets, institutions, policy, and community learning.", href: "/conversations", label: "Read the publication plan", icon: Newspaper },
  { title: "Satoshi Langar", body: "A community pilot for meals, volunteering, dignity, and transparent Proof of Seva.", href: "/langar", label: "Understand the pilot", icon: HandHeart },
];

export const participation = [
  ["Developers", "Build accessible public-interest infrastructure in the open."],
  ["Designers", "Turn complex evidence and community journeys into calm experiences."],
  ["Researchers", "Find primary sources, reconcile claims, and document uncertainty."],
  ["Writers", "Make institutional knowledge understandable without reducing its rigor."],
  ["Volunteers", "Support local food service, education, and community coordination."],
];

export const trustItems = [
  { label: "Constitution", detail: "Mission authority and durable institutional boundaries.", icon: Landmark },
  { label: "Governance", detail: "Recorded decisions, named owners, and Founder approval gates.", icon: Scale },
  { label: "Documentation", detail: "Versioned architecture, methodology, and implementation records.", icon: FileText },
  { label: "Education", detail: "Plain-language explanations grounded in public evidence.", icon: BookOpen },
  { label: "Corrections", detail: "Visible revisions when facts, sources, or classifications change.", icon: CircleHelp },
];
