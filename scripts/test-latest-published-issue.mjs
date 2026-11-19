import test from 'node:test';import assert from 'node:assert/strict';
import {selectPublishedIssue,previousPublicationDays} from '../app/data/published-issue-selection.ts';
const pdf={date:'2026-11-16',title:'PDF',page:'/pdf/',dek:'Saved PDF',format:'pdf'};
const web=date=>({date,title:'Web',page:'/web/',dek:'Saved web',format:'web'});
test('newer published web issue supersedes PDF and retains its actual URL',()=>assert.equal(selectPublishedIssue(pdf,web('2026-11-18')).page,'/web/'));
test('newer PDF and same-day PDF remain canonical daily link',()=>{assert.equal(selectPublishedIssue(pdf,web('2026-11-15')),pdf);assert.equal(selectPublishedIssue(pdf,web('2026-11-16')),pdf);});
test('missing web record preserves published PDF without fabricating today',()=>assert.equal(selectPublishedIssue(pdf,null),pdf));
test('past-issue shelf excludes actual current date and retains older dates',()=>{const days=[{date:'2026-11-18'},{date:'2026-11-16'},{date:'2026-11-15'}];assert.deepEqual(previousPublicationDays(days,web('2026-11-18')),days.slice(1));assert.deepEqual(previousPublicationDays(days,pdf),days.slice(2));});
test('invalid publication date is rejected',()=>assert.throws(()=>selectPublishedIssue(pdf,web('2026-02-30'))));
