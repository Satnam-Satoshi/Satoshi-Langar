import type { Metadata } from 'next';
import TreasuryDashboard from './treasury-dashboard';
import './treasury.css';
export const metadata:Metadata={title:'Treasury Control',description:'Self-custody treasury workspace. Review markets, track positions, and prepare human-approved actions.',robots:{index:false,follow:false}};
export default function TreasuryControlPage(){return <TreasuryDashboard/>;}
