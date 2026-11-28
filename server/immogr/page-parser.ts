export type ParsedHtmlPage = {
  title: string;
  description: string;
  canonicalUrl: string | null;
  text: string;
  links: Array<{ text: string; url: string }>;
  jsonLd: unknown[];
};
function decodeEntities(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n))))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n,16))));
}
function stripMarkup(value: string): string {
  return decodeEntities(value.replace(/<!--([\s\S]*?)-->/g,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,' ').replace(/<[^>]+>/g,' ').replace(/[\u0000-\u001f\s]+/g,' ').trim());
}
function attr(tag: string, name: string): string {
  const escaped=name.replace(/[.*+?^{}()|[\]\\]/g,'\\$&');
  const match=tag.match(new RegExp('\\b'+escaped+'\\s*=\\s*(?:"([^"]*)"|\\'([^\\']*)\\'|([^\\s>]+))','i'));
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? '');
}
export function parseImmoGRHtml(html: string, pageUrl: string): ParsedHtmlPage {
  const titleMatch=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
  const descriptionTag=meta.find(tag=>/\bname\s*=\s*["']description["']/i.test(tag));
  const description=descriptionTag?attr(descriptionTag,'content'):'';
  const canonicalTag=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).find(tag=>/\brel\s*=\s*["']canonical["']/i.test(tag));
  let canonicalUrl:string|null=null;
  try{canonicalUrl=canonicalTag?new URL(attr(canonicalTag,'href'),pageUrl).toString():null;}catch{}
  const links:Array<{text:string;url:string}>=[];
  for(const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)){
    const href=attr(m[0],'href'); if(!href)continue;
    try{const url=new URL(href,pageUrl);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password)links.push({text:stripMarkup(m[1]).slice(0,180),url:url.toString()});}catch{}
    if(links.length>=200)break;
  }
  const jsonLd:unknown[]=[];
  for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{jsonLd.push(JSON.parse(m[1].trim()));}catch{}
    if(jsonLd.length>=30)break;
  }
  const bodyMatch=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const text=stripMarkup(bodyMatch?.[1]||html).slice(0,30000);
  return {title:stripMarkup(titleMatch?.[1]||'').slice(0,300),description:description.slice(0,1000),canonicalUrl,text,links,jsonLd};
}
