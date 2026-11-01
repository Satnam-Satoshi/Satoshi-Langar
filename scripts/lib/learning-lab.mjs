/* Fictional classroom models. Never constructs or authorizes a transaction. */
export const satChallenges=[
 {btc:'0.001',options:['1,000','100,000','1,000,000'],answer:1,sats:100000},
 {btc:'0.00025',options:['25,000','250,000','2,500'],answer:0,sats:25000},
 {btc:'0.01',options:['10,000','100,000','1,000,000'],answer:2,sats:1000000},
];
export const utxos=[6000,4000,2000];
export function balanceTransaction(indices){
 if(!Array.isArray(indices)||indices.some(i=>!Number.isInteger(i)||i<0||i>=utxos.length)||new Set(indices).size!==indices.length)throw new Error('Choose distinct fictional inputs');
 const input=indices.reduce((n,i)=>n+utxos[i],0),recipient=7000,fee=500;
 return {input,recipient,fee,change:Math.max(0,input-recipient-fee),shortfall:Math.max(0,recipient+fee-input),funded:input>=recipient+fee};
}
export function signingThreshold(selected){if(!Array.isArray(selected)||selected.some(k=>!['A','B','C'].includes(k))||new Set(selected).size!==selected.length)throw new Error('Choose distinct fictional signers');return {count:selected.length,met:selected.length>=2};}
export const trustChallenges=[
 {prompt:'A person claiming to be support asks you to send your recovery words.',answer:'stop',explanation:'Stop. Recovery words can authorize spending. Verify support through an independent trusted route; support does not need those words.'},
 {prompt:'An invoice names an expected recipient, an agreed purpose, and the correct network. You independently verified those details.',answer:'review',explanation:'Continue checking the amount, fees and payment method. Passing this check does not send a payment or guarantee the merchant will deliver.'},
 {prompt:'A giveaway demands a payment now and promises to send back twice as much.',answer:'stop',explanation:'Stop. Guaranteed-return promises and time pressure are classic warning signs. Do not test the claim with a payment.'},
 {prompt:'A lesson asks you to practice with invented labels A, B and C, with no personal data.',answer:'review',explanation:'This is an appropriate kind of classroom exercise. Keep real wallet information out of it; learning does not require a transfer.'},
];
