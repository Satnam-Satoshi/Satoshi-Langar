export type LtcNetworkAsset = { asset: string; transactions: string|null; blocks: string|null; feesNative: string|null; meanFeeNative: string|null; activeAddresses: string|null };
export type LtcNetworkDay = { window: { start: string; end: string; timezone: string; frequency: string }; assets: LtcNetworkAsset[]; comparison: { transactionRatioLtcToBtc: string|null; transactionDifferenceLtcMinusBtc: string|null } };
export type LtcIntelligence = {
 schemaVersion:1; parserVersion:string; collectedAt:string; asOfDate:string; timeZone:string;
 network: LtcNetworkDay & {status:string;sourceId:string;history?:LtcNetworkDay[];gaps:string[]};
 markets: {routeId:string;chainId:number;chain:string;marketId:string;collateral:{symbol:string;address:string;decimals:number};loan:{symbol:string;address:string;decimals:number};lltv:string;oracleAddress:string;irmAddress:string;status:string;state:{asOf:string|null;freshness:string;borrowApy:string|null;supplyApy:string|null;utilization:string|null;liquidityUsdc:string|null;supplyUsdc:string|null;borrowUsdc:string|null};prices:unknown;sourceId:string;gaps:string[]}[];
 sources:{id:string;url:string;retrievedAt:string;sha256:string|null;httpStatus:number|null;status:string;parserVersion:string}[];gaps:string[];
};
export type LtcDailyFeature = {id:string;desk:string;classification:string;title:string;dek:string;status:string;eventDates:{date:string;label:string}[];paragraphs:string[];takeaway:string;discussionPrompt:string;sourceIds:string[]};
export type LtcDailyFeatures = {schemaVersion:1;issueDate:string;timezone:string;preparedAt:string;checkedAt:string;title:string;theme:string;dek:string;editorialStatus:string;authorship:string|Record<string,string>;freshnessPolicy:string;stories:LtcDailyFeature[];sources:{id:string;title:string;publisher:string;url:string;publishedAt:string|null;checkedAt:string;classification:string;note:string}[]};
export type LtcPolicySnapshot = {schemaVersion:1;collectedAt:string;sources:{id:string;title:string;url:string;status:string;checkedAt:string;sha256:string|null;errorCode:string|null;items:{id:string;title:string;url:string;publishedAt:string;classification:string}[]}[]};
