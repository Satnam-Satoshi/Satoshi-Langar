import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function assertReviewDryRunResult({policy,exitCode,receipt}) {
  if(policy?.paused === true) {
    if(exitCode!==1 || receipt?.mode!=='dry-run' || receipt.published!==false || receipt.failure!=='publication_paused')
      throw Error('paused_review_did_not_prove_closed_gate');
    return 'pause-enforcement-verified';
  }
  if(policy?.paused!==false || exitCode!==0 || receipt?.mode!=='dry-run' || receipt.published!==false || receipt.failure)
    throw Error('review_dry_run_failed');
  return 'dry-run-verified';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 const policy=JSON.parse(readFileSync('config/ltc-publication.json','utf8'));
 const receipt=JSON.parse(readFileSync(path.join(process.env.RUNNER_TEMP,'ltc-cloud-review.json'),'utf8'));
 console.log(assertReviewDryRunResult({policy,exitCode:Number(process.argv[2]),receipt}));
}
