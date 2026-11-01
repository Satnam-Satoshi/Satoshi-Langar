export function CommunityAuth({callback=false}:{callback?:boolean}) {
  return <section className="reading-content auth-panel" data-community-auth data-config={callback?'../../data/community-auth.json':'../data/community-auth.json'} data-sign-in={callback?'../../sign-in/index.html':'index.html'} data-callback={String(callback)}>
    <p data-auth-status role="status" aria-live="polite">Checking community sign-in…</p>
    {!callback && <><label className="check-label"><input type="checkbox" data-auth-consent/> I have read the <a href="/privacy/">privacy notice</a> and want to create or access my community account.</label><div className="provider-grid">{[['google','Google'],['github','GitHub'],['apple','Apple'],['facebook','Facebook']].map(([id,title])=><button type="button" key={id} data-provider={id} disabled>Continue with {title}</button>)}</div><p className="form-hint">Google is our first sign-in option. Other providers remain unavailable. Google may ask for your consent to share your basic profile and email with our Supabase account service.</p></>}
    <button type="button" className="quiet-button" hidden data-sign-out>Sign out of this tab</button>
    <div className="launch-actions"><a className="launch-button" href="/join/">Choose my first contribution →</a><a href="/welcome/">My local workspace</a></div>
    <h2>Your next step belongs to you.</h2>
    <p><a href="/sikh-bitcoin/">Start a free lesson</a> · <a href="/conversations/">Read LTC Magazine</a> · <a href="/ecosystem/">Meet the community</a></p>
    <p>Your account records the identity and email you agree to share. Courses, the magazine and contribution tools stay open to guests. Lesson progress and plans stay on this device; sign-in does not synchronize them.</p>
    <p>Creating an account does not subscribe you to emails. <a href="/subscribe/">See magazine subscription options.</a> An account does not grant custody, agent permissions, program approval or membership of a legal trust.</p>
    <p>Account and privacy contact: <a data-privacy-contact href="mailto:eddiemalhotra@gmail.com">eddiemalhotra@gmail.com</a>.</p>
    <p><a href="/sign-in/">Return to sign-in</a> · <a href="/account-help/">Account help and data deletion</a> · <a href="/join/">Continue as a guest</a></p>
    <noscript><p>Sign-in needs JavaScript and session storage. All reading and downloadable toolkits remain available.</p></noscript>
  </section>;
}
