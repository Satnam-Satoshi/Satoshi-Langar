export type November17Chapter = { id:string; page:number; kicker:string; title:string; dek:string; hero:string; paragraphs:string[]; headers:string[]; rows:string[][]; sources:number[]; identities?:{label:string;market:string;oracle:string;collateral:string}[] };
export const november17Sources = [
  {
    "url": "https://farside.co.uk/bitcoin-etf-flow-all-data/",
    "label": "Farside Investors · ETF flows"
  },
  {
    "url": "https://www.sec.gov/Archives/edgar/data/1980994/000143893426008438/ibit20260930.htm",
    "label": "BlackRock IBIT · Form 10-Q"
  },
  {
    "url": "https://www.sec.gov/Archives/edgar/data/70858/000007085826000589/xslForm13F_X02/InfoTable_Q32026.xml",
    "label": "Bank of America · 13F information table"
  },
  {
    "url": "https://litecoinregister.com/",
    "label": "Litecoin Register · aggregate"
  },
  {
    "url": "https://litecoinregister.com/categories/ecosystem/extension-block/",
    "label": "Litecoin Register · MWEB"
  },
  {
    "url": "https://litecoinregister.com/categories/investment-products/",
    "label": "Litecoin Register · products"
  },
  {
    "url": "https://litecoinregister.com/categories/company-treasuries/",
    "label": "Litecoin Register · treasuries"
  },
  {
    "url": "https://app.morpho.org/base/variable/0x9125d0fa03c3137166df68bcc72283477830de2a4a5536512374c573ad4583c3/usdc-cbltc",
    "label": "Morpho · cbLTC / USDC"
  },
  {
    "url": "https://app.morpho.org/base/variable/0x9103c3b4e834476c9a62ea009ba2c884ee42e94e6e314a26f04d312434191836/usdc-cbbtc",
    "label": "Morpho · cbBTC / USDC"
  },
  {
    "url": "https://bitbo.io/treasuries/",
    "label": "Bitbo · global treasuries"
  },
  {
    "url": "https://www.sec.gov/Archives/edgar/data/1050446/000119312526462151/mstr-20261116.htm",
    "label": "Strategy · November 16 8-K"
  },
  {
    "url": "https://www.sec.gov/Archives/edgar/data/1920406/000162828026074004/asst-20261116.htm",
    "label": "Strive · November 16 8-K"
  },
  {
    "url": "https://www.circle.com/cirbtc",
    "label": "Circle · cirBTC reserves"
  },
  {
    "url": "https://www.circle.com/pressroom/circle-launches-arc-mainnet-an-economic-operating-system-for-the-internet",
    "label": "Circle · Arc announcement"
  },
  {
    "url": "https://www.sec.gov/rules-regulations/staff-guidance/trading-markets-frequently-asked-questions/frequently-asked-questions-offerings-registrations-crypto-asset-securities",
    "label": "SEC · staff crypto FAQ"
  },
  {
    "url": "https://www.sec.gov/newsroom/press-releases",
    "label": "SEC · release index"
  },
  {
    "url": "https://www.cftc.gov/PressRoom/PressReleases",
    "label": "CFTC · release index"
  },
  {
    "url": "https://github.com/bitcoin/bitcoin/releases",
    "label": "Bitcoin Core · releases"
  },
  {
    "url": "https://github.com/lightningnetwork/lnd/releases",
    "label": "LND · releases"
  },
  {
    "url": "https://github.com/ElementsProject/lightning/releases",
    "label": "Core Lightning · releases"
  },
  {
    "url": "https://litecoin.com/news",
    "label": "Litecoin Foundation · news"
  },
  {
    "url": "https://www.litvm.com/blog/introducing-litvm-v2",
    "label": "LitVM · V2 roadmap"
  },
  {
    "url": "https://github.com/litecoin-project/litecoin/releases",
    "label": "Litecoin Core · releases"
  },
  {
    "url": "https://timechaincalendar.com/",
    "label": "Timechain Calendar"
  },
  {
    "url": "https://mnav.com/companies/strategy",
    "label": "mNAV · Strategy"
  },
  {
    "url": "https://mnav.com/companies/strive",
    "label": "mNAV · Strive"
  },
  {
    "url": "https://satnamsatoshi.com/",
    "label": "Satnam Satoshi"
  }
];
export const november17Chapters: November17Chapter[] = [
  {
    "id": "market",
    "page": 4,
    "kicker": "MARKET TAPE",
    "title": "Tuesday spot: the clock stays visible.",
    "dek": "USD references; approximately 09:12 ET, 17 November.",
    "hero": "",
    "paragraphs": [
      "1 BTC ≈ 1,439.58 LTC 1 LTC ≈ 321.17 XLM Ratios derive from the same spot set. They are not claims about relative security, utility or fair value."
    ],
    "headers": [
      "ASSET",
      "SPOT",
      "DAY",
      "HIGH",
      "LOW"
    ],
    "rows": [
      [
        "BTC",
        "$64,954",
        "+1.41%",
        "$65,475",
        "$63,976"
      ],
      [
        "LTC",
        "$45.12",
        "+1.92%",
        "$45.35",
        "$43.92"
      ],
      [
        "XLM",
        "$0.140485",
        "+2.69%",
        "$0.141127",
        "$0.135975"
      ],
      [
        "DOGE",
        "$0.059509",
        "+1.98%",
        "$0.059847",
        "$0.058105"
      ],
      [
        "PEPE",
        "$0.00000385",
        "+1.32%",
        "$0.00000397",
        "$0.00000377"
      ]
    ],
    "sources": []
  },
  {
    "id": "flows",
    "page": 5,
    "kicker": "FUND-FLOW DESK",
    "title": "Monday is final. Tuesday is not.",
    "dek": "U.S. comparable Bitcoin ETF flow universe; complete data through 16 November.",
    "hero": "+$7.9M",
    "paragraphs": [
      "November 16 printed +$7.9M: IBIT +$76.5M; FBTC -$11.3M; ARKB -$4.3M; BTCO -$6.5M; EZBC -$3.8M; MSBT -$1.5M; GBTC -$34.6M; BTC -$6.6M; BITB, BRRR, HODL and BTCW flat. November 17 cells remain dashes and are excluded."
    ],
    "headers": [
      "WINDOW",
      "FLOW",
      "COVERAGE"
    ],
    "rows": [
      [
        "1 day",
        "+$7.9M",
        "Nov 16 complete"
      ],
      [
        "7 calendar days",
        "-856.4M",
        "Nov 10-16 / 5 final sessions"
      ],
      [
        "30 calendar days",
        "-2240.3M",
        "Oct 18-Nov 16 / 21 final sessions"
      ]
    ],
    "sources": [
      0
    ]
  },
  {
    "id": "ibit",
    "page": 6,
    "kicker": "PROFILE / IBIT",
    "title": "The 13F says what was reported—not whose capital it was.",
    "dek": "Official IBIT quarter-end filing plus Bank of America manager-level 13F table.",
    "hero": "",
    "paragraphs": [
      "The 13F information table contains three IBIT rows: 982,740 shares / $46,522,911; 28,379 / $1,343,462; and 13,468,158 / $637,582,600. Their sum is a September 30 manager-level reported position—not proof of a November 16 purchase, current ownership, proprietary capital or customer capital."
    ],
    "headers": [
      "FIELD",
      "VALUE",
      "SOURCE"
    ],
    "rows": [
      [
        "IBIT BTC",
        "801,033 BTC",
        "Issuer / Sep 30"
      ],
      [
        "IBIT fair value",
        "$67.044B",
        "Issuer / Sep 30"
      ],
      [
        "IBIT net assets",
        "$67.031B",
        "Issuer / Sep 30"
      ],
      [
        "IBIT shares",
        "1,414,760,000",
        "Issuer / Sep 30"
      ],
      [
        "BofA reported IBIT",
        "14,479,277 shares",
        "13F / Sep 30"
      ],
      [
        "BofA reported value",
        "$685,448,973",
        "13F / Sep 30"
      ],
      [
        "Manager rows",
        "3",
        "13F table"
      ],
      [
        "Tracker BTC",
        "783,448.3 BTC",
        "Tracker / Nov 16"
      ],
      [
        "Latest final flow",
        "+$76.5M",
        "Tracker / Nov 16"
      ],
      [
        "Collateral class",
        "Fund collateral",
        "Editorial"
      ]
    ],
    "sources": [
      1,
      2,
      9,
      0
    ]
  },
  {
    "id": "bitcoin-products",
    "page": 7,
    "kicker": "THE 21 STANDARD",
    "title": "Twenty-one ranked Bitcoin products.",
    "dek": "Mixed global ETF, ETP, trust and fund universe; tracker quantities dated November 16.",
    "hero": "",
    "paragraphs": [],
    "headers": [
      "RANK",
      "PRODUCT / STRUCTURE",
      "BTC"
    ],
    "rows": [
      [
        "1",
        "IBIT / U.S. ETF",
        "783,448.3"
      ],
      [
        "2",
        "FBTC / U.S. ETF",
        "173,765.6"
      ],
      [
        "3",
        "GBTC / U.S. trust ETF",
        "123,148.9"
      ],
      [
        "4",
        "BTC / U.S. mini trust",
        "62,258.3"
      ],
      [
        "5",
        "CoinShares XBT / ETP",
        "48,466.0"
      ],
      [
        "6",
        "BITB / U.S. ETF",
        "36,698.1"
      ],
      [
        "7",
        "ARKB / U.S. ETF",
        "28,439.9"
      ],
      [
        "8",
        "Purpose BTCC / Canada",
        "21,047.2"
      ],
      [
        "9",
        "HODL / U.S. ETF",
        "14,267.3"
      ],
      [
        "10",
        "3iQ Bitcoin Fund",
        "13,000.0"
      ],
      [
        "11",
        "ETC Group BTCE / ETP",
        "12,967.5"
      ],
      [
        "12",
        "Bitwise Physical BTCE",
        "12,089.7"
      ],
      [
        "13",
        "MSBT / U.S. ETP",
        "11,625.4"
      ],
      [
        "14",
        "BITW / index fund",
        "10,784.0"
      ],
      [
        "15",
        "Hashdex Nasdaq / Brazil",
        "9,254.6"
      ],
      [
        "16",
        "CI Galaxy BTCX / Canada",
        "8,923.3"
      ],
      [
        "17",
        "21Shares ABTC / ETP",
        "8,915.9"
      ],
      [
        "18",
        "Fidelity Advantage / Canada",
        "8,664.3"
      ],
      [
        "19",
        "VanEck Bitcoin ETN",
        "6,868.0"
      ],
      [
        "20",
        "Grayscale GDLC / index",
        "5,750.5"
      ],
      [
        "21",
        "Valkyrie BRRR / U.S. ETF",
        "5,719.5"
      ]
    ],
    "sources": [
      9
    ]
  },
  {
    "id": "bitcoin-treasuries",
    "page": 8,
    "kicker": "PUBLIC-COMPANY LEDGER",
    "title": "Twenty-one ranked issuer / tracker observations.",
    "dek": "Strategy and Strive use November 16 filings; remaining rows use the November 16 tracker.",
    "hero": "",
    "paragraphs": [
      "Corporate treasury rows are beneficial holdings; they are not fund collateral, exchange custody, wrapped reserves, miner balances or MWEB."
    ],
    "headers": [
      "RANK",
      "PUBLIC COMPANY",
      "BTC / TRACKER"
    ],
    "rows": [
      [
        "1",
        "Strategy / SEC Nov 15",
        "850,849"
      ],
      [
        "2",
        "Strive / SEC Nov 13",
        "43,404"
      ],
      [
        "3",
        "Twenty One Capital",
        "37,229.7"
      ],
      [
        "4",
        "MARA",
        "35,577"
      ],
      [
        "5",
        "Metaplanet",
        "35,102"
      ],
      [
        "6",
        "Bullish",
        "24,340"
      ],
      [
        "7",
        "Galaxy Digital",
        "17,102"
      ],
      [
        "8",
        "Hut 8",
        "15,679"
      ],
      [
        "9",
        "Coinbase",
        "14,458"
      ],
      [
        "10",
        "CleanSpark",
        "13,530"
      ],
      [
        "11",
        "Bitcoin Group SE",
        "12,387"
      ],
      [
        "12",
        "Tesla",
        "11,509"
      ],
      [
        "13",
        "Riot Platforms",
        "11,380"
      ],
      [
        "14",
        "Block",
        "9,237"
      ],
      [
        "15",
        "American Bitcoin",
        "8,002"
      ],
      [
        "16",
        "GD Culture",
        "7,500"
      ],
      [
        "17",
        "Next Technology",
        "5,833"
      ],
      [
        "18",
        "Nakamoto / KindlyMD",
        "5,764.9"
      ],
      [
        "19",
        "ProCap BTC",
        "4,932"
      ],
      [
        "20",
        "GameStop",
        "4,710"
      ],
      [
        "21",
        "Empery Digital",
        "4,081.4"
      ]
    ],
    "sources": [
      10,
      11,
      9
    ]
  },
  {
    "id": "strategy",
    "page": 9,
    "kicker": "PROFILE / STRATEGY",
    "title": "The November 16 filing resets the ledger.",
    "dek": "Filed November 16; purchase window November 9-15.",
    "hero": "850,849 BTC",
    "paragraphs": [
      "Strategy bought 485 BTC for $33.4 million at an average $68,887. It reported aggregate holdings of 850,849 BTC at $64.20 billion aggregate purchase price and $75,452 average cost. The filing also reports 2,087,040 MSTR shares sold for $244.7 million net proceeds: $33.4 million for BTC, $206.3 million for STRC repurchases and $5.0 million retained as cash."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "Issuer total",
        "850,849 BTC / Nov 15"
      ],
      [
        "Purchase",
        "485 BTC / Nov 9-15"
      ],
      [
        "Purchase price",
        "$33.4M / avg $68,887"
      ],
      [
        "Aggregate cost",
        "$64.20B / avg $75,452"
      ],
      [
        "mNAV tracker",
        "0.85x / holdings lag"
      ]
    ],
    "sources": [
      10,
      24
    ]
  },
  {
    "id": "strive",
    "page": 10,
    "kicker": "PROFILE / STRIVE",
    "title": "The November 16 filing controls the row.",
    "dek": "Filed November 16; purchase window November 7-13.",
    "hero": "43,404 BTC / ISSUER",
    "paragraphs": [
      "Strive bought 251 BTC at an average approximately $69,853 including fees, lifting holdings to 43,404 BTC as of November 13. It also reported $465.3 million of cash and cash equivalents plus 505,000 STRC shares with a $50.455 million fair value. The dated filing controls; the mNAV tracker still lagged."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "Issuer quantity",
        "43,404 BTC / Nov 13"
      ],
      [
        "Change vs Nov 6",
        "+251 BTC"
      ],
      [
        "Purchase average",
        "~$69,853 incl. fees"
      ],
      [
        "Cash / equivalents",
        "$465.3M"
      ],
      [
        "STRC",
        "505,000 / $50.455M"
      ]
    ],
    "sources": [
      11,
      25
    ]
  },
  {
    "id": "register",
    "page": 11,
    "kicker": "LITECOIN INSTITUTIONAL REGISTER",
    "title": "One hundred holders. Six distinct categories.",
    "dek": "Same-day summary dated November 17; mixed-date tracker, not beneficial ownership.",
    "hero": "15,895,613 LTC",
    "paragraphs": [
      "The tracker combines figures reported on different dates and by different methods. It warns that some coins can be counted twice-for example, fund collateral held at an exchange. Address classifications are not proof of beneficial ownership or comparable net flow."
    ],
    "headers": [
      "CATEGORY",
      "LTC"
    ],
    "rows": [
      [
        "Exchange custody",
        "10,861,881"
      ],
      [
        "Investment products",
        "2,470,258"
      ],
      [
        "Ecosystem / protocol",
        "1,416,425"
      ],
      [
        "Treasury",
        "800,689"
      ],
      [
        "Miner reserves",
        "335,595"
      ],
      [
        "Government",
        "10,765"
      ]
    ],
    "sources": [
      3
    ]
  },
  {
    "id": "litecoin-products",
    "page": 12,
    "kicker": "LITECOIN PRODUCTS",
    "title": "Twenty-one ranked slots from a verified universe of twenty-three.",
    "dek": "Category checked November 17. ETFs, ETPs, trusts and funds retain their labels.",
    "hero": "",
    "paragraphs": [
      "Slots 22-23: Virtune Crypto Top 10 and WisdomTree Physical Crypto Mega Cap, both zero. Category 2,470,235 LTC; homepage 2,470,258 LTC: 23-LTC conflict."
    ],
    "headers": [
      "SLOT",
      "PRODUCT / VEHICLE",
      "LTC"
    ],
    "rows": [
      [
        "1",
        "Grayscale / trust",
        "1,950,399"
      ],
      [
        "2",
        "Canary / U.S. ETF",
        "221,158"
      ],
      [
        "3",
        "CoinShares Physical / ETP",
        "158,396"
      ],
      [
        "4",
        "Bitwise Physical / ETP",
        "87,489"
      ],
      [
        "5",
        "Virtune Litecoin / ETP",
        "20,566"
      ],
      [
        "6",
        "Virtune Altcoin / ETP",
        "18,564"
      ],
      [
        "7",
        "WisdomTree Altcoins / ETP",
        "4,132"
      ],
      [
        "8",
        "Valour Litecoin / ETP",
        "3,602"
      ],
      [
        "9",
        "Bitwise MSCI / ETP",
        "2,850"
      ],
      [
        "10",
        "21Shares Flexible / ETP",
        "977"
      ],
      [
        "11",
        "WisdomTree CoinDesk20",
        "908"
      ],
      [
        "12",
        "21Shares Select 10",
        "671"
      ],
      [
        "13",
        "Virtune Coinbase50",
        "523"
      ],
      [
        "14",
        "21Shares Basket / ETP",
        "0"
      ],
      [
        "15",
        "21Shares Future / ETP",
        "0"
      ],
      [
        "16",
        "Bitwise 10 Crypto / fund",
        "0"
      ],
      [
        "17",
        "Finanzen Top 10 / ETP",
        "0"
      ],
      [
        "18",
        "Physical Top 10 / ETP",
        "0"
      ],
      [
        "19",
        "CoinShares XBT LTC / ETP",
        "0"
      ],
      [
        "20",
        "Grayscale Large Cap / fund",
        "0"
      ],
      [
        "21",
        "Hashdex Momentum / ETP",
        "0"
      ]
    ],
    "sources": [
      5
    ]
  },
  {
    "id": "litecoin-treasuries",
    "page": 13,
    "kicker": "LITECOIN TREASURIES",
    "title": "Eleven positive observations. One zero. Nine open slots.",
    "dek": "Verified tracker universe: 12 entries, 800,689 LTC as of November 17.",
    "hero": "",
    "paragraphs": [],
    "headers": [
      "SLOT",
      "ENTITY / CLASS",
      "LTC"
    ],
    "rows": [
      [
        "1",
        "Lite Strategy / public",
        "751,798"
      ],
      [
        "2",
        "Luxxfolio / public",
        "26,918"
      ],
      [
        "3",
        "Consensus / public",
        "14,189"
      ],
      [
        "4",
        "FRMO / public",
        "2,116"
      ],
      [
        "5",
        "Datacentrex / public",
        "1,745"
      ],
      [
        "6",
        "Winland / public",
        "1,385"
      ],
      [
        "7",
        "Horizon Kinetics / public",
        "1,298"
      ],
      [
        "8",
        "DeFi Technologies / public",
        "449"
      ],
      [
        "9",
        "BTC Digital / public",
        "430"
      ],
      [
        "10",
        "Scrypt Strategy / private",
        "361"
      ],
      [
        "11",
        "Z Squared / public",
        "1"
      ],
      [
        "12",
        "SOLAI / public",
        "0"
      ],
      [
        "13",
        "Research slot",
        "Unavailable"
      ],
      [
        "14",
        "Research slot",
        "Unavailable"
      ],
      [
        "15",
        "Research slot",
        "Unavailable"
      ],
      [
        "16",
        "Research slot",
        "Unavailable"
      ],
      [
        "17",
        "Research slot",
        "Unavailable"
      ],
      [
        "18",
        "Research slot",
        "Unavailable"
      ],
      [
        "19",
        "Research slot",
        "Unavailable"
      ],
      [
        "20",
        "Research slot",
        "Unavailable"
      ],
      [
        "21",
        "Research slot",
        "Unavailable"
      ]
    ],
    "sources": [
      6
    ]
  },
  {
    "id": "mweb",
    "page": 14,
    "kicker": "MWEB DESK",
    "title": "A protocol balance—and a live-source conflict.",
    "dek": "Litecoin Register surfaces retrieved November 17.",
    "hero": "545,571 / 545,273",
    "paragraphs": [
      "The Register homepage top-holder list printed 545,571 LTC for MWEB while the extension-block surface exposed 545,273 LTC, a 298-LTC difference. The available category render was stale, so daily, seven-day and thirty-day changes are withheld. MWEB is a protocol-balance series, not identified ownership, fund collateral or investor flow."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "Homepage observation",
        "545,571 LTC"
      ],
      [
        "Category observation",
        "545,273 LTC"
      ],
      [
        "Difference",
        "298 LTC"
      ],
      [
        "Daily change",
        "Unavailable"
      ],
      [
        "7d / 30d",
        "Unavailable / unavailable"
      ],
      [
        "Class",
        "Protocol balance"
      ]
    ],
    "sources": [
      3,
      4
    ]
  },
  {
    "id": "morpho-ltc",
    "page": 15,
    "kicker": "MORPHO / BASE",
    "title": "cbLTC / USDC",
    "dek": "Read-only market observation. No wallet connected; no transaction submitted.",
    "hero": "",
    "paragraphs": [
      "November 17 snapshot near 09:05 ET. Loans divided by displayed market size is about 31.9%, not the interface's 86.30%; asynchronous fields are preserved without normalization. Curators shown: Clearstar, Steakhouse, Yearn, K3 and Gauntlet. Rates can move at any block."
    ],
    "headers": [
      "METRIC",
      "DISPLAY"
    ],
    "rows": [
      [
        "Market size / supplied",
        "$2.17M"
      ],
      [
        "Loans",
        "$691.62K / 691.8K USDC"
      ],
      [
        "Liquidity",
        "$1.48M / 1.48M USDC"
      ],
      [
        "Utilization / basis",
        "86.30% UI / ~31.9% rounded basis"
      ],
      [
        "Borrow / lend 6h",
        "7.10% / 6.35%"
      ],
      [
        "Spread",
        "0.75 pp"
      ],
      [
        "Instant / 24h / 7d",
        "6.80% / 7.01% / 7.17%"
      ],
      [
        "LLTV",
        "62.5%"
      ],
      [
        "Penalty",
        "12.67%"
      ],
      [
        "Bad debt",
        "$0"
      ],
      [
        "Oracle / Chainlink",
        "$45.10 / $45.1304"
      ],
      [
        "Oracle security",
        "1d / 0.5% / $3.97M"
      ]
    ],
    "sources": [
      7
    ]
  },
  {
    "id": "morpho-btc",
    "page": 16,
    "kicker": "MORPHO / BASE",
    "title": "cbBTC / USDC",
    "dek": "The same protocol, a radically larger liquidity surface.",
    "hero": "",
    "paragraphs": [
      "November 17 snapshot near 09:06 ET. Chainlink's latest displayed value was $64,980.43. Rounded loans divided by loans plus liquidity is about 84.4%, not 86.44%. Curators shown include Steakhouse, Gauntlet, SparkDAO, Pangolins and Clearstar. Configuration roles are not insurance."
    ],
    "headers": [
      "METRIC",
      "DISPLAY"
    ],
    "rows": [
      [
        "Market size / supplied",
        "$1.81B"
      ],
      [
        "Loans",
        "$1.52B"
      ],
      [
        "Liquidity",
        "$281.15M / 281.22M USDC"
      ],
      [
        "Utilization / basis",
        "86.44% UI / ~84.4% rounded basis"
      ],
      [
        "Borrow / lend 6h",
        "5.23% / 4.50%"
      ],
      [
        "Spread",
        "0.73 pp"
      ],
      [
        "Instant / 24h / 7d",
        "5.23% / 5.23% / 5.31%"
      ],
      [
        "LLTV",
        "86.0%"
      ],
      [
        "Penalty",
        "4.38%"
      ],
      [
        "Bad debt",
        "$0 realized / $0 unrealized"
      ],
      [
        "Oracle / external",
        "$64,978 / $65,002.59"
      ],
      [
        "Chainlink security",
        "20m / 0.1% / $4.46B"
      ]
    ],
    "sources": [
      8
    ]
  },
  {
    "id": "morpho-risk",
    "page": 17,
    "kicker": "MORPHO CREDENTIALS",
    "title": "Identify the market before the rate.",
    "dek": "Exact IDs, oracles, curator names and scope limits.",
    "hero": "",
    "paragraphs": [
      "cbLTC curators displayed Clearstar, Steakhouse, Yearn, K3 and Gauntlet. cbBTC displayed Steakhouse, Gauntlet, SparkDAO, Pangolins, Clearstar and others. Curator credentials are configuration roles, not insurance or endorsement; audit scope was not independently refreshed."
    ],
    "headers": [
      "RISK",
      "EDITORIAL CHECK"
    ],
    "rows": [
      [
        "Wrapper",
        "Custodian, redemption, depeg"
      ],
      [
        "Oracle",
        "Feed integrity, lag, failure"
      ],
      [
        "LLTV",
        "Liquidation threshold"
      ],
      [
        "Liquidity",
        "Displayed, not guaranteed"
      ],
      [
        "Rate",
        "Variable observation"
      ],
      [
        "Curator",
        "Configuration role, not insurance"
      ],
      [
        "Audit",
        "Match scope and deployment"
      ]
    ],
    "sources": [
      7,
      8
    ],
    "identities": [
      {
        "label": "cbLTC / USDC market",
        "market": "0x9125d0fa03c3137166df68bcc72283477830de2a4a5536512374c573ad4583c3",
        "oracle": "0x47f961E6653423A77b1EF8Fb680eE53bf7d8a00d",
        "collateral": "0xcb17C9Db87B595717C857a08468793f5bAb6445F"
      },
      {
        "label": "cbBTC / USDC market",
        "market": "0x9103c3b4e834476c9a62ea009ba2c884ee42e94e6e314a26f04d312434191836",
        "oracle": "0x663BECd10daE6C4A3Dcd89F1d76c1174199639B9",
        "collateral": "0xcbb7C0000aB88B473b1f5AFD9ef808440eEd33BF"
      }
    ]
  },
  {
    "id": "circle",
    "page": 18,
    "kicker": "CIRCLE + ARC",
    "title": "Wrapped reserves get their own ledger.",
    "dek": "cirBTC issuer report as of 16 November, 07:00; timezone not stated.",
    "hero": "5,922.44 cirBTC",
    "paragraphs": [
      "Circle reports 5,923.68 BTC of reserves against 5,922.44 cirBTC in circulation, a 1.24 BTC surplus. Arc carries 5,518.86 cirBTC and Ethereum 403.58. This is wrapped-token reserve backing—not Circle corporate treasury, ETF collateral, exchange custody or native-Bitcoin ownership by token holders."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "Total cirBTC supply",
        "5,922.44"
      ],
      [
        "BTC reserves",
        "5,923.68"
      ],
      [
        "Reserve surplus",
        "1.24 BTC"
      ],
      [
        "Arc supply",
        "5,518.86 cirBTC"
      ],
      [
        "Ethereum supply",
        "403.58 cirBTC"
      ],
      [
        "USD supply value",
        "$384.10M"
      ]
    ],
    "sources": [
      12,
      13
    ]
  },
  {
    "id": "policy",
    "page": 19,
    "kicker": "POLICY DESK",
    "title": "The status line stays precise.",
    "dek": "SEC and CFTC feeds checked November 17; no same-day crypto-specific action located.",
    "hero": "NO NEW CRYPTO ACTION",
    "paragraphs": [
      "The SEC staff FAQ updated November 2 remains the newest directly relevant item located and explicitly has no legal force or effect. The SEC's November 13 compensation-disclosure proposal is not a crypto rule. The latest CFTC crypto FAQ update located remains September 24. Absence from the checked feeds is not proof that no other proceeding exists."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "SEC crypto FAQ",
        "Updated / Nov 2"
      ],
      [
        "Legal force",
        "None / staff views"
      ],
      [
        "SEC Nov 13",
        "Compensation proposal"
      ],
      [
        "CFTC crypto FAQ",
        "Staff update / Sep 24"
      ],
      [
        "Same-day crypto action",
        "None located"
      ]
    ],
    "sources": [
      14,
      15,
      16
    ]
  },
  {
    "id": "builders",
    "page": 20,
    "kicker": "BUILDER TRACKER",
    "title": "Newness is a dated claim.",
    "dek": "Primary release and project records checked November 17.",
    "hero": "NO SAME-DAY RELEASE",
    "paragraphs": [
      "LND v0.21.8-beta remains the newest located Lightning release, published November 11 with verified signing material. Bitcoin Core 32.1, Core Lightning v26.06.10, Litecoin Core v0.21.5.8 and the LitVM V2 roadmap remain the dated records. No November 17 Litecoin Core, LitVM or Foundation release was located."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "LND",
        "v0.21.8-beta / Nov 11"
      ],
      [
        "Bitcoin Core",
        "32.1 / Oct 28"
      ],
      [
        "Core Lightning",
        "26.06.10 / Nov 4"
      ],
      [
        "Litecoin Core",
        "0.21.5.8 / Sep 12"
      ],
      [
        "LitVM",
        "V2 roadmap / Oct 27"
      ]
    ],
    "sources": [
      17,
      18,
      19,
      21,
      22
    ]
  },
  {
    "id": "foundation",
    "page": 21,
    "kicker": "LITECOIN FOUNDATION",
    "title": "Fifteen years; fifteen milestones.",
    "dek": "Newest official news item located remains the October 13 retrospective.",
    "hero": "15 × 15",
    "paragraphs": [
      "The anniversary article is a retrospective editorial record, not a November 17 protocol release. The Foundation event calendar lists CryptoCon Sydney for November 28-29 and Litecoin as a Silver Partner; that is a dated event listing, not technical deployment or endorsement of this publication."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "Newest news located",
        "Oct 13 retrospective"
      ],
      [
        "Next listed event",
        "CryptoCon Sydney"
      ],
      [
        "Event dates",
        "Nov 28-29"
      ],
      [
        "Paid placement here",
        "No"
      ],
      [
        "Affiliation implied",
        "No"
      ]
    ],
    "sources": [
      20
    ]
  },
  {
    "id": "lightning",
    "page": 22,
    "kicker": "LIGHTNING DESK",
    "title": "Two implementations; dated release records.",
    "dek": "Bitcoin and Litecoin Lightning metrics remain separate.",
    "hero": "VERIFY THE BUILD",
    "paragraphs": [
      "LND v0.21.8-beta, published November 11, includes signed release artifacts, OpenTimestamps material and reproducible-build instructions. Core Lightning v26.06.10, published November 4, remains the newest located release for that implementation. Comparable node, channel, capacity and payment-volume data were not obtained, so none are inferred."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "LND",
        "v0.21.8-beta / Nov 11"
      ],
      [
        "Core Lightning",
        "v26.06.10 / Nov 4"
      ],
      [
        "Bitcoin public capacity",
        "Unavailable"
      ],
      [
        "Litecoin public capacity",
        "Unavailable"
      ],
      [
        "Payment volume",
        "Unavailable"
      ]
    ],
    "sources": [
      18,
      19
    ]
  },
  {
    "id": "timechain",
    "page": 23,
    "kicker": "TIMECHAIN CALENDAR",
    "title": "An empty live field beats a plausible one.",
    "dek": "The JavaScript shell was reached November 17; numeric state was not captured.",
    "hero": "UNAVAILABLE",
    "paragraphs": [
      "A future edition should preserve block hash, source, retrieval time and machine-readable observation together. This issue does not backfill current-chain metrics from memory."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "Block height",
        "Unavailable"
      ],
      [
        "Latest hash",
        "Unavailable"
      ],
      [
        "Timestamp",
        "Unavailable"
      ],
      [
        "Fee bands",
        "Unavailable"
      ],
      [
        "Epoch progress",
        "Unavailable"
      ],
      [
        "Halving estimate",
        "Unavailable"
      ]
    ],
    "sources": [
      23
    ]
  },
  {
    "id": "wider-set",
    "page": 24,
    "kicker": "WIDER SETTLEMENT DESK",
    "title": "Material context, no forced narrative.",
    "dek": "XLM, DOGE and PEPE are spot context only; inclusion is not endorsement.",
    "hero": "XLM / DOGE / PEPE",
    "paragraphs": [
      "Tuesday references were XLM $0.140485, DOGE $0.059509 and PEPE $0.00000385, up 2.69%, 1.98% and 1.32% against the provider's previous close. DOGE remains relevant through Scrypt merged-mining context; XLM and PEPE have no forced Litecoin narrative here."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "XLM",
        "Settlement / tokenization lens"
      ],
      [
        "DOGE",
        "Merged-mining context"
      ],
      [
        "PEPE",
        "Meme-token risk context"
      ],
      [
        "Inclusion",
        "Not endorsement"
      ]
    ],
    "sources": []
  },
  {
    "id": "mnav",
    "page": 25,
    "kicker": "MNAV SNAPSHOT",
    "title": "Useful ratios; lagging holdings fields.",
    "dek": "Tracker values retrieved November 17; issuer filings control BTC totals.",
    "hero": "0.85x / 1.06x",
    "paragraphs": [
      "mNAV displayed 0.85x for Strategy and 1.06x for Strive, but its holdings fields lagged the November 16 filings: 850,364 vs 850,849 BTC for Strategy and about 43,000 vs 43,404 BTC for Strive. Ratios are reproduced as tracker outputs, not recomputed or promoted to issuer facts."
    ],
    "headers": [
      "FIELD",
      "VALUE"
    ],
    "rows": [
      [
        "Strategy mNAV",
        "0.85x / tracker"
      ],
      [
        "Strategy BTC field",
        "850,364 / stale"
      ],
      [
        "Strive mNAV",
        "1.06x / close"
      ],
      [
        "Strive BTC field",
        "~43,000 / stale"
      ],
      [
        "Issuer control totals",
        "850,849 / 43,404"
      ]
    ],
    "sources": [
      24,
      25,
      10,
      11
    ]
  }
];
