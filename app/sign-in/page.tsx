import {PageIntro} from '../components/PageIntro';
import {CommunityAuth} from '../components/CommunityAuth';
export const metadata={title:'Join or sign in · Community account'};
export default function SignIn(){return <main><PageIntro eyebrow="An open door · An optional account" title="Welcome, in your own way." description="Start with curiosity. Create your free community account with Google, or keep exploring as a guest."/><CommunityAuth/></main>}
