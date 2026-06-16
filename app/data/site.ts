import {
  BarChart3,
  Bot,
  BookOpen,
  CircleDollarSign,
  Globe2,
  HeartHandshake,
  Landmark,
  Network,
  ShieldCheck,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react';

export const navItems = [
  { label: 'Mission', href: '#mission' },
  { label: 'Langar', href: '#langar' },
  { label: 'AI Sevadars', href: '#ai' },
  { label: 'Intelligence', href: '#intelligence' },
  { label: 'Treasury', href: '#treasury' },
  { label: 'Join', href: '#join' },
];

export const ecosystemSections = [
  {
    id: 'mission',
    kicker: 'The mission',
    title: 'A digital gurudwara for the Bitcoin age.',
    body: 'Satnam Satoshi builds humanitarian infrastructure where service, education, and transparent reserves work together. Anyone can contribute food, time, code, sats, litoshis, or care.',
    icon: Landmark,
    stat: 'Open-source',
  },
  {
    id: 'langar',
    kicker: 'Satoshi Langar',
    title: 'Food, dignity, and proof-of-seva coordination.',
    body: 'Langar remains free. The platform will help coordinate groceries, meal sponsorships, volunteer shifts, community locations, and future Lightning-powered gratitude flows.',
    icon: Utensils,
    stat: 'Free meals',
  },
  {
    id: 'ai',
    kicker: 'AI Sevadars',
    title: 'Human volunteers supported by calm agentic systems.',
    body: 'AI sevadars can help answer questions, route volunteers, prepare education, summarize treasury activity, and keep the movement organized without losing the human center.',
    icon: Bot,
    stat: 'Agent ready',
  },
  {
    id: 'intelligence',
    kicker: 'Satnam Intelligence',
    title: 'Institutional-grade BTC, LTC, XLM, policy, and Morpho intelligence.',
    body: 'A source-linked daily report will track ETF flows, sovereign and corporate holdings, Wall Street and bank activity, network developments, regulation, and cbBTC/cbLTC lending-market risk.',
    icon: BarChart3,
    stat: 'Daily research',
  },
];

export const platformModules = [
  {
    title: 'Satnam Intelligence',
    text: 'Verified daily BTC, LTC, XLM, ETF, treasury, sovereign, regulatory, and Morpho reporting with provenance and confidence grades.',
    icon: BarChart3,
  },
  {
    title: 'Transparent Treasury',
    text: 'Public BTC and LTC reserve views with donation history, purpose tags, and operating transparency.',
    icon: ShieldCheck,
  },
  {
    title: 'Lightning Donations',
    text: 'A donation layer prepared for invoices, sats receipts, and fast recurring support.',
    icon: Zap,
  },
  {
    title: 'Bitcoin Education',
    text: 'Plain-language learning paths for families, youth, small businesses, and sangat organizers.',
    icon: BookOpen,
  },
  {
    title: 'Global Sangat',
    text: 'A community map and chapter system for local seva, learning circles, and builders.',
    icon: Globe2,
  },
];

export const treasuryArchitecture = [
  { label: 'BTC reserve', value: 'bc1q3qxt…xz8rx', tone: 'gold' },
  { label: 'LTC reserve', value: 'ltc1q7888…c63j', tone: 'silver' },
  { label: 'Lightning', value: 'Invoice layer planned', tone: 'blue' },
  { label: 'Allocation', value: 'Food, education, tools', tone: 'saffron' },
];

export const roadmap = [
  'Launch the verified Satnam Intelligence daily report',
  'Build BTC, LTC, XLM, sovereign, ETF, and Morpho data agents',
  'Open volunteer and food donor intake',
  'Integrate Lightning donation flow',
  'Launch Bitcoin education series',
  'Release paid subscriptions and x402 agent API after sandbox and compliance review',
];

export const communityActions = [
  { label: 'Donate food', icon: HeartHandshake },
  { label: 'Serve time', icon: Sparkles },
  { label: 'Teach Bitcoin', icon: BookOpen },
  { label: 'Build tools', icon: Network },
  { label: 'Support treasury', icon: CircleDollarSign },
];
