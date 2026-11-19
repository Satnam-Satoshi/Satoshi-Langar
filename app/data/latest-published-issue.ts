import {pdfIssue} from './pdf-issue';
import {latestLtcEdition,editionDateHref} from './editions';
import {selectPublishedIssue,publishedIssueCoverPath} from './published-issue-selection';
export const latestPublishedIssue=selectPublishedIssue({...pdfIssue,format:'pdf'},latestLtcEdition?{
 date:latestLtcEdition.date,title:latestLtcEdition.title,dek:latestLtcEdition.dek,page:editionDateHref(latestLtcEdition.date),format:'web',cover:publishedIssueCoverPath(latestLtcEdition.presentation?.artDirection?.coverAsset),
}:null);
export const latestWebIssueLabel=latestPublishedIssue.format==='web'?'Latest published web issue':'Latest web briefing';
