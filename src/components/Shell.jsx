import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { swapNames, useApp } from '../lib/store.jsx'
import { matchRoute, navigate, scrollRoot, scrollTop, useLocation } from '../lib/router.js'
import { api } from '../lib/api.js'
import { isRecent } from '../lib/format.js'
import { MONTHS, SEASONS, currentMonth, kanjiNumber, monthAt, pad2, routeKanji } from '../lib/hwatu.js'
import { BgmCard } from './Bgm.jsx'

/* ==================================================================
   화투(花札) 레이아웃
   - 위: 도장 메뉴 버튼 · 사이트 이름 · 메뉴 글자 · 페어 이름 상자
   - 뒤: 붉은 해 · 물결 무늬 · 페이지마다 바뀌는 큰 한자 · 꽃잎
   - 메뉴: 화투패가 펼쳐지는 전체 화면 서랍
   - 아래: 큰 글자 바닥글 · 계절 점 · '이달의 패'
   ================================================================== */

const TitleContext = createContext({ setTitle: () => {}, setCollapsed: () => {} })

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function Shell({ children }) {
  const app = useApp()
  const loc = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [collapsed, setCollapsed] = useState(true)
  const nav = app.theme.navStyle
  // 배경이 사진·패턴이면 본문을 두루마리 판 위에 올려서 글자가 잘 보이게 해요.
  const t = app.theme
  const busyBg = t.bgType === 'image' || t.bgType === 'pattern'
  const useFrame = (t.contentFrame === 'always' || (t.contentFrame !== 'never' && busyBg)) && (loc.path !== '/' || t.frameOnHome)
  const route = matchRoute(loc.path).name
  const anim = t.animations !== false

  useEffect(() => {
    setDrawerOpen(false)
  }, [loc.path, loc.search])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', drawerOpen)
    if (!drawerOpen) return
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <TitleContext.Provider value={{ setTitle, setCollapsed }}>
      <div className={`app hw nav-${nav} route-${route}`}>
        {t.hwDecor !== false && <Backdrop route={route} petals={anim && t.hwPetals !== false} />}
        {anim && t.hwWipe !== false && <RouteWipe path={loc.path} />}
        {nav !== 'bottom' && <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
        <div className={`drawer-dim ${drawerOpen ? 'active' : ''}`} onClick={() => setDrawerOpen(false)} />
        {/* 본문 창을 쓸 땐 상단바 버튼들이 창의 머리줄 안으로 들어가요. */}
        {!useFrame && <TopBar title={title} collapsed={collapsed} onMenu={() => setDrawerOpen(true)} showMenu={nav !== 'bottom'} path={loc.path} />}
        <main className={`page ${useFrame ? 'framed' : ''}`} id="main">
          {/* 창을 켜고 끌 때도 본문이 다시 그려지지 않도록 늘 같은 구조로 감싸요. (관리 화면 입력값이 사라지지 않게) */}
          <BrowserFrame on={useFrame} path={loc.path + loc.search} showUrl={app.theme.frameBar !== false} onMenu={nav !== 'bottom' ? () => setDrawerOpen(true) : null}>
            {children}
          </BrowserFrame>
        </main>
        <Footer />
        {nav !== 'drawer' && <BottomNav path={loc.path} />}
        <ScrollButtons />
        {anim && t.hwCursor !== false && (!t.cursor || t.cursor === 'default') && <InkCursor />}
        {app.toast && (
          <div className="toast" key={app.toast.id} role="status">
            {app.toast.message}
          </div>
        )}
      </div>
    </TitleContext.Provider>
  )
}

// 큰 제목 없이 상단바 제목만 정할 때 씁니다.
export function useTopbarTitle(title) {
  const { setTitle, setCollapsed } = useContext(TitleContext)
  useEffect(() => {
    if (title === undefined) return
    setTitle(title)
    setCollapsed(true)
  }, [title, setTitle, setCollapsed])
}

/* 페이지 큰 제목. 붉은 도장(페이지 한자)이 찍히고 제목 아래로 붓 선이 그어져요.
   스크롤해서 제목이 사라지면 상단바에 작은 제목이 나타나요. */
// pageKey를 주면 관리 › 페이지 문구에서 바꾼 제목·문구가 기본값 대신 쓰여요.
export function LargeTitle({ pageKey, title: defaultTitle, subtitle: defaultSubtitle, children, eyebrow: defaultEyebrow, className = '', style }) {
  const { setTitle, setCollapsed } = useContext(TitleContext)
  const ref = useRef(null)
  const { site } = useApp()
  const loc = useLocation()
  const custom = (pageKey && site.pages?.[pageKey]) || {}
  const title = custom.title || defaultTitle
  const subtitle = custom.hideSubtitle ? null : custom.subtitle ? <span dangerouslySetInnerHTML={{ __html: swapNames(custom.subtitle, site) }} /> : defaultSubtitle
  const eyebrow = custom.eyebrow ? <span dangerouslySetInnerHTML={{ __html: swapNames(custom.eyebrow, site) }} /> : defaultEyebrow
  const kanji = routeKanji(matchRoute(loc.path).name)

  useEffect(() => {
    setTitle(title)
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    io.observe(el)
    return () => {
      io.disconnect()
      setCollapsed(true)
    }
  }, [title, setTitle, setCollapsed])

  return (
    <header className={`large-title ${custom.align ? `align-${custom.align}` : ''} ${className}`} style={style}>
      <div className="large-title-inner">
        <span className="hw-seal" aria-hidden="true">
          {kanji}
        </span>
        {custom.image && <img className="large-title-image" src={custom.image} alt="" />}
        {eyebrow && <div className="large-title-eyebrow">{eyebrow}</div>}
        <h1 ref={ref}>
          <span className="hw-title-text">{title}</span>
        </h1>
        <span className="hw-brush" aria-hidden="true" />
        {subtitle && <div className="large-title-sub">{subtitle}</div>}
        {children}
      </div>
    </header>
  )
}

/* ---------------- 화투패 (메뉴·카테고리·바닥글에서 같이 써요) ---------------- */

export function HwCard({ month, icon, label, size = 'm', flip = true, className = '' }) {
  const m = month || MONTHS[0]
  return (
    <span className={`hw-card size-${size} tone-${m.tone} ${flip ? 'can-flip' : ''} ${className}`} aria-hidden="true">
      <span className="hw-card-inner">
        <span className="hw-card-face">
          <span className="hw-card-sun" />
          <span className="hw-card-kanji">{m.kanji}</span>
          <span className="hw-card-no">{m.jp}</span>
          {icon && <i className={`hw-card-icon ${icon}`} />}
        </span>
        {flip && (
          <span className="hw-card-back">
            <span className="hw-card-back-label">{label || m.ko}</span>
          </span>
        )}
      </span>
    </span>
  )
}

/* ---------------- 상단바 ---------------- */

function TopBar({ title, collapsed, onMenu, showMenu, path }) {
  const app = useApp()
  const { site } = app
  const items = app.theme.navStyle !== 'drawer' ? bottomNavItems(app) : []
  const [scrolled, setScrolled] = useState(false)
  const pair = site.pair || {}

  useEffect(() => {
    const on = () => setScrolled(scrollTop() > 12)
    on()
    window.addEventListener('scroll', on, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', on, { capture: true })
  }, [])

  return (
    <header className={`topbar hw-top ${collapsed ? 'show-title' : ''} ${scrolled ? 'scrolled' : ''}`}>
      <div className="topbar-inner">
        {showMenu ? (
          <button type="button" className="hw-menu-btn" onClick={onMenu} aria-label="메뉴 열기">
            <span className="hw-menu-lines" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="hw-menu-kanji" aria-hidden="true">
              札
            </span>
          </button>
        ) : (
          <a href="/" className="hw-menu-btn" aria-label="홈">
            <span className="hw-menu-kanji always" aria-hidden="true">
              花
            </span>
          </a>
        )}
        <a href="/" className="hw-brand" aria-label={`${site.title} 홈`}>
          <span className="hw-brand-text">
            <strong>{site.title}</strong>
            {site.description && <small>{site.description}</small>}
          </span>
        </a>
        <div className="topbar-title" aria-hidden={!collapsed}>
          {title}
        </div>
        {items.length > 0 && (
          <nav className="hw-top-nav" aria-label="주 메뉴">
            {items.map((item, i) => {
              const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
              return (
                <a key={i} href={item.href} className={active ? 'active' : ''} style={{ '--i': i }}>
                  <span className="hw-top-nav-no">{pad2(i + 1)}</span>
                  <span className="hw-top-nav-label">
                    <span data-text={item.label}>{item.label}</span>
                  </span>
                </a>
              )
            })}
          </nav>
        )}
        {(pair.me?.name || pair.partner?.name) && (
          <a href="/" className="hw-pairbox" title={pair.pairName || ''}>
            <span>{pair.me?.name}</span>
            <i aria-hidden="true" />
            <span>{pair.partner?.name}</span>
          </a>
        )}
        <div className="topbar-actions">
          <a href="/search" className="icon-btn" aria-label="검색">
            <i className="fa-solid fa-magnifying-glass" />
          </a>
          {app.theme.allowToggle !== false && (
            <button type="button" className="icon-btn hw-mode-btn" onClick={app.toggleMode} aria-label={app.mode === 'dark' ? '라이트 모드로' : '다크 모드로'}>
              <i className={`fa-solid ${app.mode === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>
          )}
          {app.admin && (
            <a href="/write" className="icon-btn accent" aria-label="글쓰기">
              <i className="fa-solid fa-pen" />
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

/* ---------------- 서랍: 화투패가 펼쳐지는 전체 화면 메뉴 ---------------- */

function Drawer({ open, onClose }) {
  const app = useApp()
  const { site } = app
  const [q, setQ] = useState('')
  const [openCats, setOpenCats] = useState({})

  async function logout() {
    await api.logout()
    await app.reload()
    app.showToast('로그아웃했어요.')
    navigate('/')
  }

  const asideRef = useRef(null)
  useEffect(() => {
    if (asideRef.current) asideRef.current.inert = !open
  }, [open])

  const roots = app.categories.filter((c) => !c.parent_id)
  // 글 개수: 관리 › 사이트 › 메뉴에서 전체를 끄거나, 관리 › 카테고리에서 카테고리마다 숨길 수 있어요.
  const showCounts = site.menu.counts !== false
  const countOf = (c, n) => (showCounts && !c.hide_count ? <span className="cat-count">{n}</span> : null)
  const children = (id) => app.categories.filter((c) => c.parent_id === id)
  const links = (site.links || []).filter((l) => l.url && l.url !== '#')
  const pair = site.pair || {}
  const tiles = [
    { href: '/', icon: 'fa-solid fa-house', label: '홈', show: true },
    { href: '/notice', icon: 'fa-solid fa-bullhorn', label: '공지', show: site.menu.notice },
    { href: '/guestbook', icon: 'fa-solid fa-comment-dots', label: '방명록', show: site.menu.guestbook && site.features.guestbook !== false },
    { href: '/calendar', icon: 'fa-regular fa-calendar', label: '캘린더', show: site.menu.calendar },
    { href: '/tags', icon: 'fa-solid fa-hashtag', label: '태그', show: site.menu.tags },
    { href: '/banners', icon: 'fa-solid fa-flag', label: '배너', show: site.menu.banners },
  ].filter((x) => x.show)

  return (
    <aside ref={asideRef} className={`drawer hw-drawer ${open ? 'open' : ''}`} aria-label="메뉴">
      <div className="hw-drawer-sun" aria-hidden="true" />
      <div className="drawer-head">
        <span className="drawer-title">
          <em>札</em> MENU
        </span>
        <div className="drawer-head-actions">
          {app.theme.allowToggle !== false && (
            <button type="button" className="icon-btn" onClick={app.toggleMode} aria-label={app.mode === 'dark' ? '라이트 모드로' : '다크 모드로'} title={app.mode === 'dark' ? '라이트 모드' : '다크 모드'}>
              <i className={`fa-solid ${app.mode === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>
          )}
          <button type="button" className="icon-btn hw-close" onClick={onClose} aria-label="메뉴 닫기">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>
      <div className="drawer-scroll">
        <div className="hw-drawer-grid">
          <section className="hw-drawer-intro">
            <div className="hw-drawer-vertical" aria-hidden="true">
              {site.title}
            </div>
            <div className="hw-drawer-pair">
              <span className="hw-drawer-pair-label">PAIR</span>
              <strong>{pair.pairName || site.title}</strong>
              {pair.bio && <p>{pair.bio}</p>}
            </div>
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
            <div className="drawer-foot">
              <div className="drawer-account">
                {app.admin ? (
                  <>
                    <a href="/write">
                      <i className="fa-solid fa-pen" /> 글쓰기
                    </a>
                    <a href="/admin">
                      <i className="fa-solid fa-gear" /> 관리
                    </a>
                    <button type="button" onClick={logout}>
                      <i className="fa-solid fa-right-from-bracket" /> 로그아웃
                    </button>
                  </>
                ) : (
                  <a href="/login">
                    <i className="fa-solid fa-right-to-bracket" /> 로그인
                  </a>
                )}
              </div>
              <BgmCard />
            </div>
          </section>

          <section className="hw-drawer-main">
            <div className="drawer-section">
              <span className="section-label">
                <b>壱</b> MENU
              </span>
              <nav className="drawer-tiles hw-hand">
                {tiles.map((x, i) => (
                  <a key={x.href} href={x.href} className="drawer-tile" style={{ '--i': i, '--n': tiles.length }}>
                    <HwCard month={monthAt(i)} icon={x.icon} label={x.label} />
                    <span className="drawer-tile-label">{x.label}</span>
                  </a>
                ))}
              </nav>
            </div>

            <div className="drawer-section">
              <span className="section-label">
                <b>弐</b> CATEGORY
              </span>
              <nav className="drawer-cats">
                {site.menu.archive && (
                  <a href="/archive" className="cat-link" style={{ '--i': 0 }}>
                    <span className="hw-cat-no">00</span>
                    <i className="cat-icon fa-solid fa-layer-group" />
                    <span>전체 기록</span>
                    {showCounts && <span className="cat-count">{app.stats.posts || 0}</span>}
                  </a>
                )}
                {roots.map((c, ci) => {
                  const kids = children(c.id)
                  const isOpen = openCats[c.id]
                  const m = monthAt(ci)
                  return (
                    <div key={c.id} className={`cat-item ${isOpen ? 'open' : ''}`} style={{ '--i': ci + 1 }}>
                      <a href={`/category/${encodeURIComponent(c.slug)}`} className="cat-link">
                        <span className="hw-cat-no">{pad2(ci + 1)}</span>
                        <i className={`cat-icon ${c.icon || 'fa-solid fa-folder'}`} />
                        <span>{c.name}</span>
                        <span className="hw-cat-kanji" aria-hidden="true">
                          {m.kanji}
                        </span>
                        {isRecent(c.latest) && <span className="new-badge">N</span>}
                        {countOf(c, c.count + kids.reduce((s, k) => s + k.count, 0))}
                      </a>
                      {kids.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="cat-toggle"
                            onClick={() => setOpenCats((s) => ({ ...s, [c.id]: !s[c.id] }))}
                            aria-label={`${c.name} 하위 카테고리 ${isOpen ? '접기' : '펼치기'}`}
                            aria-expanded={!!isOpen}
                          >
                            <i className="fa-solid fa-chevron-right" />
                          </button>
                          <div className="cat-children">
                            {kids.map((k) => (
                              <a key={k.id} href={`/category/${encodeURIComponent(k.slug)}`} className="cat-link sub">
                                <i className={`cat-icon ${k.icon || 'fa-regular fa-folder'}`} />
                                <span>{k.name}</span>
                                {isRecent(k.latest) && <span className="new-badge">N</span>}
                                {countOf(k, k.count)}
                              </a>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
                {!roots.length && app.admin && (
                  <a href="/admin/categories" className="cat-link muted">
                    <i className="cat-icon fa-solid fa-plus" />
                    <span>카테고리 만들기</span>
                  </a>
                )}
              </nav>
            </div>

            {links.length > 0 && (
              <div className="drawer-section">
                <span className="section-label">
                  <b>参</b> LINK
                </span>
                <div className="drawer-links">
                  {links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
                      <i className={l.icon || 'fa-solid fa-link'} />
                      {l.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </aside>
  )
}

export function bottomNavItems(app) {
  const list = Array.isArray(app.theme.bottomNav) ? app.theme.bottomNav : app.site.bottomNav || []
  return list.filter((it) => it && it.href && (!it.adminOnly || app.admin)).slice(0, 6)
}

/* 휴대폰 하단 탭: 화투패 모양 탭이 한 줄로 놓이고, 지금 페이지 패가 붉게 솟아요. (PC에서는 상단바 메뉴로 보여요) */
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
          <a key={i} href={item.href} className={active ? 'active' : ''} style={{ '--i': i }}>
            <span className="hw-tab-card">
              <i className={item.icon || 'fa-solid fa-circle'} />
              <em aria-hidden="true">{monthAt(i).kanji}</em>
            </span>
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
          <HwCard month={m} size="s" label="이달의 패" />
        </div>
      </div>
    </footer>
  )
}

/* ---------------- 배경 장식 ---------------- */

function Backdrop({ route, petals }) {
  const { site } = useApp()
  const kanji = routeKanji(route)
  const m = currentMonth()
  return (
    <div className="hw-backdrop" aria-hidden="true">
      <div className="hw-sun" />
      <div className="hw-splash" />
      <div className="hw-waves" />
      <div className="hw-kanji" key={kanji}>
        {kanji}
      </div>
      <div className="hw-grain" />
      <div className="hw-side hw-side-l">
        <span>{site.title}</span>
        <i />
        <span>
          {kanjiNumber(m.n)}月 · {m.kanji}
        </span>
      </div>
      <div className="hw-side hw-side-r">
        <span className="hw-progress" />
      </div>
      {petals && (
        <div className="hw-petals">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ '--i': i, '--x': `${(i * 37) % 100}vw`, '--d': `${11 + ((i * 7) % 9)}s`, '--delay': `${-((i * 13) % 17)}s`, '--s': 0.6 + ((i * 3) % 5) / 10 }} />
          ))}
        </div>
      )}
    </div>
  )
}

// 페이지가 바뀔 때 붉은 막과 먹색 막이 사선으로 스쳐 지나가요. (처음 들어올 때는 도장이 찍히며 막이 걷혀요)
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
  if (n === 0) return <div className="hw-intro" aria-hidden="true" />
  return (
    <div className="hw-wipe" key={n} aria-hidden="true">
      <i />
      <i />
    </div>
  )
}

// 먹 번짐 커서: 마우스를 따라 동그란 고리가 따라오고, 누를 수 있는 곳 위에서는 커져요. (마우스가 있는 기기에서만)
function InkCursor() {
  const ref = useRef(null)
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: fine)').matches || reduceMotion()) return
    const el = ref.current
    if (!el) return
    let x = -100
    let y = -100
    let cx = x
    let cy = y
    let raf = 0
    const tick = () => {
      cx += (x - cx) * 0.2
      cy += (y - cy) * 0.2
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(tick) : 0
    }
    const onMove = (e) => {
      x = e.clientX
      y = e.clientY
      el.classList.add('on')
      const hit = e.target.closest?.('a, button, [role="button"], summary, label, select, input[type="checkbox"]')
      el.classList.toggle('hover', !!hit)
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onDown = () => el.classList.add('down')
    const onUp = () => el.classList.remove('down')
    const onLeave = () => el.classList.remove('on')
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])
  return (
    <div className="hw-cursor" ref={ref} aria-hidden="true">
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
