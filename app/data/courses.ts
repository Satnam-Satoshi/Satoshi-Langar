export type LessonSource = {
  id: string;
  title: string;
  url: string;
};

export type Lesson = {
  slug: string;
  title: string;
  description: string;
  minutes: number;
  outcomes: string[];
  sections: {
    title: string;
    paragraphs: string[];
    sourceIds?: string[];
  }[];
  exercise: { title: string; prompt: string; answer: string };
  quiz: { question: string; options: string[]; answer: string }[];
  takeaway: string;
  sources: LessonSource[];
};

export const lessons: Lesson[] = [
  {
    slug: 'bitcoin-without-jargon',
    title: 'Bitcoin without jargon',
    description: 'Start with sats, shared rules and the habit of checking evidence. No purchase or wallet needed.',
    minutes: 8,
    outcomes: [
      'Convert a small amount between BTC and sats.',
      'Explain the different jobs of signatures, nodes and proof of work.',
      'Recognize what a payment record cannot prove.',
    ],
    sections: [
      {
        title: 'A small unit is a useful place to start',
        paragraphs: [
          'Bitcoin lets people send value over a shared network. BTC is a unit used to express the amount. One BTC equals 100,000,000 satoshis, usually shortened to sats. You do not need to use a whole BTC: 1,000 sats is 0.00001000 BTC, and 100,000 sats is 0.00100000 BTC.',
          'Write the unit every time. Imagine a poster has an illustrative price of 25,000 sats. That is 0.00025000 BTC. The conversion tells you the quantity, not what it is worth in your local currency or whether the poster is fairly priced.',
        ],
        sourceIds: ['bitcoin-payments'],
      },
      {
        title: 'Who checks the rules?',
        paragraphs: [
          'A digital signature authorizes spending. Nodes running Bitcoin software check transactions and blocks against the rules they enforce. Miners compete to find proof of work for new blocks. Proof of work makes producing blocks costly and checking that work comparatively easy.',
          'These roles fit together: a miner cannot make an invalid transaction acceptable to a node simply by doing more work. The system is designed to let participants verify a shared payment history without one central bookkeeper.',
        ],
        sourceIds: ['whitepaper'],
      },
      {
        title: 'Verification has limits',
        paragraphs: [
          'A payment record is evidence that value moved under the network’s rules. It does not tell you whether a seller delivered a painting, a meal was safe or a community organizer kept a promise. Those questions need people, clear agreements and evidence from the world.',
          'At Satnam Satoshi, proof of service means a proposed process of human review. It is separate from Bitcoin’s proof of work. A meal claim is not mining, and generating a report does not create bitcoin or an automatic reward.',
        ],
      },
      {
        title: 'A standard for our own work',
        paragraphs: [
          'Our use of “Nakamoto standard” describes a project commitment: make rules understandable, make evidence checkable and reduce unnecessary dependence on one provider. It is not a new technical standard or an endorsement by Bitcoin’s creators.',
          'Start with questions: What is the claim? Where is the source? What can I verify myself? What still depends on somebody else? You can use those questions before you hold any bitcoin.',
        ],
      },
    ],
    exercise: {
      title: 'Try a conversion on paper',
      prompt: 'A sample contribution is described as 0.00050000 BTC. How many sats is that? What extra information would you need before deciding whether any real payment is appropriate?',
      answer: 'It is 50,000 sats: multiply the BTC amount by 100,000,000. You would still need the purpose, recipient, agreed terms and fees. The example is a unit exercise, not a request to pay.',
    },
    quiz: [
      {
        question: 'How many sats are in 0.001 BTC?',
        options: ['A. 100', 'B. 100,000', 'C. 1,000,000'],
        answer: 'B. 100,000 sats. Keeping the unit beside the number helps prevent mistakes.',
      },
      {
        question: 'Can more mining work make an invalid transaction valid to a node?',
        options: ['A. Yes, if enough energy is used', 'B. No, the node still applies its validation rules'],
        answer: 'B. Proof of work does not remove the rules a node uses to validate a transaction.',
      },
      {
        question: 'Does a Bitcoin payment prove that a community meal happened?',
        options: ['A. Yes', 'B. No'],
        answer: 'B. Payment evidence and evidence of real-world service are different. A service claim still needs accountable human review.',
      },
    ],
    takeaway: 'Count carefully, check the rules and ask what the evidence actually establishes.',
    sources: [
      { id: 'bitcoin-payments', title: 'Bitcoin developer guide · Payment processing and units', url: 'https://developer.bitcoin.org/devguide/payment_processing.html' },
      { id: 'whitepaper', title: 'Satoshi Nakamoto · Bitcoin: A Peer-to-Peer Electronic Cash System', url: 'https://bitcoin.org/bitcoin.pdf' },
    ],
  },
  {
    slug: 'keys-and-custody',
    title: 'Keys, custody and keeping control',
    description: 'Understand who can authorize spending, what must stay private and why a backup matters.',
    minutes: 9,
    outcomes: [
      'Distinguish receiving information from a wallet secret.',
      'Describe the responsibilities of self-custody and the dependence of custodial use.',
      'Reject a dangerous support request without needing a wallet demonstration.',
    ],
    sections: [
      {
        title: 'The wallet and the keys do different jobs',
        paragraphs: [
          'A wallet is software or a device that helps manage the credentials used to authorize spending. It does not store little digital coins inside your phone. The network records transactions; your keys let you authorize spending the funds they control.',
          'A receiving address can be shared with someone who needs to pay you. A private key or recovery phrase is different: it can give someone the power to spend. A public username is not a recovery method, and knowing your address does not give a helper permission to move your funds.',
        ],
        sourceIds: ['bitcoin-wallets'],
      },
      {
        title: 'Know who holds the authority',
        paragraphs: [
          'With self-custody, you hold the credentials and take responsibility for protecting and recovering them. Losing the only usable backup can mean losing access permanently. A custodian holds funds on your behalf; you depend on its security, solvency and withdrawal policies.',
          'A friendly interface does not tell you which model you are using. Before choosing a real wallet, read its own documentation: who can authorize a payment, what happens if the provider disappears, and how recovery works. This lesson is a way to understand those questions, not a recommendation to move your money.',
        ],
        sourceIds: ['bitcoin-custody'],
      },
      {
        title: 'A backup should remain under your control',
        paragraphs: [
          'Wallets have different backup designs. Follow the documented recovery process for the wallet you choose and understand it before depending on it. Recovery information belongs in a secure, private backup—not in a public document, cloud screenshot, support chat, AI conversation or GitHub issue.',
          'For this course, use invented labels on paper such as “receiving address” and “private recovery information.” Do not write a real recovery phrase in an exercise. Satnam Satoshi never needs it to teach you, invite you to a meetup or offer you a meal.',
        ],
        sourceIds: ['bitcoin-security'],
      },
      {
        title: 'Protect privacy as well as access',
        paragraphs: [
          'Bitcoin transactions are public. Publishing a name beside an address can make that person’s activity easier to follow. Only share receiving information where it is needed; avoid posting someone else’s payment details or a screenshot of their wallet without permission.',
          'If an unexpected message asks you to “verify,” “synchronize” or “unlock” a wallet by exposing a secret, stop. Return to the service through a known address rather than following the message. Urgency, a familiar logo and a helpful tone are not proof of legitimacy.',
        ],
        sourceIds: ['bitcoin-privacy'],
      },
    ],
    exercise: {
      title: 'Sort three requests',
      prompt: 'Consider: (1) an artist gives a buyer an invoice; (2) a stranger asks for a recovery phrase to release a reward; (3) an organizer asks permission to publish a volunteer’s wallet address beside their name. Which request is a clear secret-exposure risk, and which needs a privacy decision?',
      answer: 'Request 2 exposes a secret and should be refused. Request 3 needs freely given consent and a good reason; public recognition should not require publishing a wallet. Request 1 is a normal payment request in principle, but the buyer must still check the recipient, network, amount and agreed terms.',
    },
    quiz: [
      {
        question: 'What does self-custody require?',
        options: ['A. Giving a community administrator a recovery phrase', 'B. Protecting your own spending credentials and a usable backup'],
        answer: 'B. Self-custody gives you control and responsibility. A community administrator does not need your wallet secret.',
      },
      {
        question: 'Does an account balance at a custodian remove dependence on that company?',
        options: ['A. Yes', 'B. No'],
        answer: 'B. You still depend on the custodian’s operations and ability to honor withdrawals.',
      },
      {
        question: 'Where should you enter a real recovery phrase for this course?',
        options: ['A. In an AI chat', 'B. In a public issue', 'C. Nowhere'],
        answer: 'C. Nowhere. The lesson uses paper examples and never asks for a real wallet secret.',
      },
    ],
    takeaway: 'Know who can spend, know how recovery works and keep private credentials private.',
    sources: [
      { id: 'bitcoin-wallets', title: 'Bitcoin developer guide · Wallets', url: 'https://developer.bitcoin.org/devguide/wallets.html' },
      { id: 'bitcoin-custody', title: 'Bitcoin FAQ · Wallets and self-custody', url: 'https://bitcoin.org/en/faq' },
      { id: 'bitcoin-security', title: 'Bitcoin.org · Securing your wallet', url: 'https://bitcoin.org/en/secure-your-wallet' },
      { id: 'bitcoin-privacy', title: 'Bitcoin.org · Things you need to know', url: 'https://bitcoin.org/en/you-need-to-know' },
    ],
  },
  {
    slug: 'payments-for-humans',
    title: 'Payments for humans, including Lightning',
    description: 'Read an invoice, distinguish payment states and understand how an artist could receive bitcoin.',
    minutes: 10,
    outcomes: [
      'Compare on-chain Bitcoin and Lightning without treating them as interchangeable instructions.',
      'Check a payment request before considering a payment.',
      'Distinguish sent, pending, failed and settled.',
    ],
    sections: [
      {
        title: 'Begin with an agreement',
        paragraphs: [
          'A useful payment begins with people agreeing what is being exchanged. For an art commission, that includes the work, price, delivery, permitted use, revisions and refund terms. Paying in bitcoin does not by itself explain those terms or transfer copyright.',
          'Consider an imaginary illustrator and buyer. The illustrator describes the work and sends a request for an agreed amount. The buyer checks that it came from the right person. A payment method should support that relationship, not make either party guess what they agreed to.',
        ],
      },
      {
        title: 'On-chain and Lightning take different paths',
        paragraphs: [
          'An on-chain Bitcoin transaction is broadcast to the network and can be included in a block. The recipient chooses an appropriate confirmation policy before treating it as settled. A broadcast is not the same as a confirmation.',
          'Lightning uses payment channels anchored to Bitcoin. It can make quick payments possible without putting every individual payment on-chain. A usable route and sufficient liquidity are still needed; a payment attempt can fail. Wallets may also differ in custody and availability.',
          'Use the payment method the recipient actually supports. Bitcoin, Litecoin and an Ethereum-style address are not interchangeable destinations. This lesson does not require you to scan a code or send anything.',
        ],
        sourceIds: ['bitcoin-processing', 'lightning-overview'],
      },
      {
        title: 'Read before you scan',
        paragraphs: [
          'Check the recipient, asset/network, amount, units, fees and expiry. An invoice may quote local currency and translate it to a bitcoin amount for a limited time. If the quote expires, ask for a current request rather than assuming an old amount is still valid.',
          'A QR code is simply a way to carry information. It does not establish who created the request or whether it is fair. Review what your wallet displays before approving any real transaction, and use a known contact route when the details disagree.',
        ],
        sourceIds: ['btcpay-invoices'],
      },
      {
        title: 'Look at the outcome, not a screenshot',
        paragraphs: [
          'A payment request can be awaiting payment, paid but awaiting settlement conditions, or settled. An on-chain payment may need confirmations. Lightning normally settles without waiting for an on-chain confirmation for each payment, but an attempted payment is not automatically a completed one.',
          'If an attempt is pending or times out, inspect its status before trying again. A timeout can leave the result uncertain. A failed attempt, an expired invoice and a settled payment call for different next steps. A screenshot saying “sent” does not replace the recipient’s own settlement check.',
        ],
        sourceIds: ['btcpay-invoices', 'btcpay-api'],
      },
      {
        title: 'Use the tool without losing the relationship',
        paragraphs: [
          'Kalakar.x proposes direct artist payments with clear terms and a verified receiving setup. It does not currently promise a live marketplace, escrow or guaranteed payout. An artist’s optional contribution to Langar would be a separate choice, never a hidden deduction.',
          'When you can explain the request, identify who receives it and tell what happened afterward, you have learned more than how to press a payment button.',
        ],
      },
    ],
    exercise: {
      title: 'Read an imaginary invoice',
      prompt: 'A sample invoice says “20,000 sats · Bitcoin Lightning · expires at 15:00.” At 15:02 the payer has a “pending” screen. What should the payer and artist verify before another attempt or delivery?',
      answer: 'The payer checks the existing payment’s actual status before retrying. The artist checks the receiving system for settlement, amount and invoice identity. They resolve the expired request and agree any replacement through their known contact route. They do not infer success or failure from the clock or a screenshot alone.',
    },
    quiz: [
      {
        question: 'What does a QR code prove?',
        options: ['A. The request is trustworthy', 'B. It contains information that still needs checking'],
        answer: 'B. A code can carry a payment request, but you still need to verify the recipient and details.',
      },
      {
        question: 'What is the first step when a payment attempt times out?',
        options: ['A. Send the same amount again immediately', 'B. Check whether the original attempt is pending, failed or complete'],
        answer: 'B. Resolve the original status before retrying so you do not create an accidental duplicate payment.',
      },
      {
        question: 'Does Lightning guarantee that every attempt succeeds?',
        options: ['A. Yes', 'B. No'],
        answer: 'B. Routing, liquidity and the receiving setup matter. Verify the result.',
      },
    ],
    takeaway: 'Agree clearly, inspect the request and verify settlement before deciding what happens next.',
    sources: [
      { id: 'bitcoin-processing', title: 'Bitcoin developer guide · Payment processing', url: 'https://developer.bitcoin.org/devguide/payment_processing.html' },
      { id: 'lightning-overview', title: 'Lightning Labs · Network overview', url: 'https://docs.lightning.engineering/the-lightning-network/overview' },
      { id: 'btcpay-invoices', title: 'BTCPay Server · Invoice states and settlement', url: 'https://docs.btcpayserver.org/Users/invoices/' },
      { id: 'btcpay-api', title: 'BTCPay Server · Greenfield API payment status', url: 'https://docs.btcpayserver.org/API/Greenfield/v1/' },
    ],
  },
];

export const courseOutlines = [
  {
    title: 'First steps with Bitcoin',
    audience: 'Everyone',
    description: 'Build confidence before choosing a wallet or making a payment.',
    modules: ['Sats and verification', 'Keys, backups and custody', 'Reading payment requests', 'Recognizing scams and checking sources'],
    outcome: 'Explain the basic units, identify a secret and reject an unsafe request.',
    status: 'Starter lessons available · Full course planned',
  },
  {
    title: 'Lightning in everyday life',
    audience: 'After the starter lessons',
    description: 'Understand invoices, routing and the practical limits of a fast payment.',
    modules: ['On-chain and Lightning', 'Invoices, amounts and expiry', 'Liquidity, fees and custody', 'A supervised demonstration using test funds'],
    outcome: 'Distinguish pending, failed and settled and explain provider dependence.',
    status: 'Introduction available · Full course planned',
  },
  {
    title: 'Creative work paid in bitcoin',
    audience: 'Artists and curators',
    description: 'Put clear agreements and creator choice at the center of a sale.',
    modules: ['Scope, ownership and licensing', 'Pricing and invoice terms', 'Settlement and delivery', 'Refunds, records and optional giving'],
    outcome: 'Prepare a sample artist brief and mock invoice with clear terms.',
    status: 'Curriculum planned',
  },
  {
    title: 'Seva and community accounts',
    audience: 'Organizers and sevadars',
    description: 'Support a welcoming meal with useful evidence and minimal data.',
    modules: ['Langar and inclusion', 'Planning with a responsible local host', 'Evidence without surveillance', 'Reading an illustrative budget'],
    outcome: 'Review a sample service record and identify a duplicate claim.',
    status: 'Curriculum planned',
  },
  {
    title: 'Verify the Nakamoto standard',
    audience: 'Curious builders',
    description: 'Study the technical roots behind our commitment to open verification.',
    modules: ['Reading the whitepaper', 'Transactions, nodes and proof of work', 'Bitcoin, Lightning and Litecoin distinctions', 'Independent recovery and provider dependence'],
    outcome: 'Explain what a node verifies and what a service claim cannot prove.',
    status: 'Curriculum planned',
  },
  {
    title: 'Humans and accountable agents',
    audience: 'People building with AI',
    description: 'Turn an agent’s output into a useful contribution someone can review.',
    modules: ['A bounded task brief', 'Sources and uncertainty', 'Permissions and human review', 'Memory, revocation and incident practice'],
    outcome: 'Submit one sourced contribution with a named human reviewer.',
    status: 'Curriculum planned',
  },
];
