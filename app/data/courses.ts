export type LessonSource = { id: string; title: string; url: string };
export type CourseId = 'foundations' | 'deep-dive' | 'sovereignty';
export type Course = {
  id: CourseId; title: string; level: string; description: string;
  outcome: string; prerequisite: string; duration: string;
};
export type Lesson = {
  courseId: CourseId; order: number; slug: string; title: string; description: string;
  minutes: number; outcomes: string[];
  sections: { title: string; paragraphs: string[]; sourceIds?: string[] }[];
  exercise: { title: string; prompt: string; answer: string };
  quiz: { question: string; options: string[]; answer: string }[];
  takeaway: string; sources: LessonSource[];
};

export const curriculumVersion = '2026-10-01';

export const courses: Course[] = [
  {
    "id": "foundations",
    "title": "Bitcoin Foundations",
    "level": "Beginner",
    "description": "Start with money, keys and payments. Build confidence through clear explanations, everyday examples and paper exercises.",
    "outcome": "Explain a payment, spot common risks and read Bitcoin claims with confidence.",
    "prerequisite": "No prior Bitcoin knowledge. No wallet or purchase required.",
    "duration": "21 lessons · About 4 hours including practice"
  },
  {
    "id": "deep-dive",
    "title": "Bitcoin Deep Dive",
    "level": "Advanced",
    "description": "For curious builders and Bitcoin maxis who want to verify the details: transactions, consensus, wallet standards, nodes and Lightning.",
    "outcome": "Trace Bitcoin’s technical rules and distinguish consensus, policy and operational assumptions.",
    "prerequisite": "Comfort with Foundations, basic arithmetic and technical vocabulary. All lessons remain open.",
    "duration": "21 lessons · About 5 hours including practice"
  },
  {
    "id": "sovereignty",
    "title": "Sovereignty & Self-Custody",
    "level": "Expert",
    "description": "Design recovery and accountable operations. Compare native Bitcoin and Lightning with wrapped collateral, USDC and lending without hiding the dependencies.",
    "outcome": "Create a defensible custody and treasury design, including the evidence needed to decide not to deploy.",
    "prerequisite": "Comfort with Deep Dive. Scenarios use fictional records; no funds or credentials are needed.",
    "duration": "21 lessons · About 5 hours including practice"
  }
];

export const lessons: Lesson[] = [
  {
    "slug": "bitcoin-without-jargon",
    "title": "Bitcoin without jargon",
    "description": "Start with sats, shared rules and the habit of checking evidence. No purchase or wallet needed.",
    "minutes": 8,
    "outcomes": [
      "Convert a small amount between BTC and sats.",
      "Explain the different jobs of signatures, nodes and proof of work.",
      "Recognize what a payment record cannot prove."
    ],
    "sections": [
      {
        "title": "A small unit is a useful place to start",
        "paragraphs": [
          "Bitcoin lets people send value over a shared network. BTC is a unit used to express the amount. One BTC equals 100,000,000 satoshis, usually shortened to sats. You do not need to use a whole BTC: 1,000 sats is 0.00001000 BTC, and 100,000 sats is 0.00100000 BTC.",
          "Write the unit every time. Imagine a poster has an illustrative price of 25,000 sats. That is 0.00025000 BTC. The conversion tells you the quantity, not what it is worth in your local currency or whether the poster is fairly priced."
        ],
        "sourceIds": [
          "bitcoin-payments"
        ]
      },
      {
        "title": "Who checks the rules?",
        "paragraphs": [
          "A digital signature authorizes spending. Nodes running Bitcoin software check transactions and blocks against the rules they enforce. Miners compete to find proof of work for new blocks. Proof of work makes producing blocks costly and checking that work comparatively easy.",
          "These roles fit together: a miner cannot make an invalid transaction acceptable to a node simply by doing more work. The system is designed to let participants verify a shared payment history without one central bookkeeper."
        ],
        "sourceIds": [
          "whitepaper"
        ]
      },
      {
        "title": "Verification has limits",
        "paragraphs": [
          "A payment record is evidence that value moved under the network’s rules. It does not tell you whether a seller delivered a painting, a meal was safe or a community organizer kept a promise. Those questions need people, clear agreements and evidence from the world.",
          "At Satnam Satoshi, proof of service means a proposed process of human review. It is separate from Bitcoin’s proof of work. A meal claim is not mining, and generating a report does not create bitcoin or an automatic reward."
        ]
      },
      {
        "title": "A standard for our own work",
        "paragraphs": [
          "Our use of “Nakamoto standard” describes a project commitment: make rules understandable, make evidence checkable and reduce unnecessary dependence on one provider. It is not a new technical standard or an endorsement by Bitcoin’s creators.",
          "Start with questions: What is the claim? Where is the source? What can I verify myself? What still depends on somebody else? You can use those questions before you hold any bitcoin."
        ]
      }
    ],
    "exercise": {
      "title": "Try a conversion on paper",
      "prompt": "A sample contribution is described as 0.00050000 BTC. How many sats is that? What extra information would you need before deciding whether any real payment is appropriate?",
      "answer": "It is 50,000 sats: multiply the BTC amount by 100,000,000. You would still need the purpose, recipient, agreed terms and fees. The example is a unit exercise, not a request to pay."
    },
    "quiz": [
      {
        "question": "How many sats are in 0.001 BTC?",
        "options": [
          "A. 100",
          "B. 100,000",
          "C. 1,000,000"
        ],
        "answer": "B. 100,000 sats. Keeping the unit beside the number helps prevent mistakes."
      },
      {
        "question": "Can more mining work make an invalid transaction valid to a node?",
        "options": [
          "A. Yes, if enough energy is used",
          "B. No, the node still applies its validation rules"
        ],
        "answer": "B. Proof of work does not remove the rules a node uses to validate a transaction."
      },
      {
        "question": "Does a Bitcoin payment prove that a community meal happened?",
        "options": [
          "A. Yes",
          "B. No"
        ],
        "answer": "B. Payment evidence and evidence of real-world service are different. A service claim still needs accountable human review."
      }
    ],
    "takeaway": "Count carefully, check the rules and ask what the evidence actually establishes.",
    "sources": [
      {
        "id": "bitcoin-payments",
        "title": "Bitcoin developer guide · Payment processing and units",
        "url": "https://developer.bitcoin.org/devguide/payment_processing.html"
      },
      {
        "id": "whitepaper",
        "title": "Satoshi Nakamoto · Bitcoin: A Peer-to-Peer Electronic Cash System",
        "url": "https://bitcoin.org/bitcoin.pdf"
      }
    ],
    "courseId": "foundations",
    "order": 1
  },
  {
    "slug": "keys-and-custody",
    "title": "Keys, custody and keeping control",
    "description": "Understand who can authorize spending, what must stay private and why a backup matters.",
    "minutes": 9,
    "outcomes": [
      "Distinguish receiving information from a wallet secret.",
      "Describe the responsibilities of self-custody and the dependence of custodial use.",
      "Reject a dangerous support request without needing a wallet demonstration."
    ],
    "sections": [
      {
        "title": "The wallet and the keys do different jobs",
        "paragraphs": [
          "A wallet is software or a device that helps manage the credentials used to authorize spending. It does not store little digital coins inside your phone. The network records transactions; your keys let you authorize spending the funds they control.",
          "A receiving address can be shared with someone who needs to pay you. A private key or recovery phrase is different: it can give someone the power to spend. A public username is not a recovery method, and knowing your address does not give a helper permission to move your funds."
        ],
        "sourceIds": [
          "bitcoin-wallets"
        ]
      },
      {
        "title": "Know who holds the authority",
        "paragraphs": [
          "With self-custody, you hold the credentials and take responsibility for protecting and recovering them. Losing the only usable backup can mean losing access permanently. A custodian holds funds on your behalf; you depend on its security, solvency and withdrawal policies.",
          "A friendly interface does not tell you which model you are using. Before choosing a real wallet, read its own documentation: who can authorize a payment, what happens if the provider disappears, and how recovery works. This lesson is a way to understand those questions, not a recommendation to move your money."
        ],
        "sourceIds": [
          "bitcoin-custody"
        ]
      },
      {
        "title": "A backup should remain under your control",
        "paragraphs": [
          "Wallets have different backup designs. Follow the documented recovery process for the wallet you choose and understand it before depending on it. Recovery information belongs in a secure, private backup—not in a public document, cloud screenshot, support chat, AI conversation or GitHub issue.",
          "For this course, use invented labels on paper such as “receiving address” and “private recovery information.” Do not write a real recovery phrase in an exercise. Satnam Satoshi never needs it to teach you, invite you to a meetup or offer you a meal."
        ],
        "sourceIds": [
          "bitcoin-security"
        ]
      },
      {
        "title": "Protect privacy as well as access",
        "paragraphs": [
          "Bitcoin transactions are public. Publishing a name beside an address can make that person’s activity easier to follow. Only share receiving information where it is needed; avoid posting someone else’s payment details or a screenshot of their wallet without permission.",
          "If an unexpected message asks you to “verify,” “synchronize” or “unlock” a wallet by exposing a secret, stop. Return to the service through a known address rather than following the message. Urgency, a familiar logo and a helpful tone are not proof of legitimacy."
        ],
        "sourceIds": [
          "bitcoin-privacy"
        ]
      }
    ],
    "exercise": {
      "title": "Sort three requests",
      "prompt": "Consider: (1) an artist gives a buyer an invoice; (2) a stranger asks for a recovery phrase to release a reward; (3) an organizer asks permission to publish a volunteer’s wallet address beside their name. Which request is a clear secret-exposure risk, and which needs a privacy decision?",
      "answer": "Request 2 exposes a secret and should be refused. Request 3 needs freely given consent and a good reason; public recognition should not require publishing a wallet. Request 1 is a normal payment request in principle, but the buyer must still check the recipient, network, amount and agreed terms."
    },
    "quiz": [
      {
        "question": "What does self-custody require?",
        "options": [
          "A. Giving a community administrator a recovery phrase",
          "B. Protecting your own spending credentials and a usable backup"
        ],
        "answer": "B. Self-custody gives you control and responsibility. A community administrator does not need your wallet secret."
      },
      {
        "question": "Does an account balance at a custodian remove dependence on that company?",
        "options": [
          "A. Yes",
          "B. No"
        ],
        "answer": "B. You still depend on the custodian’s operations and ability to honor withdrawals."
      },
      {
        "question": "Where should you enter a real recovery phrase for this course?",
        "options": [
          "A. In an AI chat",
          "B. In a public issue",
          "C. Nowhere"
        ],
        "answer": "C. Nowhere. The lesson uses paper examples and never asks for a real wallet secret."
      }
    ],
    "takeaway": "Know who can spend, know how recovery works and keep private credentials private.",
    "sources": [
      {
        "id": "bitcoin-wallets",
        "title": "Bitcoin developer guide · Wallets",
        "url": "https://developer.bitcoin.org/devguide/wallets.html"
      },
      {
        "id": "bitcoin-custody",
        "title": "Bitcoin FAQ · Wallets and self-custody",
        "url": "https://bitcoin.org/en/faq"
      },
      {
        "id": "bitcoin-security",
        "title": "Bitcoin.org · Securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "bitcoin-privacy",
        "title": "Bitcoin.org · Things you need to know",
        "url": "https://bitcoin.org/en/you-need-to-know"
      }
    ],
    "courseId": "foundations",
    "order": 2
  },
  {
    "slug": "payments-for-humans",
    "title": "Payments for humans, including Lightning",
    "description": "Read an invoice, distinguish payment states and understand how an artist could receive bitcoin.",
    "minutes": 10,
    "outcomes": [
      "Compare on-chain Bitcoin and Lightning without treating them as interchangeable instructions.",
      "Check a payment request before considering a payment.",
      "Distinguish sent, pending, failed and settled."
    ],
    "sections": [
      {
        "title": "Begin with an agreement",
        "paragraphs": [
          "A useful payment begins with people agreeing what is being exchanged. For an art commission, that includes the work, price, delivery, permitted use, revisions and refund terms. Paying in bitcoin does not by itself explain those terms or transfer copyright.",
          "Consider an imaginary illustrator and buyer. The illustrator describes the work and sends a request for an agreed amount. The buyer checks that it came from the right person. A payment method should support that relationship, not make either party guess what they agreed to."
        ]
      },
      {
        "title": "On-chain and Lightning take different paths",
        "paragraphs": [
          "An on-chain Bitcoin transaction is broadcast to the network and can be included in a block. The recipient chooses an appropriate confirmation policy before treating it as settled. A broadcast is not the same as a confirmation.",
          "Lightning uses payment channels anchored to Bitcoin. It can make quick payments possible without putting every individual payment on-chain. A usable route and sufficient liquidity are still needed; a payment attempt can fail. Wallets may also differ in custody and availability.",
          "Use the payment method the recipient actually supports. Bitcoin, Litecoin and an Ethereum-style address are not interchangeable destinations. This lesson does not require you to scan a code or send anything."
        ],
        "sourceIds": [
          "bitcoin-processing",
          "lightning-overview"
        ]
      },
      {
        "title": "Read before you scan",
        "paragraphs": [
          "Check the recipient, asset/network, amount, units, fees and expiry. An invoice may quote local currency and translate it to a bitcoin amount for a limited time. If the quote expires, ask for a current request rather than assuming an old amount is still valid.",
          "A QR code is simply a way to carry information. It does not establish who created the request or whether it is fair. Review what your wallet displays before approving any real transaction, and use a known contact route when the details disagree."
        ],
        "sourceIds": [
          "btcpay-invoices"
        ]
      },
      {
        "title": "Look at the outcome, not a screenshot",
        "paragraphs": [
          "A payment request can be awaiting payment, paid but awaiting settlement conditions, or settled. An on-chain payment may need confirmations. Lightning normally settles without waiting for an on-chain confirmation for each payment, but an attempted payment is not automatically a completed one.",
          "If an attempt is pending or times out, inspect its status before trying again. A timeout can leave the result uncertain. A failed attempt, an expired invoice and a settled payment call for different next steps. A screenshot saying “sent” does not replace the recipient’s own settlement check."
        ],
        "sourceIds": [
          "btcpay-invoices",
          "btcpay-api"
        ]
      },
      {
        "title": "Use the tool without losing the relationship",
        "paragraphs": [
          "Kalakar.x proposes direct artist payments with clear terms and a verified receiving setup. It does not currently promise a live marketplace, escrow or guaranteed payout. An artist’s optional contribution to Langar would be a separate choice, never a hidden deduction.",
          "When you can explain the request, identify who receives it and tell what happened afterward, you have learned more than how to press a payment button."
        ]
      }
    ],
    "exercise": {
      "title": "Read an imaginary invoice",
      "prompt": "A sample invoice says “20,000 sats · Bitcoin Lightning · expires at 15:00.” At 15:02 the payer has a “pending” screen. What should the payer and artist verify before another attempt or delivery?",
      "answer": "The payer checks the existing payment’s actual status before retrying. The artist checks the receiving system for settlement, amount and invoice identity. They resolve the expired request and agree any replacement through their known contact route. They do not infer success or failure from the clock or a screenshot alone."
    },
    "quiz": [
      {
        "question": "What does a QR code prove?",
        "options": [
          "A. The request is trustworthy",
          "B. It contains information that still needs checking"
        ],
        "answer": "B. A code can carry a payment request, but you still need to verify the recipient and details."
      },
      {
        "question": "What is the first step when a payment attempt times out?",
        "options": [
          "A. Send the same amount again immediately",
          "B. Check whether the original attempt is pending, failed or complete"
        ],
        "answer": "B. Resolve the original status before retrying so you do not create an accidental duplicate payment."
      },
      {
        "question": "Does Lightning guarantee that every attempt succeeds?",
        "options": [
          "A. Yes",
          "B. No"
        ],
        "answer": "B. Routing, liquidity and the receiving setup matter. Verify the result."
      }
    ],
    "takeaway": "Agree clearly, inspect the request and verify settlement before deciding what happens next.",
    "sources": [
      {
        "id": "bitcoin-processing",
        "title": "Bitcoin developer guide · Payment processing",
        "url": "https://developer.bitcoin.org/devguide/payment_processing.html"
      },
      {
        "id": "lightning-overview",
        "title": "Lightning Labs · Network overview",
        "url": "https://docs.lightning.engineering/the-lightning-network/overview"
      },
      {
        "id": "btcpay-invoices",
        "title": "BTCPay Server · Invoice states and settlement",
        "url": "https://docs.btcpayserver.org/Users/invoices/"
      },
      {
        "id": "btcpay-api",
        "title": "BTCPay Server · Greenfield API payment status",
        "url": "https://docs.btcpayserver.org/API/Greenfield/v1/"
      }
    ],
    "courseId": "foundations",
    "order": 3
  },
  {
    "courseId": "foundations",
    "order": 4,
    "slug": "money-and-measurement",
    "title": "Money, prices and units",
    "description": "Separate an amount from its price and its purchasing power.",
    "minutes": 10,
    "outcomes": [
      "Convert BTC and sats without rounding away meaning.",
      "Separate a market quote from an amount you own."
    ],
    "sections": [
      {
        "title": "Three different questions",
        "paragraphs": [
          "An amount answers how much of an asset exists in a record. A price answers what another party offers in exchange. Purchasing power asks what useful goods that amount can obtain. These are related, but they are not the same. A wallet showing an unchanged number of sats can display a changing local-currency estimate because the price feed moved. Neither display tells you whether a particular shop accepts bitcoin."
        ]
      },
      {
        "title": "Make the unit visible",
        "paragraphs": [
          "One BTC contains 100 million sats. In an illustrative ledger, 0.002 BTC is 200,000 sats. If an application silently switches from BTC to another unit, the digits become misleading. Label both the quantity and currency, use consistent decimal places, and keep calculation precision separate from a rounded display. A zero after rounding is not always an actual zero balance."
        ]
      },
      {
        "title": "Read a quote as a dated offer",
        "paragraphs": [
          "Imagine two fictional shops pricing the same item at 20,000 and 22,000 sats. Shipping, fees, quality and timing may explain the difference. A conversion estimate also needs a source and timestamp. An old screenshot cannot establish today’s executable price. Our educational examples teach arithmetic; they do not indicate fair value, future returns or what you should buy."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "At an invented conversion rate of $50,000 per BTC, express 0.002 BTC in sats and dollars. If the quote rises to $60,000, which quantity stays unchanged?",
      "answer": "0.002 BTC is 200,000 sats. Its illustrative dollar estimate changes from $100 to $120. The 200,000-sat quantity is unchanged; fees, spending or transfers would be separate events."
    },
    "quiz": [
      {
        "question": "Does a rising fiat estimate prove that more sats arrived?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A valuation change is different from a change in the asset quantity."
      },
      {
        "question": "What belongs beside a conversion estimate?",
        "options": [
          "Only a large number",
          "The asset, quote currency, source and time"
        ],
        "answer": "The asset, quote currency, source and time let a reader understand what was measured."
      }
    ],
    "sources": [
      {
        "id": "units",
        "title": "Bitcoin developer guide: payment processing",
        "url": "https://developer.bitcoin.org/devguide/payment_processing.html"
      }
    ],
    "takeaway": "Keep quantity, valuation and spending power in separate columns."
  },
  {
    "courseId": "foundations",
    "order": 5,
    "slug": "following-a-transaction",
    "title": "Follow a payment from request to receipt",
    "description": "Understand why a payment has several stages.",
    "minutes": 10,
    "outcomes": [
      "Describe authorization, broadcast and settlement.",
      "Identify the recipient’s evidence of payment."
    ],
    "sections": [
      {
        "title": "A request is not a transfer",
        "paragraphs": [
          "An invoice states what a recipient would like to receive. It may contain an amount, destination, expiry and order reference. Opening or copying it does not move money. A wallet can construct a proposed transaction from spendable outputs; an authorized signer must then approve the transaction. The application’s appearance is not evidence that authorization occurred."
        ]
      },
      {
        "title": "Broadcast is the beginning of a network journey",
        "paragraphs": [
          "Once broadcast, an on-chain transaction can propagate between nodes and may be selected by a miner for a block. Different wallets and services can observe it at different times. A delay can reflect connectivity, policy, fees or competing transactions. A transaction identifier helps locate a particular record, but its presence on an explorer does not establish that the recipient’s settlement conditions have been met."
        ]
      },
      {
        "title": "Close the loop with the recipient",
        "paragraphs": [
          "For a fictional design commission, the artist checks the invoice in their own receiving system and follows the agreed confirmation policy before delivery. A buyer’s screenshot is useful context, not the authoritative receipt. Keep the order reference and payment state separate from the file-delivery record. If something disagrees, compare those records through a known contact route before attempting another payment."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Arrange these fictional events: the buyer approves; the artist creates an invoice; a block includes the transaction; the wallet broadcasts; the artist records settlement under their policy.",
      "answer": "Invoice → approval → broadcast → block inclusion → settlement check. A particular policy can require more confirmations. The invoice and approval alone do not prove that the artist received usable funds."
    },
    "quiz": [
      {
        "question": "Does opening an invoice transfer funds?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A request and authorization are separate."
      },
      {
        "question": "Which record should an artist verify?",
        "options": [
          "Only the buyer’s screenshot",
          "Their own receiving record and settlement conditions"
        ],
        "answer": "Their own record. Screenshots can be mistaken or fabricated."
      }
    ],
    "sources": [
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      },
      {
        "id": "invoice",
        "title": "BTCPay Server: invoices",
        "url": "https://docs.btcpayserver.org/Users/invoices/"
      }
    ],
    "takeaway": "Track a payment’s state before deciding what happens next."
  },
  {
    "courseId": "foundations",
    "order": 6,
    "slug": "addresses-and-networks",
    "title": "Addresses, networks and QR codes",
    "description": "Learn why a familiar-looking destination is not enough.",
    "minutes": 10,
    "outcomes": [
      "Check the requested asset and network.",
      "Explain why a QR code does not authenticate a recipient."
    ],
    "sections": [
      {
        "title": "An address has a job",
        "paragraphs": [
          "A receiving address encodes information a wallet uses to construct a payment destination. It is not a person’s universal financial identity. Bitcoin address formats differ, and other networks use their own formats. A familiar prefix can be a clue, but it cannot replace checking the intended network in the recipient’s and sender’s software."
        ]
      },
      {
        "title": "A code carries information",
        "paragraphs": [
          "A QR code is a representation of data. It can contain an address or a richer payment request. Replacing the code on a poster can change where a payment goes while the surrounding design looks authentic. Review the decoded destination, asset, amount and recipient context. Comparing the beginning and end alone is weaker than verifying the full request through the recipient’s known channel."
        ]
      },
      {
        "title": "A classroom check needs no live wallet",
        "paragraphs": [
          "Draw a pretend invoice with the labels recipient, Bitcoin mainnet, amount, expiry and order reference. Give another learner the task of finding what is missing. Never put a real seed, private key or fabricated spendable destination in the exercise. Test networks are separate environments; a label saying test is not enough unless the actual software and destination agree. A community page should never recycle an Ethereum-style domain-owner address as a BTC donation address."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A website headline says “Donate BTC,” but the payment pane names a different network. What should a beginner do?",
      "answer": "Stop and ask the verified recipient to resolve the mismatch. Do not guess, bridge or substitute an address. A matching network and clearly explained receiving arrangement must precede a real payment."
    },
    "quiz": [
      {
        "question": "Does a valid QR code prove who owns the destination?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It shows that data can be decoded, not that the recipient is authentic."
      },
      {
        "question": "Can one assume BTC and LTC addresses are interchangeable?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. They represent different networks; validate the complete payment method."
      }
    ],
    "sources": [
      {
        "id": "bip173",
        "title": "BIP 173: Bech32 encoding",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki"
      },
      {
        "id": "units",
        "title": "Bitcoin developer guide: payment processing",
        "url": "https://developer.bitcoin.org/devguide/payment_processing.html"
      }
    ],
    "takeaway": "Verify the meaning of a destination, not just its appearance."
  },
  {
    "courseId": "foundations",
    "order": 7,
    "slug": "confirmations-and-patience",
    "title": "Confirmations and patience",
    "description": "Understand a probabilistic process without promising an exact arrival time.",
    "minutes": 10,
    "outcomes": [
      "Distinguish unconfirmed and confirmed transactions.",
      "Explain why confirmation policies differ."
    ],
    "sections": [
      {
        "title": "Blocks are not appointments",
        "paragraphs": [
          "An unconfirmed transaction has not yet been included in the accepted chain of the observing node. Inclusion gives it a confirmation; later blocks build additional work above that history. The target interval between Bitcoin blocks is an average, not a timetable. A payment does not become faulty just because a stopwatch passes ten minutes."
        ]
      },
      {
        "title": "Why recipients wait",
        "paragraphs": [
          "Competing chain histories and double-spend attempts make a first observation different from a stronger settlement assessment. A recipient chooses a policy appropriate to the value, delivery reversibility and threat they face. There is no universal count that makes every transaction absolutely irreversible. A café, a digital download and a large irreversible delivery can reasonably need different procedures."
        ]
      },
      {
        "title": "Communicate the condition",
        "paragraphs": [
          "Suppose a fictional artist’s checkout says “awaiting confirmation.” The useful message tells the buyer that the payment has been seen and what remains before delivery. It should not imply that a second payment is needed. If an explorer and wallet disagree, inspect their network, transaction identifier and synchronization state. Avoid escalating from uncertainty to a rushed resend; first establish which transaction each screen is describing."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A transaction is included in block 100. The observer’s current tip is block 102 on the same chain. How many confirmations does the transaction have in this example?",
      "answer": "Three: inclusion at 100 counts as one, followed by 101 and 102. This arithmetic does not decide an appropriate acceptance policy or guarantee that no reorganization can occur."
    },
    "quiz": [
      {
        "question": "Is the average block interval a delivery guarantee?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Actual intervals vary."
      },
      {
        "question": "Should every recipient use the same confirmation policy?",
        "options": [
          "Always",
          "No, context matters"
        ],
        "answer": "Context matters. Value, reversibility and operational risks affect the policy."
      }
    ],
    "sources": [
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      },
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      }
    ],
    "takeaway": "Waiting for evidence is different from assuming something is broken."
  },
  {
    "courseId": "foundations",
    "order": 8,
    "slug": "fees-and-transaction-size",
    "title": "Fees buy scarce block space",
    "description": "Read a fee estimate without confusing it with a percentage of value.",
    "minutes": 10,
    "outcomes": [
      "Distinguish fee rate and total fee.",
      "Explain why a small payment can still be expensive."
    ],
    "sections": [
      {
        "title": "Two numbers, two meanings",
        "paragraphs": [
          "A fee rate quotes a number of sats per unit of transaction size, commonly virtual bytes. The total fee is the quantity paid. In a simplified example, a 150-vbyte transaction at 4 sats per vbyte pays 600 sats. This arithmetic is an estimate; the final signed transaction size and wallet behavior can matter."
        ]
      },
      {
        "title": "Value and size are different",
        "paragraphs": [
          "A transaction spending many small outputs can contain more data than one spending a single larger output. Sending a greater BTC amount therefore does not necessarily require a greater fee. Think about the number and type of inputs and outputs rather than assuming the fee is a fixed percentage of the purchase. Wallets estimate demand for block space, and different estimates may disagree."
        ]
      },
      {
        "title": "Choose context before urgency",
        "paragraphs": [
          "For a classroom invoice, identify whether timing actually matters. An urgent irreversible delivery and a flexible transfer deserve different conversations. A low-fee transaction may wait; paying more is not a guaranteed clock. Fee-changing techniques depend on the wallet and transaction. Learn them later using a controlled example rather than clicking an unfamiliar accelerator advertisement. Include network and service charges separately when comparing a checkout total."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Compare two fictional transactions: A is 140 vbytes at 5 sats/vbyte; B is 220 vbytes at 3 sats/vbyte. Which has the larger total fee?",
      "answer": "A costs 700 sats and B costs 660 sats. A has the larger fee even though B is larger in data size. Do not confuse the rate with the resulting total."
    },
    "quiz": [
      {
        "question": "Does sending twice as much BTC always double the network fee?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Data size and fee rate determine the fee, not simply the value sent."
      },
      {
        "question": "Is a fee estimate an inclusion-time promise?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Demand and block timing can change."
      }
    ],
    "sources": [
      {
        "id": "bip141",
        "title": "BIP 141: Segregated Witness",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki"
      },
      {
        "id": "units",
        "title": "Bitcoin developer guide: payment processing",
        "url": "https://developer.bitcoin.org/devguide/payment_processing.html"
      }
    ],
    "takeaway": "Compare the rate, final total and actual need for speed."
  },
  {
    "courseId": "foundations",
    "order": 9,
    "slug": "backup-before-dependence",
    "title": "Backups before dependence",
    "description": "Plan recovery without exposing a real secret.",
    "minutes": 10,
    "outcomes": [
      "Describe what a usable recovery plan needs.",
      "Separate a backup exercise from a live-wallet operation."
    ],
    "sections": [
      {
        "title": "A second copy is only part of recovery",
        "paragraphs": [
          "A backup is useful when it lets the right person restore the intended wallet after a realistic failure. A file you cannot decrypt, words you cannot read or a device whose password nobody knows may not achieve that. Start by identifying the wallet’s documented recovery method and what additional information it requires."
        ]
      },
      {
        "title": "Different failures require different preparation",
        "paragraphs": [
          "A lost phone, a stolen backup and a damaged home are different problems. Keeping every copy in one location can preserve convenience while retaining a shared failure point. Conversely, creating many uncontrolled copies increases exposure. There is no universal arrangement that fits every person. The important learning task is to articulate the failure being addressed and the new access each copy creates."
        ]
      },
      {
        "title": "Practice with invented material",
        "paragraphs": [
          "Create a paper recovery plan using labels such as Backup A, Device B and trusted contact. Do not generate or enter real recovery words in this course. Mark where wallet type, derivation information or an additional passphrase would be documented privately. A future real recovery drill must follow the wallet’s current instructions and use a controlled setup; it is not an excuse to type an existing secret into an unfamiliar website."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A learner stores a device and its only backup in the same bag. Name two different ways that arrangement can fail and one question to improve the plan.",
      "answer": "Loss or destruction can remove both; theft can give someone access to both. Ask how authorized recovery would work if the bag disappeared, without multiplying uncontrolled copies of spending secrets."
    },
    "quiz": [
      {
        "question": "Does owning a backup guarantee it is usable?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Readability, completeness and a tested recovery method matter."
      },
      {
        "question": "Should a classroom instructor collect recovery phrases to check the exercise?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Use invented labels; instructors never need real secrets."
      }
    ],
    "sources": [
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "bip380",
        "title": "BIP 380: output script descriptors",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki"
      }
    ],
    "takeaway": "A recovery plan should survive a failure without creating unnecessary exposure."
  },
  {
    "courseId": "foundations",
    "order": 10,
    "slug": "scams-and-social-pressure",
    "title": "Scams, urgency and trusted routes",
    "description": "Recognize a bad request before the technology becomes a distraction.",
    "minutes": 10,
    "outcomes": [
      "Identify secret-exposure and payment-pressure patterns.",
      "Choose an independent route for verification."
    ],
    "sections": [
      {
        "title": "The request matters more than the costume",
        "paragraphs": [
          "A message can use a familiar logo, a friendly name or a convincing screenshot. Judge what it asks you to do. Revealing recovery information, approving an unexplained transaction or paying to unlock an invented reward are requests that deserve a stop. A polished page is not a security assessment, and an AI-written explanation is not independent evidence."
        ]
      },
      {
        "title": "Urgency removes time to compare",
        "paragraphs": [
          "A fictional message says your community grant expires in five minutes unless you synchronize your wallet. The deadline tries to make deliberation feel like failure. Close that route and return to a known community page or previously verified contact. Do not use contact details supplied by the suspicious message to verify the same message; that creates a circular check."
        ]
      },
      {
        "title": "Get help without making the exposure worse",
        "paragraphs": [
          "Describe the request and the domain, but omit secrets and sensitive account information. If you have already interacted, avoid following another unsolicited recovery helper. A responsible incident response first establishes what was disclosed or signed. This lesson does not ask you to send funds or perform emergency wallet operations. The community must never require proof of wealth, a deposit or a wallet secret to grant access to learning or a meal."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Write a reply to a supposed moderator asking for your seed to verify membership. Then describe a route that does not depend on that message.",
      "answer": "A suitable response is: “I will not share recovery information.” Independently open the verified community site and use its established support route. You do not need to keep negotiating with the suspicious account."
    },
    "quiz": [
      {
        "question": "Does a direct message from a familiar display name prove identity?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Accounts, names and images can be copied or compromised."
      },
      {
        "question": "Should an expiring offer override a missing explanation?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A deadline is not evidence that a request is legitimate."
      }
    ],
    "sources": [
      {
        "id": "limits",
        "title": "Bitcoin.org: things you need to know",
        "url": "https://bitcoin.org/en/you-need-to-know"
      },
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      }
    ],
    "takeaway": "Pause, verify independently and never turn politeness into secret disclosure."
  },
  {
    "courseId": "foundations",
    "order": 11,
    "slug": "privacy-is-a-practice",
    "title": "Privacy is a practice",
    "description": "Understand why public records and personal stories should stay separate.",
    "minutes": 10,
    "outcomes": [
      "Explain how an address can become linked to a person.",
      "Choose a less intrusive service record."
    ],
    "sections": [
      {
        "title": "Public does not mean anonymous",
        "paragraphs": [
          "Bitcoin transactions are publicly observable. An address does not have to contain a legal name for someone to associate its activity with a person. Publishing a donation screenshot, reusing a public receiving address or disclosing transaction details to a service can create connections. Privacy depends on how the system is used, not merely on whether the address looks like random characters."
        ]
      },
      {
        "title": "Collect less at the beginning",
        "paragraphs": [
          "Imagine a kitchen wants to report its impact. Aggregate meal counts and a reconciled expense total may answer the public question without a list of guests. A person should not need to expose financial activity to receive food or thank-you credit. Ask what each field accomplishes, who can see it and when it will be deleted before collecting it."
        ]
      },
      {
        "title": "Consent is specific",
        "paragraphs": [
          "Permission to attend an event is not permission to publish a face, name or wallet address. A donor may agree to a private receipt while declining public attribution. An agent preparing a report should receive redacted data when that is sufficient. Exportability does not justify putting private records on immutable storage. Even a hash can create an unwanted link when the underlying information is easy to guess."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A proposed public report includes a guest’s name, meal received and wallet address. Rewrite it to preserve accountability while reducing exposure.",
      "answer": "Publish an aggregate service count, event identifier, accountable steward and summarized costs. Keep any justified private evidence access-controlled. Guests should not need wallet records to receive a meal."
    },
    "quiz": [
      {
        "question": "Does a name-free address guarantee anonymity?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Other records can connect the address to a person."
      },
      {
        "question": "Does event attendance automatically authorize a public photo?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Photography and publication need their own consent process."
      }
    ],
    "sources": [
      {
        "id": "privacy",
        "title": "Bitcoin.org: protecting privacy",
        "url": "https://bitcoin.org/en/protect-your-privacy"
      }
    ],
    "takeaway": "Accountability should explain the work without exposing the people it serves."
  },
  {
    "courseId": "foundations",
    "order": 12,
    "slug": "custody-choices",
    "title": "Custody is a relationship",
    "description": "Ask who can spend, recover, block or change access.",
    "minutes": 10,
    "outcomes": [
      "Map the authority behind an account.",
      "Compare convenience and dependence without choosing a product."
    ],
    "sections": [
      {
        "title": "Begin with authority",
        "paragraphs": [
          "A balance on a screen may represent directly controlled Bitcoin outputs or a claim recorded by a service. Ask who can produce the signatures, who can reset access and who can refuse withdrawal. A login password for a custodial account is not the same kind of control as possession of a self-custody spending key."
        ]
      },
      {
        "title": "Convenience has a shape",
        "paragraphs": [
          "A provider may offer support, recovery, instant internal transfers and a familiar interface. Those features can also mean the provider controls records and policies. Self-custody changes that relationship, but introduces backup, device and operational responsibilities. Calling one option easy and the other sovereign does not tell a beginner how either fails in their circumstances."
        ]
      },
      {
        "title": "Compare failure stories",
        "paragraphs": [
          "Consider two fictional users: one loses a phone, another loses access to the company hosting an account. For each arrangement, write what information, people and software are needed to recover. Then consider theft, withdrawal restrictions and loss of a backup. This is an explanation exercise, not a recommendation to select a wallet, provider or balance size. A trustworthy course makes dependence visible without shaming a learner for their current setup."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Make four columns for an imaginary wallet: who signs, who recovers, who can restrict access and what happens if the company disappears. Which unanswered item would stop a confident assessment?",
      "answer": "Any unknown authority or recovery path is material. A marketing label alone cannot fill the columns. Record “unknown” and consult the actual provider documentation rather than guessing."
    },
    "quiz": [
      {
        "question": "Is an account password always a Bitcoin private key?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. An account credential can authorize a request to a custodian rather than a Bitcoin transaction."
      },
      {
        "question": "Does self-custody remove all risk?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It changes the risk and responsibility; loss, theft and operational errors remain."
      }
    ],
    "sources": [
      {
        "id": "faq",
        "title": "Bitcoin.org: frequently asked questions",
        "url": "https://bitcoin.org/en/faq"
      },
      {
        "id": "wallet",
        "title": "Bitcoin developer guide: wallets",
        "url": "https://developer.bitcoin.org/devguide/wallets.html"
      }
    ],
    "takeaway": "Choose understanding before labels."
  },
  {
    "courseId": "foundations",
    "order": 13,
    "slug": "lightning-invoices",
    "title": "Reading a Lightning invoice",
    "description": "Understand amount, expiry and payment status.",
    "minutes": 10,
    "outcomes": [
      "Locate the important parts of a request.",
      "Explain why an expired invoice needs care."
    ],
    "sections": [
      {
        "title": "The recipient makes a request",
        "paragraphs": [
          "A Lightning invoice can encode an amount, payment hash, timestamp, expiry and descriptive information. BOLT 11 defines a widely used invoice format. Wallets present the encoded fields in a friendlier view. The text description is useful context, but it does not prove that the person sending the invoice is the artist or organizer you intended to pay."
        ]
      },
      {
        "title": "Expiry is a condition, not a countdown game",
        "paragraphs": [
          "A recipient may use an expiring invoice because its terms or receiving setup should not remain open indefinitely. Do not assume that an old screenshot remains payable. If a previous attempt has an uncertain status, resolve that attempt before obtaining and paying a new request. Otherwise two different requests might refer to one intended purchase."
        ]
      },
      {
        "title": "The amount can be explicit or requested later",
        "paragraphs": [
          "Some invoice workflows allow the payer to specify an amount; others already fix it. That difference changes what must be checked in the wallet. For a beginner, the safest classroom exercise is to annotate a mock request on paper. No real invoice or payment is needed. Distinguish invoice expiry, network routing and the status of an actual payment: they are separate pieces of information."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "An imaginary invoice for 8,000 sats expired before a learner opened it. No payment has been attempted. What information should a replacement preserve?",
      "answer": "The intended recipient, order purpose and agreed amount should remain clear, while expiry and technical invoice fields can change. Verify the replacement through the known recipient rather than editing encoded payment data yourself."
    },
    "quiz": [
      {
        "question": "Is the description cryptographic proof of a merchant’s identity?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Check the recipient independently."
      },
      {
        "question": "Should a pending attempt be ignored when asking for a new invoice?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Resolve its result to avoid paying twice."
      }
    ],
    "sources": [
      {
        "id": "bolt11",
        "title": "Lightning specification: invoice encoding",
        "url": "https://github.com/lightning/bolts/blob/master/11-payment-encoding.md"
      },
      {
        "id": "ln",
        "title": "Lightning Labs: network overview",
        "url": "https://docs.lightning.engineering/the-lightning-network/overview"
      }
    ],
    "takeaway": "An invoice is a structured request; read its conditions."
  },
  {
    "courseId": "foundations",
    "order": 14,
    "slug": "exchanges-and-access",
    "title": "Exchanges and access to bitcoin",
    "description": "Understand a service without treating its balance as the network.",
    "minutes": 10,
    "outcomes": [
      "Separate exchange records from on-chain holdings.",
      "Identify withdrawal and identity dependencies."
    ],
    "sections": [
      {
        "title": "Trading and settlement are different",
        "paragraphs": [
          "An exchange can match orders or record trades within its own system. That account activity is not necessarily a new Bitcoin transaction for every trade. An account balance may be a claim against the operator until a supported withdrawal reaches a destination under your control. A screenshot of trading activity cannot establish the state of the Bitcoin chain."
        ]
      },
      {
        "title": "Read the service relationship",
        "paragraphs": [
          "Before assessing any provider, identify its actual operator, custody model, eligibility, fees and withdrawal rules. Requirements can vary by jurisdiction and change over time. This course does not choose an exchange, tell you to bypass restrictions or advise a purchase. It teaches the questions needed to understand what a service does and where its promises begin."
        ]
      },
      {
        "title": "Separate a service failure from a protocol failure",
        "paragraphs": [
          "Imagine a platform pauses withdrawals while Bitcoin blocks continue to arrive. Those observations are compatible: the platform and the network are different systems. Conversely, a functioning login does not establish that withdrawals will succeed. In a comparison table, record the asset quantity, whether it is a provider claim, the available exit method and the evidence supporting each entry. Leave missing facts marked unknown rather than filling them with confidence from branding."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional exchange shows 50,000 sats after an internal purchase, but provides no transaction identifier. Does that prove deception or an on-chain receipt?",
      "answer": "Neither. Internal accounting may be normal for that service. You need the custody and withdrawal terms and evidence of any actual withdrawal before claiming on-chain settlement."
    },
    "quiz": [
      {
        "question": "Does every exchange trade require a new Bitcoin block entry?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Exchanges can maintain internal ledgers."
      },
      {
        "question": "Does a working login prove that funds can be withdrawn?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Access and withdrawal capability are different."
      }
    ],
    "sources": [
      {
        "id": "faq",
        "title": "Bitcoin.org: frequently asked questions",
        "url": "https://bitcoin.org/en/faq"
      },
      {
        "id": "limits",
        "title": "Bitcoin.org: things you need to know",
        "url": "https://bitcoin.org/en/you-need-to-know"
      }
    ],
    "takeaway": "Identify the operator’s promise separately from Bitcoin’s rules."
  },
  {
    "courseId": "foundations",
    "order": 15,
    "slug": "volatility-and-planning",
    "title": "Volatility and practical planning",
    "description": "Keep uncertainty visible when discussing future needs.",
    "minutes": 10,
    "outcomes": [
      "Calculate an illustrative change in purchasing power.",
      "Distinguish savings ideas from funded obligations."
    ],
    "sections": [
      {
        "title": "A quantity does not guarantee a budget",
        "paragraphs": [
          "A fixed number of sats can buy different amounts of local goods at different times. Bitcoin’s issuance rules do not promise a stable market price. A kitchen planning next week’s food needs should therefore distinguish the asset it holds from the cost of ingredients and the dates when bills must be paid. These are operating questions, not a prediction of which asset will rise."
        ]
      },
      {
        "title": "A scenario is not a forecast",
        "paragraphs": [
          "Use invented numbers to practice. If a budget of $200 is represented by an asset currently worth $200 and that valuation falls by one quarter, the estimate becomes $150. The obligation to buy $200 of supplies has not shrunk. A scenario simply reveals a mismatch. It does not establish the probability of the change or prescribe a particular financial response."
        ]
      },
      {
        "title": "Talk about goals honestly",
        "paragraphs": [
          "“More sats” is not a complete plan when there are also debts, restricted donations and near-term costs. Record what is owned, what is owed, what is earmarked and what can actually be spent. Avoid treating a borrowed amount as income or a rising screen value as realized funding. A community promise should be based on approved, available resources and named human responsibility, not an agent’s expectation of future returns."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A hypothetical program owes $300 next week and holds an asset valued today at $400. In a 40% decline scenario, what is the shortfall?",
      "answer": "The asset estimate becomes $240. Against a $300 obligation, the illustrative shortfall is $60 before fees or other costs. This calculation is a planning exercise, not an investment recommendation."
    },
    "quiz": [
      {
        "question": "Does fixed issuance guarantee a stable market price?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Supply rules and market demand are distinct."
      },
      {
        "question": "Is borrowed money the same as earned program income?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Borrowing also creates a liability."
      }
    ],
    "sources": [
      {
        "id": "limits",
        "title": "Bitcoin.org: things you need to know",
        "url": "https://bitcoin.org/en/you-need-to-know"
      }
    ],
    "takeaway": "Show obligations and uncertainty alongside asset totals."
  },
  {
    "courseId": "foundations",
    "order": 16,
    "slug": "artists-and-clear-terms",
    "title": "A fair invoice for creative work",
    "description": "Build a payment relationship around the artist’s actual agreement.",
    "minutes": 10,
    "outcomes": [
      "List the terms a commission needs.",
      "Separate artist payment and voluntary support."
    ],
    "sections": [
      {
        "title": "Specify the work before the payment",
        "paragraphs": [
          "A useful commission brief identifies the deliverable, dimensions or format, deadline, revisions and permitted uses. The price may be stated in sats or another agreed unit. A payment alone does not tell the parties whether a design may be modified, resold or printed commercially. Discuss those terms before issuing a request."
        ]
      },
      {
        "title": "Keep the state understandable",
        "paragraphs": [
          "BTCPay distinguishes an invoice awaiting payment from a payment waiting for settlement conditions and a settled invoice. An artist can use that distinction when deciding whether to begin or deliver work under their own terms. Partial, late and excess payments need deliberate handling rather than a vague paid badge. A manually marked status is an accounting action, not independent proof of settlement."
        ]
      },
      {
        "title": "Do not hide the community contribution",
        "paragraphs": [
          "Kalakar.x proposes a route for artists to receive BTC or Lightning payments using a verified arrangement. Any gift to Langar is separate and voluntary. A creator should understand fees and deductions before agreeing to a sale, and a buyer should know who receives the money. A portfolio page, payment tool and dispute process perform different jobs. This lesson is a mock commissioning exercise; it does not activate a marketplace or guarantee payment."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Draft a one-sentence fictional poster commission with a price, deliverable, deadline and reuse term. What should happen if the invoice is paid late?",
      "answer": "Example: “One print-ready poster for 30,000 sats, due Friday, with permission for the named event to print it.” A late payment needs review against the agreed terms and current invoice; do not automatically deliver or silently keep an unexplained difference."
    },
    "quiz": [
      {
        "question": "Does payment alone explain copyright or reuse permission?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The parties need clear terms."
      },
      {
        "question": "May a community donation be silently deducted?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Any fee or optional gift must be explicit and consented."
      }
    ],
    "sources": [
      {
        "id": "invoice",
        "title": "BTCPay Server: invoices",
        "url": "https://docs.btcpayserver.org/Users/invoices/"
      },
      {
        "id": "btcpay",
        "title": "BTCPay Server: wallet",
        "url": "https://docs.btcpayserver.org/Wallet/"
      }
    ],
    "takeaway": "Clear terms protect the relationship around a payment."
  },
  {
    "courseId": "foundations",
    "order": 17,
    "slug": "donations-and-accountability",
    "title": "Donations with accountable purpose",
    "description": "Follow a contribution without exposing the people it serves.",
    "minutes": 10,
    "outcomes": [
      "Distinguish received, restricted and spent funds.",
      "Recognize the limits of a public address balance."
    ],
    "sections": [
      {
        "title": "Start with a real recipient and purpose",
        "paragraphs": [
          "A donation page should identify the accountable beneficiary, intended use and verified receiving method. A community story is not evidence of control over an address. Nor does an address copied from an unrelated wallet establish a valid receiving setup. The sender needs enough information to understand whom they support and what the project actually promises."
        ]
      },
      {
        "title": "Receipt is not impact",
        "paragraphs": [
          "A transaction can support a claim that funds arrived. It does not prove that ingredients were bought or meals served. A useful report connects receipts, approved expenses and outcomes while keeping sensitive details private. Restricted donations need separate treatment from general operating support. A large public address balance can include unrelated funds, change outputs or obligations that the viewer cannot see."
        ]
      },
      {
        "title": "Publish what helps people check",
        "paragraphs": [
          "For a fictional meal pilot, show the approved budget, aggregate receipts, spending categories, remaining restricted balance and corrections. Do not expose guests’ identities to create an impression of transparency. Donation recognition should be optional. Avoid promising a tax deduction, refund entitlement or legal status without the relevant established basis. Human stewards control spending; an agent may help reconcile redacted records but cannot convert a donor’s intent into a new mandate."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A program receives 100,000 sats restricted to ingredients and spends 60,000 on approved ingredients. A designer asks to use the remaining amount. What should the report and steward say?",
      "answer": "The report shows 40,000 sats remaining for the restricted purpose, before any separately recorded fees. The steward cannot silently redirect it; the purpose and applicable agreement govern what happens next."
    },
    "quiz": [
      {
        "question": "Does an address balance prove meals were delivered?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Financial and service evidence are separate."
      },
      {
        "question": "Should a guest disclose a wallet to receive food?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Access to a free meal must not depend on financial surveillance."
      }
    ],
    "sources": [
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      },
      {
        "id": "privacy",
        "title": "Bitcoin.org: protecting privacy",
        "url": "https://bitcoin.org/en/protect-your-privacy"
      }
    ],
    "takeaway": "Make the purpose and accounts checkable without turning service into surveillance."
  },
  {
    "courseId": "foundations",
    "order": 18,
    "slug": "proof-of-work-and-energy",
    "title": "Proof of work and honest energy questions",
    "description": "Separate a mechanism from claims about its impact.",
    "minutes": 10,
    "outcomes": [
      "Explain why producing work differs from verifying it.",
      "Evaluate an energy claim’s scope and evidence."
    ],
    "sections": [
      {
        "title": "Why work appears in the design",
        "paragraphs": [
          "Bitcoin’s proof of work requires a block header hash to meet a target. Finding a suitable result takes repeated attempts; checking a candidate is comparatively straightforward. Chaining blocks makes an attempted rewrite compete against accumulated work. This is a mechanism for a shared transaction history, not a test of moral worth or a requirement that community volunteers mine."
        ]
      },
      {
        "title": "Energy questions need boundaries",
        "paragraphs": [
          "Mining consumes resources. Evaluating its environmental effects requires more than a slogan: electricity source, location, time, hardware, alternative uses and the boundary of the comparison matter. A single average can hide local variation. This course does not supply a live energy estimate or claim that every miner is either beneficial or harmful. Separate a protocol explanation from an empirical impact study."
        ]
      },
      {
        "title": "Use the same standards for friendly claims",
        "paragraphs": [
          "Imagine an advertisement says a project’s Bitcoin payments are carbon-free because it uses Lightning. That conclusion does not follow just from a payment-layer label. Ask what was measured and whether upstream dependencies were counted. Supporters should be willing to inspect inconvenient evidence as well as favorable examples. Our proposed proof-of-service records assess human work through review; they do not inherit Bitcoin’s consensus guarantees."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Rewrite “Bitcoin uses clean energy” as a question a researcher could answer.",
      "answer": "For example: “For this identified set of mining facilities, during this stated period, what electricity sources were measured, by whom, and with what uncertainty?” A bounded question is more useful than an unsupported universal claim."
    },
    "quiz": [
      {
        "question": "Does checking a valid block require reproducing all unsuccessful mining attempts?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Verification checks the candidate against the target and other rules."
      },
      {
        "question": "Does using Lightning alone establish an environmental footprint?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The claim needs a defined method and evidence."
      }
    ],
    "sources": [
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      },
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      }
    ],
    "takeaway": "Explain the mechanism precisely and investigate impact separately."
  },
  {
    "courseId": "foundations",
    "order": 19,
    "slug": "bitcoin-and-litecoin",
    "title": "Bitcoin and Litecoin: related ideas, separate networks",
    "description": "Compare without treating names or addresses as interchangeable.",
    "minutes": 10,
    "outcomes": [
      "Distinguish BTC and LTC payment contexts.",
      "Ask useful questions about a protocol comparison."
    ],
    "sections": [
      {
        "title": "Shared ancestry does not merge balances",
        "paragraphs": [
          "Bitcoin and Litecoin are separate networks with separate native assets and rules. Litecoin Core’s network parameters describe its own consensus configuration. Sending an asset on one network does not create a balance of the other. A wallet that displays both can make the distinction less visible, so a payment page must identify the network and unit clearly."
        ]
      },
      {
        "title": "Compare systems, not just speed labels",
        "paragraphs": [
          "A target block interval is one design parameter, not a complete measure of security, finality, cost or usability. A faster expected interval does not make one confirmation on every chain equivalent. Compare validation rules, economic security, wallet support, liquidity and the recipient’s acceptance policy. State the context and date when making claims that can change."
        ]
      },
      {
        "title": "Apply this to a support page",
        "paragraphs": [
          "If a community accepts both BTC and LTC, each destination needs its own verification and accounting trail. Totals should not combine raw coin quantities as though the units match. Any common valuation needs dated conversion sources. Our support for learning about proof-of-work systems does not mean every related asset is endorsed, equivalent or appropriate for a particular person. A beginner can understand the distinction without acquiring either asset."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A report lists “1 BTC + 1 LTC = 2 coins donated.” Why is that a poor financial total?",
      "answer": "It adds different units and hides their different values and networks. Report quantities separately; if a common valuation is useful, state its quote sources, time and assumptions rather than calling the sum two equivalent coins."
    },
    "quiz": [
      {
        "question": "Does a multi-asset wallet make BTC and LTC the same asset?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The interface groups separate networks."
      },
      {
        "question": "Does a shorter target interval alone prove equal or greater settlement security?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Confirmation meaning depends on the complete network and threat context."
      }
    ],
    "sources": [
      {
        "id": "ltc",
        "title": "Litecoin Core: network parameters",
        "url": "https://github.com/litecoin-project/litecoin/blob/master/src/chainparams.cpp"
      },
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      }
    ],
    "takeaway": "Keep network identity and asset units explicit."
  },
  {
    "courseId": "foundations",
    "order": 20,
    "slug": "reading-bitcoin-news",
    "title": "Read Bitcoin news with a source trail",
    "description": "Separate an observation, an interpretation and a prediction.",
    "minutes": 10,
    "outcomes": [
      "Label evidence and commentary.",
      "Check timing and units in a market headline."
    ],
    "sections": [
      {
        "title": "A headline compresses a chain of claims",
        "paragraphs": [
          "A news item may combine a primary document, a calculation and an opinion. Reconstruct those layers. An issuer’s statement is evidence of what it says; it is not automatically an independent verification of every assertion. A quote repeated by many outlets may still trace back to the same source. Count distinct evidence rather than repetitions."
        ]
      },
      {
        "title": "Dates and definitions change the meaning",
        "paragraphs": [
          "A daily publication should state when its data was observed, what period it describes and whether a market was open. “Assets increased” can reflect price changes, subscriptions, acquisitions or a changed methodology. Without units and definitions, an impressive percentage is difficult to interpret. A stale figure must remain visibly dated; refreshing a page must not silently make old data look new."
        ]
      },
      {
        "title": "Practice a correction culture",
        "paragraphs": [
          "Lunch Time Conversations aims to pair readable explanations with evidence and visible corrections. A reader should be able to distinguish a verified fact, a calculation under assumptions and an unresolved question. Do not treat educational reporting as a personalized instruction to buy, sell or borrow. If a source becomes unavailable, preserve the limitation instead of inventing a replacement number. Good reporting can say that the evidence is incomplete."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A headline says “Treasury grows 20%” while the underlying report says its coin quantity was unchanged and the market valuation rose. Write a more accurate headline.",
      "answer": "“Reported treasury valuation rises 20%; coin quantity unchanged.” Include the valuation date and source. This wording avoids implying an acquisition or realized operating income."
    },
    "quiz": [
      {
        "question": "Are ten articles quoting one press release ten independent confirmations?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. They may share a single evidence source."
      },
      {
        "question": "Does a fresh page load make an old observation current?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Data needs its own observation timestamp."
      }
    ],
    "sources": [
      {
        "id": "usdc",
        "title": "Circle: reserve transparency",
        "url": "https://www.circle.com/transparency"
      },
      {
        "id": "limits",
        "title": "Bitcoin.org: things you need to know",
        "url": "https://bitcoin.org/en/you-need-to-know"
      }
    ],
    "takeaway": "Follow the source, the date and the definition before the conclusion."
  },
  {
    "courseId": "foundations",
    "order": 21,
    "slug": "foundations-capstone",
    "title": "Capstone: welcome a newcomer safely",
    "description": "Combine units, custody and verification in one useful explanation.",
    "minutes": 10,
    "outcomes": [
      "Explain a mock contribution without financial pressure.",
      "Identify missing evidence in a complete beginner journey."
    ],
    "sections": [
      {
        "title": "Your scenario",
        "paragraphs": [
          "A friend wants to help a community kitchen and is curious about Bitcoin. They have never used a wallet. Design an introduction that lets them learn, volunteer or make art without a purchase. If they later ask about giving, explain that a verified destination and accountable purpose are needed. Do not make donation the test of belonging."
        ]
      },
      {
        "title": "Build an understandable mock record",
        "paragraphs": [
          "Create a pretend artist invoice in sats, a conversion to BTC and a service report that uses aggregate numbers. Label every example as fictional. Show the difference between request, payment observation, settlement and actual delivery. Include a short custody comparison that identifies who controls spending and recovery. Avoid using real addresses, names, screenshots or secret information."
        ]
      },
      {
        "title": "Review it as the other person",
        "paragraphs": [
          "Ask a second learner to explain the page back to you. Can they identify the unit, recipient and source? Can they tell what happens if a payment is pending? Can they join without money? A correct technical sentence is not enough if the overall journey pressures them into an action they do not understand. Revise confusing language before moving to the advanced course. This is a self-assessment exercise, not a certification of financial competence."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Write a five-line newcomer invitation covering belonging, learning, optional giving, verification and privacy.",
      "answer": "A strong answer welcomes participation without money; links a lesson; makes giving voluntary; explains the verified recipient and purpose; and says that no recovery phrase or public wallet disclosure is needed. Another learner should be able to repeat those boundaries in their own words."
    },
    "quiz": [
      {
        "question": "Is passing a local quiz proof of readiness to manage significant funds?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It is practice, not an assessment by a qualified supervisor."
      },
      {
        "question": "What makes a better invitation?",
        "options": [
          "Pressure to act before learning",
          "A clear action with understandable choices"
        ],
        "answer": "An understandable choice helps a newcomer participate by consent."
      }
    ],
    "sources": [
      {
        "id": "units",
        "title": "Bitcoin developer guide: payment processing",
        "url": "https://developer.bitcoin.org/devguide/payment_processing.html"
      },
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "invoice",
        "title": "BTCPay Server: invoices",
        "url": "https://docs.btcpayserver.org/Users/invoices/"
      }
    ],
    "takeaway": "Teach the next person without asking them to surrender control."
  },
  {
    "courseId": "deep-dive",
    "order": 1,
    "slug": "reading-the-whitepaper",
    "title": "Read the whitepaper as an argument",
    "description": "Follow the problem, assumptions and proposed mechanism.",
    "minutes": 14,
    "outcomes": [
      "Connect double spending to a shared ordering problem.",
      "Separate the paper’s technical proposal from later implementations."
    ],
    "sections": [
      {
        "title": "Start with the threat",
        "paragraphs": [
          "The whitepaper asks how willing parties can transact digitally without making one intermediary the authority over payment history. A signature can establish authorization, but by itself does not reveal whether the same spend was offered elsewhere. The proposal therefore joins signatures with a public ordering mechanism and a way to compare competing histories."
        ]
      },
      {
        "title": "Keep the assumptions visible",
        "paragraphs": [
          "The paper analyzes an adversary trying to catch up with an honest chain. Its security discussion depends on assumptions about relative work and behavior. Read those assumptions before repeating the conclusion. The everyday phrase longest chain is best understood here through accumulated proof of work, not merely counting an arbitrary collection of blocks. A node still rejects a chain that violates its validation rules."
        ]
      },
      {
        "title": "Read historically and technically",
        "paragraphs": [
          "The document is a foundation, not a current wallet manual. Later improvements, deployed rules and operational experience belong in implementation documentation. When teaching it, annotate each paragraph as problem, mechanism, assumption or consequence. Avoid turning a technical statement about payment history into a guarantee about prices, human governance or charitable outcomes. Strong advocacy becomes more credible when it can explain the limits of its own evidence."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Why are digital signatures alone insufficient to solve the problem described in the introduction? Write a two-sentence explanation for a technical newcomer.",
      "answer": "A signature shows that the relevant key authorized a spend, but does not independently establish whether a conflicting spend exists. The network needs a shared way to establish which history to accept under its rules."
    },
    "quiz": [
      {
        "question": "Does chain selection replace transaction validation?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A candidate history must satisfy validation rules."
      },
      {
        "question": "Is the whitepaper a current step-by-step wallet guide?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It presents the foundational argument; implementations evolved."
      }
    ],
    "sources": [
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      },
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      }
    ],
    "takeaway": "Read the assumptions as carefully as the conclusion."
  },
  {
    "courseId": "deep-dive",
    "order": 2,
    "slug": "hashes-and-merkle-trees",
    "title": "Hashes and Merkle commitments",
    "description": "Learn what a compact commitment establishes—and what it does not.",
    "minutes": 14,
    "outcomes": [
      "Explain a Merkle inclusion proof conceptually.",
      "Distinguish integrity from truth and availability."
    ],
    "sections": [
      {
        "title": "A commitment binds data",
        "paragraphs": [
          "A cryptographic hash maps data to a fixed-size result. In Bitcoin, hashes connect block headers and organize transaction commitments. Change the underlying data and the corresponding commitment normally changes. A hash does not contain an explanation of the data, and it is not encryption that can be reversed to recover the original content."
        ]
      },
      {
        "title": "A tree makes a short path useful",
        "paragraphs": [
          "A Merkle tree combines hashes in pairs until one root remains. A proof can supply the neighboring hashes needed to reconstruct the root from a particular leaf. This establishes inclusion relative to a trusted or independently verified root. It does not, by itself, validate the included transaction’s spending conditions or prove that the root belongs to the accepted chain."
        ]
      },
      {
        "title": "Apply the boundary to service records",
        "paragraphs": [
          "Suppose an organization publishes a hash of a kitchen report. A matching copy later shows that the content agrees with that commitment. It does not prove that meals were served, that the report was honest or that the private evidence will remain available. If the input is predictable, a hash may also be guessable. Keep human verification, storage availability and cryptographic integrity as separate questions in an audit."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A report hash matches a file, but the file contains an inflated meal count. Which property passed and which remains unproven?",
      "answer": "Integrity relative to the published commitment passed: it is the committed content. The accuracy of the meal count remains unproven. A witness, reconciliation process and accountable review are still required."
    },
    "quiz": [
      {
        "question": "Can a Merkle proof alone establish every transaction rule was followed?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Inclusion is narrower than full validation."
      },
      {
        "question": "Is hashing a private file equivalent to encrypting it?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A hash is a commitment; it does not provide general confidentiality or recoverability."
      }
    ],
    "sources": [
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      },
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      }
    ],
    "takeaway": "A commitment protects consistency, not the truth of an assertion."
  },
  {
    "courseId": "deep-dive",
    "order": 3,
    "slug": "utxos-and-change",
    "title": "UTXOs, change and accounting",
    "description": "Read a transaction as a set of consumed and created outputs.",
    "minutes": 14,
    "outcomes": [
      "Balance inputs, outputs and fees.",
      "Explain why change is a new output."
    ],
    "sections": [
      {
        "title": "Outputs are the units of spendability",
        "paragraphs": [
          "A UTXO is an unspent transaction output. An input references a previous transaction and an output index, and supplies what is needed to satisfy that output’s spending conditions. Spending consumes the referenced output as a whole. A wallet balance summarizes many such outputs rather than representing one account row in a central database."
        ]
      },
      {
        "title": "Change preserves the difference",
        "paragraphs": [
          "Imagine a wallet spends a 100,000-sat output, pays 30,000 sats to a recipient and leaves 1,000 sats as a fee. It can create a 69,000-sat change output under its own control. That change is a newly created output, not a reduction of the original one in place. A recipient and change output can look similar to an outside observer; labels require context."
        ]
      },
      {
        "title": "Do not mistake visible totals for economic activity",
        "paragraphs": [
          "Adding every output in a transaction can overstate the amount paid to someone else because change is included. Multiple inputs may also link previously separate histories. A donation report needs wallet accounting and purpose records, not simply an explorer’s displayed transaction total. For practice, use synthetic amounts and labels so no real wallet graph is exposed. Later coin-control decisions must consider both fees and privacy."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Two fictional inputs contain 40,000 and 70,000 sats. A recipient receives 65,000 and the fee is 2,000. What change remains?",
      "answer": "The inputs total 110,000 sats. Subtracting 65,000 and 2,000 leaves 43,000 sats of change. The original inputs are consumed; the remaining value exists in a new output."
    },
    "quiz": [
      {
        "question": "Is change the unspent remainder inside the original consumed output?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It is a newly created output."
      },
      {
        "question": "Does the sum of all outputs necessarily equal a merchant sale?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Some outputs can return change or serve other recipients."
      }
    ],
    "sources": [
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      }
    ],
    "takeaway": "Reconcile value while keeping ownership labels separate from chain data."
  },
  {
    "courseId": "deep-dive",
    "order": 4,
    "slug": "scripts-and-spending-conditions",
    "title": "Scripts describe spending conditions",
    "description": "Understand programmability without assuming an account-based model.",
    "minutes": 14,
    "outcomes": [
      "Explain locking conditions and satisfying data.",
      "Recognize why arbitrary contract assumptions do not transfer."
    ],
    "sections": [
      {
        "title": "An output carries a condition",
        "paragraphs": [
          "Bitcoin transactions create outputs whose scripts constrain how they may be spent. A later spending transaction supplies the required data. In a simple key-based example, the conditions involve a valid signature for the relevant key. More complex constructions can express combinations such as multiple keys and time constraints."
        ]
      },
      {
        "title": "Execution answers a bounded question",
        "paragraphs": [
          "Script evaluation determines whether a proposed spend satisfies the applicable rules. It does not consult an external website to determine whether a meal happened. Bitcoin’s model is different from an application with a mutable account database or a general-purpose EVM contract. Familiar words such as contract can hide important differences in state, execution and available primitives."
        ]
      },
      {
        "title": "Review the whole condition",
        "paragraphs": [
          "A diagram saying two signatures required is incomplete if there is also an alternative recovery branch after a delay. Conversely, a script that is elegant mathematically may be difficult to back up or operate with available wallets. Separate what the script permits from what a user interface claims and what the organization intends. This lesson explains conditions; it does not ask you to construct or fund a custom script with real assets."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional spending policy has one path requiring two keys and another available after a delay. What must a reviewer inspect beyond the phrase “two-key wallet”?",
      "answer": "They must inspect the alternative path, timing conditions, who controls its keys, wallet support and recovery behavior. A summary that omits a valid branch can misrepresent who can ultimately spend."
    },
    "quiz": [
      {
        "question": "Can a Bitcoin script directly verify that a dinner was served?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. That real-world fact is outside the transaction’s own validation data."
      },
      {
        "question": "Does an EVM contract explanation automatically apply to Bitcoin outputs?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Their execution and state models differ."
      }
    ],
    "sources": [
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      },
      {
        "id": "bip341",
        "title": "BIP 341: Taproot",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki"
      }
    ],
    "takeaway": "A spending policy is the complete set of allowed paths."
  },
  {
    "courseId": "deep-dive",
    "order": 5,
    "slug": "signatures-and-commitments",
    "title": "Signatures and what they authorize",
    "description": "A valid signature is only as meaningful as the message it covers.",
    "minutes": 14,
    "outcomes": [
      "Distinguish authentication from informed authorization.",
      "Explain why transaction details matter to a signer."
    ],
    "sections": [
      {
        "title": "A signature binds a key to a message",
        "paragraphs": [
          "Bitcoin uses digital signatures to authorize spending under applicable script rules. BIP 340 specifies Schnorr signatures used in Taproot contexts; earlier output types use other established rules. A valid signature establishes a mathematical relation among a message, signature and public key. It does not establish that a human understood the transaction shown by an interface."
        ]
      },
      {
        "title": "The covered data matters",
        "paragraphs": [
          "Transaction signature rules determine which parts are committed to. Different signature-hash modes have different meanings. A signer must therefore inspect the actual transaction and intended policy rather than assuming that every signature authorizes exactly one intuitive payment. A request described as verification can still deserve scrutiny if its content is unclear."
        ]
      },
      {
        "title": "Make the display useful",
        "paragraphs": [
          "For a fictional hardware-signing exercise, show the recipient outputs, change recognition, network and fee before approval. If a device cannot meaningfully display what matters, that is a limitation to address, not an invitation to click through. A signature workflow should support refusal and an independent review route. This course never asks for a real signature; use a written transaction summary to practice explaining what would be authorized."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A signer sees a 20,000-sat recipient payment but the proposed transaction also has an unfamiliar second external output. What is the right review question?",
      "answer": "Ask what every output represents and whether change is correctly identified. A correct first output does not establish that the whole transaction matches the intended action."
    },
    "quiz": [
      {
        "question": "Does cryptographic validity prove informed human consent?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The human may have been shown misleading information."
      },
      {
        "question": "Should unfamiliar signature modes be ignored because the wallet recognizes them?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Their commitments need to match the intended authorization."
      }
    ],
    "sources": [
      {
        "id": "bip340",
        "title": "BIP 340: Schnorr signatures",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki"
      },
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      }
    ],
    "takeaway": "Review the message and spending effect, not merely the signature prompt."
  },
  {
    "courseId": "deep-dive",
    "order": 6,
    "slug": "block-headers",
    "title": "Block headers and the chain of work",
    "description": "Trace how compact headers bind a transaction history.",
    "minutes": 14,
    "outcomes": [
      "Identify the role of previous-block and Merkle commitments.",
      "Distinguish header checks from full block validation."
    ],
    "sections": [
      {
        "title": "Two commitments join the structure",
        "paragraphs": [
          "A block header links to the previous block and commits to its transactions through a Merkle root. It also contains fields used in proof-of-work validation. Linking headers allows a verifier to evaluate accumulated work and ordering. The transaction data remains necessary for a full node to validate the actual spends and other rules."
        ]
      },
      {
        "title": "Compact evidence has a boundary",
        "paragraphs": [
          "Headers are smaller than full blocks, which makes them useful for lightweight verification. But a chain of plausible headers cannot by itself prove that every transaction inside the corresponding blocks is valid. A lightweight client relies on additional assumptions and evidence. Describe the assurance level honestly instead of calling every explorer lookup equivalent to running a fully validating node."
        ]
      },
      {
        "title": "Use a chain sketch",
        "paragraphs": [
          "Draw three fictional blocks as boxes. Put a previous-header link and a transaction-root label in each. If a transaction in the first box changes, its root changes and the links above it no longer match the original history. The exercise explains commitments; it does not calculate the real cost of an attack. That cost depends on work, network behavior and the adversary, not the artistic length of a drawing."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A service verifies headers and an inclusion path but does not execute the block’s transaction rules. What can it claim more narrowly than “fully verified Bitcoin”?",
      "answer": "It can describe header-chain and transaction-inclusion checks under its assumptions. It should disclose that it did not independently validate every transaction and spending condition in the full chain."
    },
    "quiz": [
      {
        "question": "Does a header include every transaction’s full contents?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It commits to them through a root."
      },
      {
        "question": "Is header verification identical to full validation?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The data and checks differ."
      }
    ],
    "sources": [
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      },
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      }
    ],
    "takeaway": "State exactly which evidence your verifier checked."
  },
  {
    "courseId": "deep-dive",
    "order": 7,
    "slug": "difficulty-and-hashrate",
    "title": "Difficulty, hashrate and noisy observations",
    "description": "Separate a protocol target from an inferred network measurement.",
    "minutes": 14,
    "outcomes": [
      "Explain the purpose of difficulty adjustment.",
      "Recognize uncertainty in short-term hashrate estimates."
    ],
    "sections": [
      {
        "title": "A target controls the search",
        "paragraphs": [
          "Proof of work compares a header hash against a target. A more demanding target makes success less likely per attempt. Bitcoin adjusts difficulty at defined intervals based on observed timing under its rules. This mechanism aims to regulate average block production; it does not schedule individual blocks or guarantee that mining revenue remains constant."
        ]
      },
      {
        "title": "Hashrate is not printed in each block",
        "paragraphs": [
          "A block proves that a successful candidate was found, not how many unsuccessful attempts preceded it. Network hashrate charts therefore estimate activity from difficulty and observed blocks over a window. Short windows are noisy. A sudden estimated jump does not automatically establish that a particular new mining facility came online."
        ]
      },
      {
        "title": "Match the claim to the measurement",
        "paragraphs": [
          "Suppose a newsroom sees several quick blocks and wants a headline declaring a permanent hashrate increase. Ask about the window, estimator, uncertainty and comparison period. Distinguish protocol data from interpretation. A serious technical conversation can support proof of work while acknowledging statistical noise and changing economics. Do not present a point estimate as an exact count of machines or a forecast of future security."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Two charts use the same chain data but one averages a day and the other a month. Why might their current hashrate estimates differ?",
      "answer": "They use different observation windows. Random block timing affects short windows more strongly, while a longer window smooths recent changes. Neither chart directly counts every unsuccessful hash attempt."
    },
    "quiz": [
      {
        "question": "Does difficulty adjustment promise a block at an exact time?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It concerns expected production over time."
      },
      {
        "question": "Does a block reveal the total number of failed attempts?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Hashrate is inferred from observations and assumptions."
      }
    ],
    "sources": [
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      },
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      }
    ],
    "takeaway": "Treat estimated hashrate as an estimate with a window."
  },
  {
    "courseId": "deep-dive",
    "order": 8,
    "slug": "issuance-and-incentives",
    "title": "Issuance, fees and incentives",
    "description": "Understand rules without converting them into a price promise.",
    "minutes": 14,
    "outcomes": [
      "Separate subsidy and transaction fees.",
      "Explain why scarcity does not determine demand."
    ],
    "sections": [
      {
        "title": "The coinbase transaction has a special role",
        "paragraphs": [
          "A block’s coinbase transaction can claim the permitted subsidy and included transaction fees under consensus rules. The subsidy follows Bitcoin’s issuance schedule and decreases at defined block heights. Ordinary users cannot create the same privilege by labeling a transaction as a reward. Nodes validate the allowed amounts as part of block acceptance."
        ]
      },
      {
        "title": "Incentives are an argument, not magic",
        "paragraphs": [
          "The whitepaper discusses why miners may prefer following the rules to attacking the system. Real participants still face hardware, energy and market conditions. A rule can constrain issuance while economic behavior remains uncertain. Avoid treating a halving as a timetable for prices or assuming that a smaller subsidy alone tells the full future security story."
        ]
      },
      {
        "title": "Keep community rewards separate",
        "paragraphs": [
          "If a kitchen grant is paid in sats, those sats come from an existing approved budget. They are not newly mined because a volunteer submitted evidence. A service-review process and Bitcoin issuance operate at different layers. In educational reports, distinguish mined issuance, transfers, trading gains, donations and borrowing. Calling all incoming funds rewards can hide both the source and the obligation attached to them."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional block permits a 10-unit subsidy and contains 2 units in fees. A miner claims 13. What should a validating node conclude in this simplified example?",
      "answer": "The claim exceeds the allowed total of 12 and is invalid. The example uses invented units to teach the accounting rule, not current Bitcoin subsidy values."
    },
    "quiz": [
      {
        "question": "Do community service records create new BTC?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Any payment must come from actual funds."
      },
      {
        "question": "Does a known issuance schedule guarantee a future market price?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Demand and other market conditions are separate."
      }
    ],
    "sources": [
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      },
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      }
    ],
    "takeaway": "Know the monetary rule and keep economic predictions distinct."
  },
  {
    "courseId": "deep-dive",
    "order": 9,
    "slug": "mempool-and-policy",
    "title": "Mempools and policy are not consensus",
    "description": "Understand why nodes can disagree about pending transactions.",
    "minutes": 14,
    "outcomes": [
      "Distinguish local relay policy from block validity.",
      "Explain why a transaction can be absent from one explorer."
    ],
    "sections": [
      {
        "title": "There is no single global waiting room",
        "paragraphs": [
          "A node’s mempool is its local collection of accepted unconfirmed transactions. Nodes can receive information at different times, apply different policies and evict transactions under resource constraints. An explorer showing no result does not prove that nobody else has seen the transaction. Conversely, visibility in one mempool does not ensure eventual confirmation."
        ]
      },
      {
        "title": "Policy helps manage limited resources",
        "paragraphs": [
          "Relay and mempool policy restrict what a node is willing to handle before confirmation. Consensus rules determine what blocks it accepts as valid. These layers overlap in purpose but are not identical. A transaction can fail a local policy check without proving that every possible block containing it would violate consensus. Exact behavior depends on implementation and version."
        ]
      },
      {
        "title": "Diagnose with identifiers and context",
        "paragraphs": [
          "For a fictional pending donation, collect the network, transaction identifier, observing node’s synchronization state and relevant policy response. Avoid exposing an entire wallet history when one transaction is sufficient. Compare observations with their timestamps. A responsible interface distinguishes not observed, rejected by this node, pending and confirmed instead of turning every missing lookup into failed payment.",
          "When comparing two nodes, also record when each observation was made; their views can change while the comparison is underway."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Explorer A shows a transaction pending; Explorer B has no record. List two explanations that do not require fraud.",
      "answer": "They may have different propagation timing or local policies, or one may be out of sync. The disagreement needs investigation of the same network and transaction, not an automatic resend."
    },
    "quiz": [
      {
        "question": "Is there one universal mempool shared identically by every node?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Mempools are local views."
      },
      {
        "question": "Is relay policy always identical to consensus validity?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. They answer different operational questions."
      }
    ],
    "sources": [
      {
        "id": "p2p",
        "title": "Bitcoin developer guide: peer-to-peer network",
        "url": "https://developer.bitcoin.org/devguide/p2p_network.html"
      },
      {
        "id": "bip125",
        "title": "BIP 125: opt-in replace-by-fee",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki"
      }
    ],
    "takeaway": "Describe a node’s observation without calling it the whole network."
  },
  {
    "courseId": "deep-dive",
    "order": 10,
    "slug": "fee-bumping",
    "title": "Fee changes: RBF and CPFP",
    "description": "Understand two mechanisms before relying on a rescue button.",
    "minutes": 14,
    "outcomes": [
      "Compare replacement and child-pays-for-parent concepts.",
      "Recognize wallet and policy constraints."
    ],
    "sections": [
      {
        "title": "A replacement changes the proposed spend",
        "paragraphs": [
          "Replace-by-fee concerns replacing an unconfirmed transaction with a competing transaction that pays a more attractive fee under applicable node policy. BIP 125 documents an opt-in approach; actual software policy can evolve. A replacement can change the transaction identifier and may change outputs, so an application must reconcile the final transaction rather than trusting an old identifier forever."
        ]
      },
      {
        "title": "A child can make a package more attractive",
        "paragraphs": [
          "Child-pays-for-parent uses a transaction spending an output of an unconfirmed parent. A sufficiently attractive combined fee can encourage inclusion of the package under supported policies. This requires a spendable output and appropriate wallet behavior. It is not a universal ability to modify somebody else’s transaction or to force a miner to include it."
        ]
      },
      {
        "title": "Plan observability before urgency",
        "paragraphs": [
          "An artist checkout should keep order identity separate from transaction identity because replacement and multiple payment attempts complicate the mapping. A fee bump is not a new sale. Before a real action, inspect the current wallet documentation, transaction state, amounts and total fee. This course provides a paper comparison only; it does not instruct you to use a paid acceleration service or modify a live transaction."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A pending payment changes from identifier A to identifier B after an authorized fee replacement. What should an invoice system preserve?",
      "answer": "It should preserve the order and intended payment relationship while tracking the replacement and final settlement. It must avoid counting A and B as two independent settled donations."
    },
    "quiz": [
      {
        "question": "Does fee replacement guarantee a specific confirmation time?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Mining and policy remain relevant."
      },
      {
        "question": "Does CPFP let anyone spend an output they cannot authorize?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The child still needs valid spending authorization."
      }
    ],
    "sources": [
      {
        "id": "bip125",
        "title": "BIP 125: opt-in replace-by-fee",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki"
      },
      {
        "id": "units",
        "title": "Bitcoin developer guide: payment processing",
        "url": "https://developer.bitcoin.org/devguide/payment_processing.html"
      }
    ],
    "takeaway": "A fee-management action needs its own reconciliation trail."
  },
  {
    "courseId": "deep-dive",
    "order": 11,
    "slug": "segwit-and-weight",
    "title": "SegWit and transaction weight",
    "description": "Connect a structural change to practical fee accounting.",
    "minutes": 14,
    "outcomes": [
      "Explain witness separation at a high level.",
      "Calculate virtual size from weight."
    ],
    "sections": [
      {
        "title": "Witness data has a distinct role",
        "paragraphs": [
          "Segregated Witness, described in BIP 141, separates witness information used to satisfy spending conditions from the traditional transaction serialization used for the transaction identifier. This addresses important transaction-malleability concerns for the relevant forms and introduces a weight-based way to constrain block resources. It does not mean that signatures disappear or stop being validated."
        ]
      },
      {
        "title": "Weight and virtual bytes are related",
        "paragraphs": [
          "Transaction weight combines base size and total size according to the specified formula. Virtual size is weight divided by four, rounded up. Wallet fee estimates commonly use virtual bytes, so a comparison based only on raw file length can be misleading. The output and input types influence the data that needs to be represented."
        ]
      },
      {
        "title": "Explain benefits without universal promises",
        "paragraphs": [
          "A SegWit label does not guarantee that every transaction is cheaper than every older-format transaction. Input counts, script structure and fee rates still matter. Likewise, a protocol improvement does not make an unknown wallet implementation safe. When reviewing a technical claim, separate the deployed consensus feature from product support and a particular transaction’s measured characteristics.",
          "For a practical estimator, label whether its input is bytes, weight units or virtual bytes before applying a fee rate. A correct multiplication with the wrong unit still produces a wrong fee."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A hypothetical transaction weighs 561 weight units. What virtual size should be used before multiplying by a fee rate?",
      "answer": "Divide by four to get 140.25 and round up: 141 virtual bytes. At an illustrative 3 sats/vbyte, the corresponding fee calculation is 423 sats."
    },
    "quiz": [
      {
        "question": "Does witness separation mean signatures are no longer checked?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Witness data remains part of validation."
      },
      {
        "question": "Should virtual size round down when weight is not divisible by four?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. BIP 141 specifies rounding up."
      }
    ],
    "sources": [
      {
        "id": "bip141",
        "title": "BIP 141: Segregated Witness",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki"
      }
    ],
    "takeaway": "Use the protocol’s resource units when comparing fees."
  },
  {
    "courseId": "deep-dive",
    "order": 12,
    "slug": "taproot-and-schnorr",
    "title": "Taproot and Schnorr: useful, not magical",
    "description": "Understand spend paths and the boundaries of privacy gains.",
    "minutes": 14,
    "outcomes": [
      "Distinguish key-path and script-path spending.",
      "Avoid overstating Taproot privacy or wallet support."
    ],
    "sections": [
      {
        "title": "A new spending structure",
        "paragraphs": [
          "Taproot combines a key-based spending path with the ability to commit to script alternatives. BIP 340 describes the Schnorr signature construction, and BIP 341 specifies Taproot output and spending rules. A cooperative key-path spend can avoid exposing unused script alternatives. A script-path spend reveals the used script and information needed to validate its commitment."
        ]
      },
      {
        "title": "Privacy depends on what happens",
        "paragraphs": [
          "Unused branches can remain hidden, but a Taproot transaction is not automatically anonymous. Network observation, address reuse, transaction amounts and other metadata still matter. Script-path usage can reveal additional structure. Distinguish a privacy improvement in a particular construction from a claim that all transactions are indistinguishable under all circumstances."
        ]
      },
      {
        "title": "Do not invent a signing protocol",
        "paragraphs": [
          "The algebraic properties of Schnorr signatures support useful constructions, but safely combining participants’ keys and signatures requires an appropriate protocol. A homemade scheme that adds public keys is not a security review. For an organization, wallet support, backup information and recovery behavior matter as much as the elegance of the script tree. Study the rules with synthetic examples before considering any production policy."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A backup says only “Taproot wallet,” but the recovery plan relies on an alternative script path. What information is missing?",
      "answer": "The spending policy, relevant keys, derivation and script-tree information may be required. A format label alone does not describe the complete recovery arrangement or prove that a replacement wallet can reconstruct it."
    },
    "quiz": [
      {
        "question": "Does a key-path spend reveal every unused script branch?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Avoiding that disclosure is one of the useful properties."
      },
      {
        "question": "Does Taproot eliminate all privacy concerns?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Transaction and network metadata can still identify patterns."
      }
    ],
    "sources": [
      {
        "id": "bip340",
        "title": "BIP 340: Schnorr signatures",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki"
      },
      {
        "id": "bip341",
        "title": "BIP 341: Taproot",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki"
      }
    ],
    "takeaway": "Evaluate the actual spend path and complete recovery policy."
  },
  {
    "courseId": "deep-dive",
    "order": 13,
    "slug": "hd-wallets",
    "title": "HD wallets and derivation paths",
    "description": "Understand reproducible keys without mistaking xpubs for harmless data.",
    "minutes": 14,
    "outcomes": [
      "Explain a hierarchy of derived keys.",
      "Identify why derivation metadata and xpub privacy matter."
    ],
    "sections": [
      {
        "title": "A tree replaces isolated key records",
        "paragraphs": [
          "BIP 32 defines hierarchical deterministic wallets: a seed can derive a tree of keys through indexed paths. Extended keys include information needed for child derivation. This helps wallets create many receiving addresses without requiring a separately improvised backup for every new address. A path identifies a position in the hierarchy, not a separate blockchain account."
        ]
      },
      {
        "title": "Public derivation is useful and sensitive",
        "paragraphs": [
          "An extended public key can derive corresponding non-hardened public descendants without spending authority. That makes watch-only receiving and monitoring possible. It can also reveal a broad set of addresses and their activity. Some combinations of exposed extended public information and private descendants have serious security consequences, which is one reason hardened derivation exists."
        ]
      },
      {
        "title": "Recovery needs context",
        "paragraphs": [
          "A seed alone does not always tell replacement software which script type, account or path the original wallet used. Store the required policy metadata securely according to the wallet’s recovery design. Never post a real xpub in a public support issue merely because it cannot independently sign. For a learning diagram, label a root, account branch, receiving branch and change branch without including actual key material."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A shop wants an online server to generate receiving addresses without holding spending keys. What concept helps, and what privacy tradeoff remains?",
      "answer": "A suitable extended public key or watch-only descriptor can support receiving-address generation. The server can still learn and expose the associated address history, so its scope and access should be limited."
    },
    "quiz": [
      {
        "question": "Is an xpub equivalent to one ordinary receiving address?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It can reveal a family of derived addresses."
      },
      {
        "question": "Can every wallet infer all derivation choices from a seed alone?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Recovery may require additional metadata."
      }
    ],
    "sources": [
      {
        "id": "bip32",
        "title": "BIP 32: hierarchical deterministic wallets",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki"
      },
      {
        "id": "bip380",
        "title": "BIP 380: output script descriptors",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki"
      }
    ],
    "takeaway": "Back up the policy context as well as the secret."
  },
  {
    "courseId": "deep-dive",
    "order": 14,
    "slug": "psbt-workflows",
    "title": "PSBT: separate construction from signing",
    "description": "Follow a portable transaction through distinct responsibilities.",
    "minutes": 14,
    "outcomes": [
      "Identify the main PSBT roles.",
      "Explain why a signer must still review the transaction."
    ],
    "sections": [
      {
        "title": "A container for collaboration",
        "paragraphs": [
          "A Partially Signed Bitcoin Transaction carries a proposed transaction and supporting data so multiple tools can participate. BIP 174 describes roles such as creator, updater, signer, combiner, finalizer and extractor. One application may perform several roles, but the separation helps explain where data is added and where spending authorization occurs."
        ]
      },
      {
        "title": "Portable does not mean trustworthy",
        "paragraphs": [
          "A coordinator can prepare a PSBT without being allowed to spend. A signer must check the transaction and sufficient supporting information rather than assuming the coordinator is honest. Combining signatures does not authorize a different economic purpose. The final extracted transaction still needs broadcast and reconciliation; a complete signature set is not a confirmation."
        ]
      },
      {
        "title": "Design for refusal and recovery",
        "paragraphs": [
          "In a fictional two-person treasury, one person prepares a payment request and two authorized signers review their own displays. A mismatch stops the workflow. Logs can preserve the approved purpose and final transaction identifier without storing private keys. Test the recovery path if the coordinator disappears: can another compatible tool reconstruct the policy and complete the process? This lesson does not ask you to sign or upload any real PSBT."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A coordinator says a PSBT is “ready.” Name three checks a signer should understand before authorizing it.",
      "answer": "Check recipient outputs and amounts, correct recognition of change, and the fee/network/policy context. The exact review depends on the wallet and script. “Ready” is a workflow label, not proof that the proposal matches human intent."
    },
    "quiz": [
      {
        "question": "Does a PSBT require the coordinator to hold private keys?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Construction and signing can be separated."
      },
      {
        "question": "Does finalizing a PSBT prove on-chain settlement?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Broadcast and settlement checks come afterward."
      }
    ],
    "sources": [
      {
        "id": "bip174",
        "title": "BIP 174: partially signed Bitcoin transactions",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki"
      },
      {
        "id": "btcpay",
        "title": "BTCPay Server: wallet",
        "url": "https://docs.btcpayserver.org/Wallet/"
      }
    ],
    "takeaway": "Keep preparation, authorization and settlement independently understandable."
  },
  {
    "courseId": "deep-dive",
    "order": 15,
    "slug": "descriptors-and-recovery",
    "title": "Descriptors make a wallet policy portable",
    "description": "Preserve the information that turns keys into the intended outputs.",
    "minutes": 14,
    "outcomes": [
      "Explain what a descriptor describes.",
      "Identify limits of a key-only backup."
    ],
    "sections": [
      {
        "title": "Keys do not describe every choice",
        "paragraphs": [
          "A replacement wallet must know how to construct the scripts and addresses it should watch. Output script descriptors express script types, keys and derivation information in a structured language. BIP 380 describes general syntax and checksums. This addresses a gap in backups that preserve a secret but omit the policy surrounding it."
        ]
      },
      {
        "title": "A checksum is useful but narrow",
        "paragraphs": [
          "A descriptor checksum can help detect transcription errors. It does not certify that the descriptor belongs to you or represents the intended signers. A maliciously supplied descriptor can be perfectly well formed. Verify policy and derived receiving information through the supported wallet workflow rather than trusting syntactic validity alone."
        ]
      },
      {
        "title": "Protect both confidentiality and continuity",
        "paragraphs": [
          "A descriptor can contain public or private key material depending on the export. Never assume every descriptor is safe to publish. Even a watch-only export can disclose financial history. A good recovery package records the required format and metadata under appropriate access controls. For a classroom exercise, draw the policy rather than copying a live descriptor. Ask whether a second compatible implementation can interpret it before treating portability as established."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A multisig backup includes one signer’s seed but omits the other public keys and script policy. Why might that be insufficient even if another signer is available?",
      "answer": "The wallet may be unable to reconstruct the exact addresses and spending conditions. Recovery needs the required key threshold and complete policy metadata, not simply an unrelated collection of seeds."
    },
    "quiz": [
      {
        "question": "Does a valid checksum prove ownership?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It primarily detects errors, not authorization."
      },
      {
        "question": "Are all descriptors safe to post publicly?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. They may contain private material or sensitive public-wallet information."
      }
    ],
    "sources": [
      {
        "id": "bip380",
        "title": "BIP 380: output script descriptors",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki"
      }
    ],
    "takeaway": "A portable recovery plan preserves the exact policy, not just a label."
  },
  {
    "courseId": "deep-dive",
    "order": 16,
    "slug": "full-nodes-and-pruning",
    "title": "Full nodes, pruning and verification",
    "description": "Understand the difference between validating history and retaining every byte.",
    "minutes": 14,
    "outcomes": [
      "Explain full validation and pruned storage.",
      "Recognize operational limits of a node."
    ],
    "sections": [
      {
        "title": "Validation is the core responsibility",
        "paragraphs": [
          "A full node independently checks blocks and transactions against its rules. Running one can reduce dependence on a third-party service for payment verification. It does not automatically make every connected wallet use that node; the wallet’s actual connection and configuration still matter. A node also does not create ownership of funds merely by observing them."
        ]
      },
      {
        "title": "Storage choices affect capabilities",
        "paragraphs": [
          "Pruning removes older block data after validation to reduce retained storage. It is different from skipping validation. However, historical rescans and serving old blocks can be constrained by what remains available locally. A recovery plan must account for those operational limits rather than assuming that a small disk footprint comes without consequences."
        ]
      },
      {
        "title": "Independence still needs maintenance",
        "paragraphs": [
          "A node depends on hardware, storage integrity, power, network access and software maintenance. Protect administrative interfaces and understand synchronization status before treating its view as current. Do not publish a node’s management credentials to make remote help convenient. For this course, plan the architecture on paper: data source, wallet connection, backup, update process and who responds when the machine is offline. No software installation or ports need to be opened."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A wallet uses a public server while a full node runs unused on the same home network. Has the wallet automatically gained independent validation?",
      "answer": "No. The wallet must actually use an appropriate connection to the validating node. Proximity is not configuration, and a node that is out of sync may also provide an incomplete current view."
    },
    "quiz": [
      {
        "question": "Does pruning necessarily mean skipping historical validation?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Pruning concerns retained data after validation."
      },
      {
        "question": "Does operating a node remove hardware and maintenance responsibilities?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It changes dependencies rather than eliminating operations."
      }
    ],
    "sources": [
      {
        "id": "node",
        "title": "Bitcoin.org: running a full node",
        "url": "https://bitcoin.org/en/full-node"
      },
      {
        "id": "p2p",
        "title": "Bitcoin developer guide: peer-to-peer network",
        "url": "https://developer.bitcoin.org/devguide/p2p_network.html"
      }
    ],
    "takeaway": "Verify the connection and operational state, not just the presence of a node."
  },
  {
    "courseId": "deep-dive",
    "order": 17,
    "slug": "reorganizations-and-light-clients",
    "title": "Reorganizations and lightweight evidence",
    "description": "Understand why history observations have different strengths.",
    "minutes": 14,
    "outcomes": [
      "Explain a reorganization without implying arbitrary coin creation.",
      "Compare full validation and inclusion-based checks."
    ],
    "sections": [
      {
        "title": "Competing valid histories can occur",
        "paragraphs": [
          "Nodes can temporarily learn about different valid blocks near the tip. If a competing valid chain accumulates greater work, a node may reorganize its accepted history. Transactions from displaced blocks may reappear elsewhere, return to an unconfirmed state or conflict with accepted spends. A reorganization is not permission to violate the node’s monetary or spending rules."
        ]
      },
      {
        "title": "Inclusion proofs answer a narrower question",
        "paragraphs": [
          "A lightweight client can use headers and Merkle evidence to check inclusion under particular assumptions. That is different from independently executing all validation rules over the entire chain. The whitepaper discusses the tradeoff. A product should tell users which verification approach it uses rather than borrowing the assurance of a full node it does not operate."
        ]
      },
      {
        "title": "Design state transitions honestly",
        "paragraphs": [
          "A payment interface should be able to move from an earlier observation to a corrected state when the underlying chain changes. A confirmation badge hard-coded forever after the first observation is poor accounting. Keep order fulfillment policy distinct from chain observation, and preserve an audit trail of corrections. Do not promise that any single confirmation count makes all attack models impossible."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional donation was included in a block later displaced by a reorganization. What should a reporting system avoid doing?",
      "answer": "It should avoid permanently counting the old inclusion as final without checking the accepted chain. It must reassess the transaction and its settlement state, preserve the correction and avoid treating reappearance as a second donation."
    },
    "quiz": [
      {
        "question": "Can a greater-work chain force a node to accept invalid inflation?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The chain must still satisfy that node’s validation rules."
      },
      {
        "question": "Is transaction inclusion the same as full validation?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The checks and assumptions differ."
      }
    ],
    "sources": [
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      },
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      }
    ],
    "takeaway": "Build systems that can correct observations when the chain view changes."
  },
  {
    "courseId": "deep-dive",
    "order": 18,
    "slug": "lightning-htlcs",
    "title": "Lightning channels and HTLCs",
    "description": "Follow conditional payments without assuming trusted routing intermediaries.",
    "minutes": 14,
    "outcomes": [
      "Describe hash and time conditions conceptually.",
      "Explain why channel operation needs current state."
    ],
    "sections": [
      {
        "title": "Channels keep an enforceable relationship",
        "paragraphs": [
          "Lightning participants exchange updates to channel balances with commitments anchored to Bitcoin. Routed payments connect multiple channels. The protocol uses conditional mechanisms so a forwarding node can link what it pays onward to what it receives. The goal is coordinated completion or failure rather than simply trusting each intermediary to forward money."
        ]
      },
      {
        "title": "Hashes and timeouts coordinate the path",
        "paragraphs": [
          "An HTLC combines a hash-based condition with a timeout. Revealing the appropriate preimage can fulfill the payment condition; time constraints provide a recovery path when it is not fulfilled. Timeout differences along a route matter because intermediaries need time to resolve dependent claims. The exact commitment and channel rules belong to the relevant Lightning specification and implementation."
        ]
      },
      {
        "title": "Operational details remain important",
        "paragraphs": [
          "A correct protocol is not a substitute for current state, backups, monitoring and fee management. A self-hosted node operator must understand their implementation’s recovery method rather than assuming an on-chain seed restores every channel situation. This lesson deliberately uses a diagram, not a live channel. Draw payer, forwarding node and recipient, then label the information each needs and what happens when a participant becomes unavailable."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Why should an intermediary’s incoming and outgoing conditions be coordinated rather than independent promises?",
      "answer": "The intermediary needs a way to obtain what it is owed when the onward payment succeeds and to resolve failure within the allowed time. Independent informal promises would reintroduce trust and loss exposure."
    },
    "quiz": [
      {
        "question": "Are forwarding nodes meant to rely only on a recipient’s verbal promise?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Conditional protocol mechanisms coordinate outcomes."
      },
      {
        "question": "Does an on-chain wallet backup automatically describe every Lightning recovery procedure?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Channel-state and implementation-specific recovery requirements matter."
      }
    ],
    "sources": [
      {
        "id": "bolt2",
        "title": "Lightning specification: peer protocol",
        "url": "https://github.com/lightning/bolts/blob/master/02-peer-protocol.md"
      },
      {
        "id": "ln",
        "title": "Lightning Labs: network overview",
        "url": "https://docs.lightning.engineering/the-lightning-network/overview"
      }
    ],
    "takeaway": "Understand the condition and the operational responsibility together."
  },
  {
    "courseId": "deep-dive",
    "order": 19,
    "slug": "lightning-liquidity",
    "title": "Lightning liquidity has direction",
    "description": "Capacity is not the same as the ability to receive.",
    "minutes": 14,
    "outcomes": [
      "Distinguish inbound and outbound capacity conceptually.",
      "Explain why a route may fail despite visible channels."
    ],
    "sections": [
      {
        "title": "Balances determine direction",
        "paragraphs": [
          "A channel’s total capacity describes value committed to it, but the distribution of balances affects what can move in each direction. A node can have channels and still lack sufficient ability to receive a particular payment. Looking only at the capacity headline omits the practical direction of available liquidity."
        ]
      },
      {
        "title": "A route is a set of constraints",
        "paragraphs": [
          "The sender needs a usable path through channels whose participants are available and able to forward the amount. Public topology does not reveal every current balance or operational condition. Attempts can fail and alternative routes may be tried. Small successful payments therefore do not prove that an arbitrary larger payment will work at the same time."
        ]
      },
      {
        "title": "Treat liquidity services as services",
        "paragraphs": [
          "An operator may consider channels, liquidity providers or other arrangements, each with fees and assumptions. This lesson does not recommend a provider or ask for a channel opening. A comparison should describe costs, custody, uptime expectations, limits and recovery behavior. For a community checkout, communicate a failed attempt honestly and offer a verified alternative without pressuring the buyer to accept unfamiliar infrastructure."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional node has a channel of 100,000 sats, with almost all spendable balance on its own side. Why might an incoming 60,000-sat payment still fail?",
      "answer": "Total capacity does not establish inbound liquidity. The remote side and the rest of the route must be able to carry the incoming payment, subject to channel constraints and current availability."
    },
    "quiz": [
      {
        "question": "Does large total channel capacity guarantee any incoming payment succeeds?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Direction and route conditions matter."
      },
      {
        "question": "Does one successful small payment prove unlimited capacity?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Amount and timing change the constraints."
      }
    ],
    "sources": [
      {
        "id": "ln",
        "title": "Lightning Labs: network overview",
        "url": "https://docs.lightning.engineering/the-lightning-network/overview"
      },
      {
        "id": "bolt2",
        "title": "Lightning specification: peer protocol",
        "url": "https://github.com/lightning/bolts/blob/master/02-peer-protocol.md"
      }
    ],
    "takeaway": "Measure the direction and usable route, not only total capacity."
  },
  {
    "courseId": "deep-dive",
    "order": 20,
    "slug": "soft-forks-and-governance",
    "title": "Soft forks, proposals and human coordination",
    "description": "Distinguish code, signaling and actual rule enforcement.",
    "minutes": 14,
    "outcomes": [
      "Explain a soft fork as a restriction of accepted behavior.",
      "Avoid treating a proposal number as deployment evidence."
    ],
    "sections": [
      {
        "title": "Rules change through concrete mechanisms",
        "paragraphs": [
          "A soft fork narrows the set of behavior accepted by upgraded validators in a way intended to retain compatibility with older validation rules. Activation mechanisms vary. BIP 9 describes one version-bits signaling approach; it is not a universal description of every past or future upgrade. Study the actual deployment rather than generalizing from one mechanism."
        ]
      },
      {
        "title": "Publication is not adoption",
        "paragraphs": [
          "A Bitcoin Improvement Proposal can be a discussion document, specification or historical record. Having a BIP number does not make a proposal accepted, safe or active. Source code availability, releases, signaling and economic adoption are distinct evidence. A miner’s signal and a user’s rule enforcement also play different roles; no single popularity counter captures the whole process."
        ]
      },
      {
        "title": "Disagreement belongs in an open system",
        "paragraphs": [
          "Technical review includes adversarial questions about failure modes, compatibility, incentives and maintenance. Supporting Bitcoin does not require treating every proposed feature as an improvement or every critic as an opponent. For a community explanation, identify what is deployed, what is debated and which conclusions are your interpretation. Do not use the project’s Nakamoto standard phrase as though it settles a protocol governance dispute."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A social post says “BIP 999 exists, therefore every wallet now supports it.” List the missing evidence without assuming anything about that hypothetical proposal.",
      "answer": "Check the actual document and status, implementation, deployment conditions and the specific wallet’s released support. Existence in a proposal repository does not establish adoption or interoperability."
    },
    "quiz": [
      {
        "question": "Is a BIP number proof of deployment?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Proposal and adoption are different."
      },
      {
        "question": "Does one activation method explain all upgrades?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Read the specific mechanism and historical context."
      }
    ],
    "sources": [
      {
        "id": "bip9",
        "title": "BIP 9: version-bits deployment",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0009.mediawiki"
      },
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      }
    ],
    "takeaway": "Track the path from proposal to enforced behavior."
  },
  {
    "courseId": "deep-dive",
    "order": 21,
    "slug": "deep-dive-capstone",
    "title": "Capstone: trace a payment end to end",
    "description": "Build a technically honest verification map.",
    "minutes": 14,
    "outcomes": [
      "Connect transaction construction, validation and settlement.",
      "Identify the assumptions at each layer."
    ],
    "sections": [
      {
        "title": "Choose a fictional transaction",
        "paragraphs": [
          "Design a paper payment from an imaginary community treasury to an artist. Give it two inputs, a recipient output, a change output and an explicit fee. Describe the spending policy and whether a PSBT coordinator is involved. Use synthetic amounts and abstract keys; no real addresses, credentials or signing actions are required."
        ]
      },
      {
        "title": "Trace the evidence",
        "paragraphs": [
          "Explain what the signer checks, what the broadcasting node observes, what a miner includes and what the receiving wallet verifies. Add a possible replacement and a possible reorganization. If you choose a Lightning alternative, replace the on-chain-per-payment assumptions with channel, routing and settlement conditions. Do not pretend both paths provide identical observations or operational requirements."
        ]
      },
      {
        "title": "Challenge your own account",
        "paragraphs": [
          "Ask where an untrusted coordinator, stale node, missing policy backup or misleading interface could create an error. Identify what an independent reviewer can reproduce and what remains dependent on external behavior. The final artifact is a one-page explanation and a list of unresolved assumptions. A strong Bitcoin advocate should be able to explain both the system’s useful guarantees and the places where careful operations remain necessary."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "For inputs of 80,000 and 50,000 sats, a 90,000-sat artist payment and a 1,500-sat fee, compute change and name three independent checks in your map.",
      "answer": "Change is 38,500 sats. Useful independent checks include signer review of outputs and fee, node validation against consensus rules, and recipient reconciliation of the accepted transaction to the invoice. Each verifies a different property."
    },
    "quiz": [
      {
        "question": "Can one green checkmark summarize every trust boundary?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Name the check and its scope."
      },
      {
        "question": "Should a technical explainer hide uncertain implementation details?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Label them and identify the evidence needed to resolve them."
      }
    ],
    "sources": [
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      },
      {
        "id": "bip174",
        "title": "BIP 174: partially signed Bitcoin transactions",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki"
      },
      {
        "id": "chain",
        "title": "Bitcoin developer guide: block chain",
        "url": "https://developer.bitcoin.org/devguide/block_chain.html"
      }
    ],
    "takeaway": "Technical depth means being precise about both guarantees and assumptions."
  },
  {
    "courseId": "sovereignty",
    "order": 1,
    "slug": "threat-model-before-tools",
    "title": "Threat model before tools",
    "description": "Design around concrete failures and the people who must recover.",
    "minutes": 14,
    "outcomes": [
      "Separate assets, threats and controls.",
      "Identify residual risk after a control is added."
    ],
    "sections": [
      {
        "title": "Name what needs protection",
        "paragraphs": [
          "A custody design protects more than a balance. It may also protect privacy, access to operating funds, continuity after illness and the ability to explain decisions. List the asset, authorized people and consequence of failure. Avoid starting with a favorite device and inventing reasons it solves every problem."
        ]
      },
      {
        "title": "Model distinct failures",
        "paragraphs": [
          "Theft, accidental deletion, coercion, unavailable signers, misleading interfaces and a provider outage require different responses. A control can reduce one threat while increasing another. For example, a demanding approval threshold may resist one compromised signer but make urgent recovery harder. Geographic separation can reduce a shared physical failure while complicating access and maintenance."
        ]
      },
      {
        "title": "Make assumptions testable",
        "paragraphs": [
          "For a fictional community treasury, write who can prepare, authorize, reconcile and pause operations. Record the evidence a second person needs to reproduce the result. A tabletop exercise should include a missing device, an unavailable provider and an unexplained payment request. No real secrets or transfers are needed. The useful outcome is a list of unresolved dependencies, not a declaration that the system is institution grade because it uses several tools."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A team introduces a second approval but both approvers share one laptop and one recovery account. What risk remains?",
      "answer": "A compromise or loss of that shared environment can affect both approvals. The nominal number of people does not establish independent control. Review the shared device, credentials, recovery route and ability to refuse separately."
    },
    "quiz": [
      {
        "question": "Can one control remove every threat?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Controls have scope and tradeoffs."
      },
      {
        "question": "Is a vendor label a substitute for a recovery exercise?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Test the actual people, tools and information."
      }
    ],
    "sources": [
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "bip174",
        "title": "BIP 174: partially signed Bitcoin transactions",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki"
      }
    ],
    "takeaway": "Start with failure stories, then choose controls with explicit limits."
  },
  {
    "courseId": "sovereignty",
    "order": 2,
    "slug": "custody-architecture",
    "title": "Design a custody architecture",
    "description": "Separate routine use, authorization and observation.",
    "minutes": 14,
    "outcomes": [
      "Map the different functions of a custody system.",
      "Avoid confusing watch-only access with operational safety."
    ],
    "sections": [
      {
        "title": "Divide responsibilities by purpose",
        "paragraphs": [
          "An architecture can separate payment preparation, signing, observation and reconciliation. A watch-only system may generate addresses or inspect balances without holding spending keys. An offline signer can authorize a transaction prepared elsewhere. These separations help, but the interfaces between them still need verification of the intended policy and outputs."
        ]
      },
      {
        "title": "Minimize authority where possible",
        "paragraphs": [
          "A research agent usually needs public or redacted observations, not credentials that can transact. A bookkeeper may need receipts, not every private wallet detail. A signer needs a clear proposal and independent display, not a command to approve everything a coordinator creates. Access should match the job and be revocable without destroying the only recovery path."
        ]
      },
      {
        "title": "Document what remains dependent",
        "paragraphs": [
          "A diagram with cold storage at the center may still depend on one coordinator, one cloud account or one person who understands recovery. Name those dependencies and test alternatives. Do not assume a native Bitcoin multisig and an EVM smart-contract wallet have identical guarantees just because both use multiple approvals. This exercise describes architecture choices; it does not authorize establishing custody or moving community funds."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Assign prepare, sign, reconcile and read-only research roles in a fictional four-person team. Which roles must an agent not silently acquire?",
      "answer": "An agent may assist preparation or research within a brief. It must not acquire signing, custody or spending authority because its draft was accepted. Human approval and reconciliation remain separately assigned responsibilities."
    },
    "quiz": [
      {
        "question": "Does watch-only mean the data is harmless to disclose?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It can reveal sensitive financial history."
      },
      {
        "question": "Does an offline signer eliminate the need to inspect outputs?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It can still authorize a maliciously prepared transaction."
      }
    ],
    "sources": [
      {
        "id": "wallet",
        "title": "Bitcoin developer guide: wallets",
        "url": "https://developer.bitcoin.org/devguide/wallets.html"
      },
      {
        "id": "btcpay",
        "title": "BTCPay Server: wallet",
        "url": "https://docs.btcpayserver.org/Wallet/"
      },
      {
        "id": "bip174",
        "title": "BIP 174: partially signed Bitcoin transactions",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki"
      }
    ],
    "takeaway": "Separate capability, ownership and human authorization in the design."
  },
  {
    "courseId": "sovereignty",
    "order": 3,
    "slug": "entropy-and-passphrases",
    "title": "Entropy, mnemonics and passphrase tradeoffs",
    "description": "Understand recovery inputs without improvising cryptography.",
    "minutes": 14,
    "outcomes": [
      "Distinguish a mnemonic from an optional passphrase.",
      "Explain how extra secrecy can create recovery failure."
    ],
    "sections": [
      {
        "title": "Words encode carefully generated material",
        "paragraphs": [
          "BIP 39 describes a mnemonic representation derived from entropy with a checksum and a process for deriving a seed. Choosing memorable words yourself is not equivalent to following a wallet’s secure generation process. A checksum helps detect certain mistakes; it is not proof that the underlying randomness was strong or privately generated."
        ]
      },
      {
        "title": "An additional passphrase changes the result",
        "paragraphs": [
          "In BIP 39, an optional passphrase participates in seed derivation. Different passphrases produce different results; a typo may lead to an apparently empty wallet rather than a helpful error. This can strengthen a particular design but also create a new loss path if the intended passphrase is forgotten or omitted from recovery planning."
        ]
      },
      {
        "title": "Avoid home-made backup experiments",
        "paragraphs": [
          "Do not split words casually among people, invent a brainwallet or enter existing recovery material into a website to see what happens. Different schemes have different security and compatibility properties. A classroom exercise can represent inputs as symbols: mnemonic M and passphrase P produce seed S. The real system should follow documented wallet behavior and be tested with an isolated, nonvaluable setup before anyone depends on it."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional recovery package contains a mnemonic but the wallet originally used an additional passphrase that nobody recorded. Why might the package fail?",
      "answer": "The intended seed depends on both inputs. Omitting or mistyping the passphrase can derive a different wallet. The existence of valid words alone does not establish recoverability of the intended funds."
    },
    "quiz": [
      {
        "question": "Is a mnemonic checksum proof of strong random generation?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It checks structure, not the quality or secrecy of generation."
      },
      {
        "question": "Must a wrong BIP 39 passphrase produce an error?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It can derive a different valid seed."
      }
    ],
    "sources": [
      {
        "id": "bip39",
        "title": "BIP 39: mnemonic codes",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki"
      },
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      }
    ],
    "takeaway": "Additional secrets need an equally deliberate recovery plan."
  },
  {
    "courseId": "sovereignty",
    "order": 4,
    "slug": "hardware-and-trusted-displays",
    "title": "Hardware signing and trusted displays",
    "description": "A separate device helps only when its checks are understood.",
    "minutes": 14,
    "outcomes": [
      "Explain the intended boundary of a hardware signer.",
      "List transaction details an operator must verify."
    ],
    "sections": [
      {
        "title": "Keep the signing boundary clear",
        "paragraphs": [
          "A hardware signer aims to keep spending secrets isolated from a general-purpose computer while participating in a supported signing workflow. That can reduce exposure to some host compromises. It does not make the host’s proposed transaction trustworthy or prove that the physical device and firmware are authentic."
        ]
      },
      {
        "title": "Review the actual spending effect",
        "paragraphs": [
          "The operator needs enough information on a trusted display to verify recipients, amounts, change and fees under the expected network and policy. A warning about an unfamiliar script or unsupported detail deserves investigation. Blindly confirming because a software tutorial says so defeats the purpose of separating the signer from the host."
        ]
      },
      {
        "title": "Plan the entire lifecycle",
        "paragraphs": [
          "Procurement, initialization, firmware verification, backup, replacement and retirement all affect the design. Follow the selected manufacturer’s current documented procedure rather than a generic course instruction. Test compatibility with the coordinator and recovery metadata. This lesson recommends no device and requests no purchase. On paper, compare a malicious host, a lost device and a stolen backup: each challenges a different part of the system."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A laptop shows the intended artist address while the signing device shows a different recipient. What should the operator do, and why?",
      "answer": "Stop and investigate the mismatch through a trusted process. Approval would authorize the transaction the signer actually signs, not the reassuring story on the laptop. Do not assume either display is correct without resolving the discrepancy."
    },
    "quiz": [
      {
        "question": "Does a hardware device remove the need for a backup?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Devices can fail or be lost."
      },
      {
        "question": "Does an isolated key make every transaction proposed by the host safe?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The host can propose an unwanted payment."
      }
    ],
    "sources": [
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "bip174",
        "title": "BIP 174: partially signed Bitcoin transactions",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki"
      }
    ],
    "takeaway": "A signer protects a boundary; a person still reviews the authorization."
  },
  {
    "courseId": "sovereignty",
    "order": 5,
    "slug": "multisig-and-independence",
    "title": "Multisig and independent control",
    "description": "Count independent failure domains, not just signatures.",
    "minutes": 14,
    "outcomes": [
      "Analyze availability and compromise in a threshold policy.",
      "Identify shared recovery dependencies."
    ],
    "sections": [
      {
        "title": "A threshold changes who can spend",
        "paragraphs": [
          "A multisignature policy can require a subset of several keys to satisfy spending conditions. In an illustrative two-of-three arrangement, two qualifying signers are needed. This can tolerate one unavailable signer, but compromise of a sufficient subset can still authorize spending. The policy needs exact implementation and recovery metadata."
        ]
      },
      {
        "title": "Independence is operational",
        "paragraphs": [
          "Three keys created on one compromised machine or stored in one location may share a failure. Three people relying on one account recovery route may also be less independent than the diagram suggests. Assess devices, locations, software, access procedures and social authority. Adding complexity without competent operators can introduce recovery mistakes."
        ]
      },
      {
        "title": "Exercise both refusal and continuity",
        "paragraphs": [
          "A healthy treasury workflow lets a signer refuse an unclear proposal and still recover from a missing coordinator. Practice reconstructing the policy with synthetic material and documenting who can act when a person becomes unavailable. Do not put real seeds in the exercise. A threshold is not an automatic substitute for governance: the people must still know what they are authorized to approve and how decisions are recorded."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "In a fictional two-of-three setup, one signer is unavailable and one refuses because the destination is unexplained. Is the correct response to bypass the refusal?",
      "answer": "No. The remaining technical threshold and the governance purpose are separate. Investigate the proposal and respect refusal; a recovery plan must not become a routine way to defeat an approval control."
    },
    "quiz": [
      {
        "question": "Do three keys necessarily mean three independent risks?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Shared devices and recovery routes can correlate failures."
      },
      {
        "question": "Can two compromised keys satisfy a two-of-three policy?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "Yes, assuming they meet the actual script’s conditions. Threshold design does not remove compromise risk."
      }
    ],
    "sources": [
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      },
      {
        "id": "bip380",
        "title": "BIP 380: output script descriptors",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki"
      }
    ],
    "takeaway": "Independent judgment and recovery matter alongside the threshold."
  },
  {
    "courseId": "sovereignty",
    "order": 6,
    "slug": "recovery-and-continuity",
    "title": "Recovery and continuity across people",
    "description": "Make a plan that remains understandable when its author is absent.",
    "minutes": 14,
    "outcomes": [
      "Distinguish access instructions from exposed secrets.",
      "Plan an authorized continuity exercise."
    ],
    "sections": [
      {
        "title": "Recovery is a human process",
        "paragraphs": [
          "A technically sufficient backup can still fail when nobody knows it exists, which wallet it belongs to or who is authorized to use it. Continuity planning records the process, roles and necessary metadata while protecting the spending material. The people following the plan may be stressed or unfamiliar with the original setup."
        ]
      },
      {
        "title": "Avoid making one person indispensable",
        "paragraphs": [
          "For a fictional community, document how a replacement steward locates the approved records, identifies the current policy and obtains the required authorized cooperation. Separate ordinary absence from permanent incapacity. Legal authority and inheritance obligations vary; an educational template cannot settle them. Obtain appropriate professional input before relying on a real arrangement."
        ]
      },
      {
        "title": "Test with nonvaluable material",
        "paragraphs": [
          "Have someone other than the author follow a mock recovery packet. Note ambiguous names, missing derivation details, unreadable media and dependence on obsolete software. Record the result and next review date without putting secrets in the report. An exercise should not move actual funds or silently change signers. The measure of success is reproducible authorized recovery under the stated scenario, not the number of pages in the binder."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A recovery document says “Ask the founder where the backup is.” What specific improvement would make the plan less dependent on that person?",
      "answer": "Document a protected, authorized discovery procedure and the roles able to execute it if the founder is unavailable. Include the required wallet and policy metadata, while keeping secrets out of the public procedure."
    },
    "quiz": [
      {
        "question": "Is a technical backup alone a complete inheritance plan?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Human access and legal authority also matter."
      },
      {
        "question": "Should a public recovery-test report include real seeds?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Record the outcome and issues without exposing spending material."
      }
    ],
    "sources": [
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "bip380",
        "title": "BIP 380: output script descriptors",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0380.mediawiki"
      }
    ],
    "takeaway": "Recovery must be understandable to the authorized person who arrives later."
  },
  {
    "courseId": "sovereignty",
    "order": 7,
    "slug": "coin-control-and-privacy",
    "title": "Coin control and privacy tradeoffs",
    "description": "Understand how transaction construction can connect histories.",
    "minutes": 14,
    "outcomes": [
      "Explain a privacy cost of combining inputs.",
      "Compare fee efficiency with data minimization."
    ],
    "sections": [
      {
        "title": "Inputs tell a story",
        "paragraphs": [
          "When a wallet combines outputs from different sources in one transaction, observers may infer relationships among them. Such heuristics are not perfect, but they can reveal more than a user intended. Address reuse, published receipts and third-party balance queries can add further links. Privacy is a system property involving both chain data and surrounding information."
        ]
      },
      {
        "title": "Coin control exposes a choice",
        "paragraphs": [
          "Some wallets let an operator choose which outputs to spend. That can support accounting separation or privacy goals, but introduces decisions about fees, change and operational complexity. Avoid universal rules such as always consolidate or never combine. The right analysis begins with the purpose, threat model and constraints of a specific situation."
        ]
      },
      {
        "title": "Keep accounting separate from unnecessary publication",
        "paragraphs": [
          "A community can preserve internal source-of-funds records without publishing every donor-to-expense relationship. A researcher should receive the minimum data needed for reconciliation. Exporting an xpub to a convenient service can expose a much wider history than one address lookup. This lesson does not provide a privacy guarantee or ask you to reorganize real funds; use labeled fictional outputs to reason about what a transaction reveals."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A mock wallet has one output publicly tied to a fundraiser and one from a private artist sale. What new inference might arise if they are spent together?",
      "answer": "An observer may associate the sources with a common spending controller. The inference is not absolute proof of identity, but the transaction can reduce separation between previously distinct contexts."
    },
    "quiz": [
      {
        "question": "Does a new receiving address alone guarantee privacy?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Later transactions and external disclosures can connect activity."
      },
      {
        "question": "Can a watch-only export expose broad history?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "Yes. Its scope may include many derived addresses."
      }
    ],
    "sources": [
      {
        "id": "privacy",
        "title": "Bitcoin.org: protecting privacy",
        "url": "https://bitcoin.org/en/protect-your-privacy"
      },
      {
        "id": "bip32",
        "title": "BIP 32: hierarchical deterministic wallets",
        "url": "https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki"
      }
    ],
    "takeaway": "Evaluate what construction and disclosure reveal together."
  },
  {
    "courseId": "sovereignty",
    "order": 8,
    "slug": "lightning-operations",
    "title": "Lightning operations and recovery",
    "description": "Operate a payment service with channel state and continuity in mind.",
    "minutes": 14,
    "outcomes": [
      "Distinguish channel recovery from restoring an ordinary on-chain wallet.",
      "Name the limits of a recovery promise."
    ],
    "sections": [
      {
        "title": "A running service has changing state",
        "paragraphs": [
          "A Lightning node maintains information about channels and payment activity as well as keys. Treat it as an operational service with software updates, monitoring and a documented recovery procedure. A balance shown in an interface does not tell an operator whether channels can send, receive or be recovered after a failure. Availability and recoverability are separate questions."
        ]
      },
      {
        "title": "Use the implementation’s actual recovery model",
        "paragraphs": [
          "LND documentation describes static channel backups as a way to contact peers and recover through channel closure, not as a snapshot that instantly resumes every old channel. It also warns about using an outdated channel database. Other implementations and hosted products can have different processes. A Bitcoin mnemonic lesson is therefore not a complete Lightning recovery runbook."
        ]
      },
      {
        "title": "Practice failure without risking operating funds",
        "paragraphs": [
          "For a fictional community checkout, record who notices an outage, which independent record confirms incoming payments and who can authorize the documented recovery process. Include unavailable peers, delayed on-chain access and expensive fees in the scenario. Preserve evidence before attempting repair and seek implementation-specific expertise. An assistant can explain logs or draft a checklist, but it cannot turn an uncertain recovery into a guaranteed outcome or silently initiate channel closures."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A team says “We have the seed, so recovery will instantly restore our Lightning checkout.” What is missing?",
      "answer": "They have not established the implementation’s channel-state and backup requirements, peer availability, closure delays or service-restart plan. Verify those dependencies using the exact documented workflow and a nonvaluable rehearsal; seed possession alone does not prove uninterrupted payment service."
    },
    "quiz": [
      {
        "question": "Is an LND static channel backup a promise of instantly reopened channels?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The documented recovery mechanism involves channel closure."
      },
      {
        "question": "Should a stale channel database be restored casually?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. LND documents serious risks from outdated channel state."
      }
    ],
    "sources": [
      {
        "id": "lnd-recovery",
        "title": "Lightning Labs: disaster recovery",
        "url": "https://docs.lightning.engineering/lightning-network-tools/lnd/disaster-recovery"
      },
      {
        "id": "bolt2",
        "title": "Lightning specification: peer protocol",
        "url": "https://github.com/lightning/bolts/blob/master/02-peer-protocol.md"
      }
    ],
    "takeaway": "A Lightning recovery plan must account for state, peers and time."
  },
  {
    "courseId": "sovereignty",
    "order": 9,
    "slug": "payment-operations",
    "title": "Payment operations and reconciliation",
    "description": "Design clear records from an invoice to an authorized refund.",
    "minutes": 14,
    "outcomes": [
      "Distinguish payment observation from an order’s business state.",
      "Design a duplicate-resistant reconciliation process."
    ],
    "sections": [
      {
        "title": "Keep separate records for separate facts",
        "paragraphs": [
          "A checkout may contain an order, an invoice, a network payment and a delivery event. These are linked but not interchangeable. A canceled order can still receive a late payment. A manually adjusted invoice status can reflect an administrative decision. Reconciliation asks which funds arrived, which obligation they satisfy and what evidence supports the conclusion."
        ]
      },
      {
        "title": "Treat events as reports to verify",
        "paragraphs": [
          "An integration should authenticate its event source, tolerate repeated notifications and check authoritative state before releasing something valuable. An identifier must connect a payment to the intended invoice and network. A second notification must not automatically trigger a second delivery or refund. These are application-design requirements, not a claim that every payment product implements the same event semantics."
        ]
      },
      {
        "title": "Make exceptions understandable",
        "paragraphs": [
          "In a fictional Kalakar store, an operator records an underpayment, contacts the buyer through the known order channel and follows previously published terms. A refund requires its own authorization and a verified destination; blindly sending to an apparent originating address can fail, especially when an intermediary sent the payment. Keep personal information out of public transaction notes. Practice the workflow with synthetic records and make the unresolved exception visible to a human owner."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "An invoice generates two identical settlement notifications. What should an order processor do?",
      "answer": "Recognize the same invoice and already recorded fulfillment, verify current state, and avoid repeating the side effect. Keep a trace of the duplicate notification without treating it as a second payment or automatically refunding it."
    },
    "quiz": [
      {
        "question": "Does a canceled order prove that no payment can arrive?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The payment record must still be reconciled."
      },
      {
        "question": "Should every refund go to a guessed transaction input address?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Obtain and verify an authorized refund destination."
      }
    ],
    "sources": [
      {
        "id": "invoice",
        "title": "BTCPay Server: invoices",
        "url": "https://docs.btcpayserver.org/Users/invoices/"
      },
      {
        "id": "btcpay",
        "title": "BTCPay Server: wallet",
        "url": "https://docs.btcpayserver.org/Wallet/"
      }
    ],
    "takeaway": "Use explicit states and evidence to prevent expensive ambiguity."
  },
  {
    "courseId": "sovereignty",
    "order": 10,
    "slug": "native-and-wrapped-bitcoin",
    "title": "Native bitcoin and wrapped claims",
    "description": "Follow the asset and the extra trust assumptions.",
    "minutes": 14,
    "outcomes": [
      "Explain why a Bitcoin-linked token is not a Bitcoin UTXO.",
      "Map issuance, redemption and host-chain dependencies."
    ],
    "sections": [
      {
        "title": "Start with the settlement system",
        "paragraphs": [
          "Native bitcoin is represented by spendable outputs under Bitcoin’s rules. Lightning uses Bitcoin-based channel arrangements with additional operational assumptions. A token on another chain that references BTC is a different technical object. Its symbol, logo or quoted price does not make it settle directly as a Bitcoin output."
        ]
      },
      {
        "title": "Follow the representation back to its promise",
        "paragraphs": [
          "A wrapped or custodial representation needs an explanation of issuance, underlying assets, redemption rights and who can change or interrupt the arrangement. Some designs involve custodians; others involve bridges or other verification mechanisms. Identify the actual product rather than treating all wrappers as identical. A reserve report does not by itself prove every holder’s immediate ability to redeem."
        ]
      },
      {
        "title": "Add the lending layer separately",
        "paragraphs": [
          "If that token becomes collateral in a lending contract, the user adds smart-contract, oracle, liquidity and liquidation exposure. Holding the host-chain private key does not remove these dependencies. For a paper comparison, draw native BTC, the representation, the collateral contract and the borrowed asset as distinct boxes. Label each controlling party and exit condition. No specific wrapped asset is approved by this course, and a familiar ticker is not sufficient evidence for a real collateral route."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A brochure calls a BTC-linked token “bitcoin with extra utility.” Which questions would reveal the omitted dependencies?",
      "answer": "Ask which chain records it, what backs it, who can issue or restrict it, who is eligible to redeem, what evidence verifies reserves and which contracts or bridges an exit requires. If used as collateral, also identify the oracle, liquidation rule and available loan liquidity."
    },
    "quiz": [
      {
        "question": "Does holding a wrapped token’s private key eliminate issuer risk?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Key control and the representation’s promise are separate."
      },
      {
        "question": "Is native BTC itself an ERC-20 token?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Bitcoin outputs and ERC-20 contract balances are different systems."
      }
    ],
    "sources": [
      {
        "id": "tx",
        "title": "Bitcoin developer guide: transactions",
        "url": "https://developer.bitcoin.org/devguide/transactions.html"
      },
      {
        "id": "erc20",
        "title": "ERC-20 token standard",
        "url": "https://eips.ethereum.org/EIPS/eip-20"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      }
    ],
    "takeaway": "Count each added dependency before calling a design sovereign."
  },
  {
    "courseId": "sovereignty",
    "order": 11,
    "slug": "usdc-and-redemption",
    "title": "USDC, reserves and redemption",
    "description": "Separate issuer commitments from market prices and access.",
    "minutes": 14,
    "outcomes": [
      "Distinguish reserve reporting from personal redemption eligibility.",
      "Explain a stablecoin’s operational and issuer risks."
    ],
    "sections": [
      {
        "title": "A stablecoin has an issuer model",
        "paragraphs": [
          "USDC is a dollar-referenced token issued by Circle. Circle publishes reserve information and independent assurance materials. Those documents are useful evidence about the stated reserve arrangements at their reporting dates. They do not turn an exchange balance into a bank account or make every third-party service using USDC endorsed by Circle."
        ]
      },
      {
        "title": "Redemption is not the same as a screen quote",
        "paragraphs": [
          "Circle’s terms distinguish eligible registered users who can redeem directly from other holders. Access depends on current account eligibility and terms. A secondary-market quote can differ from the intended dollar reference, and a platform can add its own delays, fees or restrictions. Read the current issuer terms rather than inferring your rights from the token’s name."
        ]
      },
      {
        "title": "Include restrictions in the model",
        "paragraphs": [
          "Circle’s terms describe blocklisting powers and circumstances that can restrict transfers or redemption. Its reserve page and terms answer different questions: backing, eligibility and operational control must all be considered. In a fictional treasury comparison, write how a supplier would receive usable funds if a platform, chain or redemption route became unavailable. This is an educational analysis, not a recommendation to hold a stablecoin or a substitute for professional advice about a particular legal claim."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A student sees a recent reserve report and concludes every holder can immediately redeem directly with Circle. What evidence is still required?",
      "answer": "Current eligibility, account status, applicable terms, supported chain and the actual redemption route are still needed. A reserve report addresses backing at a date; it does not establish an individual holder’s instant access."
    },
    "quiz": [
      {
        "question": "Does a dollar reference guarantee an identical price on every venue?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A market quote and the issuer’s stated reference are different."
      },
      {
        "question": "Does an issuer’s reserve report eliminate platform risk?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A platform can create additional custody and access dependencies."
      }
    ],
    "sources": [
      {
        "id": "usdc",
        "title": "Circle: reserve transparency",
        "url": "https://www.circle.com/transparency"
      },
      {
        "id": "usdc-terms",
        "title": "Circle: USDC terms",
        "url": "https://www.circle.com/legal/usdc-terms"
      },
      {
        "id": "redemption",
        "title": "Circle: supported blockchains, minting and redemption",
        "url": "https://help.circle.com/support/en/usdc-supported-blockchains-minting-redemption-faqs?id=kb_article_view&sysparm_article=KB0010590"
      }
    ],
    "takeaway": "Read backing, rights and access as three separate questions."
  },
  {
    "courseId": "sovereignty",
    "order": 12,
    "slug": "morpho-market-identity",
    "title": "Identify a Morpho market precisely",
    "description": "A symbol pair is not a complete lending specification.",
    "minutes": 14,
    "outcomes": [
      "List a market’s five defining parameters.",
      "Distinguish chain identity from a friendly asset label."
    ],
    "sections": [
      {
        "title": "Pin the exact system being inspected",
        "paragraphs": [
          "Morpho’s variable-rate markets are defined by the collateral token, loan token, oracle, interest-rate model and liquidation loan-to-value threshold. These parameters define a market’s identity. An application also needs the chain and deployment context. Two cards labeled BTC/USDC may represent different tokens, prices, thresholds or networks."
        ]
      },
      {
        "title": "Read a token address as data, not endorsement",
        "paragraphs": [
          "A symbol can be copied. An address must be checked against reliable deployment and issuer records for the intended chain. The oracle and rate model deserve the same scrutiny as the asset names. An immutable market definition means those particular parameters do not change within that identity; it does not mean the economic state, underlying token or surrounding interface is risk-free."
        ]
      },
      {
        "title": "Keep a reproducible observation",
        "paragraphs": [
          "For a fictional research report, record the chain, market identifier, five parameters, source and observation time. Add whether the data is from a contract, an indexer or a website. If two sources disagree, mark the result unresolved instead of silently selecting the appealing value. This lesson prepares readers to ask better questions. It does not certify any configured Satnam Satoshi route, connect a wallet or monitor an individual debt position."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Two markets share the same collateral and loan symbols but have different oracle addresses. Can a report safely combine their risk figures?",
      "answer": "No. They are different market specifications and may value collateral differently. Record each complete identity and explain the distinct oracle before comparing observations. Matching tickers do not establish equivalence."
    },
    "quiz": [
      {
        "question": "Is the oracle part of a Morpho market’s defining parameters?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "Yes, alongside the two tokens, rate model and LLTV."
      },
      {
        "question": "Does market immutability guarantee no loss?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Contract, oracle, token, liquidity and economic risks remain."
      }
    ],
    "sources": [
      {
        "id": "blue",
        "title": "Morpho: variable-rate markets",
        "url": "https://docs.morpho.org/learn/concepts/blue/"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      }
    ],
    "takeaway": "Verify the complete market identity before interpreting its numbers."
  },
  {
    "courseId": "sovereignty",
    "order": 13,
    "slug": "oracle-risk",
    "title": "Oracles, prices and measurement risk",
    "description": "Understand which price a lending contract actually uses.",
    "minutes": 14,
    "outcomes": [
      "Distinguish a front-end price from a contract’s oracle value.",
      "Identify scaling and dependency errors in a price feed."
    ],
    "sections": [
      {
        "title": "A contract needs a defined measurement",
        "paragraphs": [
          "A lending protocol cannot simply look at the world. It consumes a value from its configured oracle. That value affects collateralization and liquidation eligibility. Morpho documentation explains that the on-chain oracle price can differ from the display price used by an interface. A reassuring portfolio chart therefore does not establish a position’s on-chain condition."
        ]
      },
      {
        "title": "Units are part of the security boundary",
        "paragraphs": [
          "A price function must be interpreted with the correct collateral and loan token units and normalization. Misreading decimals can produce a plausible-looking but wildly incorrect ratio. Also inspect whether the feed values a token directly or assumes a relationship to another asset. A wrapped asset’s market price and the price of underlying BTC can diverge when redemption or confidence changes."
        ]
      },
      {
        "title": "Trace dependencies and failure behavior",
        "paragraphs": [
          "For a fictional oracle review, identify the data sources, update behavior, administrative powers and response to stale or unavailable information. The exact contract implementation determines which protections exist; do not import assumptions from a different market. Document the observation time and unresolved questions. This course supplies no live risk alerts. An independent dashboard that stops updating must show stale status, rather than repeating its last healthy value as if nothing changed."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A dashboard values collateral at 100 units, while the market’s oracle values it at 80. Which value governs the protocol’s collateral calculation?",
      "answer": "The configured on-chain oracle value, interpreted under the contract’s rules. The dashboard may be displaying another price source or timestamp. Investigate the difference rather than treating the higher number as available borrowing capacity."
    },
    "quiz": [
      {
        "question": "Can token decimals be ignored when calculating a ratio?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Raw integers require the correct units and scaling."
      },
      {
        "question": "Does a BTC price feed automatically prove a wrapper can redeem at that price?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Wrapper-specific redemption and market risks can differ."
      }
    ],
    "sources": [
      {
        "id": "oracle",
        "title": "Morpho: oracles",
        "url": "https://help.morpho.org/en/articles/12879577-oracles-on-morpho"
      },
      {
        "id": "liquidation",
        "title": "Morpho: liquidation mechanics",
        "url": "https://docs.morpho.org/learn/concepts/liquidation/"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      }
    ],
    "takeaway": "A price is a method, a unit and a timestamp—not just a number."
  },
  {
    "courseId": "sovereignty",
    "order": 14,
    "slug": "ltv-and-liquidation",
    "title": "LTV, liquidation and nonlinear losses",
    "description": "Work through a hypothetical balance sheet without taking a loan.",
    "minutes": 14,
    "outcomes": [
      "Calculate LTV and equity in a stated scenario.",
      "Explain why a threshold is not a safe operating target."
    ],
    "sections": [
      {
        "title": "Put numerator and denominator in the same unit",
        "paragraphs": [
          "Loan-to-value is debt divided by the oracle-valued collateral. With hypothetical debt of 6,000 units and collateral worth 10,000 units, LTV is 60%. Equity before costs is 4,000 units. These figures are classroom assumptions, not a live market, recommended position or assessment of someone’s account."
        ]
      },
      {
        "title": "A price decline changes the ratio quickly",
        "paragraphs": [
          "If collateral value falls 20% to 8,000 while debt stays 6,000, LTV becomes 75% and equity falls to 2,000. Equity has fallen 50%, before interest or liquidation costs. In an imaginary market with an 86% liquidation threshold, the initial difference of 26 percentage points is not a 26% collateral-price cushion. The simplified threshold value is 6,000 / 0.86, approximately 6,977."
        ]
      },
      {
        "title": "Real execution adds uncertainty",
        "paragraphs": [
          "Morpho positions can become liquidatable when their contract-defined LTV exceeds the market’s LLTV. Interest, oracle changes, transaction delays and liquidation incentives affect outcomes. A displayed healthy ratio is only an observation under its inputs. Automated alerts can fail, and a plan that assumes an instant top-up during stress may not be executable. This lesson teaches arithmetic and failure analysis; it does not recommend borrowing, a leverage ratio or a particular response to a live position."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Using the same fictional debt of 6,000, calculate LTV if collateral falls to 6,000. What happened to equity before fees?",
      "answer": "LTV is 100%, and collateral minus debt is zero. A real protocol may have allowed liquidation earlier. This simplified endpoint is not a prediction of the actual liquidation amount or remaining balance."
    },
    "quiz": [
      {
        "question": "Is a 26-point difference between LTV and LLTV a 26% price cushion?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The ratio changes as the collateral denominator changes."
      },
      {
        "question": "Can interest raise LTV even with an unchanged collateral price?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "Yes. Increasing debt raises the numerator."
      }
    ],
    "sources": [
      {
        "id": "liquidation",
        "title": "Morpho: liquidation mechanics",
        "url": "https://docs.morpho.org/learn/concepts/liquidation/"
      },
      {
        "id": "blue",
        "title": "Morpho: variable-rate markets",
        "url": "https://docs.morpho.org/learn/concepts/blue/"
      }
    ],
    "takeaway": "Calculate the stressed balance sheet, not just the initial ratio."
  },
  {
    "courseId": "sovereignty",
    "order": 15,
    "slug": "variable-rates-and-debt",
    "title": "Variable rates and growing debt",
    "description": "Read a rate as a changing input, not a promise.",
    "minutes": 14,
    "outcomes": [
      "Distinguish a rate snapshot from realized borrowing cost.",
      "Estimate a simplified interest expense with explicit assumptions."
    ],
    "sections": [
      {
        "title": "A quoted rate has a context",
        "paragraphs": [
          "A variable borrowing rate responds to a market’s rate model and state. Morpho’s documentation describes interest-rate models that react to utilization. A current quote is therefore not a fixed cost for the entire life of a loan. Record the market, observation time, rate convention and whether a displayed number is an annualized estimate."
        ]
      },
      {
        "title": "Keep the arithmetic honest",
        "paragraphs": [
          "For an invented principal of 1,000 units and a constant 10% simple annual rate over 30 days, a 365-day approximation gives 1,000 × 0.10 × 30 / 365, about 8.22 units. That is a teaching calculation. Actual protocol accrual, compounding, changing rates and rounding can produce different results. APR and APY are not interchangeable labels."
        ]
      },
      {
        "title": "Model the obligation rather than the headline",
        "paragraphs": [
          "A borrowing plan has debt in the loan asset, collateral exposure and possible transaction costs. A supply rate on another product may vary or disappear; it cannot be treated as a guaranteed offset. In a fictional committee review, ask what happens if borrowing becomes more expensive while accessible income falls. Include an exit that does not require a favorable market or uninterrupted application. An attractive rate screenshot is neither an authorization to borrow nor proof of a sustainable strategy."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Under the simplified assumptions above, what happens to the 30-day interest estimate if the annual rate doubles to 20% for the entire period?",
      "answer": "The simple estimate doubles to about 16.44 units. A real variable-rate loan needs the actual rate path and accrual rules; applying the final displayed rate to the whole past month would be a different, potentially incorrect calculation."
    },
    "quiz": [
      {
        "question": "Does today’s variable rate lock next month’s cost?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The market and rate model can change the rate."
      },
      {
        "question": "Can a projected yield be assumed to pay all future interest?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Both streams have distinct risks and can change."
      }
    ],
    "sources": [
      {
        "id": "irm",
        "title": "Morpho: interest-rate model",
        "url": "https://docs.morpho.org/learn/concepts/irm/"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      }
    ],
    "takeaway": "State the rate path and calculation convention before comparing costs."
  },
  {
    "courseId": "sovereignty",
    "order": 16,
    "slug": "vaults-and-exit-liquidity",
    "title": "Vaults, allocation and exit liquidity",
    "description": "Look through a share balance to the underlying exposures.",
    "minutes": 14,
    "outcomes": [
      "Distinguish a vault share from immediately available cash.",
      "Identify allocation authority and withdrawal dependencies."
    ],
    "sections": [
      {
        "title": "A vault adds a management layer",
        "paragraphs": [
          "A lending vault can allocate supplied assets across underlying opportunities and issue shares representing a claim under its contract rules. This changes the research task: inspect both the vault and its destinations. A familiar deposit asset does not mean every underlying exposure has the same risk or the same exit conditions."
        ]
      },
      {
        "title": "Identify the actual version and controls",
        "paragraphs": [
          "Morpho Vault V2 documentation describes roles, adapters, allocation limits and optional gates. Those features must be evaluated in the particular configuration. Do not copy conclusions from another vault version or assume every deployment has identical restrictions. Who can change allocations, what delays apply and who can respond to a problem are concrete questions requiring contract and governance evidence."
        ]
      },
      {
        "title": "Separate value from availability",
        "paragraphs": [
          "A balance can have an accounting value even when the immediately withdrawable amount is limited by deployed liquidity or other conditions. An in-kind claim is different from cash ready to pay a kitchen supplier. Stress the exit path under high utilization, an impaired market and an unavailable interface. Our classroom review treats yield as uncertain and principal as exposed to loss. It does not endorse a vault, offer a deposit button or represent a liquidity guarantee."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional kitchen owes suppliers tomorrow. Its ledger lists vault shares worth the same amount, but the withdrawal path is constrained. What reporting distinction matters?",
      "answer": "Show the shares and their valuation separately from funds accessible by the supplier deadline. Record the withdrawal dependency and uncertainty. A matching estimated asset value does not demonstrate the ability to meet a time-specific obligation."
    },
    "quiz": [
      {
        "question": "Are all versions and configurations of a vault equivalent?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Roles, contracts and withdrawal conditions must be identified."
      },
      {
        "question": "Does a share balance guarantee immediate withdrawal of the same value?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Available liquidity and contract conditions matter."
      }
    ],
    "sources": [
      {
        "id": "vault",
        "title": "Morpho: Vault V2",
        "url": "https://docs.morpho.org/learn/concepts/vault-v2/"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      }
    ],
    "takeaway": "A treasury needs to know what it owns and when it can actually use it."
  },
  {
    "courseId": "sovereignty",
    "order": 17,
    "slug": "chains-and-bridges",
    "title": "Arc, Base and cross-chain dependencies",
    "description": "Name the settlement rules behind the interface.",
    "minutes": 14,
    "outcomes": [
      "Explain why EVM compatibility does not imply Bitcoin security.",
      "Map a cross-chain workflow into distinct finality and exit steps."
    ],
    "sections": [
      {
        "title": "Compatible software can sit on different foundations",
        "paragraphs": [
          "EVM compatibility helps applications use familiar contract tooling, but it does not define a chain’s consensus, validator access or withdrawal process. Arc’s documentation describes a permissioned validator set using Malachite, a Tendermint BFT implementation. Base documentation describes deriving its L2 chain from data published to its L1. Neither should be presented as Bitcoin proof-of-work settlement."
        ]
      },
      {
        "title": "A bridge adds a separate transition",
        "paragraphs": [
          "A cross-chain action can involve custody, locking, burning, minting, proofs or external messages depending on the design. The exact bridge and asset determine the assumptions. Submission on the starting chain is not automatically usable value at the destination. Identify each state and the evidence that advances the workflow; a single spinner conceals too much for an accountable financial interface."
        ]
      },
      {
        "title": "Evaluate the whole exit route",
        "paragraphs": [
          "In a fictional architecture review, list the source chain, destination chain, asset contracts, bridge mechanism, administrative powers, fees and expected waiting conditions. Then remove the usual front end and ask what the authorized human can still verify or recover. A decentralization goal should be expressed as dependencies to reduce, not a claim that a particular deployment has no third parties. This course does not certify a bridge or imply that Arc and Base inherit Bitcoin’s consensus guarantees."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A product runs the same Solidity interface on two chains. Which conclusions cannot be inferred from that fact alone?",
      "answer": "You cannot infer identical consensus, validator openness, finality assumptions, gas behavior, bridge safety or exit availability. Inspect each chain and deployment with its current official specification."
    },
    "quiz": [
      {
        "question": "Does EVM compatibility mean Bitcoin proof of work?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Execution compatibility and consensus are different properties."
      },
      {
        "question": "Is a source-chain transaction alone proof of destination availability?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. The complete transition must be verified."
      }
    ],
    "sources": [
      {
        "id": "arc",
        "title": "Arc: system overview",
        "url": "https://docs.arc.io/arc/concepts/system-overview"
      },
      {
        "id": "base",
        "title": "Base: chain derivation",
        "url": "https://docs.base.org/specifications/base-protocol/consensus/derivation"
      },
      {
        "id": "whitepaper",
        "title": "Bitcoin whitepaper",
        "url": "https://bitcoin.org/bitcoin.pdf"
      }
    ],
    "takeaway": "Describe every trust boundary in a cross-chain flow."
  },
  {
    "courseId": "sovereignty",
    "order": 18,
    "slug": "allowances-and-simulation",
    "title": "Allowances, signing and simulation",
    "description": "Understand what a token authorization permits.",
    "minutes": 14,
    "outcomes": [
      "Distinguish a connection, a token allowance and a transfer.",
      "Explain why a simulation has a limited scope."
    ],
    "sections": [
      {
        "title": "Different permissions do different things",
        "paragraphs": [
          "An account connection can expose an address to an application. An ERC-20 allowance lets a specified spender use the token contract’s transfer-from mechanism within the authorized amount. A token transfer changes balances. A friendly button that combines these concepts must still explain each requested effect; a connection should never be treated as blanket permission to transact."
        ]
      },
      {
        "title": "Inspect the exact authorization",
        "paragraphs": [
          "Review chain, token contract, spender, amount, units and transaction effects. A very large allowance can outlive the immediate action. Token implementations may add behavior beyond the base standard, so evaluate the actual contract and workflow. Removing an allowance can limit future use under that mechanism, but it does not reverse an already executed transfer or recover previously lost funds."
        ]
      },
      {
        "title": "Use simulation as evidence with boundaries",
        "paragraphs": [
          "A simulation evaluates a proposal against a particular environment and state. It can expose unwanted transfers or failures, yet state, permissions and execution context may change before inclusion. A successful result is not proof of good economic terms, safe contracts or an authentic counterparty. For a paper exercise, compare the intended action with a mock decoded request. Stop at a mismatch. No connection, signature or approval is needed to complete this lesson."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A mock purchase needs 50 token units, but the request authorizes an unfamiliar spender for an effectively unlimited amount. What must be resolved before any approval?",
      "answer": "Verify the spender’s identity and purpose, the token and chain, the intended amount and whether the broad permission is necessary. Do not approve merely because the front end calls it setup. A simulation alone does not supply that authorization."
    },
    "quiz": [
      {
        "question": "Does revoking an allowance undo a completed transfer?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It affects future authority under that allowance."
      },
      {
        "question": "Does a successful simulation establish an investment is prudent?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. It tests execution under assumptions, not economic suitability."
      }
    ],
    "sources": [
      {
        "id": "erc20",
        "title": "ERC-20 token standard",
        "url": "https://eips.ethereum.org/EIPS/eip-20"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      }
    ],
    "takeaway": "Approve a specific authority only after its full effect is understood."
  },
  {
    "courseId": "sovereignty",
    "order": 19,
    "slug": "treasury-accounting",
    "title": "Treasury accounting and restricted funds",
    "description": "Make obligations and permissions visible beside asset balances.",
    "minutes": 14,
    "outcomes": [
      "Separate holdings, valuation, liabilities and restricted purposes.",
      "Design a human-accountable reconciliation record."
    ],
    "sections": [
      {
        "title": "A balance is only one part of the story",
        "paragraphs": [
          "A community ledger needs asset quantities, valuation methods, obligations and permitted uses. An increase in a BTC price estimate is different from a donation arriving. Borrowed USDC creates both an asset and a liability; it is not donation income. Funds restricted to food purchases cannot silently become experimental collateral because a dashboard offers a lending feature."
        ]
      },
      {
        "title": "Reconcile evidence without exposing people",
        "paragraphs": [
          "Maintain dated records that connect authorized decisions, payment evidence and bookkeeping entries. Public reporting can show aggregate receipts and expenditure while protecting guests, volunteers and donors. A blockchain transaction does not prove that meals were served or that a particular person consented to publication. Those are separate human records with their own verification and retention rules."
        ]
      },
      {
        "title": "Assign accountable roles",
        "paragraphs": [
          "In a fictional treasury, a human owner approves policy, authorized signers review spending and a separate reviewer reconciles records. An agent can flag mismatches and prepare explanations from permitted data. It must not infer permission to allocate capital or claim to manage funds. Build a report with separate columns for available operating funds, restricted balances, outstanding liabilities and uncertain valuations. Real accounting and reporting obligations require appropriate qualified review for the organization and jurisdiction."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A fictional ledger receives 1,000 USDC from a loan and lists it as 1,000 of new community wealth. What correction is needed?",
      "answer": "Record the received asset and the corresponding debt, then account separately for costs and any restricted purpose. Gross holdings increased, but net assets did not increase by 1,000 merely because the organization borrowed."
    },
    "quiz": [
      {
        "question": "Does an on-chain transfer prove a meal was delivered?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Service evidence is separate from payment evidence."
      },
      {
        "question": "May an agent reinterpret restricted donations as trading capital?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Purpose, authorization and human accountability remain binding."
      }
    ],
    "sources": [
      {
        "id": "invoice",
        "title": "BTCPay Server: invoices",
        "url": "https://docs.btcpayserver.org/Users/invoices/"
      },
      {
        "id": "blue",
        "title": "Morpho: variable-rate markets",
        "url": "https://docs.morpho.org/learn/concepts/blue/"
      }
    ],
    "takeaway": "Report what is owned, owed, available and authorized for use."
  },
  {
    "courseId": "sovereignty",
    "order": 20,
    "slug": "incident-response",
    "title": "Incident response with clear human authority",
    "description": "Respond to uncertainty without creating a second incident.",
    "minutes": 14,
    "outcomes": [
      "Distinguish a monitoring failure from a confirmed asset loss.",
      "Draft an evidence-preserving escalation path."
    ],
    "sections": [
      {
        "title": "Classify the observation first",
        "paragraphs": [
          "A stale data feed, suspicious approval request, unavailable signer and confirmed unauthorized transaction are different incidents. Record what was observed, when, from which source and what remains unknown. Avoid claiming a theft simply because a dashboard cannot load, or claiming safety because an old snapshot still looks healthy."
        ]
      },
      {
        "title": "Pause the affected workflow and preserve evidence",
        "paragraphs": [
          "A response can stop new actions in the affected application, preserve nonsecret logs and notify the designated human through an established channel. Keep credentials, seed material and private personal data out of shared incident notes. Do not follow a stranger’s recovery link or rush a compensating transfer. The exact containment action depends on the system and must be authorized by its responsible people."
        ]
      },
      {
        "title": "Test decisions before an emergency",
        "paragraphs": [
          "Run a tabletop exercise with an oracle mismatch, a duplicated invoice event or a compromised public account. Name who can assess evidence, approve operational changes and communicate verified facts. An agent’s job can be observation and drafting; it does not gain signing authority during an emergency. End with a dated incident record, unresolved risks and a follow-up owner. This course provides no active account-level monitoring, and reading it does not establish a liquidation alert or recovery service."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "A read-only market feed fails for an hour. What should a responsible status message say?",
      "answer": "State that the feed is unavailable or stale, give the last verified time and describe the resulting observation gap. Do not infer that a user’s position is safe, liquidated or even monitored. Escalate according to the defined service scope."
    },
    "quiz": [
      {
        "question": "Should recovery instructions from an unsolicited message be trusted?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Verify through established official and internal channels."
      },
      {
        "question": "Does an incident give a research agent automatic spending authority?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Human authorization boundaries still apply."
      }
    ],
    "sources": [
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      },
      {
        "id": "lnd-recovery",
        "title": "Lightning Labs: disaster recovery",
        "url": "https://docs.lightning.engineering/lightning-network-tools/lnd/disaster-recovery"
      }
    ],
    "takeaway": "Clear facts and authority reduce the chance that urgency causes more harm."
  },
  {
    "courseId": "sovereignty",
    "order": 21,
    "slug": "sovereignty-capstone",
    "title": "Capstone: a defensible treasury design",
    "description": "Compare options and write a decision that another person can challenge.",
    "minutes": 14,
    "outcomes": [
      "Produce a dependency-aware architecture and recovery plan.",
      "Make a reasoned no-action decision when evidence is insufficient."
    ],
    "sections": [
      {
        "title": "Begin with a concrete service need",
        "paragraphs": [
          "A fictional kitchen wants reliable supplier payments and public accountability. Its goal is service continuity, not a target yield. Define the operating horizon, authorized people, available skills, privacy needs and restricted purposes. None of the invented amounts in the exercise represent Satnam Satoshi funds or a proposal to allocate a real person’s assets."
        ]
      },
      {
        "title": "Compare four distinct arrangements",
        "paragraphs": [
          "Analyze native BTC held under a documented custody policy, Lightning operating liquidity, a BTC-linked token on another chain and a collateralized loan in USDC. For each, list settlement rules, controlling parties, recovery inputs, liquidity constraints, liabilities and exit conditions. Add doing nothing or using an existing noncrypto payment method as a legitimate comparator. A preferred technology does not remove the need to meet the service requirement."
        ]
      },
      {
        "title": "Finish with evidence and acceptance gates",
        "paragraphs": [
          "Write what is known, what depends on a provider and what requires specialist review. Require a nonvaluable recovery exercise, accurate accounting, clear human authority and an independently checked deployment before any operational proposal. Have another learner attempt to falsify the design by removing a signer, price feed or front end. The completion standard is a transparent, revisable argument. It is not a certificate of expertise, proof of financial suitability or permission for an agent to execute it."
        ]
      }
    ],
    "exercise": {
      "title": "Practice on paper",
      "prompt": "Draft a one-page decision with purpose, alternatives, dependencies, failure scenarios, human owner and unresolved questions. What is a valid outcome if redemption or recovery cannot be established?",
      "answer": "A valid outcome is no deployment or no allocation until the missing evidence is obtained. The report should identify the unresolved dependency, responsible reviewer and acceptance condition instead of inventing confidence or treating delay as failure."
    },
    "quiz": [
      {
        "question": "Must a capstone choose a lending strategy to pass?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. A well-supported decision not to use a system is valid."
      },
      {
        "question": "Does course completion authorize real treasury operations?",
        "options": [
          "Yes",
          "No"
        ],
        "answer": "No. Operational authority and independent review are separate."
      }
    ],
    "sources": [
      {
        "id": "security",
        "title": "Bitcoin.org: securing your wallet",
        "url": "https://bitcoin.org/en/secure-your-wallet"
      },
      {
        "id": "ln",
        "title": "Lightning Labs: network overview",
        "url": "https://docs.lightning.engineering/the-lightning-network/overview"
      },
      {
        "id": "blue",
        "title": "Morpho: variable-rate markets",
        "url": "https://docs.morpho.org/learn/concepts/blue/"
      },
      {
        "id": "risk",
        "title": "Morpho: risks and security",
        "url": "https://docs.morpho.org/learn/resources/risks/"
      }
    ],
    "takeaway": "Sovereignty is a practiced ability to understand, verify and responsibly choose."
  }
];

export function getCourseLessons(courseId: CourseId): Lesson[] {
  return lessons.filter((lesson) => lesson.courseId === courseId).sort((a, b) => a.order - b.order);
}
