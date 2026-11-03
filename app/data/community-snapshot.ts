import snapshot from '../../content/ltc-community/latest.json';

export type CommunitySnapshot = {
  collectedAt: string;
  sourceStatus: {
    id: string;
    sourceName: string;
    url: string;
    status: string;
    checkedAt: string | null;
    errorCode: string | null;
    sha256: string | null;
  }[];
  items: {
    id: string;
    sourceName: string;
    title: string;
    url: string;
    publishedAt: string;
    summaryClassification: string;
  }[];
};

// Collection may legitimately produce no accepted records. Widen an empty JSON
// array to the stable view type while still checking populated snapshot fields.
export const communitySnapshot: CommunitySnapshot = snapshot;
