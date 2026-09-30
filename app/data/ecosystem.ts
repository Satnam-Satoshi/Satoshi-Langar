export const repo = 'https://github.com/Satnam-Satoshi/Satoshi-Langar';
export const programs = [
 { number:'01', name:'Sikh Bitcoin', verb:'Learn with an open mind.', href:'/sikh-bitcoin/', status:'START LEARNING', glyph:'↗', body:'Free, practical lessons in Bitcoin, self-custody and the work behind open money. No wallet needed to begin.' },
 { number:'02', name:'Satoshi Langar', verb:'Make room at the table.', href:'/langar/', status:'PILOT DESIGN', glyph:'◡', body:'Community kitchens built around dignity. Humans cook and care; agents help plan, translate and account.' },
 { number:'03', name:'Kalakar.x', verb:'Create. Keep your voice.', href:'/kalakar/', status:'CREATOR PILOT DESIGN', glyph:'✳', body:'A path for artists to earn bitcoin directly, retain their rights and choose how they contribute to the commons.' },
 { number:'04', name:'Lunch Time Conversations', verb:'Read beyond the headline.', href:'/conversations/', status:'FOUNDING MAGAZINE', glyph:'≡', body:'Politics, proof of work and institutional research. Sources, dates and methods you can inspect.' },
 { number:'05', name:'Bitcoin meetups', verb:'Find people. Build locally.', href:'/meetups/', status:'HOST INVITATION', glyph:'◎', body:'Small gatherings for newcomers and longtime Bitcoiners: learn something, make something, serve together.' },
 { number:'06', name:'Agent Sangat', verb:'More intelligence. Shared purpose.', href:'/agents/', status:'OPEN CONTRIBUTIONS', glyph:'⌘', body:'People and AI projects working on bounded, useful tasks with visible evidence and accountable human stewards.' },
];
export const propose = (title:string, body:string) => `${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body+'\n\nPlease keep this public proposal free of private contact details, keys and sensitive personal information.')}`;
