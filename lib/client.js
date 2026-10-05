window.__ModuleLoader__.load({
  id: 'dsh-memory-guardian',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')
    const { createElement: h, useEffect, useMemo, useState } = React
    const SNAPSHOT_PATH = '/memory-guardian/api/snapshot'
    const SEARCH_PATH = '/memory-guardian/api/search'
    const MUTATE_PATH = '/memory-guardian/api/mutate'
    const EXPORT_PATH = '/memory-guardian/api/export'

    const CSS = `
.dmg-shell{--mg-accent:#38d9a9;--mg-accent-2:#5eb8ff;--mg-warning:#f4b860;--mg-danger:#ff6b81;--mg-panel:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,#132b2a 6%);position:relative;display:grid;gap:16px;min-width:0;container-type:inline-size;color:var(--dsw-alias-label-primary);font-family:"Fira Sans",Inter,"Segoe UI",sans-serif}
.dmg-shell *{box-sizing:border-box}.dmg-shell button,.dmg-shell input,.dmg-shell textarea,.dmg-shell select{font:inherit}.dmg-shell button,.dmg-shell [role=button],.dmg-shell a{cursor:pointer}.dmg-shell :focus-visible{outline:2px solid var(--mg-accent-2);outline-offset:2px}
.dmg-aurora{pointer-events:none;position:absolute;inset:-18px -12px auto;height:240px;overflow:hidden;opacity:.38;z-index:0}.dmg-aurora:before,.dmg-aurora:after{content:"";position:absolute;border-radius:999px;filter:blur(56px)}.dmg-aurora:before{width:270px;height:120px;top:-30px;right:4%;background:color-mix(in srgb,var(--mg-accent) 48%,transparent)}.dmg-aurora:after{width:240px;height:100px;left:15%;top:25px;background:color-mix(in srgb,var(--mg-accent-2) 34%,transparent)}
.dmg-header,.dmg-hero,.dmg-tabs,.dmg-content,.dmg-foot{position:relative;z-index:1}.dmg-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:4px 2px}.dmg-brand{display:flex;gap:12px;align-items:center}.dmg-logo{display:grid;place-items:center;width:42px;height:42px;border:1px solid color-mix(in srgb,var(--mg-accent) 42%,var(--dsw-alias-border-l1));border-radius:14px;background:linear-gradient(145deg,color-mix(in srgb,var(--mg-accent) 19%,var(--dsw-alias-bg-layer-1)),color-mix(in srgb,var(--mg-accent-2) 8%,var(--dsw-alias-bg-layer-1)));color:var(--mg-accent);box-shadow:0 12px 35px color-mix(in srgb,var(--mg-accent) 12%,transparent)}.dmg-title{margin:0;font-size:21px;line-height:28px;font-weight:720;letter-spacing:-.02em}.dmg-subtitle{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.dmg-kicker{display:inline-flex;align-items:center;gap:6px;margin-bottom:3px;color:var(--mg-accent);font:600 9px/14px "Fira Code",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.dmg-pulse{width:6px;height:6px;border-radius:50%;background:var(--mg-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--mg-accent) 14%,transparent)}
.dmg-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dmg-button{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--mg-panel);color:var(--dsw-alias-label-primary);text-decoration:none;font-size:12px;font-weight:600;transition:background-color .2s,border-color .2s,color .2s,box-shadow .2s}.dmg-button:hover{border-color:color-mix(in srgb,var(--mg-accent) 48%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--mg-accent) 7%,var(--mg-panel))}.dmg-button.primary{border-color:color-mix(in srgb,var(--mg-accent) 68%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--mg-accent) 26%,var(--mg-panel)),color-mix(in srgb,var(--mg-accent-2) 13%,var(--mg-panel)));box-shadow:0 8px 24px color-mix(in srgb,var(--mg-accent) 12%,transparent)}.dmg-button.danger{color:var(--mg-danger)}.dmg-button:disabled{opacity:.5;cursor:default}.dmg-icon{width:16px;height:16px;display:inline-block;flex:0 0 auto}
.dmg-hero{display:grid;grid-template-columns:minmax(260px,1.05fr) minmax(390px,1.95fr);gap:12px}.dmg-health{display:flex;align-items:center;gap:17px;min-height:142px;padding:17px;border:1px solid color-mix(in srgb,var(--mg-accent) 18%,var(--dsw-alias-border-l1));border-radius:16px;background:linear-gradient(145deg,color-mix(in srgb,var(--mg-accent) 8%,var(--mg-panel)),var(--mg-panel));box-shadow:0 18px 48px color-mix(in srgb,#000 9%,transparent)}.dmg-ring{--value:0;position:relative;width:92px;height:92px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--mg-accent) calc(var(--value)*1%),color-mix(in srgb,var(--dsw-alias-border-l1) 75%,transparent) 0)}.dmg-ring:before{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--mg-panel);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1)}.dmg-ring-value{position:relative;font:700 25px/1 "Fira Code",ui-monospace,monospace;letter-spacing:-.05em}.dmg-health-label{color:var(--dsw-alias-label-secondary);font-size:10px;line-height:16px;text-transform:uppercase;letter-spacing:.08em}.dmg-health-title{margin-top:3px;font-size:15px;font-weight:680}.dmg-health-copy{margin-top:5px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:17px}
.dmg-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.dmg-metric{position:relative;min-width:0;padding:15px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--mg-panel);overflow:hidden}.dmg-metric:after{content:"";position:absolute;width:45px;height:45px;border-radius:50%;right:-18px;top:-19px;background:color-mix(in srgb,var(--metric-color,var(--mg-accent)) 20%,transparent);filter:blur(2px)}.dmg-metric-top{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--dsw-alias-label-tertiary)}.dmg-metric-value{margin-top:10px;font:700 23px/28px "Fira Code",ui-monospace,monospace;letter-spacing:-.04em}.dmg-metric-label{margin-top:2px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}.dmg-metric-hint{font:500 9px/13px "Fira Code",ui-monospace,monospace;color:var(--metric-color,var(--mg-accent))}
.dmg-tabs{display:flex;gap:5px;padding:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:13px;background:var(--mg-panel);overflow-x:auto}.dmg-tab{min-height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 12px;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary);white-space:nowrap;font-size:11px;font-weight:620;transition:background-color .2s,color .2s}.dmg-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dmg-tab[data-active=true]{background:linear-gradient(135deg,color-mix(in srgb,var(--mg-accent) 16%,var(--dsw-alias-bg-layer-2)),color-mix(in srgb,var(--mg-accent-2) 8%,var(--dsw-alias-bg-layer-2)));color:var(--mg-accent)}.dmg-tab-count{min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);font:600 9px/1 "Fira Code",monospace}
.dmg-content{min-height:430px}.dmg-grid{display:grid;grid-template-columns:minmax(270px,.9fr) minmax(360px,1.45fr);gap:12px;min-width:0}.dmg-panel{min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:15px;background:var(--mg-panel);overflow:hidden}.dmg-panel-head{min-height:53px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;border-bottom:1px solid var(--dsw-alias-border-l1)}.dmg-panel-title{font-size:12px;font-weight:680}.dmg-panel-note{color:var(--dsw-alias-label-tertiary);font:500 9px/14px "Fira Code",monospace}.dmg-filter-row{display:flex;gap:6px;flex-wrap:wrap}.dmg-chip{min-height:28px;padding:0 9px;border:1px solid transparent;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px}.dmg-chip:hover{color:var(--dsw-alias-label-primary)}.dmg-chip[data-active=true]{border-color:color-mix(in srgb,var(--mg-accent) 30%,transparent);background:color-mix(in srgb,var(--mg-accent) 12%,var(--dsw-alias-bg-layer-2));color:var(--mg-accent)}
.dmg-memory-list{max-height:545px;overflow:auto;padding:7px}.dmg-memory{width:100%;display:grid;grid-template-columns:4px minmax(0,1fr) auto;gap:10px;padding:11px 9px;border:0;border-radius:10px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;transition:background-color .18s}.dmg-memory:hover{background:var(--dsw-alias-interactive-bg-hover)}.dmg-memory[data-selected=true]{background:linear-gradient(90deg,color-mix(in srgb,var(--mg-accent) 12%,var(--dsw-alias-interactive-bg-active)),var(--dsw-alias-interactive-bg-active))}.dmg-memory-bar{border-radius:999px;background:var(--mg-accent)}.dmg-memory-bar.quarantined{background:var(--mg-warning)}.dmg-memory-bar.archived{background:var(--dsw-alias-label-tertiary)}.dmg-memory-title{display:block;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px;line-height:17px;font-weight:580}.dmg-memory-meta{display:flex;gap:7px;align-items:center;margin-top:6px;color:var(--dsw-alias-label-tertiary);font:500 9px/13px "Fira Code",monospace}.dmg-memory-score{padding:3px 6px;border-radius:999px;background:color-mix(in srgb,var(--mg-accent) 10%,var(--dsw-alias-bg-layer-2));color:var(--mg-accent);font:600 9px/13px "Fira Code",monospace}.dmg-star{color:var(--mg-warning)}
.dmg-detail{padding:18px}.dmg-detail-empty,.dmg-empty{display:grid;place-items:center;align-content:center;min-height:280px;padding:28px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px}.dmg-empty-orb{display:grid;place-items:center;width:50px;height:50px;margin-bottom:12px;border-radius:17px;background:linear-gradient(145deg,color-mix(in srgb,var(--mg-accent) 15%,var(--dsw-alias-bg-layer-2)),color-mix(in srgb,var(--mg-accent-2) 8%,var(--dsw-alias-bg-layer-2)));color:var(--mg-accent)}.dmg-detail-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.dmg-status{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;background:color-mix(in srgb,var(--mg-accent) 10%,var(--dsw-alias-bg-layer-2));color:var(--mg-accent);font:600 9px/13px "Fira Code",monospace;text-transform:uppercase}.dmg-status.quarantined{color:var(--mg-warning);background:color-mix(in srgb,var(--mg-warning) 11%,var(--dsw-alias-bg-layer-2))}.dmg-status.archived{color:var(--dsw-alias-label-secondary)}.dmg-detail-content{margin:17px 0 0;font-size:15px;line-height:24px;font-weight:570;overflow-wrap:anywhere}.dmg-key{margin-top:9px;color:var(--mg-accent-2);font:500 10px/16px "Fira Code",monospace}.dmg-tag-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}.dmg-tag{padding:3px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;color:var(--dsw-alias-label-secondary);font-size:9px}.dmg-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 20px;margin-top:20px;padding-top:17px;border-top:1px solid var(--dsw-alias-border-l1)}.dmg-kv-label{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px}.dmg-kv-value{margin-top:3px;font-size:10px;line-height:16px;overflow-wrap:anywhere}.dmg-detail-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:19px}.dmg-risk{margin-top:17px;padding:10px 11px;border:1px solid color-mix(in srgb,var(--mg-warning) 25%,var(--dsw-alias-border-l1));border-radius:10px;background:color-mix(in srgb,var(--mg-warning) 6%,transparent);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:16px}
.dmg-search-card{padding:20px;border:1px solid var(--dsw-alias-border-l1);border-radius:15px;background:linear-gradient(145deg,color-mix(in srgb,var(--mg-accent-2) 7%,var(--mg-panel)),var(--mg-panel))}.dmg-search-title{font-size:16px;font-weight:700}.dmg-search-copy{margin-top:5px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px}.dmg-search-form{display:grid;grid-template-columns:minmax(200px,1fr) 120px auto;gap:8px;margin-top:16px}.dmg-field,.dmg-select,.dmg-textarea{width:100%;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.dmg-field,.dmg-select{min-height:42px;padding:0 11px}.dmg-textarea{min-height:112px;padding:10px 11px;resize:vertical;line-height:19px}.dmg-field::placeholder,.dmg-textarea::placeholder{color:var(--dsw-alias-label-tertiary)}.dmg-results{display:grid;gap:9px;margin-top:12px}.dmg-result{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:12px;align-items:start;padding:13px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--mg-panel)}.dmg-score-ring{--score:0;width:48px;height:48px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(var(--mg-accent-2) calc(var(--score)*1%),var(--dsw-alias-bg-layer-2) 0);position:relative}.dmg-score-ring:before{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--mg-panel)}.dmg-score-ring span{position:relative;font:650 9px/1 "Fira Code",monospace}.dmg-result-content{font-size:11px;line-height:18px}.dmg-result-why{margin-top:5px;color:var(--dsw-alias-label-tertiary);font:500 9px/14px "Fira Code",monospace}.dmg-budget{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;color:var(--dsw-alias-label-secondary);font-size:10px}.dmg-budget-track{height:5px;flex:1;overflow:hidden;border-radius:999px;background:var(--dsw-alias-bg-layer-2)}.dmg-budget-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--mg-accent),var(--mg-accent-2))}
.dmg-audit{display:grid;gap:0}.dmg-audit-row{display:grid;grid-template-columns:115px 150px minmax(0,1fr);gap:12px;padding:11px 13px;border-top:1px solid var(--dsw-alias-border-l1);align-items:center}.dmg-audit-row:first-child{border-top:0}.dmg-audit-time{color:var(--dsw-alias-label-tertiary);font:500 9px/14px "Fira Code",monospace}.dmg-audit-action{font-size:10px;font-weight:650}.dmg-audit-detail{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font:500 9px/14px "Fira Code",monospace}
.dmg-error,.dmg-toast{padding:11px 13px;border-radius:10px;font-size:11px;line-height:17px}.dmg-error{border:1px solid color-mix(in srgb,var(--mg-danger) 35%,transparent);background:color-mix(in srgb,var(--mg-danger) 7%,transparent);color:var(--mg-danger)}.dmg-toast{position:fixed;right:24px;bottom:24px;z-index:50;max-width:340px;border:1px solid color-mix(in srgb,var(--mg-accent) 35%,var(--dsw-alias-border-l1));background:var(--dsw-alias-bg-layer-1);box-shadow:0 18px 52px color-mix(in srgb,#000 22%,transparent);color:var(--dsw-alias-label-primary)}
.dmg-modal-backdrop{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:18px;background:color-mix(in srgb,#020617 58%,transparent);backdrop-filter:blur(8px)}.dmg-modal{width:min(570px,100%);max-height:min(720px,calc(100vh - 36px));overflow:auto;border:1px solid color-mix(in srgb,var(--mg-accent) 22%,var(--dsw-alias-border-l1));border-radius:18px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 28px 90px color-mix(in srgb,#000 36%,transparent)}.dmg-modal-head{display:flex;justify-content:space-between;gap:12px;padding:18px 19px;border-bottom:1px solid var(--dsw-alias-border-l1)}.dmg-modal-title{font-size:15px;font-weight:700}.dmg-modal-copy{margin-top:3px;color:var(--dsw-alias-label-secondary);font-size:10px}.dmg-close{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}.dmg-form{display:grid;gap:13px;padding:18px 19px}.dmg-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.dmg-label{display:grid;gap:6px;color:var(--dsw-alias-label-secondary);font-size:10px}.dmg-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:3px}
.dmg-foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:0 3px;color:var(--dsw-alias-label-tertiary);font:500 9px/14px "Fira Code",ui-monospace,monospace}
@media(max-width:1050px){.dmg-hero{grid-template-columns:1fr}.dmg-grid{grid-template-columns:minmax(250px,.8fr) minmax(340px,1.2fr)}}
@media(max-width:760px){.dmg-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.dmg-grid{grid-template-columns:1fr}.dmg-memory-list{max-height:360px}.dmg-search-form{grid-template-columns:1fr}.dmg-audit-row{grid-template-columns:100px 1fr}.dmg-audit-detail{grid-column:1/-1}.dmg-kv{grid-template-columns:1fr}}
@media(max-width:480px){.dmg-actions{width:100%}.dmg-button{flex:1}.dmg-health{align-items:flex-start}.dmg-ring{width:76px;height:76px}.dmg-form-grid{grid-template-columns:1fr}.dmg-modal-backdrop{padding:8px}.dmg-result{grid-template-columns:48px minmax(0,1fr)}.dmg-result>.dmg-memory-score{grid-column:2}}
@container(max-width:760px){.dmg-hero{grid-template-columns:1fr}.dmg-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.dmg-grid{grid-template-columns:1fr}.dmg-memory-list{max-height:340px}.dmg-search-form{grid-template-columns:1fr}.dmg-audit-row{grid-template-columns:100px 1fr}.dmg-audit-detail{grid-column:1/-1}.dmg-kv{grid-template-columns:1fr}.dmg-panel-head{align-items:flex-start;flex-wrap:wrap}}
@container(max-width:470px){.dmg-actions{width:100%}.dmg-button{flex:1}.dmg-health{align-items:flex-start}.dmg-ring{width:76px;height:76px}.dmg-form-grid{grid-template-columns:1fr}.dmg-result{grid-template-columns:48px minmax(0,1fr)}.dmg-result>.dmg-memory-score{grid-column:2}}
@media(prefers-reduced-motion:reduce){.dmg-shell *{scroll-behavior:auto!important;transition:none!important}}
`

    const paths = {
      brain: ['M9.5 4.5A3.5 3.5 0 0 0 6 8v.3A3.2 3.2 0 0 0 4 11.2c0 1 .45 1.9 1.2 2.5A3.5 3.5 0 0 0 8.5 18H10V6.2c0-.9.7-1.7 1.6-1.7h.1', 'M14.5 4.5A3.5 3.5 0 0 1 18 8v.3a3.2 3.2 0 0 1 2 2.9c0 1-.45 1.9-1.2 2.5a3.5 3.5 0 0 1-3.3 4.3H14V6.2c0-.9-.7-1.7-1.6-1.7h-.1', 'M6 8.3c1.2-.2 2.3.2 3 1M18 8.3c-1.2-.2-2.3.2-3 1M5.2 13.7c1.2-.4 2.5 0 3.3.9M18.8 13.7c-1.2-.4-2.5 0-3.3.9'],
      plus: ['M12 5v14M5 12h14'],
      download: ['M12 3v12m0 0 4-4m-4 4-4-4M5 19h14'],
      vault: ['M4 7h16v13H4zM7 7V4h10v3M9 12h6M12 10v4'],
      search: ['m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'],
      shield: ['M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Zm-3 9 2 2 4-5'],
      activity: ['M4 13h3l2-7 4 12 2-7h5'],
      archive: ['M4 7h16M6 7v13h12V7M9 11h6M5 3h14v4H5z'],
      restore: ['M4 12a8 8 0 1 0 2.3-5.7L4 9M4 4v5h5'],
      check: ['m5 12 4 4L19 6'],
      x: ['M6 6l12 12M18 6 6 18'],
      pin: ['m9 4 6 6-2 2 4 4-1 1-4-4-2 2-6-6 2-2 3 3 2-2Z'],
      history: ['M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2'],
      lock: ['M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3'],
      spark: ['m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z'],
    }

    function Icon({ name, size = 16 }) {
      return h('svg', { className: 'dmg-icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        ...(paths[name] || []).map((d, index) => h('path', { key: index, d })),
      )
    }

    function formatNumber(value) { return new Intl.NumberFormat().format(Number(value) || 0) }
    function shortId(value) { const text = String(value || '-'); return text.length > 18 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text }
    function formatTime(value) { if (!value) return '-'; try { return new Date(value).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '-' } }
    function categoryLabel(value) { return ({ preference: '偏好', fact: '事实', instruction: '指令', project: '项目', relationship: '关系', experience: '经验', other: '其他' })[value] || value }
    function statusLabel(value) { return ({ active: 'Active', quarantined: 'Review', archived: 'Archived' })[value] || value }

    async function request(path, options = {}) {
      const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, ...options })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw Object.assign(new Error(body.message || 'HTTP ' + response.status), { status: response.status })
      return body
    }

    function Button({ children, icon, kind = '', ...props }) {
      return h('button', { type: 'button', className: `dmg-button ${kind}`.trim(), ...props }, icon ? h(Icon, { name: icon }) : null, children)
    }

    function Metric({ icon, label, value, hint, color }) {
      return h('div', { className: 'dmg-metric', style: { '--metric-color': color } },
        h('div', { className: 'dmg-metric-top' }, h(Icon, { name: icon }), h('span', { className: 'dmg-metric-hint' }, hint)),
        h('div', { className: 'dmg-metric-value' }, formatNumber(value)),
        h('div', { className: 'dmg-metric-label' }, label),
      )
    }

    function HealthCard({ metrics }) {
      const health = Number(metrics.health) || 0
      const title = health >= 90 ? '记忆库状态优秀' : health >= 70 ? '有少量记忆待审核' : '需要处理冲突和风险'
      const copy = metrics.quarantined > 0 ? `${metrics.quarantined} 条记忆被隔离，不会进入模型上下文。` : '没有未处理冲突，敏感内容拦截策略正常。'
      return h('div', { className: 'dmg-health' },
        h('div', { className: 'dmg-ring', style: { '--value': health }, 'aria-label': `Memory health ${health} percent` }, h('span', { className: 'dmg-ring-value' }, health)),
        h('div', null,
          h('div', { className: 'dmg-health-label' }, 'Memory health'),
          h('div', { className: 'dmg-health-title' }, title),
          h('div', { className: 'dmg-health-copy' }, copy),
        ),
      )
    }

    function MemoryList({ memories, selectedId, onSelect, empty }) {
      if (memories.length === 0) return h('div', { className: 'dmg-empty' }, h('div', { className: 'dmg-empty-orb' }, h(Icon, { name: 'brain', size: 24 })), empty)
      return h('div', { className: 'dmg-memory-list' }, ...memories.map(memory => h('button', {
        key: memory.id, type: 'button', className: 'dmg-memory', 'data-selected': memory.id === selectedId ? 'true' : 'false', onClick: () => onSelect(memory.id),
      },
      h('span', { className: `dmg-memory-bar ${memory.status}` }),
      h('span', { style: { minWidth: 0 } },
        h('span', { className: 'dmg-memory-title' }, memory.content),
        h('span', { className: 'dmg-memory-meta' }, h('span', null, categoryLabel(memory.category)), h('span', null, memory.scope.kind), h('span', null, `I${memory.importance}`)),
      ),
      h('span', null, memory.pinned ? h('span', { className: 'dmg-star', title: 'Pinned' }, h(Icon, { name: 'pin' })) : null),
      )))
    }


    function ProjectPicker({ projects = [], value, onChange, id, disabled = false }) {
      return h('label', { className: 'dmg-label', style: { gridColumn: '1 / -1' } }, '项目目录',
        h('input', { className: 'dmg-field', list: id, value, onChange: event => onChange(event.target.value), placeholder: '选择已有项目，或输入绝对目录', required: true, disabled, 'aria-label': 'Project directory' }),
        h('datalist', { id }, ...projects.map(project => h('option', { key: project.key, value: project.key }, project.label))),
      )
    }

    function ProjectBinding({ memory, projects, busy, mutate }) {
      const [projectKey, setProjectKey] = useState('')
      useEffect(() => setProjectKey(''), [memory.id])
      return h('form', { className: 'dmg-risk', onSubmit: event => {
        event.preventDefault()
        if (projectKey.trim()) mutate('update', memory.id, { scope: { kind: 'project', key: projectKey.trim() } })
      } },
        h('p', null, '这条旧记忆尚未绑定项目，暂不参与召回。请选择所属目录；绑定后会重新检查冲突。'),
        h(ProjectPicker, { projects, value: projectKey, onChange: setProjectKey, id: 'bind-project-' + memory.id, disabled: busy }),
        h(Button, { type: 'submit', disabled: busy || !projectKey.trim() }, '绑定项目'),
      )
    }

    function ReviewActions({ memory, busy, mutate }) {
      const approve = resolution => mutate('approve', memory.id, undefined, { resolution, expectedToken: memory.reviewToken })
      const disabled = busy || memory.needsProjectBinding
      return h('div', { className: 'dmg-detail-actions' },
        memory.conflictsWith?.length
          ? h(React.Fragment, null,
            h(Button, { kind: 'primary', icon: 'check', disabled, onClick: () => approve('replace') }, '替代旧记录'),
            h(Button, { disabled, onClick: () => approve('coexist') }, '同时保留'))
          : h(Button, { kind: 'primary', icon: 'check', disabled, onClick: () => approve() }, '批准使用'),
        h(Button, { kind: 'danger', icon: 'x', disabled: busy, onClick: () => mutate('reject', memory.id) }, '拒绝'),
      )
    }

    function ConflictPreview({ memory, memories }) {
      if (!memory.conflictsWith?.length) return null
      return h('div', { className: 'dmg-risk' },
        h('strong', null, '同一作用域、同一 key 的现有记录：'),
        ...memory.conflictsWith.map(id => h('p', { key: id }, memories.find(item => item.id === id)?.content || id)),
        h('p', null, '替代：归档以上旧记录，新记录生效。同时保留：作为同主题备选一起召回，适用条件由你确认。'),
      )
    }

    function MemoryDetail({ memory, memories, projects, busy, mutate }) {
      if (!memory) return h('div', { className: 'dmg-detail-empty' }, h('div', { className: 'dmg-empty-orb' }, h(Icon, { name: 'vault', size: 24 })), '选择一条记忆查看来源、作用域和治理状态。')
      const risk = [...(memory.risk?.reasons || []), ...(memory.conflictsWith?.length ? [`与 ${memory.conflictsWith.length} 条现有记忆冲突`] : [])]
      return h('div', { className: 'dmg-detail' },
        h('div', { className: 'dmg-detail-top' },
          h('span', { className: `dmg-status ${memory.status}` }, h(Icon, { name: memory.status === 'active' ? 'check' : memory.status === 'quarantined' ? 'shield' : 'archive', size: 13 }), statusLabel(memory.status)),
          h('span', { className: 'dmg-panel-note' }, `#${shortId(memory.id)}`),
        ),
        h('div', { className: 'dmg-detail-content' }, memory.content),
        memory.key ? h('div', { className: 'dmg-key' }, memory.key) : null,
        h('div', { className: 'dmg-tag-row' }, ...(memory.tags?.length ? memory.tags : ['untagged']).map(tag => h('span', { className: 'dmg-tag', key: tag }, tag))),
        risk.length ? h('div', { className: 'dmg-risk' }, h('strong', null, '治理提示：'), ' ', risk.join('；')) : null,
        memory.needsProjectBinding ? h(ProjectBinding, { memory, projects, busy, mutate }) : null,
        h(ConflictPreview, { memory, memories }),
        memory.coexistsWith?.length ? h('div', { className: 'dmg-risk' }, '已批准与 ' + memory.coexistsWith.length + ' 条同主题记录并存。') : null,
        memory.status === 'quarantined' ? h(ReviewActions, { memory, busy, mutate }) : null,
        h('div', { className: 'dmg-kv' },
          h('div', null, h('div', { className: 'dmg-kv-label' }, 'Scope'), h('div', { className: 'dmg-kv-value' }, `${memory.scope.kind} · ${memory.scope.key}`)),
          h('div', null, h('div', { className: 'dmg-kv-label' }, 'Source'), h('div', { className: 'dmg-kv-value' }, `${memory.source.kind}${memory.source.sessionId ? ` · ${shortId(memory.source.sessionId)}` : ''}`)),
          h('div', null, h('div', { className: 'dmg-kv-label' }, 'Created'), h('div', { className: 'dmg-kv-value' }, formatTime(memory.createdAt))),
          h('div', null, h('div', { className: 'dmg-kv-label' }, 'Last recalled'), h('div', { className: 'dmg-kv-value' }, `${formatTime(memory.lastAccessedAt)} · ${memory.recallCount} times`)),
        ),
        h('div', { className: 'dmg-detail-actions' },
          memory.status === 'archived' ? h(Button, { icon: 'restore', disabled: busy, onClick: () => mutate('restore', memory.id) }, '恢复') : h(Button, { icon: 'archive', disabled: busy, onClick: () => mutate('archive', memory.id) }, '归档'),
          memory.status !== 'archived' ? h(Button, { icon: 'pin', disabled: busy, onClick: () => mutate('update', memory.id, { pinned: !memory.pinned }) }, memory.pinned ? '取消固定' : '固定') : null,
        ),
      )
    }

    function Vault({ memories, projects, selectedId, setSelectedId, status, setStatus, busy, mutate }) {
      const visible = memories.filter(item => status === 'all' || item.status === status)
      const selected = memories.find(item => item.id === selectedId) || visible[0] || null
      useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id) }, [status, memories.length])
      return h('div', { className: 'dmg-grid' },
        h('section', { className: 'dmg-panel' },
          h('div', { className: 'dmg-panel-head' },
            h('div', null, h('div', { className: 'dmg-panel-title' }, 'Memory Vault'), h('div', { className: 'dmg-panel-note' }, `${visible.length} visible`)),
            h('div', { className: 'dmg-filter-row' }, ...['all', 'active', 'quarantined', 'archived'].map(value => h('button', { key: value, type: 'button', className: 'dmg-chip', 'data-active': status === value ? 'true' : 'false', onClick: () => setStatus(value) }, value === 'all' ? '全部' : statusLabel(value)))),
          ),
          h(MemoryList, { memories: visible, selectedId: selected?.id, onSelect: setSelectedId, empty: status === 'all' ? '还没有长期记忆。添加第一条，或在会话中说“记住：……”' : '当前筛选条件下没有记忆。' }),
        ),
        h('section', { className: 'dmg-panel' }, h(MemoryDetail, { memory: selected, memories, projects, busy, mutate })),
      )
    }

    function RecallLab({ policy, projects, projectKey, setProjectKey, notify }) {
      const [query, setQuery] = useState('')
      const [scope, setScope] = useState('global')
      const [result, setResult] = useState(null)
      const [loading, setLoading] = useState(false)
      const run = async event => {
        event?.preventDefault()
        if (!query.trim() || (scope === 'project' && !projectKey.trim())) return
        setLoading(true)
        try { setResult(await request(SEARCH_PATH, { method: 'POST', body: JSON.stringify({ query, scope: { kind: scope, key: scope === 'global' ? '*' : projectKey.trim() } }) })) }
        catch (error) { notify(error.message, true) }
        finally { setLoading(false) }
      }
      const used = result?.usedChars || 0
      const budget = result?.budgetChars || policy.maxRecallChars || 1
      return h(React.Fragment, null,
        h('section', { className: 'dmg-search-card' },
          h('div', { className: 'dmg-search-title' }, 'Recall Lab'),
          h('div', { className: 'dmg-search-copy' }, '模拟模型召回，查看命中理由、排序分数和上下文预算。只有 Active 记忆会出现在结果中。'),
          h('form', { className: 'dmg-search-form', onSubmit: run },
            h('input', { className: 'dmg-field', value: query, onChange: event => { setQuery(event.target.value); setResult(null) }, placeholder: '例如：我偏好的开发语言和编辑器', 'aria-label': 'Recall query' }),
            h('select', { className: 'dmg-select', value: scope, onChange: event => { setScope(event.target.value); setResult(null) }, 'aria-label': 'Recall scope', disabled: loading }, h('option', { value: 'global' }, 'Global'), h('option', { value: 'project' }, 'Project')), 
            h(Button, { kind: 'primary', icon: 'search', disabled: loading || !query.trim() || (scope === 'project' && !projectKey.trim()), type: 'submit' }, loading ? '检索中…' : '运行召回'),
            scope === 'project' ? h(ProjectPicker, { projects, value: projectKey, onChange: value => { setProjectKey(value); setResult(null) }, id: 'recall-project', disabled: loading }) : null,
          ),
          result ? h('div', { className: 'dmg-budget' }, h('span', null, `${formatNumber(used)} / ${formatNumber(budget)} chars · ≈ ${formatNumber(result.estimatedTokens)} tokens`), h('div', { className: 'dmg-budget-track' }, h('div', { className: 'dmg-budget-fill', style: { width: `${Math.min(100, used / budget * 100)}%` } })), h('span', null, `${result.items.length} selected`)) : null,
        ),
        ...(result?.warnings || []).map((warning, index) => h('div', { className: 'dmg-risk', key: 'warning-' + index }, warning.message)),
        ...(result?.coexistenceGroups || []).map((group, index) => h('div', { className: 'dmg-risk', key: 'group-' + index }, group.key + '：' + (group.approved ? '已批准并存' : '旧版本遗留的同主题多条记录，尚未确认并存') + '；不可仅按时间选择其中一条。')),
        result ? h('div', { className: 'dmg-results' }, ...(result.items.length ? result.items.map(item => h('div', { className: 'dmg-result', key: item.id },
          h('div', { className: 'dmg-score-ring', title: '排序分数，不代表准确率', style: { '--score': Math.round(item.score * 100) } }, h('span', null, Number(item.score).toFixed(2))),
          h('div', null, h('div', { className: 'dmg-result-content' }, item.content), item.includedAsAlternative ? h('div', { className: 'dmg-result-why' }, '同主题备选，随相关记录一起返回') : null, h('div', { className: 'dmg-result-why' }, `${item.category} · importance ${item.importance} · ${item.scope.kind} · ${item.estimatedTokens} tokens`)),
          h('span', { className: 'dmg-memory-score' }, shortId(item.id)),
        )) : [h('div', { className: 'dmg-empty dmg-panel', key: 'empty' }, h('div', { className: 'dmg-empty-orb' }, h(Icon, { name: 'search', size: 23 })), '没有找到达到相关性阈值的 Active 记忆。')] )) : null,
      )
    }

    function ReviewQueue({ memories, projects, busy, mutate }) {
      const review = memories.filter(item => item.status === 'quarantined')
      return h('section', { className: 'dmg-panel' },
        h('div', { className: 'dmg-panel-head' }, h('div', null, h('div', { className: 'dmg-panel-title' }, 'Review Queue'), h('div', { className: 'dmg-panel-note' }, 'PII and conflicts never enter recall before approval')), h('span', { className: 'dmg-status quarantined' }, `${review.length} pending`)),
        review.length ? h('div', { className: 'dmg-results', style: { padding: '10px', marginTop: 0 } }, ...review.map(memory => h('div', { className: 'dmg-result', key: memory.id },
          h('div', { className: 'dmg-empty-orb', style: { width: '46px', height: '46px', margin: 0, color: 'var(--mg-warning)' } }, h(Icon, { name: 'shield', size: 21 })),
          h('div', null, h('div', { className: 'dmg-result-content' }, memory.content), h('div', { className: 'dmg-result-why' }, [...(memory.risk?.reasons || []), ...(memory.conflictsWith?.length ? ['semantic-key-conflict'] : [])].join(' · ') || 'manual-review')),
          h('div', { style: { gridColumn: '2 / -1' } }, h(ConflictPreview, { memory, memories }), memory.needsProjectBinding ? h(ProjectBinding, { memory, projects, busy, mutate }) : null, h(ReviewActions, { memory, busy, mutate })),
        ))) : h('div', { className: 'dmg-empty' }, h('div', { className: 'dmg-empty-orb' }, h(Icon, { name: 'check', size: 24 })), '审核队列为空。所有可召回记忆都已通过治理检查。'),
      )
    }

    function AuditLog({ audit }) {
      return h('section', { className: 'dmg-panel' },
        h('div', { className: 'dmg-panel-head' }, h('div', null, h('div', { className: 'dmg-panel-title' }, 'Privacy Ledger'), h('div', { className: 'dmg-panel-note' }, 'append-style governance trail · no raw search queries'))),
        audit.length ? h('div', { className: 'dmg-audit' }, ...audit.map(item => h('div', { className: 'dmg-audit-row', key: item.id }, h('span', { className: 'dmg-audit-time' }, formatTime(item.at)), h('span', { className: 'dmg-audit-action' }, item.action), h('span', { className: 'dmg-audit-detail' }, item.memoryId || item.queryFingerprint || item.fingerprint || '-')))) : h('div', { className: 'dmg-empty' }, '还没有治理事件。'),
      )
    }

    function AddModal({ onClose, onSave, projects, projectKey, setProjectKey, busy }) {
      const [content, setContent] = useState('')
      const [key, setKey] = useState('')
      const [category, setCategory] = useState('preference')
      const [scope, setScope] = useState('global')
      const [importance, setImportance] = useState(3)
      const submit = event => { event.preventDefault(); if (content.trim() && (scope !== 'project' || projectKey.trim())) onSave({ content, key, category, importance: Number(importance), scope: { kind: scope, key: scope === 'global' ? '*' : projectKey.trim() }, source: { kind: 'dashboard' } }) }
      return h('div', { className: 'dmg-modal-backdrop', role: 'presentation', onMouseDown: event => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'dmg-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dmg-add-title' },
          h('div', { className: 'dmg-modal-head' }, h('div', null, h('div', { className: 'dmg-modal-title', id: 'dmg-add-title' }, '添加治理记忆'), h('div', { className: 'dmg-modal-copy' }, '敏感凭据会在写入磁盘前被拒绝；个人信息默认进入审核队列。')), h('button', { type: 'button', className: 'dmg-close', onClick: onClose, 'aria-label': 'Close dialog' }, h(Icon, { name: 'x' }))),
          h('form', { className: 'dmg-form', onSubmit: submit },
            h('label', { className: 'dmg-label' }, 'Memory content', h('textarea', { className: 'dmg-textarea', value: content, onChange: event => setContent(event.target.value), placeholder: '写下一条可以在未来会话继续使用的事实、偏好或项目决策。', autoFocus: true, required: true, maxLength: 8000 })),
            h('label', { className: 'dmg-label' }, 'Semantic key（可选，用于发现新旧冲突）', h('input', { className: 'dmg-field', value: key, onChange: event => setKey(event.target.value), placeholder: 'preference.editor', maxLength: 160 })),
            h('div', { className: 'dmg-form-grid' },
              h('label', { className: 'dmg-label' }, 'Category', h('select', { className: 'dmg-select', value: category, onChange: event => setCategory(event.target.value) }, ...['preference', 'fact', 'instruction', 'project', 'relationship', 'experience', 'other'].map(value => h('option', { key: value, value }, categoryLabel(value))))),
              h('label', { className: 'dmg-label' }, 'Scope', h('select', { className: 'dmg-select', value: scope, onChange: event => setScope(event.target.value) }, h('option', { value: 'global' }, 'Global'), h('option', { value: 'project' }, 'Project'))),
              h('label', { className: 'dmg-label' }, 'Importance', h('select', { className: 'dmg-select', value: importance, onChange: event => setImportance(event.target.value) }, ...[1, 2, 3, 4, 5].map(value => h('option', { key: value, value }, `${value} / 5`)))),
            ),
            scope === 'project' ? h(ProjectPicker, { projects, value: projectKey, onChange: setProjectKey, id: 'add-project', disabled: busy }) : null,
            h('div', { className: 'dmg-form-actions' }, h(Button, { onClick: onClose, disabled: busy }, '取消'), h(Button, { kind: 'primary', icon: 'plus', type: 'submit', disabled: busy || !content.trim() || (scope === 'project' && !projectKey.trim()) }, busy ? '保存中…' : '安全保存')),
          ),
        ),
      )
    }

    function Dashboard() {
      const [snapshot, setSnapshot] = useState(null)
      const [error, setError] = useState('')
      const [tab, setTab] = useState('vault')
      const [status, setStatus] = useState('all')
      const [selectedId, setSelectedId] = useState('')
      const [adding, setAdding] = useState(false)
      const [busy, setBusy] = useState(false)
      const [toast, setToast] = useState(null)
      const [projectKey, setProjectKey] = useState('')

      const load = async () => {
        try { setSnapshot(await request(SNAPSHOT_PATH)); setError('') }
        catch (cause) { setError(cause.message) }
      }
      useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer) }, [])
      useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3200); return () => clearTimeout(timer) }, [toast])

      const notify = (message, isError = false) => setToast({ message, isError })
      const mutate = async (action, id, patch, review = {}) => {
        setBusy(true)
        try {
          const result = await request(MUTATE_PATH, { method: 'POST', body: JSON.stringify({ action, id, patch, ...review }) })
          notify(result.status === 'quarantined' ? '记录已保存，需在审核队列确认后才会召回。' : action === 'approve' ? '记忆已批准并进入召回池。' : action === 'archive' || action === 'reject' ? '记忆已归档，可随时恢复。' : action === 'restore' ? '记忆已恢复。' : '记忆已更新。')
          await load()
          return result
        } catch (cause) { if (cause.status === 409) await load(); notify(cause.message, true) }
        finally { setBusy(false) }
      }
      const save = async memory => {
        setBusy(true)
        try {
          const result = await request(MUTATE_PATH, { method: 'POST', body: JSON.stringify({ action: 'remember', memory }) })
          if (result.outcome === 'blocked') notify(`未保存：检测到 ${result.reasons.join(', ')}`, true)
          else { notify(result.status === 'quarantined' ? '已保存到审核队列，不会自动召回。' : result.outcome === 'duplicate' ? '已有等价记忆，本次已自动去重。' : '记忆已安全保存。'); setAdding(false); setSelectedId(result.id); await load() }
        } catch (cause) { notify(cause.message, true) }
        finally { setBusy(false) }
      }

      const metrics = snapshot?.metrics || { health: 100 }
      const memories = snapshot?.memories || []
      const projects = snapshot?.projects || []
      const tabs = [
        ['vault', 'vault', '记忆库', metrics.total],
        ['recall', 'search', '召回实验室', null],
        ['review', 'shield', '审核队列', metrics.quarantined],
        ['audit', 'history', '隐私账本', snapshot?.audit?.length],
      ]

      return h(React.Fragment, null,
        h('style', null, CSS),
        h('div', { className: 'dmg-shell' },
          h('div', { className: 'dmg-aurora', 'aria-hidden': 'true' }),
          h('header', { className: 'dmg-header' },
            h('div', { className: 'dmg-brand' },
              h('div', { className: 'dmg-logo' }, h(Icon, { name: 'brain', size: 23 })),
              h('div', null, h('div', { className: 'dmg-kicker' }, h('span', { className: 'dmg-pulse' }), 'Memory governance online'), h('h2', { className: 'dmg-title' }, 'Memory Guardian'), h('p', { className: 'dmg-subtitle' }, '长期记忆的隐私防线、冲突检测与上下文预算控制')), 
            ),
            h('div', { className: 'dmg-actions' }, h('a', { className: 'dmg-button', href: EXPORT_PATH, download: true }, h(Icon, { name: 'download' }), '导出'), h(Button, { kind: 'primary', icon: 'plus', onClick: () => setAdding(true) }, '添加记忆')),
          ),
          error ? h('div', { className: 'dmg-error' }, `Memory Guardian API 不可用：${error}`) : null,
          h('section', { className: 'dmg-hero' },
            h(HealthCard, { metrics }),
            h('div', { className: 'dmg-metrics' },
              h(Metric, { icon: 'vault', label: 'Active memories', value: metrics.active, hint: `${metrics.pinned || 0} pinned`, color: 'var(--mg-accent)' }),
              h(Metric, { icon: 'shield', label: 'Review queue', value: metrics.quarantined, hint: `${metrics.conflicts || 0} conflicts`, color: 'var(--mg-warning)' }),
              h(Metric, { icon: 'activity', label: 'Governed recalls', value: metrics.recalls, hint: `≤ ${snapshot?.policy?.maxRecallChars || 0} chars`, color: 'var(--mg-accent-2)' }),
              h(Metric, { icon: 'lock', label: 'Secrets blocked', value: metrics.blockedAttempts, hint: 'before disk', color: 'var(--mg-danger)' }),
            ),
          ),
          h('nav', { className: 'dmg-tabs', 'aria-label': 'Memory Guardian sections' }, ...tabs.map(([value, icon, label, count]) => h('button', { key: value, type: 'button', className: 'dmg-tab', 'data-active': tab === value ? 'true' : 'false', onClick: () => setTab(value) }, h(Icon, { name: icon }), label, count !== null && count !== undefined ? h('span', { className: 'dmg-tab-count' }, count) : null))),
          metrics.unboundProjects ? h('div', { className: 'dmg-risk' }, metrics.unboundProjects + ' 条旧项目记忆待绑定目录，目前不参与召回。请在记忆详情中处理。') : null,
          h('main', { className: 'dmg-content' },
            tab === 'vault' ? h(Vault, { memories, projects, selectedId, setSelectedId, status, setStatus, busy, mutate }) : null,
            tab === 'recall' ? h(RecallLab, { policy: snapshot?.policy || {}, projects, projectKey, setProjectKey, notify }) : null,
            tab === 'review' ? h(ReviewQueue, { memories, projects, busy, mutate }) : null,
            tab === 'audit' ? h(AuditLog, { audit: snapshot?.audit || [] }) : null,
          ),
          h('footer', { className: 'dmg-foot' }, h('span', null, 'LOCAL-FIRST · NO NETWORK · SECRET REJECTION BEFORE PERSISTENCE'), h('span', null, snapshot ? `v${snapshot.pluginVersion} · revision ${snapshot.revision} · ${formatTime(snapshot.generatedAt)}` : 'connecting…')),
        ),
        adding ? h(AddModal, { onClose: () => setAdding(false), onSave: save, projects, projectKey, setProjectKey, busy }) : null,
        toast ? h('div', { className: 'dmg-toast', role: 'status', style: toast.isError ? { borderColor: 'color-mix(in srgb,var(--mg-danger) 45%,transparent)' } : undefined }, toast.message) : null,
      )
    }

    exports.name = 'dsh-memory-guardian-client'
    exports.inject = ['slots']
    exports.apply = function apply(ctx) {
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'memory-guardian',
        order: 93,
        label: () => 'Memory Guardian',
      }, Dashboard))
    }

    return module.exports
  },
})
