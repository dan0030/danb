import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { swapNames, useApp } from '../lib/store.jsx'
import { matchRoute, navigate, scrollRoot, scrollTop, useLocation } from '../lib/router.js'
import { api } from '../lib/api.js'
import { isRecent } from '../lib/format.js'
import { MONTHS, SEASONS, currentMonth, pad2, routeKanji, routeWord } from '../lib/hwatu.js'
import { BgmCard, useBgm } from './Bgm.jsx'

/* ==================================================================
   花札 · 단색 레이아웃
   - 머리말(상단바) 없이, 왼쪽(또는 오른쪽)에 접었다 펼 수 있는 메뉴바 하나에 모든 메뉴를 모아요.
     PC: 펼치면 이름·메뉴·카테고리·검색·BGM이 다 보이고, 접으면 아이콘 줄만 남아요.
     휴대폰: 구석의 메뉴 버튼을 누르면 메뉴바가 옆에서 밀려 나와요.
   - 뒤: 사선 띠 · 점 무늬 · 가는 원 · 페이지마다 바뀌는 윤곽선 영문
   ================================================================== */

const TitleContext = createContext({ setTitle: () => {}, setCollapsed: () => {} })

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const SIDE_KEY = 'hw-side-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(SIDE_KEY) === '1'
  } catch {
    return false
  }
}

export function Shell({ children }) {
  const app = useApp()
  const loc = useLocation()
  const t = app.theme
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  // 예전에 고른 'bottom'(하단 탭만)은 '메뉴바 + 하단 탭'으로 봐요.
  const nav = t.navStyle === 'drawer' ? 'drawer' : 'both'
  const side = t.drawerSide === 'right' ? 'right' : 'left'
  // 배경이 사진·패턴이면 본문을 판 위에 올려서 글자가 잘 보이게 해요.
  const busyBg = t.bgType === 'image' || t.bgType === 'pattern'
  const useFrame = (t.contentFrame === 'always' || (t.contentFrame !== 'never' && busyBg)) && (loc.path !== '/' || t.frameOnHome)
  const route = matchRoute(loc.path).name
  const anim = t.animations !== false

  useEffect(() => {
    setMobileOpen(false)
  }, [loc.path, loc.search])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', mobileOpen)
    if (!mobileOpen) return
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  function toggleCollapsed() {
    setCollapsed((v) => {
      try {
        localStorage.setItem(SIDE_KEY, v ? '0' : '1')
      } catch {
        // 저장 못 해도 괜찮아요
      }
      return !v
    })
  }

  // 휴대폰에서는 메뉴바를 열고 닫고, PC에서는 접고 펴요.
  const isNarrow = () => window.matchMedia?.('(max-width: 899px)').matches
  const onMenu = () => (isNarrow() ? setMobileOpen(true) : toggleCollapsed())

  return (
    <TitleContext.Provider value={{ setTitle: noop, setCollapsed: noop }}>
      <div className={`app hw side-${side} ${collapsed ? 'side-collapsed' : 'side-expanded'} ${mobileOpen ? 'side-mobile-open' : ''} nav-${nav} route-${route}`}>
        {t.hwDecor !== false && <Backdrop route={route} />}
        {anim && t.hwWipe !== false && <RouteWipe path={loc.path} />}
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} path={loc.path} />
        <div className={`drawer-dim ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(false)} />
        <button type="button" className="hw-menu-fab" onClick={() => setMobileOpen(true)} aria-label="메뉴 열기" aria-expanded={mobileOpen}>
          <span className="hw-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
        <main className={`page ${useFrame ? 'framed' : ''}`} id="main">
          {/* 창을 켜고 끌 때도 본문이 다시 그려지지 않도록 늘 같은 구조로 감싸요. (관리 화면 입력값이 사라지지 않게) */}
          <BrowserFrame on={useFrame} path={loc.path + loc.search} showUrl={t.frameBar !== false} onMenu={onMenu}>
            {children}
          </BrowserFrame>
        </main>
        <Footer />
        {nav === 'both' && <BottomNav path={loc.path} />}
        <ScrollButtons />
        {app.toast && (
          <div className="toast" key={app.toast.id} role="status">
            {app.toast.message}
          </div>
        )}
      </div>
    </TitleContext.Provider>
  )
}

function noop() {}

// 예전에 상단바 제목을 정하던 곳에서 쓰던 함수예요. 머리말이 없어져서 지금은 아무것도 하지 않아요.
export function useTopbarTitle(title) {
  const { setTitle, setCollapsed } = useContext(TitleContext)
  useEffect(() => {
    if (title === undefined) return
    setTitle(title)
    setCollapsed(true)
  }, [title, setTitle, setCollapsed])
}

/* 페이지 큰 제목: 작은 붉은 도장 · 영문 단어 · 가는 선 */
// pageKey를 주면 관리 › 페이지 문구에서 바꾼 제목·문구가 기본값 대신 쓰여요.
export function LargeTitle({ pageKey, title: defaultTitle, subtitle: defaultSubtitle, children, eyebrow: defaultEyebrow, className = '', style }) {
  const { site } = useApp()
  const loc = useLocation()
  const custom = (pageKey && site.pages?.[pageKey]) || {}
  const title = custom.title || defaultTitle
  const subtitle = custom.hideSubtitle ? null : custom.subtitle ? <span dangerouslySetInnerHTML={{ __html: swapNames(custom.subtitle, site) }} /> : defaultSubtitle
  const eyebrow = custom.eyebrow ? <span dangerouslySetInnerHTML={{ __html: swapNames(custom.eyebrow, site) }} /> : defaultEyebrow
  const name = matchRoute(loc.path).name

  return (
    <header className={`large-title ${custom.align ? `align-${custom.align}` : ''} ${className}`} style={style}>
      <div className="large-title-inner">
        <div className="hw-title-meta" aria-hidden="true">
          <span className="hw-seal">{routeKanji(name)}</span>
          <span className="hw-title-word">{routeWord(name)}</span>
          <i />
        </div>
        {custom.image && <img className="large-title-image" src={custom.image} alt="" />}
        {eyebrow && <div className="large-title-eyebrow">{eyebrow}</div>}
        <h1>
          <span className="hw-title-text">{title}</span>
        </h1>
        <span className="hw-rule" aria-hidden="true" />
        {subtitle && <div className="large-title-sub">{subtitle}</div>}
        {children}
      </div>
    </header>
  )
}

/* ---------------- 화투패 (메뉴바·바닥글에서 같이 써요) ---------------- */

export function HwCard({ month, size = 'm', className = '' }) {
  const m = month || MONTHS[0]
  return (
    <span className={`hw-card size-${size} tone-${m.tone} ${className}`} aria-hidden="true">
      <span className="hw-card-sun" />
      <span className="hw-card-kanji">{m.kanji}</span>
      <span className="hw-card-no">{m.jp}</span>
    </span>
  )
}

/* ---------------- 메뉴바 ---------------- */

export function bottomNavItems(app) {
  const list = Array.isArray(app.theme.bottomNav) ? app.theme.bottomNav : app.site.bottomNav || []
  return list.filter((it) => it && it.href && (!it.adminOnly || app.admin)).slice(0, 6)
}

function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile, path }) {
  const app = useApp()
  const { site } = app
  const bgm = useBgm()
  const [q, setQ] = useState('')
  const [openCats, setOpenCats] = useState({})
  const asideRef = useRef(null)
  const pair = site.pair || {}

  // 휴대폰에서 닫혀 있을 땐 키보드 이동에서 빼요.
  useEffect(() => {
    const el = asideRef.current
    if (!el) return
    const mq = window.matchMedia?.('(max-width: 899px)')
    const sync = () => (el.inert = !!mq?.matches && !mobileOpen)
    sync()
    mq?.addEventListener?.('change', sync)
    return () => mq?.removeEventListener?.('change', sync)
  }, [mobileOpen])

  async function logout() {
    await api.logout()
    await app.reload()
    app.showToast('로그아웃했어요.')
    navigate('/')
  }

  // 주 메뉴(관리 › 디자인 › 배치에서 정해요) 뒤에, 거기 없는 기본 메뉴를 이어 붙여요.
  const main = bottomNavItems(app)
  const extra = [
    { href: '/archive', icon: 'fa-solid fa-layer-group', label: '전체 기록', show: site.menu.archive },
    { href: '/notice', icon: 'fa-solid fa-bullhorn', label: '공지', show: site.menu.notice },
    { href: '/guestbook', icon: 'fa-regular fa-comment-dots', label: '방명록', show: site.menu.guestbook && site.features.guestbook !== false },
    { href: '/calendar', icon: 'fa-regular fa-calendar', label: '캘린더', show: site.menu.calendar },
    { href: '/tags', icon: 'fa-solid fa-hashtag', label: '태그', show: site.menu.tags },
    { href: '/banners', icon: 'fa-solid fa-flag', label: '배너', show: site.menu.banners },
  ].filter((x) => x.show && !main.some((m) => m.href === x.href))
  const menu = [...(main.some((m) => m.href === '/') ? [] : [{ href: '/', icon: 'fa-solid fa-house', label: '홈' }]), ...main, ...extra]
  const isActive = (href) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`) || path.startsWith(`${href}?`))

  const roots = app.categories.filter((c) => !c.parent_id)
  // 글 개수: 관리 › 사이트 › 메뉴에서 전체를 끄거나, 관리 › 카테고리에서 카테고리마다 숨길 수 있어요.
  const showCounts = site.menu.counts !== false
  const countOf = (c, n) => (showCounts && !c.hide_count ? <span className="cat-count">{n}</span> : null)
  const children = (id) => app.categories.filter((c) => c.parent_id === id)
  const links = (site.links || []).filter((l) => l.url && l.url !== '#')
  const modeLabel = app.mode === 'dark' ? '라이트 모드로' : '다크 모드로'

  return (
    <aside ref={asideRef} className={`hw-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="메뉴">
      <div className="hw-sb-head">
        <button type="button" className="hw-sb-toggle desktop-only" onClick={onToggle} aria-label={collapsed ? '메뉴바 펼치기' : '메뉴바 접기'} aria-expanded={!collapsed} title={collapsed ? '펼치기' : '접기'}>
          <span className="hw-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
        <button type="button" className="hw-sb-toggle mobile-only" onClick={onCloseMobile} aria-label="메뉴 닫기">
          <i className="fa-solid fa-xmark" />
        </button>
        <a href="/" className="hw-sb-brand">
          <strong>{site.title}</strong>
          {site.description && <small>{site.description}</small>}
        </a>
      </div>

      <div className="hw-sb-scroll">
        {(pair.me?.name || pair.partner?.name) && (
          <a href="/" className="hw-pairbox hw-sb-full" title={pair.pairName || ''}>
            <span>{pair.me?.name}</span>
            <i aria-hidden="true" />
            <span>{pair.partner?.name}</span>
          </a>
        )}

        <nav className="hw-sb-section" aria-label="주 메뉴">
          <span className="hw-sb-label">
            <b>壱</b> MENU
          </span>
          {menu.map((item, i) => (
            <a key={item.href + i} href={item.href} className={`hw-sb-link ${isActive(item.href) ? 'active' : ''}`} title={item.label} style={{ '--i': i }}>
              <i className={`hw-sb-icon ${item.icon || 'fa-solid fa-circle'}`} />
              <span className="hw-sb-text">{item.label}</span>
              <span className="hw-sb-no">{pad2(i + 1)}</span>
            </a>
          ))}
        </nav>

        {(roots.length > 0 || app.admin) && (
          <nav className="hw-sb-section hw-sb-cats" aria-label="카테고리">
            <span className="hw-sb-label">
              <b>弐</b> CATEGORY
            </span>
            {roots.map((c) => {
              const kids = children(c.id)
              const isOpen = openCats[c.id]
              const href = `/category/${encodeURIComponent(c.slug)}`
              return (
                <div key={c.id} className={`cat-item ${isOpen ? 'open' : ''}`}>
                  <a href={href} className={`hw-sb-link ${isActive(href) ? 'active' : ''}`} title={c.name}>
                    <i className={`hw-sb-icon ${c.icon || 'fa-solid fa-folder'}`} />
                    <span className="hw-sb-text">{c.name}</span>
                    {isRecent(c.latest) && <span className="new-badge hw-sb-full">N</span>}
                    <span className="hw-sb-full">{countOf(c, c.count + kids.reduce((s, k) => s + k.count, 0))}</span>
                  </a>
                  {kids.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="cat-toggle hw-sb-full"
                        onClick={() => setOpenCats((s) => ({ ...s, [c.id]: !s[c.id] }))}
                        aria-label={`${c.name} 하위 카테고리 ${isOpen ? '접기' : '펼치기'}`}
                        aria-expanded={!!isOpen}
                      >
                        <i className="fa-solid fa-chevron-right" />
                      </button>
                      <div className="cat-children hw-sb-full">
                        {kids.map((k) => {
                          const kh = `/category/${encodeURIComponent(k.slug)}`
                          return (
                            <a key={k.id} href={kh} className={`hw-sb-link sub ${isActive(kh) ? 'active' : ''}`}>
                              <span className="hw-sb-text">{k.name}</span>
                              {isRecent(k.latest) && <span className="new-badge">N</span>}
                              {countOf(k, k.count)}
                            </a>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {!roots.length && app.admin && (
              <a href="/admin/categories" className="hw-sb-link muted" title="카테고리 만들기">
                <i className="hw-sb-icon fa-solid fa-plus" />
                <span className="hw-sb-text">카테고리 만들기</span>
              </a>
            )}
          </nav>
        )}

        <div className="hw-sb-section hw-sb-full">
          <span className="hw-sb-label">
            <b>参</b> SEARCH
          </span>
          <form
            className="search-field"
            onSubmit={(e) => {
              e.preventDefault()
              if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
            }}
          >
            <i className="fa-solid fa-magnifying-glass" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어 입력..." aria-label="검색어" />
          </form>
        </div>

        {links.length > 0 && (
          <div className="hw-sb-section hw-sb-full">
            <span className="hw-sb-label">
              <b>四</b> LINK
            </span>
            <div className="hw-sb-links">
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" title={l.name}>
                  <i className={l.icon || 'fa-solid fa-link'} />
                  <span>{l.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="hw-sb-full hw-sb-bgm">
          <BgmCard />
        </div>
      </div>

      {/* 아래쪽 도구: 접혀 있을 땐 아이콘만 세로로 */}
      <div className="hw-sb-tools">
        <a href="/search" className="hw-sb-tool hw-sb-mini" aria-label="검색" title="검색">
          <i className="fa-solid fa-magnifying-glass" />
        </a>
        {bgm.tracks.length > 0 && (
          <button type="button" className={`hw-sb-tool hw-sb-mini ${bgm.playing ? 'on' : ''}`} onClick={bgm.toggle} aria-label={bgm.playing ? 'BGM 일시정지' : 'BGM 재생'} title="BGM">
            <i className={`fa-solid ${bgm.playing ? 'fa-pause' : 'fa-music'}`} />
          </button>
        )}
        {app.theme.allowToggle !== false && (
          <button type="button" className="hw-sb-tool" onClick={app.toggleMode} aria-label={modeLabel} title={modeLabel}>
            <i className={`fa-solid ${app.mode === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>
        )}
        {app.admin ? (
          <>
            <a href="/write" className="hw-sb-tool accent" aria-label="글쓰기" title="글쓰기">
              <i className="fa-solid fa-pen" />
            </a>
            <a href="/admin" className="hw-sb-tool" aria-label="관리" title="관리">
              <i className="fa-solid fa-gear" />
            </a>
            <button type="button" className="hw-sb-tool" onClick={logout} aria-label="로그아웃" title="로그아웃">
              <i className="fa-solid fa-right-from-bracket" />
            </button>
          </>
        ) : (
          <a href="/login" className="hw-sb-tool" aria-label="로그인" title="로그인">
            <i className="fa-solid fa-key" />
          </a>
        )}
      </div>
    </aside>
  )
}

/* 휴대폰 하단 탭 (관리 › 디자인 › 배치 › 휴대폰 메뉴에서 켜요). PC에서는 숨겨요. */
function BottomNav({ path }) {
  const app = useApp()
  const items = bottomNavItems(app)
  const ref = useRef(null)
  // 저장 바·글쓰기 바·버튼들이 하단 탭 바로 위에 뜰 수 있게 높이를 알려줘요.
  useEffect(() => {
    const el = ref.current
    const root = document.documentElement
    if (!el) {
      root.style.removeProperty('--bottom-nav-space')
      return
    }
    const update = () => root.style.setProperty('--bottom-nav-space', `${el.offsetHeight ? el.offsetHeight + 26 : 12}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      root.style.removeProperty('--bottom-nav-space')
    }
  }, [items.length])
  if (!items.length) return null
  return (
    <nav className="bottom-nav hw-tabs" aria-label="하단 메뉴" ref={ref}>
      {items.map((item, i) => {
        const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
        return (
          <a key={i} href={item.href} className={active ? 'active' : ''}>
            <i className={item.icon || 'fa-solid fa-circle'} />
            <span>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

/* 바닥글: 큰 글자 · 계절 점 · 이달의 패 */
function Footer() {
  const { site } = useApp()
  const m = currentMonth()
  return (
    <footer className="site-footer hw-foot">
      <div className="hw-foot-inner">
        <div className="hw-foot-title">
          <strong>{site.footer || 'HANAFUDA ARCHIVE'}</strong>
          <span>{site.title}</span>
        </div>
        <div className="hw-foot-seasons" aria-label={`지금은 ${SEASONS[m.season].label}`}>
          {SEASONS.map((s, i) => (
            <span key={s.kanji} className={i === m.season ? 'on' : ''} title={s.label}>
              <i />
              <em>{s.kanji}</em>
            </span>
          ))}
        </div>
        <div className="hw-foot-month">
          <div className="hw-foot-month-text">
            <small>MONTH · {m.jp}</small>
            <span>
              {m.name} <em>({m.ko})</em>
            </span>
          </div>
          <b>{pad2(m.n)}</b>
          <HwCard month={m} size="s" />
        </div>
      </div>
    </footer>
  )
}

/* ---------------- 배경 장식 (단색) ---------------- */

function Backdrop({ route }) {
  const { site } = useApp()
  const word = routeWord(route)
  return (
    <div className="hw-backdrop" aria-hidden="true">
      <div className="hw-band" />
      <div className="hw-band-line" />
      <div className="hw-dots" />
      <div className="hw-orbit">
        <i />
      </div>
      <div className="hw-word" key={word}>
        {word}
      </div>
      <div className="hw-edge">
        <span>{site.title}</span>
        <span className="hw-progress-track">
          <span className="hw-progress" />
        </span>
      </div>
    </div>
  )
}

// 페이지가 바뀔 때 다홍 막이 사선으로 한 번 스쳐 지나가요.
function RouteWipe({ path }) {
  const first = useRef(true)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!reduceMotion()) setN((x) => x + 1)
  }, [path])
  if (n === 0) return null
  return (
    <div className="hw-wipe" key={n} aria-hidden="true">
      <i />
    </div>
  )
}

/* 두루마리 모양 본문 창. 머리줄에 메뉴·검색·모드·글쓰기 버튼이 함께 들어가요. */
function BrowserFrame({ on, path, showUrl, onMenu, children }) {
  const app = useApp()
  const url = `${window.location.host}${decodeURIComponent(path)}`
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      app.showToast('주소를 복사했어요.')
    } catch {
      window.prompt('주소', window.location.href)
    }
  }
  return (
    <div className={on ? 'browser-frame' : 'frame-off'}>
      {on && (
        <div className={`browser-bar ${showUrl ? '' : 'no-url'}`}>
          {onMenu ? (
            <button type="button" className="browser-btn" onClick={onMenu} aria-label="메뉴 열기">
              <i className="fa-solid fa-bars" />
            </button>
          ) : (
            <a href="/" className="browser-btn" aria-label="홈">
              <i className="fa-solid fa-house" />
            </a>
          )}
          {showUrl && (
            <button type="button" className="browser-btn back" onClick={() => window.history.back()} aria-label="뒤로" disabled={path === '/'}>
              <i className="fa-solid fa-arrow-left" />
            </button>
          )}
          {showUrl ? (
            <button type="button" className="browser-url" onClick={copy} title="주소 복사">
              <i className="fa-solid fa-lock" />
              <span>{url}</span>
            </button>
          ) : (
            <span className="browser-spacer" />
          )}
          <a href="/search" className="browser-btn" aria-label="검색">
            <i className="fa-solid fa-magnifying-glass" />
          </a>
          {app.theme.allowToggle !== false && (
            <button type="button" className="browser-btn" onClick={app.toggleMode} aria-label={app.mode === 'dark' ? '라이트 모드로' : '다크 모드로'}>
              <i className={`fa-solid ${app.mode === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>
          )}
          {app.admin && (
            <a href="/write" className="browser-btn accent" aria-label="글쓰기">
              <i className="fa-solid fa-pen" />
            </a>
          )}
        </div>
      )}
      <div className={on ? 'browser-body' : 'frame-off'}>{children}</div>
    </div>
  )
}

// 맨 위로 · 맨 아래로 버튼. 조금 내려가면 나타나요. 오른쪽 가장자리의 붉은 선은 얼마나 읽었는지 보여줘요.
function ScrollButtons() {
  const loc = useLocation()
  const [up, setUp] = useState(false)
  const [down, setDown] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const on = () => {
      const el = scrollRoot()
      const top = scrollTop()
      const max = el ? el.scrollHeight - el.clientHeight : document.documentElement.scrollHeight - window.innerHeight
      setUp(top > 320)
      setDown(max - top > 320)
      root.style.setProperty('--hw-progress', max > 0 ? String(Math.min(1, Math.max(0, top / max))) : '0')
    }
    on()
    // 사이트 배경 이미지를 쓸 때는 #root가 스크롤되므로, 캡처 단계로 모든 스크롤을 들어요.
    window.addEventListener('scroll', on, { capture: true, passive: true })
    window.addEventListener('resize', on)
    // 글·사진이 나중에 불러와져 페이지가 길어져도 맞춰요.
    const ro = new ResizeObserver(on)
    const main = document.getElementById('main')
    if (main) ro.observe(main)
    return () => {
      window.removeEventListener('scroll', on, { capture: true })
      window.removeEventListener('resize', on)
      ro.disconnect()
    }
  }, [loc.path])
  const go = (where) => {
    const el = scrollRoot()
    const top = where === 'top' ? 0 : el ? el.scrollHeight : document.documentElement.scrollHeight
    ;(el || window).scrollTo({ top, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }
  const Btn = ({ show, where, icon, label }) => (
    <button type="button" className={`scroll-top-btn ${show ? 'show' : ''}`} onClick={() => go(where)} aria-label={label} title={label} tabIndex={show ? 0 : -1} aria-hidden={!show}>
      <i className={icon} />
    </button>
  )
  return (
    <div className={`scroll-btns ${up || down ? 'show' : ''}`}>
      <Btn show={up} where="top" icon="fa-solid fa-arrow-up" label="맨 위로" />
      <Btn show={down} where="bottom" icon="fa-solid fa-arrow-down" label="맨 아래로" />
    </div>
  )
}
