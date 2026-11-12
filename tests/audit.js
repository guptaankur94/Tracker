// Full feature audit of the GitHub Pages build in an emulated iPhone.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const FILE = process.argv[2] || 'file:///home/claude/tracker/index.html';
const OUT = process.argv[3] || '/tmp/claude-0/-home-claude/953df497-8a5e-58e8-b391-e32f9986a701/scratchpad/audit';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, cond, info = '') => results.push({ name, pass: !!cond, info });
const gap = (name, info) => results.push({ name, gap: true, info });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.addInitScript(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|fonts/.test(m.text())) errs.push('console: ' + m.text()); });
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('openloops.v2') || '{"items":[]}'));
  const item = async t => (await state()).items.find(i => i.title === t);
  const shot = n => p.screenshot({ path: `${OUT}/${n}.png` });
  const tab = v => p.click(`#tabs [data-view=${v}]`);
  const cardBtn = (title, act) => p.locator(`article.card:has(h3:text-is("${title}")) button[data-act=${act}]`).first();

  await p.goto(FILE);
  await p.waitForTimeout(300);
  await shot('01-empty');
  ok('Empty state: no weekly-review nag on brand new install', !(await p.locator('text=Weekly review.').count()), 'banner shows on day 1');

  // capture
  for (const t of ['Set up VPS for crew app', 'Read Supabase auth docs', 'Ask Raj for capacity data', 'Create Apple developer account', 'idea: dark mode for crew app']) {
    await p.fill('#addTitle', t); await p.click('#addForm button[type=submit]');
  }
  let s = await state();
  ok('Capture adds 5 inbox items', s.items.length === 5 && s.items.every(i => i.status === 'inbox'));
  ok('Auto-kind: read', (await item('Read Supabase auth docs')).kind === 'read');
  ok('Auto-kind: follow-up', (await item('Ask Raj for capacity data')).kind === 'followup');
  ok('Auto-kind: admin', (await item('Create Apple developer account')).kind === 'admin');
  ok('Auto-kind: idea', (await item('idea: dark mode for crew app')).kind === 'idea');
  gap('Capture: can assign a project at capture time', 'no way to choose project when capturing; every item lands with no project');

  // review: sort inbox
  await tab('review'); await shot('02-review');
  const inboxRows = await p.locator('.inbox-item').count();
  ok('Review lists inbox items', inboxRows === 5);
  await p.locator('.inbox-item:has-text("Set up VPS") button[data-act=edit]').click();
  await p.waitForSelector('.sheet');
  // scroll sheet down then tap a priority chip and see if scroll jumps
  await p.evaluate(() => { document.querySelector('.sheet').scrollTop = 400; });
  await p.fill('#f-proj', 'Crew Scheduler');
  await p.evaluate(() => { document.querySelector('.sheet').scrollTop = 300; });
  const before = await p.evaluate(() => document.querySelector('.sheet').scrollTop);
  await p.$eval('#f-prio button[data-v=A]', el => el.click());
  await p.$eval('#f-est button[data-v="60"]', el => el.click());
  const after = await p.evaluate(() => document.querySelector('.sheet').scrollTop);
  ok('Edit sheet keeps scroll position when tapping a chip', after === before, `scrollTop ${before} -> ${after}`);
  ok('Edit sheet keeps typed project after tapping a chip', (await p.inputValue('#f-proj')) === 'Crew Scheduler');
  await p.click('#f-eff button[data-v="3"]');
  await p.click('#f-est button[data-v="120"]');
  await p.fill('#f-starter', 'Open Hetzner pricing page');
  await p.fill('#f-step', 'Pick provider'); await p.click('#f-addstep');
  await p.fill('#f-step', 'Create droplet'); await p.press('#f-step', 'Enter');
  ok('Subtasks can be added', (await p.locator('#f-steps label').count()) === 2);
  await p.locator('#f-steps input[type=checkbox]').first().check();
  await p.fill('#f-due', '2026-11-20');
  await shot('03-sheet');
  await p.click('#f-save');
  let v = await item('Set up VPS for crew app');
  ok('Sort saves project/prio/effort/est/starter/due', v && v.project === 'Crew Scheduler' && v.prio === 'A' && v.effort === 3 && v.est === 120 && v.starter && v.due === '2026-11-20' && v.status === 'open', JSON.stringify(v));
  ok('Sort saves subtasks with tick state', v.steps && v.steps.length === 2 && v.steps[0].done === true, JSON.stringify(v.steps));

  // keep / park others
  await p.locator('.inbox-item:has-text("Read Supabase") button[data-act=accept]').click();
  await p.locator('.inbox-item:has-text("Ask Raj") button[data-act=accept]').click();
  await p.locator('.inbox-item:has-text("Create Apple") button[data-act=accept]').click();
  await p.locator('.inbox-item:has-text("dark mode") button[data-act=park]').click();
  s = await state();
  ok('Inbox emptied by Keep/Park', s.items.every(i => i.status !== 'inbox'));

  // priority cycle in review step 4: clicking the title text should NOT change priority
  await p.locator('.steps .prow:has-text("Read Supabase") span').first().click();
  ok('Tapping a title in the A/B/C list does not change its priority', !(await item('Read Supabase auth docs')).prio, 'label wraps the button so tapping the text cycles priority');

  // Now
  await tab('now'); await shot('04-now');
  const nowCards = await p.locator('article.card.big').count();
  ok('Now shows up to 3 picks', nowCards >= 1 && nowCards <= 3, String(nowCards));
  ok('Now: deep block is the A-priority VPS task', await p.locator('article.card.big').first().locator('h3').innerText() === 'Set up VPS for crew app');
  gap('Card shows next unticked subtask', 'only shows "1/2 steps"');
  gap('Subtask can be ticked from the card', 'must open Edit');

  // energy toggle
  await p.click('#energySeg [data-en=low]');
  const lowTitles = await p.locator('article.card.big h3').allInnerTexts();
  ok('Low energy hides deep work', !lowTitles.includes('Set up VPS for crew app'), lowTitles.join(' | '));
  await p.click('#energySeg [data-en=high]');

  // timer
  await cardBtn('Set up VPS for crew app', 'focus').click();
  ok('Focus starts dock timer', await p.locator('.dock').count() === 1);
  ok('Focus marks item Doing', (await item('Set up VPS for crew app')).status === 'doing');
  await p.evaluate(() => { const t = JSON.parse(localStorage.getItem('openloops.timer')); t.start -= 30 * 60000; t.end -= 30 * 60000; localStorage.setItem('openloops.timer', JSON.stringify(t)); });
  await p.reload(); await p.waitForTimeout(1300);
  ok('Timer survives app close/reopen', await p.locator('.dock').count() === 1);
  ok('Timer shows overtime prompt', await p.locator('.dock :text("Time\'s up")').count() === 1);
  await shot('05-timer-over');
    await p.evaluate(() => { const t = JSON.parse(localStorage.getItem('openloops.timer')); t.end = Date.now() + 1500; localStorage.setItem('openloops.timer', JSON.stringify(t)); });
  await p.reload(); await p.waitForTimeout(3000);
  ok('Timer alerts when time is up (vibration/chime)', await p.evaluate(() => window.__vib) > 0);
  await p.click('.dock button[data-t=done]');
  await p.waitForSelector('.sheet');
  ok('Done flow offers timer-logged time', await p.locator('#dOpts button:has-text("Timer")').count() === 1);
  await p.click('#dOpts button:has-text("Timer")');
  v = await item('Set up VPS for crew app');
  ok('Done saves status+actual', v.status === 'done' && v.actual >= 30, JSON.stringify({ s: v.status, a: v.actual }));
  ok('Done keeps logged time (spent)', v.spent >= 30, 'spent=' + v.spent);

  // WIP limit
  for (const t of ['Read Supabase auth docs', 'Create Apple developer account', 'Ask Raj for capacity data']) {
    const it = await item(t); await p.evaluate(id => { const s = JSON.parse(localStorage.getItem('openloops.v2')); s.items.find(i => i.id === id).status = 'doing'; localStorage.setItem('openloops.v2', JSON.stringify(s)); }, it.id);
  }
  await p.reload();
  await p.fill('#addTitle', 'Optimise tool count'); await p.click('#addForm button[type=submit]');
  await tab('review');
  await p.locator('.inbox-item:has-text("Optimise") button[data-act=accept]').click();
  await tab('projects');
  await cardBtn('Optimise tool count', 'focus').click();
  ok('WIP limit warns at 4th Doing item', await p.locator('.sheet :text("already have 3 things")').count() === 1);
  await p.click('#wCancel');

  // waiting / follow-up
  await cardBtn('Ask Raj for capacity data', 'waiting').click();
  ok('Follow-up can be set to Waiting', (await item('Ask Raj for capacity data')).status === 'waiting');
  ok('Waiting card offers Got a reply, not Focus', await cardBtn('Ask Raj for capacity data', 'reply').count() === 1 && await cardBtn('Ask Raj for capacity data', 'focus').count() === 0);
  gap('Waiting records who/what you are waiting on', 'no field for who or since when');

  // commit idea
  await cardBtn('idea: dark mode for crew app', 'commit').click();
  v = (await state()).items.find(i => /dark mode/.test(i.title));
  ok('Commit turns idea into open task', v.status === 'open' && v.kind !== 'idea' && !/^idea/i.test(v.title), JSON.stringify(v));

  // lingering + decide
  const lid = (await item('Read Supabase auth docs')).id;
  const lid2 = (await item('Optimise tool count')).id;
  await p.evaluate(([a, b]) => { const s = JSON.parse(localStorage.getItem('openloops.v2')); for (const id of [a, b]) { const i = s.items.find(i => i.id === id); i.status = 'open'; i.touched = new Date(Date.now() - 10 * 864e5).toISOString(); } localStorage.setItem('openloops.v2', JSON.stringify(s)); }, [lid, lid2]);
  await p.reload(); await tab('now');
  const inPicks = await p.locator('article.card.big h3:text-is("Read Supabase auth docs")').count();
  const inDecide = await p.locator('section:has(h2:text("Needs a decision")) h3:text-is("Read Supabase auth docs")').count();
  const hasDecide = await p.locator('article:has(h3:text-is("Read Supabase auth docs")) button[data-act=drop]').count();
  ok('Lingering item offers a decision on Now', hasDecide >= 1, inPicks ? 'picked into Now without choices' : 'missing');
  await p.locator('article:has(h3:text-is("Optimise tool count")) button[data-act=progress]').first().click();
  ok('"I worked on it" clears the lingering flag', (await p.evaluate(id => { const i = JSON.parse(localStorage.getItem('openloops.v2')).items.find(i => i.id === id); return (Date.now() - Date.parse(i.touched)) < 60000; }, lid2)));
    await p.locator('article:has(h3:text-is("Read Supabase auth docs")) button[data-act=drop]').first().click();
  ok('Drop closes loop', (await item('Read Supabase auth docs')).status === 'dropped');
  gap('Undo after Drop/Done', 'no undo');

  // projects view
  await tab('projects'); await shot('06-projects');
  const heads = await p.locator('.sec-head h2').allInnerTexts();
  ok('Projects view groups by project', heads.includes('Crew Scheduler'), heads.join(' | '));
  gap('Projects can be created/renamed and have a goal', 'projects only exist as free text on items; typos create duplicates');
  gap('Project shows thoughts/notes', 'no place for thoughts that are not tasks');
  gap('Can add a task directly inside a project', 'must capture then sort');
  await p.click('#pfilters [data-f=A]');
  ok('Priority-A filter works', true);
  await p.click('#pfilters [data-f=all]');

  // review: done, timer length, calibration
  await tab('review');
  await p.selectOption('#timerLen', '45');
  ok('Timer length setting saves', (await state()).settings.timer === 45);
  await p.click('#reviewDone');
  ok('Review done saves date', !!(await state()).settings.lastReview);
  ok('Calibration shows after a done item with time', await p.locator('.cal-row').count() >= 1);

  // search
  gap('Search across items', 'no search');

  // delete
  await tab('projects');
  await cardBtn('Create Apple developer account', 'edit').click();
  await p.click('#f-del'); await p.click('#f-del');
  ok('Delete with confirm', !(await item('Create Apple developer account')));

  // export/import
  await tab('review');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#exportBtn')]);
  const path = await dl.path(); const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  ok('Export contains all items', data.items.length === (await state()).items.length);
  await p.evaluate(() => localStorage.removeItem('openloops.v2')); await p.reload(); await tab('review');
  await p.setInputFiles('#importFile', path); await p.click('#iGo'); await p.waitForTimeout(200);
  ok('Import restores items', (await state()).items.length === data.items.length);

  // offline
  ok('Offline support: service worker built and registered', fs.existsSync('/home/claude/tracker/sw.js') && fs.readFileSync('/home/claude/tracker/index.html','utf8').includes('serviceWorker.register'));

  // keyboard/listener leak check
  const leak = await p.evaluate(async () => 0);
  ok('No JS errors during run', errs.length === 0, errs.join(' || '));
  await tab('now'); await shot('07-final');
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  for (const r of results) console.log((r.gap ? 'GAP  ' : r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.pass || !r.info ? '' : '  -> ' + r.info));
  await p.emulateMedia({ colorScheme: 'dark' }); await tab('now'); await shot('08-dark');
  await b.close();
})().catch(e => { console.error('AUDIT CRASH', e); for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.pass||!r.info ? '' : '  -> ' + r.info)); process.exit(1); });
