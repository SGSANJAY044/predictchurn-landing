const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Set data-tally-id on #form-slot in index.html to switch from the email fallback to the Tally form.
const slot = document.getElementById('form-slot');
const tallyId = slot.dataset.tallyId;

if (tallyId) {
  const params = 'alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';
  const frame = document.createElement('iframe');
  frame.title = 'PredictChurn waitlist form';
  frame.loading = 'lazy';
  frame.dataset.tallySrc = `https://tally.so/embed/${encodeURIComponent(tallyId)}?${params}`;
  slot.replaceChildren(frame);

  const script = document.createElement('script');
  script.src = 'https://tally.so/widgets/embed.js';
  script.onload = () => window.Tally?.loadEmbeds();
  document.body.appendChild(script);
}

// Hero parallax
const layers = [...document.querySelectorAll('[data-speed]')];
const hero = document.querySelector('.hero');
let ticking = false;

function paintParallax() {
  ticking = false;
  const y = window.scrollY;
  if (y > hero.offsetHeight) return;
  layers.forEach((el) => {
    el.style.transform = `translate3d(0, ${(y * Number(el.dataset.speed)).toFixed(1)}px, 0)`;
  });
}

if (!reduceMotion && window.matchMedia('(min-width: 981px)').matches) {
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(paintParallax);
    }
  }, { passive: true });
}

// Section reveals
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// Pinned account story
const storyStates = [
  { x: 0, score: 12, status: 'Healthy', tone: 'low' },
  { x: 260, score: 41, status: 'Drifting', tone: 'medium' },
  { x: 325, score: 82, status: 'High risk', tone: 'high' },
  { x: 390, score: 64, status: 'In progress', tone: 'medium' },
  { x: 520, score: 18, status: 'Recovered', tone: 'low' },
];
const story = document.getElementById('story');
const storySlides = [...document.querySelectorAll('.story-slide')];
const storyButtons = [...document.querySelectorAll('[data-go]')];
const storyFeed = [...document.querySelectorAll('.story-feed li')];
const storyMarks = [...document.querySelectorAll('.mark')];
const storyLine = document.getElementById('story-line');
const storyDot = document.getElementById('story-dot');
const storyRing = document.getElementById('story-ring');
const storyScore = document.getElementById('story-score');
const storyStatus = document.getElementById('story-status');
const storyLength = storyLine.getTotalLength();
const lastStep = storyStates.length - 1;
let storyIndex = -1;
let storyCurrent = 0;
let storyTarget = 0;
let storyFrame = 0;

function lengthAtX(x) {
  let low = 0;
  let high = storyLength;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (storyLine.getPointAtLength(mid).x < x) low = mid; else high = mid;
  }
  return high;
}
const storyAnchors = storyStates.map((state) => lengthAtX(state.x));
storyLine.style.strokeDasharray = `${storyLength} ${storyLength}`;

const between = (values, position) => {
  const from = Math.floor(position);
  const to = Math.min(from + 1, lastStep);
  return values[from] + (values[to] - values[from]) * (position - from);
};

// The line, dot and ring share one position, so the dot can never leave the path.
function drawStory(position) {
  const length = between(storyAnchors, position);
  storyLine.style.strokeDashoffset = storyLength - length;
  const point = storyLine.getPointAtLength(length);
  [storyDot, storyRing].forEach((circle) => {
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
  });
  storyScore.textContent = Math.round(between(storyStates.map((state) => state.score), position));
  storyButtons.forEach((button, i) => {
    const fill = i === 0 ? 1 : Math.min(1, Math.max(0, position - i + 1));
    button.querySelector('b').style.transform = `scaleX(${fill})`;
  });
  storyMarks.forEach((mark, i) => mark.classList.toggle('on', position >= i + 1 - 0.02));
  setStoryStep(Math.round(position));
}

function setStoryStep(index) {
  if (index === storyIndex) return;
  storyIndex = index;
  const state = storyStates[index];
  storySlides.forEach((slide, i) => slide.classList.toggle('active', i === index));
  storyButtons.forEach((button, i) => button.toggleAttribute('data-current', i === index));
  storyFeed.forEach((row, i) => {
    row.classList.toggle('on', i <= index);
    row.classList.toggle('now', i === index);
  });
  storyStatus.textContent = state.status;
  storyStatus.className = `tag ${state.tone}`;
}

function animateStory() {
  const gap = storyTarget - storyCurrent;
  storyCurrent = reduceMotion || Math.abs(gap) < 0.002 ? storyTarget : storyCurrent + gap * 0.14;
  drawStory(storyCurrent);
  storyFrame = storyCurrent === storyTarget ? 0 : requestAnimationFrame(animateStory);
}

function readStory() {
  const box = story.getBoundingClientRect();
  const travel = box.height - window.innerHeight;
  const raw = Math.min(1, Math.max(0, -box.top / travel)) * lastStep;
  const step = Math.min(Math.floor(raw), lastStep - 1);
  // Hold on each step for a moment, then glide to the next one.
  const t = Math.min(1, Math.max(0, (raw - step - 0.3) / 0.4));
  storyTarget = step + t * t * (3 - 2 * t);
  if (!storyFrame) storyFrame = requestAnimationFrame(animateStory);
}

storyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const travel = story.offsetHeight - window.innerHeight;
    const top = story.getBoundingClientRect().top + window.scrollY + travel * (Number(button.dataset.go) / lastStep);
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

window.addEventListener('scroll', readStory, { passive: true });
window.addEventListener('resize', readStory);
drawStory(0);
readStory();

// Hero load count-up, and pause its loops when it's off screen
if (!reduceMotion) {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const started = performance.now() + 620;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - started) / 900));
      const value = Math.round(end * (1 - (1 - t) ** 3));
      el.textContent = `${prefix}${value.toLocaleString('en-US')}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    el.textContent = `${prefix}0`;
    requestAnimationFrame(tick);
  });
}
new IntersectionObserver(([entry]) => {
  hero.classList.toggle('offscreen', !entry.isIntersecting);
}).observe(hero);

// Sample workspace
const signalNames = { usage: 'Core action drop', seats: 'Seat reduction', billing: 'Billing risk', rhythm: 'Off usual rhythm' };
const defaultWeights = {
  Scale: { usage: 45, seats: 35, billing: 5, rhythm: 15 },
  Growth: { usage: 40, seats: 20, billing: 15, rhythm: 25 },
  Starter: { usage: 30, seats: 5, billing: 30, rhythm: 35 },
};
const weights = structuredClone(defaultWeights);
const accounts = [
  { id: 'acme', name: 'Acme Freight', plan: 'Scale', mrr: 2400, owner: 'AK', why: 'Weekly report stopped after 11 weeks. Seats 18 → 12.', s: { usage: 0.95, seats: 0.8, billing: 0.1, rhythm: 0.7 } },
  { id: 'north', name: 'Sample Robotics', plan: 'Scale', mrr: 1850, owner: 'MR', why: 'Usage steady. One seat removed last month.', s: { usage: 0.1, seats: 0.3, billing: 0, rhythm: 0.1 } },
  { id: 'health', name: 'Example Health', plan: 'Growth', mrr: 890, owner: 'MR', why: 'Cancels at period end. Core action down 64%.', s: { usage: 0.85, seats: 0.45, billing: 0.9, rhythm: 0.75 } },
  { id: 'parcel', name: 'Demo Parcel', plan: 'Growth', mrr: 640, owner: 'AK', why: 'Card expires in 9 days. Usage is healthy.', s: { usage: 0.05, seats: 0, billing: 0.95, rhythm: 0.05 }, billing: true },
  { id: 'ledger', name: 'Sample Ledger', plan: 'Starter', mrr: 49, owner: '', why: 'Quiet for 16 days, normal for this account.', s: { usage: 0.25, seats: 0, billing: 0, rhythm: 0.1 } },
  { id: 'studio', name: 'Test Studio', plan: 'Starter', mrr: 79, owner: '', why: 'Logins down 40%, but reports still go out.', s: { usage: 0.35, seats: 0, billing: 0.2, rhythm: 0.5 } },
];
const money = (n) => `$${n.toLocaleString('en-US')}`;

function scoreOf(account) {
  const w = weights[account.plan];
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  return Math.round(Object.keys(w).reduce((sum, key) => sum + w[key] * account.s[key], 0) / total * 100);
}
const levelOf = (score) => (score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low');

let planFilter = 'All';
let weightPlan = 'Scale';
const selected = new Set(['acme', 'health']);
const riskPanel = document.getElementById('panel-risk');
const weightsPanel = document.getElementById('panel-weights');
const approvalsPanel = document.getElementById('panel-approvals');

function renderRisk() {
  const rows = accounts
    .filter((a) => planFilter === 'All' || a.plan === planFilter)
    .sort((a, b) => scoreOf(b) * b.mrr - scoreOf(a) * a.mrr);
  const chosen = accounts.filter((a) => selected.has(a.id));
  const atRisk = chosen.reduce((sum, a) => sum + a.mrr, 0);
  riskPanel.innerHTML = `
    <div class="toolbar">
      ${['All', 'Scale', 'Growth', 'Starter'].map((p) => `<button class="chip" data-filter="${p}" aria-pressed="${planFilter === p}">${p === 'All' ? 'All plans' : p}</button>`).join('')}
      <div class="bulk" aria-live="polite"><span>${chosen.length} selected · ${money(atRisk)}/mo</span>
        <button class="small-btn" data-review ${chosen.length ? '' : 'disabled'}>Review actions</button></div>
    </div>
    ${rows.map((a) => {
      const score = scoreOf(a);
      const owner = a.owner ? `<span class="owner ${a.owner === 'MR' ? 'm' : ''}" title="Owner">${a.owner}</span>` : '<span class="owner u" title="Unassigned">–</span>';
      return `<label class="acct ${selected.has(a.id) ? 'sel' : ''}">
        <input type="checkbox" data-account="${a.id}" ${selected.has(a.id) ? 'checked' : ''} aria-label="Select ${a.name}">
        <span><strong>${a.name}</strong><small>${a.plan} · ${money(a.mrr)}/mo</small></span>
        <span class="why">${a.why}</span>${owner}
        <span class="tag ${a.billing ? 'billing' : levelOf(score)}">${a.billing ? 'Billing' : score}</span>
      </label>`;
    }).join('')}`;
}

riskPanel.addEventListener('click', (event) => {
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    planFilter = filter.dataset.filter;
    renderRisk();
  } else if (event.target.closest('[data-review]')) {
    selectTab('tab-approvals');
  }
});
riskPanel.addEventListener('change', (event) => {
  const id = event.target.dataset.account;
  if (!id) return;
  if (event.target.checked) selected.add(id); else selected.delete(id);
  renderRisk();
  riskPanel.querySelector(`[data-account="${id}"]`)?.focus();
});

function renderScores() {
  const list = weightsPanel.querySelector('[data-scores]');
  list.innerHTML = accounts.filter((a) => a.plan === weightPlan).map((a) => {
    const score = scoreOf(a);
    return `<div class="score-row"><div><span>${a.name}</span><b>${score}</b></div><div class="track"><i class="${levelOf(score)}" style="width:${score}%"></i></div></div>`;
  }).join('');
}

function renderWeights() {
  weightsPanel.innerHTML = `<div class="weights-panel">
    <div>
      <div class="plan-pick">${Object.keys(weights).map((p) => `<button class="chip" data-plan="${p}" aria-pressed="${weightPlan === p}">${p}</button>`).join('')}</div>
      ${Object.entries(signalNames).map(([key, name]) => `<label class="slider"><span>${name}<output data-out="${key}">${weights[weightPlan][key]}</output></span>
        <input type="range" min="0" max="60" step="5" value="${weights[weightPlan][key]}" data-weight="${key}"></label>`).join('')}
      <button class="reset" data-reset>Reset to defaults</button>
    </div>
    <div><h3>${weightPlan} accounts</h3><p class="weights-note">Drag a weight and watch the risk scores move.</p><br><div data-scores></div></div>
  </div>`;
  renderScores();
}

weightsPanel.addEventListener('click', (event) => {
  const plan = event.target.closest('[data-plan]');
  if (plan) {
    weightPlan = plan.dataset.plan;
    renderWeights();
  } else if (event.target.closest('[data-reset]')) {
    weights[weightPlan] = { ...defaultWeights[weightPlan] };
    renderWeights();
    renderRisk();
  }
});
weightsPanel.addEventListener('input', (event) => {
  const key = event.target.dataset.weight;
  if (!key) return;
  weights[weightPlan][key] = Number(event.target.value);
  weightsPanel.querySelector(`[data-out="${key}"]`).textContent = event.target.value;
  renderScores();
  renderRisk();
});

const approvals = [
  { id: 'a1', meta: 'Acme Freight · Alex', title: 'Book a call', text: 'Personal email with a call link: "You stopped running the weekly report in October. Did something change?"', state: 'pending' },
  { id: 'a2', meta: 'Example Health · Maya', title: 'Send check-in email', text: 'Ask what changed before renewal. No discount on the first touch.', state: 'pending' },
];

function renderApprovals() {
  approvalsPanel.innerHTML = `${approvals.map((item) => `<div class="approval">
    <div><small>${item.meta}</small><h3>${item.title}</h3><p>${item.text}</p></div>
    <div class="approval-actions">${item.state === 'pending'
      ? `<button class="small-btn" data-approve="${item.id}">Approve</button><button class="small-btn alt" data-skip="${item.id}">Skip</button>`
      : `<span class="done">${item.state === 'approved' ? 'Approved' : 'Skipped'}</span>`}</div>
  </div>`).join('')}<p class="demo-note">This is a demo. Nothing is actually sent.</p>`;
}

approvalsPanel.addEventListener('click', (event) => {
  const approve = event.target.dataset.approve;
  const skip = event.target.dataset.skip;
  const item = approvals.find((a) => a.id === (approve || skip));
  if (!item) return;
  item.state = approve ? 'approved' : 'skipped';
  renderApprovals();
});

const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(id, focus = false) {
  tabs.forEach((tab) => {
    const active = tab.id === id;
    tab.setAttribute('aria-selected', active);
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) tab.focus();
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab.id));
  tab.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const step = event.key === 'ArrowRight' ? 1 : -1;
    selectTab(tabs[(index + step + tabs.length) % tabs.length].id, true);
  });
});

renderRisk();
renderWeights();
renderApprovals();
