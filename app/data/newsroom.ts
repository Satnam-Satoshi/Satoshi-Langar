import saved from '../../content/ltc-newsroom/latest.json';
import {latestLtcEdition} from './editions';
import type {LtcEditionSource,LtcBrief} from './editions';
import type {LtcIntelligence,LtcPolicySnapshot} from './intelligence';
type Newsroom={id:string;date:string;preparedAt:string;sources:LtcEditionSource[];briefs:LtcBrief[];intelligence:LtcIntelligence;policyRecords:LtcPolicySnapshot;sha256:string;hashScope:string};
// A later daily issue takes precedence without re-dating this intraday record.
export const newsroom:Newsroom=latestLtcEdition&&latestLtcEdition.preparedAt>saved.preparedAt?{...latestLtcEdition,intelligence:latestLtcEdition.intelligence!,policyRecords:latestLtcEdition.policyRecords!,sha256:latestLtcEdition.sourceSnapshotSha256,hashScope:"Base source snapshot"}:{...saved,hashScope:"Complete notebook record"} as Newsroom;
