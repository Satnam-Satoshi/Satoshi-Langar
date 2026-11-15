// PURE DESIGN VALIDATOR ONLY: observations must be obtained by a separately
// reviewed trusted provider adapter, not workflow inputs or caller JSON.
// This validates identity, NOT durable reservation/owner approval. No I/O.
const check=(v,c)=>{if(!v)throw Error('bootstrap_admission_'+c);};
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const runId=v=>typeof v==='string'&&/^[1-9][0-9]{0,19}$/.test(v);
export function validateBootstrapInvocation({pin,run,review,now}){
 check(Number.isFinite(now),'clock');
 check(pin&&pin.schemaVersion===1&&pin.action==='one-private-receipt-bootstrap'&&runId(pin.runId)&&pin.runAttempt===1,'pin');
 check(review&&review.repository==='Satnam-Satoshi/Satoshi-Langar'&&sha(review.sourceSha)&&sha(review.workflowSha)&&digest(review.bootstrapBodySha256)&&digest(review.bootstrapKey)&&typeof review.workflowPath==='string'&&/^\.github\/workflows\/[a-z0-9-]+\.yml$/.test(review.workflowPath),'review');
 check(pin.repository===review.repository&&pin.sourceSha===review.sourceSha&&pin.workflowSha===review.workflowSha&&pin.workflowPath===review.workflowPath&&pin.bootstrapBodySha256===review.bootstrapBodySha256&&pin.bootstrapKey===review.bootstrapKey,'review_binding');
 check(Number.isFinite(pin.pinnedAt)&&Number.isFinite(pin.expiresAt)&&pin.pinnedAt<=now&&now<pin.expiresAt&&pin.expiresAt-pin.pinnedAt<=3600000,'expired');
 check(run&&runId(run.id)&&run.id===pin.runId&&run.attempt===1&&run.repository===review.repository&&run.event==='workflow_dispatch'&&run.headSha===review.workflowSha&&run.workflowSha===review.workflowSha&&run.executedSourceSha===review.sourceSha&&run.workflowPath===review.workflowPath&&run.ref==='refs/heads/main','run_binding');
 check(run.status==='in_progress'&&run.jobName==='create-private-receipt-once'&&run.jobAttempt===1,'job');
 return Object.freeze({admittedIdentity:true,runId:pin.runId,runAttempt:1,durableReservationEstablished:false,publicationAuthorized:false});
}
