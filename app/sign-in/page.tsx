import {PageIntro} from '../components/PageIntro';
import {CommunityAuth} from '../components/CommunityAuth';
export const metadata={title:'Optional community sign-in'};
export default function SignIn(){return <main><PageIntro eyebrow="An open door · An optional account" title="Welcome, in your own way." description="Start with curiosity. Bring an existing identity when accounts open, or continue without one."/><CommunityAuth/></main>}
