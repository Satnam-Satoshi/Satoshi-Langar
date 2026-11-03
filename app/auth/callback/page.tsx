import {PageIntro} from '../../components/PageIntro';
import {CommunityAuth} from '../../components/CommunityAuth';
export const metadata={title:'Complete sign-in',robots:{index:false,follow:false}};
export default function Callback(){return <main><PageIntro eyebrow="Community account" title="Let’s finish your sign-in." description="Keep this tab open while we check your provider’s response."/><CommunityAuth callback/></main>}
