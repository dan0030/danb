// 화투(花札) 디자인에서 쓰는 열두 달 패 정보와 페이지별 장식 글자예요.
// 메뉴 카드·카테고리 카드·바닥글의 '이달의 패'가 이 순서를 따라요.

export const MONTHS = [
  { n: 1, kanji: '松', tone: 'red', jp: '一月', ko: '송학', name: '소나무와 학', season: 3 },
  { n: 2, kanji: '梅', tone: 'red', jp: '二月', ko: '매조', name: '매화와 휘파람새', season: 3 },
  { n: 3, kanji: '桜', tone: 'red', jp: '三月', ko: '벚꽃', name: '벚꽃과 휘장', season: 0 },
  { n: 4, kanji: '藤', tone: 'ink', jp: '四月', ko: '흑싸리', name: '등나무와 두견새', season: 0 },
  { n: 5, kanji: '菖', tone: 'blue', jp: '五月', ko: '난초', name: '창포와 다리', season: 0 },
  { n: 6, kanji: '牡', tone: 'red', jp: '六月', ko: '모란', name: '모란과 나비', season: 1 },
  { n: 7, kanji: '萩', tone: 'ink', jp: '七月', ko: '홍싸리', name: '싸리와 멧돼지', season: 1 },
  { n: 8, kanji: '芒', tone: 'gold', jp: '八月', ko: '공산', name: '억새와 보름달', season: 1 },
  { n: 9, kanji: '菊', tone: 'gold', jp: '九月', ko: '국진', name: '국화와 술잔', season: 2 },
  { n: 10, kanji: '楓', tone: 'red', jp: '十月', ko: '단풍', name: '단풍과 사슴', season: 2 },
  { n: 11, kanji: '柳', tone: 'blue', jp: '十一月', ko: '비', name: '버드나무와 비', season: 2 },
  { n: 12, kanji: '桐', tone: 'gold', jp: '十二月', ko: '똥', name: '오동과 봉황', season: 3 },
]

export const SEASONS = [
  { kanji: '春', label: '봄' },
  { kanji: '夏', label: '여름' },
  { kanji: '秋', label: '가을' },
  { kanji: '冬', label: '겨울' },
]

// i번째 카드(0부터)에 붙일 달 패
export function monthAt(i) {
  return MONTHS[((i % 12) + 12) % 12]
}

export function currentMonth(date = new Date()) {
  return MONTHS[date.getMonth()]
}

// 페이지마다 배경에 크게 흐리게 깔리는 한 글자
const ROUTE_KANJI = {
  home: '花',
  archive: '記',
  category: '札',
  tag: '印',
  search: '探',
  notice: '告',
  post: '文',
  guestbook: '帖',
  tags: '印',
  calendar: '暦',
  banners: '旗',
  login: '鍵',
  write: '筆',
  admin: '司',
}

export function routeKanji(name) {
  return ROUTE_KANJI[name] || '月'
}

// 숫자를 한자 숫자로 (1~99)
const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
export function kanjiNumber(n) {
  n = Math.max(0, Math.floor(Number(n) || 0))
  if (n < 10) return DIGITS[n]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return `${t > 1 ? DIGITS[t] : ''}十${o ? DIGITS[o] : ''}`
  }
  return String(n)
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}
