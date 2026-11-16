import {createElement, type ReactNode} from 'react';
import path from 'node:path';
import {readVerifiedPdfReader} from '../../scripts/lib/ltc-pdf-reader.mjs';
import type {PdfIssue} from '../data/pdf-issue';
import styles from './LtcPdfIssue.module.css';
type ReaderNode={text:string}|{tag:string;attrs:Record<string,string>;children:ReaderNode[]};
const tagNames:Record<string,string>={main:'div',article:'section',header:'div',footer:'div',section:'section',div:'div',h1:'h2',h2:'h2',h3:'h3',h4:'h4',h5:'h5',h6:'h6',p:'p',ul:'ul',ol:'ol',li:'li',blockquote:'blockquote',pre:'pre',table:'table',caption:'caption',thead:'thead',tbody:'tbody',tfoot:'tfoot',tr:'tr',th:'th',td:'td',hr:'hr',a:'a',strong:'strong',em:'em',b:'b',i:'i',span:'span',small:'small',br:'br',code:'code',sup:'sup',sub:'sub'};
function renderNode(node:ReaderNode,key:string):ReactNode{
 if('text' in node)return node.text;
 const tag=tagNames[node.tag];if(!tag)throw Error('Unreviewed reader element');
 const props:Record<string,string|number>={key};
 for(const [attribute,value] of Object.entries(node.attrs)){
  if(attribute==='href'&&node.tag==='a')props.href=value;
  else if(attribute==='scope'&&node.tag==='th')props.scope=value;
  else if(['colspan','rowspan'].includes(attribute)&&['td','th'].includes(node.tag))props[attribute==='colspan'?'colSpan':'rowSpan']=Number(value);
  else throw Error('Unreviewed reader attribute');
 }
 const children=node.children.map((child,index)=>renderNode(child,`${key}-${index}`));
 const element=createElement(tag,props,...children);
 if(tag==='table')return <div className={styles.readerTable} key={key} role="region" aria-label="Source data table" tabIndex={0}>{element}</div>;
 return element;
}
export default function LtcTrustedReader({issue}:{issue:PdfIssue}){
 if(!issue.reader)return null;
 const document=readVerifiedPdfReader(issue.reader,path.resolve('public'));
 return <article className={styles.reader} aria-labelledby={`reader-${issue.id}`} data-trusted-daily-reader="ltc-inert-html-v1">
  <header className={styles.readerHeader}><p className={styles.kicker}>THE WEB READING EDITION / SAME DATED RESEARCH</p><h2 id={`reader-${issue.id}`}>Read beyond<br/><em>the cover.</em></h2><p>Text, tables and original source links from this issue’s verified reader artifact. The saved PDF remains the canonical designed edition.</p><a href={issue.pdf}>Open the original {issue.pages}-page PDF ↗</a></header>
  <div className={styles.readerBody}>{(document.nodes as ReaderNode[]).map((node,index)=>renderNode(node,`reader-node-${index}`))}</div>
  <footer className={styles.readerFooter}><strong>Keep the source. Keep its date.</strong><p>General education and research. Figures retain their source-specific observation dates and limitations.</p><a href="/conversations/archive/">Explore the issue archive ↗</a></footer>
 </article>;
}
