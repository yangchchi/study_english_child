/** Kid-friendly motivational lines for the home header. */
export const DAILY_QUOTES = [
  "今天多抓一个词，明天就更厉害一点。",
  "一点点进步，也是了不起的成长。",
  "敢开口，英语就会慢慢听你的话。",
  "错了没关系，抓住它，它就成了你的。",
  "坚持的人，运气都不会太差。",
  "把新词当成宝藏，抓到一个就赢一点。",
  "你已经比昨天更勇敢了。",
  "学英语像种小树，每天浇一点就会长大。",
  "不怕慢，只怕停；今天继续出发！",
  "每一次复习，都是在给未来自己加油。",
  "单词不会跑，你抓住它，它就是朋友。",
  "小小的你，正在做一件了不起的事。",
] as const;

/** Stable pick for a calendar day so the quote doesn't flicker on refresh. */
export function quoteForDateKey(dateKey: string, quotes: readonly string[] = DAILY_QUOTES): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return quotes[hash % quotes.length] ?? quotes[0];
}
