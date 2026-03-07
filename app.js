// Dynamic, editable truck list — starts with one truck
var TRUCK_NAMES = ['ট্রাক-০১'];

function truckNamesChanged(skipRender) {
  // refresh all dropdowns that depend on TRUCK_NAMES
  var selIds = ['truckFilter', 'fTruck', 'wPlate', 'aeTruck', 'om_truck_sel', 'settleTruck', 'reportTruckFilter', 'mFilterTruck'];
  selIds.forEach(function (id) {
    var el = document.getElementById(id); if (!el) return;
    var cur = el.value;
    var hasAll = el.options[0] && (el.options[0].value === '' || el.options[0].value === 'All Trucks');
    el.innerHTML = '';
    if (hasAll) {
      var allOpt = document.createElement('option');
      allOpt.value = el.id === 'truckFilter' ? 'All Trucks' : '';
      allOpt.textContent = 'সকল ট্রাক';
      el.appendChild(allOpt);
    }
    TRUCK_NAMES.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t; o.textContent = t;
      if (t === cur) o.selected = true;
      el.appendChild(o);
    });
  });
  if (!skipRender) renderAll();
}

const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const MONTHS_SHORT = ["জান", "ফেব", "মার", "এপ্র", "মে", "জুন", "জুল", "আগ", "সেপ", "অক্ট", "নভ", "ডিস"];
const EXP_TYPES_BN = ["তেল", "লেবার", "ব্রিজ/টোল", "চাঁদা/পুলিশ", "কমিশন (১০%)", "দৈনিক ভাতা (খোরাকি)", "টায়ার", "মেইনটেন্যান্স", "ড্রাইভার স্যালারি", "বার্ষিক গাড়ির কাজ", "কেইস/ফাইন", "অন্যান্য (৫০০+)"];
const EXP_TYPES_KEY = ["Fuel", "Driver Salary", "Tolls & Fees", "Maintenance & Repairs", "Other"];
const CAT_COLORS = { "তেল": "#d97706", "লেবার": "#7c3aed", "ব্রিজ/টোল": "#db2777", "চাঁদা/পুলিশ": "#dc2626", "কমিশন (১০%)": "#2563eb", "দৈনিক ভাতা (খোরাকি)": "#059669", "টায়ার": "#9333ea", "মেইনটেন্যান্স": "#16a34a", "ড্রাইভার স্যালারি": "#0891b2", "বার্ষিক গাড়ির কাজ": "#b45309", "কেইস/ফাইন": "#b91c1c", "অন্যান্য (৫০০+)": "#6b7280" };
const CLIENTS_BN = [];

let entries = [];
let filteredEntries = [];
let modalType = 'revenue';

function toBN(n) {
  return Math.abs(Math.round(n)).toString().replace(/\d/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][+d]);
}

function fmt(n) {
  const val = Math.abs(Math.round(n));
  // Format with commas (Indian style)
  const s = val.toString();
  let result = s;
  if (s.length > 3) {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = restFormatted + ',' + last3;
  }
  // Convert to Bangla digits
  result = result.replace(/\d/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][+d]);
  return '৳' + result;
}

function toBn(s) { return String(s).replace(/[0-9]/g, function(d){ return '০১২৩৪৫৬৭৮৯'[+d]; }); }
function fmtPct(n) { return toBn(n) + '%'; }

function fmtDate(d) {
  if (!d) return '—';
  var parts = d.split('-');
  if (parts.length !== 3) return d;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}


function init() {
  entries = [];
  const now = new Date();
  const tSel = document.getElementById('truckFilter');
  const fTruck = document.getElementById('fTruck');
  TRUCK_NAMES.forEach(function (t) {
    tSel.innerHTML += '<option value="' + t + '">' + t + '</option>';
    if (fTruck) fTruck.innerHTML += '<option value="' + t + '">' + t + '</option>';
  });
  const mSel = document.getElementById('monthFilter');
  MONTHS_BN.forEach((m, i) => {
    const yearBN = now.getFullYear().toString().replace(/\d/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][+d]);
    mSel.innerHTML += `<option value="${i}">${m} ${yearBN}</option>`;
  });
  document.getElementById('fDate').value = now.toISOString().split('T')[0];
  applyFilters();
}

function applyFilters() {
  const truck = document.getElementById('truckFilter').value;
  const month = document.getElementById('monthFilter').value;
  filteredEntries = entries.filter(e => {
    const tOk = truck === 'All Trucks' || e.truck === truck;
    const mOk = month === 'All' || new Date(e.date).getMonth() === +month;
    return tOk && mOk;
  });
  const countBN = filteredEntries.length.toString().replace(/\d/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][+d]);
  document.getElementById('entryCount').textContent = countBN + ' টি এন্ট্রি';
  renderAll();
}

function renderAll() {
  renderKPIs(); renderMonthlyChart(); renderExpBreakdown();
  renderTruckGrid(); renderTruckTable(); renderEntries(); renderReports();
  renderFuelAlerts();
}

function renderFuelAlerts() {
  var strip = document.getElementById('fuelAlertStrip');
  if (!strip) return;

  // For each truck, compute monthly fuel cost
  // An alert fires if this month's fuel > 1.5x the avg of previous months
  var now = new Date();
  var thisMonth = now.getFullYear() + '-' + (now.getMonth() + 1 < 10 ? '0' : '') + (now.getMonth() + 1);

  var alerts = [];

  TRUCK_NAMES.forEach(function (truck) {
    var te = entries.filter(function (e) { return e.truck === truck && e.type === 'expense'; });

    // group fuel entries by month
    var monthlyFuel = {};
    te.forEach(function (e) {
      if (!e.category || e.category.indexOf('তেল') === -1) return;
      var m = e.date ? e.date.slice(0, 7) : null;
      if (!m) return;
      monthlyFuel[m] = (monthlyFuel[m] || 0) + e.amount;
    });

    var months = Object.keys(monthlyFuel).sort();
    if (months.length < 2) return; // need at least 2 months to compare

    var thisFuel = monthlyFuel[thisMonth] || 0;
    if (!thisFuel) return;

    // avg of all previous months (exclude this month)
    var prevMonths = months.filter(function (m) { return m !== thisMonth; });
    if (!prevMonths.length) return;
    var prevTotal = prevMonths.reduce(function (s, m) { return s + monthlyFuel[m]; }, 0);
    var prevAvg = prevTotal / prevMonths.length;

    if (prevAvg > 0 && thisFuel > prevAvg * fuelAlertMultiplier) {
      var pct = Math.round((thisFuel / prevAvg - 1) * 100);
      var threshold = Math.round((fuelAlertMultiplier - 1) * 100);
      alerts.push({ truck: truck, thisFuel: thisFuel, prevAvg: prevAvg, pct: pct });
    }
  });

  // also check fuel vs total expense ratio per truck this month
  TRUCK_NAMES.forEach(function (truck) {
    var te = entries.filter(function (e) {
      return e.truck === truck && e.type === 'expense' && e.date && e.date.slice(0, 7) === thisMonth;
    });
    var totalExp = te.reduce(function (s, e) { return s + e.amount; }, 0);
    var fuelExp = te.filter(function (e) { return e.category && e.category.indexOf('তেল') !== -1; })
      .reduce(function (s, e) { return s + e.amount; }, 0);
    if (totalExp > 0 && fuelExp / totalExp > fuelAlertRatioPct / 100) {
      // avoid duplicate
      if (!alerts.find(function (a) { return a.truck === truck; })) {
        alerts.push({ truck: truck, thisFuel: fuelExp, prevAvg: null, pct: null, ratioAlert: true, ratio: Math.round(fuelExp / totalExp * 100) });
      }
    }
  });

  if (!alerts.length) {
    strip.style.display = 'none';
    return;
  }

  strip.style.display = 'block';
  strip.innerHTML = '<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:14px 18px">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
    + '<span style="font-size:18px">⚠️</span>'
    + '<span style="font-size:13px;font-weight:700;color:#92400e">তেলের খরচ সতর্কতা</span>'
    + '<button onclick="openFuelAlertSettings()" style="margin-left:auto;background:transparent;border:1px solid #f59e0b;color:#92400e;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit">⚙️ সেটিং</button>'
    + '</div>'
    + alerts.map(function (a) {
      var msg = a.ratioAlert
        ? '🚚 <strong>' + a.truck + '</strong> — এই মাসে তেল খরচ মোট ব্যয়ের <strong style="color:#c81e1e">' + a.ratio + '%</strong> (স্বাভাবিকের চেয়ে বেশি)'
        : '🚚 <strong>' + a.truck + '</strong> — এই মাসে তেল খরচ <strong style="color:#c81e1e">' + fmt(a.thisFuel) + '</strong>, গড়ের চেয়ে <strong style="color:#c81e1e">+' + a.pct + '%</strong> বেশি (গড়: ' + fmt(a.prevAvg) + ')';
      return '<div style="font-size:12px;color:#78350f;padding:5px 0;border-top:1px solid #fde68a">' + msg + '</div>';
    }).join('')
    + '</div>';
}

function getKPIs() {
  const rev = filteredEntries.filter(e => e.type === 'revenue').reduce((s, e) => s + e.amount, 0);
  const exp = filteredEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const profit = rev - exp;
  const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '০.০';
  return { rev, exp, profit, margin };
}

function renderKPIs() {
  const { rev, exp, profit, margin } = getKPIs();
  document.getElementById('kpiRevenue').textContent = fmt(rev);
  document.getElementById('kpiExpenses').textContent = fmt(exp);
  const pEl = document.getElementById('kpiProfit');
  pEl.textContent = (profit < 0 ? '-' : '') + fmt(Math.abs(profit));
  pEl.className = 'kpi-value ' + (profit >= 0 ? 'blue' : 'red');
  document.getElementById('kpiProfitCard').className = 'kpi-card ' + (profit >= 0 ? 'blue' : 'red');
  const marginBN = margin.toString().replace(/\d/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][+d]);
  document.getElementById('kpiMargin').textContent = marginBN + '%';
}

function getTruckSummaries() {
  return TRUCK_NAMES.map(truck => {
    const te = filteredEntries.filter(e => e.truck === truck);
    const rev = te.filter(e => e.type === 'revenue').reduce((s, e) => s + e.amount, 0);
    const exp = te.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    return { truck, revenue: rev, expenses: exp, profit: rev - exp };
  }).sort((a, b) => b.profit - a.profit);
}

function renderMonthlyChart() {
  const truck = document.getElementById('truckFilter').value;
  const data = {};
  entries.filter(e => truck === 'All Trucks' || e.truck === truck).forEach(e => {
    const d = new Date(e.date); const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!data[key]) data[key] = { label: MONTHS_SHORT[d.getMonth()], revenue: 0, expenses: 0, month: d.getMonth(), year: d.getFullYear() };
    if (e.type === 'revenue') data[key].revenue += e.amount; else data[key].expenses += e.amount;
  });
  const months = Object.values(data).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month).slice(-6);
  const max = Math.max(...months.map(m => Math.max(m.revenue, m.expenses)), 1);
  document.getElementById('monthlyChart').innerHTML = months.map(m => `
    <div class="chart-col">
      <div class="chart-bars-inner">
        <div class="bar bar-rev" style="height:${(m.revenue / max) * 100}%" title="আয়: ${fmt(m.revenue)}"></div>
        <div class="bar bar-exp" style="height:${(m.expenses / max) * 100}%" title="ব্যয়: ${fmt(m.expenses)}"></div>
      </div>
      <div class="bar-label">${m.label}</div>
    </div>
  `).join('');
}

function renderExpBreakdown() {
  const cats = {};
  filteredEntries.filter(e => e.type === 'expense').forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  const total = Object.values(cats).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  document.getElementById('expBreakdown').innerHTML = sorted.length ? sorted.map(([cat, amt]) => `
    <div class="exp-row">
      <div class="exp-row-header">
        <span style="color:${CAT_COLORS[cat] || '#6b7280'};font-weight:600">${cat}</span>
        <span style="color:var(--heading);font-weight:700">${fmt(amt)}</span>
      </div>
      <div class="exp-track">
        <div class="exp-fill" style="width:${total > 0 ? (amt / total) * 100 : 0}%;background:${CAT_COLORS[cat] || '#6b7280'}"></div>
      </div>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px 0">কোনো ব্যয়ের তথ্য নেই</p>';
}

function renderTruckGrid() {
  // Populate month filter
  var mfEl = document.getElementById('plMonthFilter');
  if (mfEl && mfEl.options.length <= 1) {
    var months = {};
    entries.forEach(function(e){ if(e.date) months[e.date.slice(0,7)] = true; });
    var curMonth = new Date().toISOString().slice(0,7);
    mfEl.innerHTML = '<option value="">এই মাস</option>'
      + Object.keys(months).sort().reverse().map(function(m){
          var d = new Date(m+'-01');
          return '<option value="'+m+'">'+(MONTHS_BN[d.getMonth()])+' '+d.getFullYear()+'</option>';
        }).join('');
  }
  var selM = mfEl ? mfEl.value : '';
  var filterMonth = selM || new Date().toISOString().slice(0,7);

  // Build per-truck data for selected month
  var tMap = {};
  TRUCK_NAMES.forEach(function(t){ tMap[t] = {rev:0, exp:0, trips:0, prevRev:0, prevExp:0}; });

  // Prev month for trend
  var prevDate = new Date(filterMonth+'-01');
  prevDate.setMonth(prevDate.getMonth()-1);
  var prevMonth = prevDate.toISOString().slice(0,7);

  entries.forEach(function(e){
    if (!e.date) return;
    if (!tMap[e.truck]) tMap[e.truck] = {rev:0,exp:0,trips:0,prevRev:0,prevExp:0,dist:0,fuel:0,mCount:0};
    var em = e.date.slice(0,7);
    if (em === filterMonth) {
      if (e.type==='revenue'){
        tMap[e.truck].rev += e.amount; tMap[e.truck].trips++;
        if (e.distance) tMap[e.truck].dist += e.distance;
        if (e.fuel_liters) tMap[e.truck].fuel += e.fuel_liters;
        if (e.mileage) tMap[e.truck].mCount++;
      }
      else tMap[e.truck].exp += e.amount;
    } else if (em === prevMonth) {
      if (e.type==='revenue') tMap[e.truck].prevRev += e.amount;
      else tMap[e.truck].prevExp += e.amount;
    }
  });

  var summaries = TRUCK_NAMES.map(function(t){
    var d = tMap[t];
    var avgEff = (d.fuel > 0 && d.dist > 0) ? (d.dist/d.fuel).toFixed(1) : null;
    return { truck:t, revenue:d.rev, expenses:d.exp, profit:d.rev-d.exp, trips:d.trips,
             prevProfit: d.prevRev - d.prevExp, dist: d.dist, fuel: d.fuel, avgEff: avgEff };
  });

  // Sort by profit desc
  summaries.sort(function(a,b){ return b.profit - a.profit; });

  var monthLabel = (function(){
    var d = new Date(filterMonth+'-01');
    return MONTHS_BN[d.getMonth()] + ' ' + d.getFullYear();
  })();

  var totalRev = summaries.reduce(function(s,t){return s+t.revenue;},0);
  var totalExp = summaries.reduce(function(s,t){return s+t.expenses;},0);
  var totalProfit = totalRev - totalExp;

  var cards = summaries.map(function(t, i) {
    var margin = t.revenue > 0 ? ((t.profit/t.revenue)*100).toFixed(0) : '0';
    var marginBn = toBn(margin);
    var isProfit = t.profit >= 0;
    var trend = t.prevProfit === 0 ? '' : t.profit > t.prevProfit
      ? '<span style="color:#057a55;font-size:11px;font-weight:700">▲ উন্নতি</span>'
      : t.profit < t.prevProfit
      ? '<span style="color:#c81e1e;font-size:11px;font-weight:700">▼ হ্রাস</span>'
      : '<span style="color:#64748b;font-size:11px">→ অপরিবর্তিত</span>';
    var revPct = totalRev > 0 ? Math.round((t.revenue/totalRev)*100) : 0;
    var rankColor = i===0 ? '#f59e0b' : i===1 ? '#94a3b8' : i===2 ? '#b45309' : '#e2e8f0';
    var hasData = t.revenue > 0 || t.expenses > 0;

    return '<div onclick="openTruckDetail(\''+t.truck+'\')" style="background:#fff;border:2px solid '+(isProfit&&hasData?'#bbf7d0':'#fecdd3')+';border-radius:12px;padding:16px;cursor:pointer;transition:box-shadow .15s;position:relative;overflow:hidden" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,.10)\'" onmouseout="this.style.boxShadow=\'none\'">'
      // rank badge
      + '<div style="position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;background:'+rankColor+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">'+(i+1)+'</div>'
      // truck name
      + '<div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px;padding-right:28px">🚚 '+t.truck+'</div>'
      + '<div style="font-size:10px;color:#94a3b8;margin-bottom:12px">'+toBn(t.trips)+'টি ট্রিপ · '+monthLabel+'</div>'
      // profit big number
      + '<div style="font-size:22px;font-weight:800;color:'+(isProfit?'#057a55':'#c81e1e')+';margin-bottom:4px">'+(t.profit<0?'-':'')+fmt(Math.abs(t.profit))+'</div>'
      + '<div style="font-size:10px;color:#64748b;margin-bottom:10px">নিট মুনাফা &nbsp;'+trend+'</div>'
      // bar
      + (hasData ? '<div style="height:4px;background:#f1f5f9;border-radius:2px;margin-bottom:10px"><div style="height:4px;border-radius:2px;background:'+(isProfit?'#057a55':'#c81e1e')+';width:'+Math.min(Math.abs(parseInt(margin)),100)+'%"></div></div>' : '<div style="height:4px;background:#f1f5f9;border-radius:2px;margin-bottom:10px"></div>')
      // rev / exp row
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + '<div style="background:#f0fdf4;border-radius:8px;padding:8px 10px"><div style="font-size:9px;color:#64748b;font-weight:600;margin-bottom:2px">আয়</div><div style="font-size:13px;font-weight:700;color:#057a55">'+fmt(t.revenue)+'</div></div>'
      + '<div style="background:#fff5f5;border-radius:8px;padding:8px 10px"><div style="font-size:9px;color:#64748b;font-weight:600;margin-bottom:2px">ব্যয়</div><div style="font-size:13px;font-weight:700;color:#c81e1e">'+fmt(t.expenses)+'</div></div>'
      + '</div>'
      // margin badge + mileage
      + '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between">'
      + '<span style="font-size:10px;color:#64748b">আয়ের অংশ: '+revPct+'%</span>'
      + '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:'+(parseFloat(margin)>=20?'#dcfce7':parseFloat(margin)>=0?'#fef9c3':'#fee2e2')+';color:'+(parseFloat(margin)>=20?'#15803d':parseFloat(margin)>=0?'#92400e':'#c81e1e')+'">'+marginBn+'% মার্জিন</span>'
      + '</div>'
      + (t.avgEff ? '<div style="margin-top:8px;background:#eff6ff;border-radius:6px;padding:6px 10px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:10px;color:#64748b">⛽ জ্বালানি দক্ষতা</span><span style="font-size:12px;font-weight:700;color:#1a56db">'+toBn(t.avgEff)+' কি.মি./লি.</span></div>' : '')
      + (t.dist > 0 ? '<div style="margin-top:4px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;padding:0 2px"><span>দূরত্ব: '+toBn(Math.round(t.dist))+' কি.মি.</span><span>জ্বালানি: '+toBn(t.fuel.toFixed(0))+' লি.</span></div>' : '')
      + (!hasData ? '<div style="margin-top:8px;font-size:11px;color:#94a3b8;text-align:center">এই মাসে কোনো ডেটা নেই</div>' : '')
      + '</div>';
  });

  // Summary total card
  var totalMargin = totalRev > 0 ? ((totalProfit/totalRev)*100).toFixed(0) : '0';
  var totalCard = '<div style="background:linear-gradient(135deg,#1e3a5f,#1a56db);border-radius:12px;padding:16px;color:#fff">'
    + '<div style="font-size:11px;opacity:.7;font-weight:600;letter-spacing:.05em;margin-bottom:4px">📊 সামগ্রিক সারসংক্ষেপ</div>'
    + '<div style="font-size:11px;opacity:.6;margin-bottom:12px">'+monthLabel+'</div>'
    + '<div style="font-size:22px;font-weight:800;margin-bottom:4px">'+(totalProfit<0?'-':'')+fmt(Math.abs(totalProfit))+'</div>'
    + '<div style="font-size:10px;opacity:.7;margin-bottom:12px">মোট নিট মুনাফা</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    + '<div style="background:rgba(255,255,255,.1);border-radius:8px;padding:8px 10px"><div style="font-size:9px;opacity:.7;margin-bottom:2px">মোট আয়</div><div style="font-size:13px;font-weight:700;color:#86efac">'+fmt(totalRev)+'</div></div>'
    + '<div style="background:rgba(255,255,255,.1);border-radius:8px;padding:8px 10px"><div style="font-size:9px;opacity:.7;margin-bottom:2px">মোট ব্যয়</div><div style="font-size:13px;font-weight:700;color:#fca5a5">'+fmt(totalExp)+'</div></div>'
    + '</div>'
    + '<div style="font-size:11px;opacity:.8">মোট মার্জিন: <b>'+totalMargin+'%</b> &nbsp;|&nbsp; সক্রিয় ট্রাক: <b>'+summaries.filter(function(t){return t.revenue>0||t.expenses>0;}).length+'টি</b></div>'
    + '</div>';

  document.getElementById('truckGrid').innerHTML = totalCard + cards.join('');
}

function renderTruckTable() {
  const summaries = getTruckSummaries();
  document.getElementById('truckTableBody').innerHTML = summaries.map((t, i) => {
    const m = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '০.০';
    const mClass = parseFloat(m) >= 20 ? 'tag-good' : parseFloat(m) >= 0 ? 'tag-mid' : 'tag-bad';
    const rankBN = toBn(i + 1);
    const mBN = toBn(m);
    return `<tr>
      <td style="color:var(--muted);font-weight:600">#${rankBN}</td>
      <td style="color:var(--accent);font-weight:600;cursor:pointer" onclick="openTruckDetail('${t.truck}')">🚚 ${t.truck}</td>
      <td style="color:var(--green);font-weight:600">${fmt(t.revenue)}</td>
      <td style="color:var(--red);font-weight:600">${fmt(t.expenses)}</td>
      <td style="color:${t.profit >= 0 ? 'var(--green)' : 'var(--red)'};font-size:16px;font-weight:700">${t.profit < 0 ? '-' : ''}${fmt(Math.abs(t.profit))}</td>
      <td><span class="tag tag-margin ${mClass}">${mBN}%</span></td>
      <td><button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="goTruckEntries('${t.truck}')">এন্ট্রি দেখুন →</button></td>
    </tr>`;
  }).join('');
}

// Store sheet groups for button callbacks
var _sheetGroups = {};
function renderSheetAddBtns(g) {
  if (!currentUser || currentUser.role === 'viewer') return '';
  var key = (g.sheet_ref || (g.truck + g.date)).replace(/[^a-zA-Z0-9]/g,'');
  _sheetGroups[key] = g;
  var b1 = document.createElement('button');
  b1.setAttribute('data-sgkey', key);
  b1.setAttribute('data-sgtype', 'revenue');
  b1.setAttribute('onclick', 'openSheetModal(this)');
  b1.style.cssText = 'background:#dcfce7;border:1.5px solid #86efac;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-weight:700;color:#15803d';
  b1.textContent = '+ আয়';
  var b2 = document.createElement('button');
  b2.setAttribute('data-sgkey', key);
  b2.setAttribute('data-sgtype', 'expense');
  b2.setAttribute('onclick', 'openSheetModal(this)');
  b2.style.cssText = 'background:#fee2e2;border:1.5px solid #fca5a5;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-weight:700;color:#b91c1c';
  b2.textContent = '+ ব্যয়';
  return b1.outerHTML + b2.outerHTML;
}
function openSheetModal(btn) {
  event.stopPropagation();
  var key = btn.dataset.sgkey;
  var type = btn.dataset.sgtype;
  var g = _sheetGroups[key];
  if (g) openModal(type, g.sheet_ref || '', g.truck, g.date);
}
function renderEntryActionBtns(id) {
  if (!currentUser || currentUser.role === 'viewer') return '';
  var b1 = document.createElement('button');
  b1.setAttribute('onclick', 'event.stopPropagation();adminEditEntry(' + JSON.stringify(id) + ')');
  b1.style.cssText = 'background:#eff6ff;border:1.5px solid #c7d7f8;color:#1a56db;border-radius:6px;padding:4px 9px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;margin-right:4px';
  b1.textContent = '✏️';
  var b2 = document.createElement('button');
  b2.setAttribute('onclick', 'event.stopPropagation();adminDeleteEntry(' + JSON.stringify(id) + ')');
  b2.style.cssText = 'background:#fde8e8;border:1.5px solid #f8d0d0;color:#c81e1e;border-radius:6px;padding:4px 9px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit';
  b2.textContent = '🗑️';
  return b1.outerHTML + b2.outerHTML;
}

function renderEntries() {
  const groups = {};
  filteredEntries.forEach(e => {
    const key = e.sheet_ref ? e.sheet_ref : (e.date + '|' + e.truck);
    if (!groups[key]) {
      groups[key] = { date: e.date, truck: e.truck, entries: [], revenue: 0, expense: 0, discount: 0, sheet_ref: e.sheet_ref || null };
    }
    if (e.date < groups[key].date) groups[key].date = e.date;
    groups[key].entries.push(e);
    if (e.type === 'revenue') {
      groups[key].revenue += e.amount;
    } else {
      if (e.category === 'ঐচ্ছিক ছাড়' || (e.description && e.description.includes('ঐচ্ছিক ছাড়'))) {
        groups[key].discount += e.amount;
      } else {
        groups[key].expense += e.amount;
      }
    }
  });

  const groupKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const shownGroups = groupKeys.slice(0, 30);

  let html = '';
  shownGroups.forEach((key, idx) => {
    const g = groups[key];
    const net = g.revenue - g.expense - g.discount;
    const isPos = net >= 0;
    const netClass = isPos ? 'var(--green)' : 'var(--red)';
    const netSign = isPos ? '+' : '';

    html += `
    <tr style="background:#f8fafc;border-top:2px solid var(--border);border-bottom:2px solid var(--border);cursor:pointer" onclick="toggleSheetRows('${idx}')">
      <td><span class="tag" style="background:#e0e7ff;color:#4338ca;font-weight:700">শিট</span></td>
      <td style="font-weight:700;color:var(--heading)">${g.truck}${g.sheet_ref ? '<span style=\"font-size:10px;background:#f0f9ff;color:#0284c7;border:1px solid #bae6fd;border-radius:4px;padding:2px 7px;font-weight:700;margin-left:8px\"># ' + g.sheet_ref + '</span>' : ''}</td>
      <td style="font-weight:600;color:var(--muted)">${fmtDate(g.date)}</td>
      <td style="color:${netClass};font-weight:800;font-size:15px">${netSign}${fmt(Math.abs(net))}</td>
      <td style="color:var(--muted);font-size:12px">আয়: ${fmt(g.revenue)} | ব্যয়: ${fmt(g.expense)}${g.discount > 0 ? ' | ছাড়: ' + fmt(g.discount) : ''}</td>
      <td style="color:var(--muted)">${g.entries.length}টি এন্ট্রি</td>
      <td style="white-space:nowrap;display:flex;gap:6px;align-items:center">
        <button id="btn_toggle_${idx}" style="background:#fff;border:1.5px solid #cbd5e1;border-radius:6px;padding:4px 9px;cursor:pointer;font-size:11px;font-weight:600;color:#475569">▼ বিস্তারিত</button>
        ${renderSheetAddBtns(g)}
      </td>
    </tr>
    `;

    g.entries.sort((a, b) => (a.type === 'revenue' ? -1 : 1)).forEach(e => {
      html += `
        <tr class="sheet-row-${idx}" style="display:none;background:#fff">
          <td style="padding-left:24px"><span class="tag ${e.type === 'revenue' ? 'tag-rev' : 'tag-exp'}">${e.type === 'revenue' ? 'আয়' : 'ব্যয়'}</span></td>
          <td style="color:var(--muted)">${e.truck}</td>
          <td style="color:var(--muted)">${fmtDate(e.date)}</td>
          <td style="color:${e.type === 'revenue' ? 'var(--green)' : 'var(--red)'};font-weight:700">${e.type === 'revenue' ? '+' : '-'}${fmt(Math.abs(e.amount))}</td>
          <td style="color:var(--heading)">${e.description}</td>
          <td style="color:var(--muted)">${e.client || e.category || '—'}</td>
          <td style="white-space:nowrap">
            ${renderEntryActionBtns(e.id)}
          </td>
        </tr>
        `;
    });
  });

  document.getElementById('entriesTableBody').innerHTML = html;
  const more = document.getElementById('moreInfo');
  if (groupKeys.length > 30) {
    const extraBN = (groupKeys.length - 30).toString().replace(/\d/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][+d]);
    const totalBN = groupKeys.length.toString().replace(/\d/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][+d]);
    more.style.display = 'block';
    more.textContent = `${totalBN} টি শিটের মধ্যে ৩০টি দেখানো হচ্ছে। আরো ${extraBN}টি আছে। ফিল্টার ব্যবহার করুন।`;
  } else { more.style.display = 'none'; }
}

function toggleSheetRows(idx) {
  const rows = document.querySelectorAll('.sheet-row-' + idx);
  const btn = document.getElementById('btn_toggle_' + idx);
  let isHidden = false;
  rows.forEach(r => {
    if (r.style.display === 'none') {
      r.style.display = 'table-row';
      isHidden = true;
    } else {
      r.style.display = 'none';
      isHidden = false;
    }
  });
  if (btn) btn.innerHTML = isHidden ? '▲ লুকান' : '▼ বিস্তারিত';
}

function renderReports() {
  // populate month dropdown
  var rmEl = document.getElementById('reportMonth');
  var rtEl = document.getElementById('reportTruckFilter');
  if (rmEl && rmEl.options.length <= 1) {
    var months = {};
    entries.forEach(function (e) { if (e.date) months[e.date.slice(0, 7)] = true; });
    var curM = rmEl.value;
    rmEl.innerHTML = '<option value="">সকল মাস</option>' +
      Object.keys(months).sort().reverse().map(function (m) {
        var d = new Date(m + '-01');
        return '<option value="' + m + '"' + (m === curM ? ' selected' : '') + '>' + MONTHS_BN[d.getMonth()] + ' ' + d.getFullYear() + '</option>';
      }).join('');
  }
  if (rtEl && rtEl.options.length <= 1) {
    var curT = rtEl.value;
    rtEl.innerHTML = '<option value="">সকল ট্রাক</option>' +
      TRUCK_NAMES.map(function (t) { return '<option value="' + t + '"' + (t === curT ? ' selected' : '') + '>' + t + '</option>'; }).join('');
  }

  var selMonth = rmEl ? rmEl.value : '';
  var selTruck = rtEl ? rtEl.value : '';

  // filter entries
  var rEntries = entries.filter(function (e) {
    var okM = !selMonth || (e.date && e.date.slice(0, 7) === selMonth);
    var okT = !selTruck || e.truck === selTruck;
    return okM && okT;
  });

  // per-truck summaries
  var tMap = {};
  TRUCK_NAMES.forEach(function (t) { tMap[t] = { rev: 0, exp: 0, trips: 0 }; });
  rEntries.forEach(function (e) {
    if (!tMap[e.truck]) tMap[e.truck] = { rev: 0, exp: 0, trips: 0 };
    if (e.type === 'revenue') { tMap[e.truck].rev += e.amount; tMap[e.truck].trips++; }
    else tMap[e.truck].exp += e.amount;
  });
  var summaries = Object.keys(tMap).map(function (t) {
    return {
      truck: t, revenue: tMap[t].rev, expenses: tMap[t].exp,
      profit: tMap[t].rev - tMap[t].exp, trips: tMap[t].trips
    };
  }).filter(function (t) { return t.revenue > 0 || t.expenses > 0; })
    .sort(function (a, b) { return b.profit - a.profit; });

  // profit bars
  var maxP = Math.max.apply(null, summaries.map(function (t) { return Math.abs(t.profit); }).concat([1]));
  document.getElementById('profitBars').innerHTML = summaries.length ? summaries.map(function (t) {
    return '<div class="profit-row">'
      + '<div class="profit-label" style="font-size:10px">' + t.truck + '</div>'
      + '<div class="profit-track"><div class="profit-bar" style="width:' + (Math.abs(t.profit) / maxP * 100) + '%;background:' + (t.profit >= 0 ? 'var(--green)' : 'var(--red)') + ';opacity:.8"></div></div>'
      + '<div class="profit-amt" style="color:' + (t.profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (t.profit < 0 ? '-' : '') + fmt(Math.abs(t.profit)) + '</div>'
      + '</div>';
  }).join('') : '<p style="color:var(--muted);font-size:13px;padding:16px 0">কোনো ডেটা নেই</p>';

  // summary panel
  var rev = rEntries.filter(function (e) { return e.type === 'revenue'; }).reduce(function (s, e) { return s + e.amount; }, 0);
  var exp = rEntries.filter(function (e) { return e.type === 'expense'; }).reduce(function (s, e) { return s + e.amount; }, 0);
  var profit = rev - exp;
  var margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0';
  var best = summaries[0]; var worst = summaries[summaries.length - 1];
  document.getElementById('summaryReport').innerHTML = [
    ['নির্বাচিত মাস', selMonth ? (function () { var d = new Date(selMonth + '-01'); return MONTHS_BN[d.getMonth()] + ' ' + d.getFullYear(); })() : 'সকল'],
    ['মোট আয়', fmt(rev)],
    ['মোট ব্যয়', fmt(exp)],
    ['নিট মুনাফা', (profit < 0 ? '-' : '') + fmt(Math.abs(profit))],
    ['মুনাফার হার', fmtPct(margin)],
    ['সক্রিয় ট্রাক', summaries.length + 'টি'],
    ['সেরা পারফরম্যান্স', best ? best.truck : '—'],
    ['মনোযোগ প্রয়োজন', worst ? worst.truck : '—'],
  ].map(function (r) {
    return '<div class="summary-row"><span class="summary-key">' + r[0] + '</span><span class="summary-val">' + r[1] + '</span></div>';
  }).join('');

  // truck detail table
  document.getElementById('reportTruckTable').innerHTML = summaries.length ? summaries.map(function (t, i) {
    var m = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '0';
    return '<tr>'
      + '<td style="font-weight:600">🚚 ' + t.truck + '</td>'
      + '<td style="color:var(--green);font-weight:600">' + fmt(t.revenue) + '</td>'
      + '<td style="color:var(--red);font-weight:600">' + fmt(t.expenses) + '</td>'
      + '<td style="color:' + (t.profit >= 0 ? 'var(--green)' : 'var(--red)') + ';font-weight:700">' + (t.profit < 0 ? '-' : '') + fmt(Math.abs(t.profit)) + '</td>'
      + '<td><span class="tag ' + (parseFloat(m) >= 20 ? 'tag-good' : parseFloat(m) >= 0 ? 'tag-mid' : 'tag-bad') + '">' + m + '%</span></td>'
      + '<td style="color:var(--muted)">' + t.trips + 'টি</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">কোনো ডেটা নেই</td></tr>';

  // entry list
  var sortedE = rEntries.slice().sort(function (a, b) {
    if (a.type !== b.type) return a.type === 'revenue' ? -1 : 1;
    return b.date.localeCompare(a.date);
  });
  document.getElementById('reportEntryTable').innerHTML = sortedE.length ? sortedE.map(function (e) {
    return '<tr>'
      + '<td style="color:var(--muted)">' + fmtDate(e.date) + '</td>'
      + '<td style="color:var(--muted)">' + e.truck + '</td>'
      + '<td><span class="tag ' + (e.type === 'revenue' ? 'tag-rev' : 'tag-exp') + '">' + (e.type === 'revenue' ? 'আয়' : 'ব্যয়') + '</span></td>'
      + '<td style="color:' + (e.type === 'revenue' ? 'var(--green)' : 'var(--red)') + ';font-weight:600">' + (e.type === 'revenue' ? '+' : '-') + fmt(Math.abs(e.amount)) + '</td>'
      + '<td>' + e.description + '</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">কোনো ডেটা নেই</td></tr>';
}

function printMonthlyReport() {
  var selMonth = document.getElementById('reportMonth').value;
  var selTruck = document.getElementById('reportTruckFilter').value;
  var monthLabel = selMonth ? (function () { var d = new Date(selMonth + '-01'); return MONTHS_BN[d.getMonth()] + ' ' + d.getFullYear(); })() : 'সকল মাস';
  var truckLabel = selTruck || 'সকল ট্রাক';

  var rEntries = entries.filter(function (e) {
    var okM = !selMonth || (e.date && e.date.slice(0, 7) === selMonth);
    var okT = !selTruck || e.truck === selTruck;
    return okM && okT;
  });

  function toBnDigits(s) { return String(s).replace(/[0-9]/g, function(d){ return '০১২৩৪৫৬৭৮৯'[+d]; }); }
  function fmtP(n) { return '৳' + toBnDigits(Math.round(n).toLocaleString('en-IN')); }
  function fmtPct(p) { return toBnDigits(p) + '%'; }
  function fmtD(d) { if (!d) return ''; var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  var rev = rEntries.filter(function(e){return e.type==='revenue';}).reduce(function(s,e){return s+e.amount;},0);
  var exp = rEntries.filter(function(e){return e.type==='expense';}).reduce(function(s,e){return s+e.amount;},0);
  var profit = rev - exp;
  var margin = rev > 0 ? ((profit/rev)*100).toFixed(1) : '0';

  // Per-truck
  var tMap = {};
  rEntries.forEach(function(e) {
    if (!tMap[e.truck]) tMap[e.truck] = {rev:0, exp:0, trips:0};
    if (e.type==='revenue') { tMap[e.truck].rev += e.amount; tMap[e.truck].trips++; }
    else tMap[e.truck].exp += e.amount;
  });
  var truckRows = Object.keys(tMap)
    .sort(function(a,b){ return (tMap[b].rev-tMap[b].exp)-(tMap[a].rev-tMap[a].exp); })
    .map(function(t) {
      var p = tMap[t].rev - tMap[t].exp;
      var m = tMap[t].rev > 0 ? ((p/tMap[t].rev)*100).toFixed(1) : '0';
      return '<tr><td>'+t+'</td><td class="num green">'+fmtP(tMap[t].rev)+'</td>'
        +'<td class="num red">'+fmtP(tMap[t].exp)+'</td>'
        +'<td class="num '+(p>=0?'green':'red')+'">'+(p<0?'-':'')+fmtP(Math.abs(p))+'</td>'
        +'<td class="num">'+toBnDigits(m)+'%</td><td class="num">'+toBnDigits(tMap[t].trips)+'\u099f\u09bf</td></tr>';
    }).join('');

  // Sheet breakdown
  var sheetMap = {};
  rEntries.forEach(function(e) {
    var key = e.sheet_ref || (e.truck + '|' + e.date);
    if (!sheetMap[key]) sheetMap[key] = {ref: e.sheet_ref||'\u2014', truck: e.truck, date: e.date, rev:0, exp:0};
    if (e.type==='revenue') sheetMap[key].rev += e.amount;
    else sheetMap[key].exp += e.amount;
  });
  var sheetRows = Object.keys(sheetMap)
    .sort(function(a,b){ return sheetMap[a].date.localeCompare(sheetMap[b].date); })
    .map(function(k) {
      var s = sheetMap[k]; var net = s.rev - s.exp;
      return '<tr><td><b>'+s.ref+'</b></td><td>'+s.truck+'</td><td>'+fmtD(s.date)+'</td>'
        +'<td class="num green">'+fmtP(s.rev)+'</td><td class="num red">'+fmtP(s.exp)+'</td>'
        +'<td class="num '+(net>=0?'green':'red')+'">'+(net<0?'-':'')+fmtP(Math.abs(net))+'</td></tr>';
    }).join('');

  // Expense categories
  var catMap = {};
  rEntries.filter(function(e){return e.type==='expense';}).forEach(function(e) {
    var cat = e.category || e.description || '\u0985\u09a8\u09cd\u09af\u09be\u09a8\u09cd\u09af';
    catMap[cat] = (catMap[cat]||0) + e.amount;
  });
  var catRows = Object.keys(catMap)
    .sort(function(a,b){return catMap[b]-catMap[a];})
    .map(function(c) {
      var pct = exp > 0 ? ((catMap[c]/exp)*100).toFixed(1) : '0';
      return '<tr><td>'+c+'</td><td class="num red">'+fmtP(catMap[c])+'</td><td class="num">'+toBnDigits(pct)+'%</td></tr>';
    }).join('');

  // Driver summary
  var driverMap = {};
  rEntries.filter(function(e){return e.type==='revenue' && e.client;}).forEach(function(e) {
    if (!driverMap[e.client]) driverMap[e.client] = {trips:0, rev:0};
    driverMap[e.client].trips++; driverMap[e.client].rev += e.amount;
  });
  // Mileage summary per truck for report
  var mileageMap = {};
  rEntries.filter(function(e){return e.type==='revenue' && e.mileage > 0;}).forEach(function(e){
    if (!mileageMap[e.truck]) mileageMap[e.truck] = {dist:0, fuel:0, count:0};
    mileageMap[e.truck].dist += (e.distance||0);
    mileageMap[e.truck].fuel += (e.fuel_liters||0);
    mileageMap[e.truck].count++;
  });
  var mileageRows = Object.keys(mileageMap).length ? Object.keys(mileageMap).map(function(t) {
    var m = mileageMap[t];
    var eff = m.fuel > 0 ? (m.dist/m.fuel).toFixed(2) : '—';
    return '<tr><td>'+t+'</td><td class="num">'+toBnDigits(Math.round(m.dist))+' কি.মি.</td><td class="num">'+toBnDigits(m.fuel.toFixed(1))+' লি.</td><td class="num">'+toBnDigits(eff)+' কি.মি./লি.</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#94a3b8">কোনো মাইলেজ ডেটা নেই</td></tr>';

  var driverRows = Object.keys(driverMap).length ? Object.keys(driverMap)
    .sort(function(a,b){return driverMap[b].rev-driverMap[a].rev;})
    .map(function(d) {
      return '<tr><td>'+d+'</td><td class="num">'+toBnDigits(driverMap[d].trips)+'\u099f\u09bf</td><td class="num green">'+fmtP(driverMap[d].rev)+'</td></tr>';
    }).join('') : '<tr><td colspan="3" style="color:#94a3b8;text-align:center">\u0995\u09cb\u09a8\u09cb \u09a1\u09c7\u099f\u09be \u09a8\u09c7\u0987</td></tr>';

  var printDate = new Date().toLocaleDateString('en-GB');
  var preparedBy = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.username : 'Admin';

  // Read checkbox options
  var showSheets  = document.getElementById('rptShowSheets')  ? document.getElementById('rptShowSheets').checked  : true;
  var showExpCat  = document.getElementById('rptShowExpCat')  ? document.getElementById('rptShowExpCat').checked   : false;
  var showDrivers = document.getElementById('rptShowDrivers') ? document.getElementById('rptShowDrivers').checked : true;

  var html = '<!DOCTYPE html><html><head>'
    + '<meta charset="UTF-8"/>'
    + '<title>\u09ae\u09be\u09b8\u09bf\u0995 \u09aa\u09cd\u09b0\u09a4\u09bf\u09ac\u09c7\u09a6\u09a8</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet"/>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:\'Hind Siliguri\',sans-serif;font-size:12px;color:#1e293b;background:#fff;padding:24px 32px}'
    + '.header{border-bottom:3px solid #1a56db;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}'
    + '.logo{font-size:22px;font-weight:700;color:#1a56db}'
    + '.sub{font-size:12px;color:#64748b;margin-top:3px}'
    + '.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}'
    + '.kpi{border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 14px}'
    + '.kpi .lbl{font-size:10px;color:#64748b;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}'
    + '.kpi .val{font-size:18px;font-weight:700}'
    + '.kpi.green .val{color:#057a55}.kpi.red .val{color:#c81e1e}.kpi.blue .val{color:#1a56db}.kpi.orange .val{color:#d97706}'
    + 'h2{font-size:12px;font-weight:700;color:#fff;background:#1a56db;padding:7px 12px;margin:20px 0 0;border-radius:6px 6px 0 0;letter-spacing:.04em}'
    + 'table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0}'
    + 'th{background:#f8fafc;padding:7px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0}'
    + 'td{padding:6px 10px;border-bottom:1px solid #f8fafc;font-size:11px}'
    + 'tfoot tr td{background:#f8fafc;border-top:2px solid #e2e8f0}'
    + '.num{text-align:right;font-weight:600}'
    + '.green{color:#057a55}.red{color:#c81e1e}'
    + '.sig-row{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:48px}'
    + '.sig-box{border-top:1.5px solid #1e293b;padding-top:6px;font-size:11px;color:#64748b;text-align:center}'
    + '.footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}'
    + '@media print{body{padding:12px}@page{margin:10mm;size:A4}}'
    + '</style></head><body>'
    + '<div class="header"><div><div class="logo">\uD83D\uDE9B FleetLedger</div>'
    + '<div class="sub">\u09ae\u09be\u09b8\u09bf\u0995 \u0986\u09af\u09bc-\u09ac\u09cd\u09af\u09af\u09bc \u09aa\u09cd\u09b0\u09a4\u09bf\u09ac\u09c7\u09a6\u09a8 &nbsp;|&nbsp; '+monthLabel+' &nbsp;|&nbsp; '+truckLabel+'</div></div>'
    + '<div style="font-size:11px;color:#94a3b8;text-align:right">\u09ae\u09c1\u09a6\u09cd\u09b0\u09a3\u09c7\u09b0 \u09a4\u09be\u09b0\u09bf\u0996: '+printDate+'<br>\u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4\u0995\u09be\u09b0\u09c0: '+preparedBy+'</div></div>'
    + '<div class="kpi-row">'
    + '<div class="kpi green"><div class="lbl">\u09ae\u09cb\u099f \u0986\u09af\u09bc</div><div class="val">'+fmtP(rev)+'</div></div>'
    + '<div class="kpi red"><div class="lbl">\u09ae\u09cb\u099f \u09ac\u09cd\u09af\u09af\u09bc</div><div class="val">'+fmtP(exp)+'</div></div>'
    + '<div class="kpi '+(profit>=0?'blue':'red')+'"><div class="lbl">\u09a8\u09bf\u099f \u09ae\u09c1\u09a8\u09be\u09ab\u09be</div><div class="val">'+(profit<0?'-':'')+fmtP(Math.abs(profit))+'</div></div>'
    + '<div class="kpi orange"><div class="lbl">\u09ae\u09c1\u09a8\u09be\u09ab\u09be\u09b0 \u09b9\u09be\u09b0</div><div class="val">'+toBnDigits(margin)+'%</div></div>'
    + '</div>'
    + '<h2>\uD83D\uDE9A \u099f\u09cd\u09b0\u09be\u0995 \u0985\u09a8\u09c1\u09af\u09be\u09af\u09bc\u09c0 \u09b8\u09be\u09b0\u09b8\u0982\u0995\u09cd\u09b7\u09c7\u09aa</h2>'
    + '<table><thead><tr><th>\u099f\u09cd\u09b0\u09be\u0995</th><th class="num">\u09ae\u09cb\u099f \u0986\u09af\u09bc</th><th class="num">\u09ae\u09cb\u099f \u09ac\u09cd\u09af\u09af\u09bc</th><th class="num">\u09a8\u09bf\u099f \u09ae\u09c1\u09a8\u09be\u09ab\u09be</th><th class="num">\u09ae\u09c1\u09a8\u09be\u09ab\u09be\u09b0 \u09b9\u09be\u09b0</th><th class="num">\u099f\u09cd\u09b0\u09bf\u09aa</th></tr></thead><tbody>'+truckRows+'</tbody></table>'
    + (showSheets ? '<h2>\uD83D\uDCCB \u09b6\u09bf\u099f \u09ad\u09bf\u09a4\u09cd\u09a4\u09bf\u0995 \u09ac\u09bf\u09b8\u09cd\u09a4\u09be\u09b0\u09bf\u09a4</h2>'
    + '<table><thead><tr><th>\u09b6\u09bf\u099f \u09a8\u09ae\u09cd\u09ac\u09b0</th><th>\u099f\u09cd\u09b0\u09be\u0995</th><th>\u09a4\u09be\u09b0\u09bf\u0996</th><th class="num">\u0986\u09af\u09bc</th><th class="num">\u09ac\u09cd\u09af\u09af\u09bc</th><th class="num">\u09a8\u09bf\u099f</th></tr></thead><tbody>'+sheetRows+'</tbody></table>' : '')
    + (showExpCat ? '<h2>\uD83D\uDCB0 \u0996\u09b0\u099a\u09c7\u09b0 \u09ad\u09be\u0999\u09a8</h2>'
    + '<table><thead><tr><th>\u0996\u09b0\u099a\u09c7\u09b0 \u09a7\u09b0\u09a8</th><th class="num">\u09aa\u09b0\u09bf\u09ae\u09be\u09a3</th><th class="num">\u09ae\u09cb\u099f\u09c7\u09b0 %</th></tr></thead><tbody>'+catRows+'</tbody>'
    + '<tfoot><tr><td><b>\u09ae\u09cb\u099f \u0996\u09b0\u099a</b></td><td class="num red"><b>'+fmtP(exp)+'</b></td><td class="num"><b>100%</b></td></tr></tfoot></table>' : '')
    + (showDrivers ? '<h2>\uD83D\uDC77 \u09a1\u09cd\u09b0\u09be\u0987\u09ad\u09be\u09b0 \u09b8\u09be\u09b0\u09b8\u0982\u0995\u09cd\u09b7\u09c7\u09aa</h2>'
    + '<table><thead><tr><th>\u09a1\u09cd\u09b0\u09be\u0987\u09ad\u09be\u09b0</th><th class="num">\u099f\u09cd\u09b0\u09bf\u09aa \u09b8\u0982\u0996\u09cd\u09af\u09be</th><th class="num">\u09ae\u09cb\u099f \u0986\u09af\u09bc</th></tr></thead><tbody>'+driverRows+'</tbody></table>' : '')
    + '<h2>⛽ জ্বালানি দক্ষতা (মাইলেজ)</h2>'
    + '<table><thead><tr><th>ট্রাক</th><th class="num">মোট দূরত্ব</th><th class="num">মোট জ্বালানি</th><th class="num">গড় দক্ষতা</th></tr></thead><tbody>'+mileageRows+'</tbody></table>'
    + '<div class="sig-row">'
    + '<div class="sig-box">Alamgir (\u09b9\u09bf\u09b8\u09be\u09ac\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0)</div>'
    + '<div class="sig-box">\u09ac\u09cd\u09af\u09ac\u09b8\u09cd\u09a5\u09be\u09aa\u0995</div>'
    + '<div class="sig-box">\u09ae\u09be\u09b2\u09bf\u0995</div>'
    + '</div>'
    + '<div class="footer"><span>FleetLedger \u2014 \u09b8\u09cd\u09ac\u09af\u09bc\u0982\u0995\u09cd\u09b0\u09bf\u09af\u09bc\u09ad\u09be\u09ac\u09c7 \u09a4\u09c8\u09b0\u09bf \u09aa\u09cd\u09b0\u09a4\u09bf\u09ac\u09c7\u09a6\u09a8</span><span>'+monthLabel+' | '+truckLabel+'</span></div>'
    + '<scr'+'ipt>window.onload=function(){window.print();}<'+'/scr'+'ipt>'
    + '</body></html>';

  var win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function switchView(v, btn) {
  if (v === 'usermgmt') { renderUserMgmtTable(); loadActivityLog(); }
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Truck metadata store
var truckMeta = {}; // keyed by truck name: {model, year, color, note}

function openTruckMgmtModal() {
  renderTruckMgmtList();
  document.getElementById('newTruckName').value = '';
  document.getElementById('truckMgmtModal').classList.add('open');
}

function renderTruckMgmtList() {
  var list = document.getElementById('truckMgmtList');
  list.innerHTML = TRUCK_NAMES.length ? TRUCK_NAMES.map(function (t, i) {
    return '<div style="display:flex;align-items:center;gap:8px;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:8px 12px">'
      + '<span style="font-size:14px">🚚</span>'
      + '<input type="text" value="' + t + '" id="te_truck_' + i + '" style="flex:1;border:none;background:transparent;font-size:13px;font-family:inherit;font-weight:600;color:var(--heading)" onchange="renameTruck(' + i + ', this.value)"/>'
      + '<button onclick="deleteTruck(' + i + ')" style="background:#fde8e8;border:1.5px solid #f8d0d0;color:#c81e1e;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit">🗑️ মুছুন</button>'
      + '</div>';
  }).join('') : '<div style="color:var(--muted);font-size:13px;padding:10px">কোনো ট্রাক নেই</div>';
  // update count label
  var lbl = document.getElementById('truckCountLabel');
  if (lbl) lbl.textContent = TRUCK_NAMES.length + 'টি ট্রাক নিবন্ধিত';
}

function addTruck() {
  var name = document.getElementById('newTruckName').value.trim();
  if (!name) { showNotif('ট্রাকের নাম দিন', 'var(--red)'); return; }
  if (TRUCK_NAMES.indexOf(name) !== -1) { showNotif('এই নামে ট্রাক আছে', 'var(--red)'); return; }
  TRUCK_NAMES.push(name);
  document.getElementById('newTruckName').value = '';
  renderTruckMgmtList();
  truckNamesChanged();
  saveTruckList();
  showNotif('ট্রাক যোগ হয়েছে ✓', 'var(--green)');
}

function renameTruck(i, newName) {
  newName = newName.trim();
  if (!newName) return;
  var old = TRUCK_NAMES[i];
  TRUCK_NAMES[i] = newName;
  entries.forEach(function (e) { if (e.truck === old) e.truck = newName; });
  if (truckMeta[old]) { truckMeta[newName] = truckMeta[old]; delete truckMeta[old]; }
  truckNamesChanged();
  saveTruckList();
  showNotif('ট্রাকের নাম পরিবর্তন হয়েছে ✓', 'var(--green)');
}

function deleteTruck(i) {
  var name = TRUCK_NAMES[i];
  var hasData = entries.some(function (e) { return e.truck === name; });
  if (hasData) {
    if (!confirm(name + ' এর এন্ট্রি ডেটা আছে। তবুও মুছবেন?')) return;
  } else {
    if (!confirm(name + ' মুছে ফেলবেন?')) return;
  }
  TRUCK_NAMES.splice(i, 1);
  renderTruckMgmtList();
  truckNamesChanged();
  saveTruckList();
  showNotif(name + ' মুছে ফেলা হয়েছে', 'var(--red)');
}
var fuelAlertMultiplier = 1.5;  // alert if this month > avg * multiplier
var fuelAlertRatioPct = 60;   // alert if fuel > X% of total expenses

function goTruck(truck) {
  openTruckDetail(truck);
}

function openTruckDetail(truck) {
  // switch to trucks view first
  switchView('trucks', document.querySelectorAll('.nav-btn')[1]);
  // hide table, show detail
  document.getElementById('truckTableWrap').style.display = 'none';
  document.getElementById('truckDetailPanel').style.display = 'block';
  document.getElementById('truckDetailTitle').textContent = '🚚 ' + truck;

  var meta = truckMeta[truck] || {};

  // KPI
  var te = entries.filter(function (e) { return e.truck === truck; });
  var rev = te.filter(function (e) { return e.type === 'revenue'; }).reduce(function (s, e) { return s + e.amount; }, 0);
  var exp = te.filter(function (e) { return e.type === 'expense'; }).reduce(function (s, e) { return s + e.amount; }, 0);
  var profit = rev - exp;
  var margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0';
  document.getElementById('truckDetailKPI').innerHTML = [
    { label: 'মোট আয়', val: fmt(rev), color: 'var(--green)' },
    { label: 'মোট ব্যয়', val: fmt(exp), color: 'var(--red)' },
    { label: 'নিট মুনাফা', val: (profit < 0 ? '-' : '') + fmt(Math.abs(profit)), color: profit >= 0 ? 'var(--green)' : 'var(--red)' },
  ].map(function (k) {
    return '<div class="kpi-card ' + (k.color.includes('green') ? 'green' : k.color.includes('red') ? 'red' : 'blue') + '">'
      + '<div class="kpi-label">' + k.label + '</div>'
      + '<div class="kpi-value" style="color:' + k.color + '">' + k.val + '</div></div>';
  }).join('');

  // Truck info
  document.getElementById('truckInfoPanel').innerHTML =
    '<div class="section-title" style="margin-bottom:10px">ট্রাকের তথ্য</div>'
    + '<table style="width:100%;font-size:13px;border-collapse:collapse">'
    + '<tr><td style="color:var(--muted);padding:5px 0;width:40%">নম্বর প্লেট</td><td style="font-weight:600">' + truck + '</td></tr>'
    + '<tr><td style="color:var(--muted);padding:5px 0">মডেল</td><td style="font-weight:600">' + (meta.model || '—') + '</td></tr>'
    + '<tr><td style="color:var(--muted);padding:5px 0">বছর</td><td style="font-weight:600">' + (meta.year || '—') + '</td></tr>'
    + '<tr><td style="color:var(--muted);padding:5px 0">রঙ</td><td style="font-weight:600">' + (meta.color || '—') + '</td></tr>'
    + '<tr><td style="color:var(--muted);padding:5px 0">মন্তব্য</td><td style="font-weight:600">' + (meta.note || '—') + '</td></tr>'
    + '</table>';

  // Driver info
  var driver = drivers.find(function (d) { return d.truck === truck; });
  document.getElementById('truckDriverPanel').innerHTML =
    '<div class="section-title" style="margin-bottom:10px">অ্যাসাইন করা ড্রাইভার</div>'
    + (driver
      ? '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      + '<div style="width:42px;height:42px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:20px">👤</div>'
      + '<div><div style="font-weight:700;font-size:15px">' + driver.name + '</div>'
      + '<div style="font-size:12px;color:var(--muted)">' + driver.phone + '</div></div></div>'
      + '<table style="width:100%;font-size:13px;border-collapse:collapse">'
      + '<tr><td style="color:var(--muted);padding:4px 0;width:45%">বেতন</td><td style="font-weight:600">' + fmt(driver.salary || 0) + '/মাস</td></tr>'
      + '<tr><td style="color:var(--muted);padding:4px 0">NID</td><td style="font-weight:600">' + (driver.nid || '—') + '</td></tr>'
      + '<tr><td style="color:var(--muted);padding:4px 0">লাইসেন্স</td><td style="font-weight:600">' + (driver.license || '—') + '</td></tr>'
      + '</table>'
      : '<div style="color:var(--muted);font-size:13px;padding:10px 0">কোনো ড্রাইভার অ্যাসাইন নেই</div>');

  // This month trips
  var now = new Date(); var thisM = now.getFullYear() + '-' + (now.getMonth() + 1 < 10 ? '0' : '') + (now.getMonth() + 1);
  var monthTrips = te.filter(function (e) { return e.date && e.date.slice(0, 7) === thisM; })
    .sort(function (a, b) { return b.date.localeCompare(a.date); });
  document.getElementById('truckMonthTripCount').textContent = monthTrips.length + 'টি এন্ট্রি';
  document.getElementById('truckMonthTrips').innerHTML = monthTrips.length
    ? monthTrips.map(function (e) {
      return '<tr><td style="color:var(--muted)">' + fmtDate(e.date) + '</td>'
        + '<td>' + e.description + '</td>'
        + '<td style="color:var(--green);font-weight:600">' + (e.type === 'revenue' ? fmt(e.amount) : '—') + '</td>'
        + '<td style="color:var(--red);font-weight:600">' + (e.type === 'expense' ? fmt(e.amount) : '—') + '</td></tr>';
    }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">এই মাসে কোনো ট্রিপ নেই</td></tr>';

  // Maintenance history
  var mhist = maintenanceItems.filter(function (m) { return m.truck === truck; })
    .sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 10);
  document.getElementById('truckMaintHistory').innerHTML = mhist.length
    ? mhist.map(function (m) {
      return '<tr><td style="color:var(--muted)">' + fmtDate(m.date) + '</td>'
        + '<td>' + m.type + '</td><td>' + m.description + '</td>'
        + '<td style="color:var(--red);font-weight:600">' + fmt(m.cost) + '</td></tr>';
    }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px">কোনো মেইনটেন্যান্স রেকর্ড নেই</td></tr>';

  // Mileage
  var mileageEntries = te.filter(function (e) { return e.mileage && e.mileage > 0; })
    .sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);
  var avgMileage = mileageEntries.length ? (mileageEntries.reduce(function(s,e){return s+e.mileage;},0)/mileageEntries.length).toFixed(2) : null;
  var totalDist = te.reduce(function(s,e){return s+(e.distance||0);},0);
  var totalFuel = te.reduce(function(s,e){return s+(e.fuel_liters||0);},0);
  document.getElementById('truckMileageTrack').innerHTML = mileageEntries.length
    ? '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">'
    + '<div style="background:#eff6ff;border-radius:8px;padding:10px;text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">গড় দক্ষতা</div><div style="font-size:16px;font-weight:700;color:#1a56db">'+toBn(avgMileage)+' কি.মি./লি.</div></div>'
    + '<div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">মোট দূরত্ব</div><div style="font-size:16px;font-weight:700;color:#057a55">'+toBn(Math.round(totalDist))+' কি.মি.</div></div>'
    + '<div style="background:#fef9c3;border-radius:8px;padding:10px;text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">মোট জ্বালানি</div><div style="font-size:16px;font-weight:700;color:#d97706">'+toBn(totalFuel.toFixed(1))+' লি.</div></div>'
    + '</div>'
    + '<table style="width:100%;font-size:13px;border-collapse:collapse">'
    + '<tr style="color:var(--muted);font-size:11px"><th style="text-align:left;padding:4px 0">তারিখ</th><th style="text-align:right">দূরত্ব</th><th style="text-align:right">জ্বালানি</th><th style="text-align:right">দক্ষতা</th></tr>'
    + mileageEntries.map(function (e) {
      return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:5px 0">' + fmtDate(e.date) + '</td>'
        + '<td style="text-align:right;color:var(--muted)">' + (e.distance ? toBn(Math.round(e.distance))+' কি.মি.' : '—') + '</td>'
        + '<td style="text-align:right;color:var(--muted)">' + (e.fuel_liters ? toBn(e.fuel_liters)+' লি.' : '—') + '</td>'
        + '<td style="text-align:right;font-weight:600;color:var(--accent)">' + toBn(e.mileage.toFixed(2)) + ' কি.মি./লি.</td></tr>';
    }).join('') + '</table>'
    : '<div style="color:var(--muted);font-size:13px">কোনো মাইলেজ ডেটা নেই</div>';
}

function closeTruckDetail() {
  document.getElementById('truckDetailPanel').style.display = 'none';
  document.getElementById('truckTableWrap').style.display = 'block';
}

function openTruckEditModal() {
  var title = document.getElementById('truckDetailTitle').textContent.replace('🚚 ', '');
  var meta = truckMeta[title] || {};
  document.getElementById('teMeta_truck').value = title;
  document.getElementById('teMeta_model').value = meta.model || '';
  document.getElementById('teMeta_year').value = meta.year || '';
  document.getElementById('teMeta_color').value = meta.color || '';
  document.getElementById('teMeta_note').value = meta.note || '';
  document.getElementById('truckEditModal').classList.add('open');
}

function openFuelAlertSettings() {
  document.getElementById('fas_multiplier').value = fuelAlertMultiplier;
  document.getElementById('fas_ratio').value = fuelAlertRatioPct;
  document.getElementById('fuelAlertSettingsModal').classList.add('open');
}

function saveFuelAlertSettings() {
  fuelAlertMultiplier = parseFloat(document.getElementById('fas_multiplier').value) || 1.5;
  fuelAlertRatioPct = parseFloat(document.getElementById('fas_ratio').value) || 60;
  document.getElementById('fuelAlertSettingsModal').classList.remove('open');
  renderFuelAlerts();
  showNotif('সতর্কতার সীমা আপডেট হয়েছে ✓', 'var(--green)');
}

async function saveTruckMeta() {
  var truck = document.getElementById('teMeta_truck').value;
  var meta = {
    model: document.getElementById('teMeta_model').value,
    year: document.getElementById('teMeta_year').value,
    color: document.getElementById('teMeta_color').value,
    note: document.getElementById('teMeta_note').value,
  };
  truckMeta[truck] = meta;
  // save to Supabase truck_meta table
  try {
    var res = await fetch(S_URL + '/rest/v1/truck_meta?on_conflict=truck_name', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        truck_name: truck,
        model: meta.model,
        year: meta.year ? parseInt(meta.year) : null,
        color: meta.color,
        note: meta.note
      })
    });
    if (!res.ok) console.warn('truck_meta save failed:', res.status);
  } catch (e) { console.warn('truck_meta save error:', e); }
  document.getElementById('truckEditModal').classList.remove('open');
  openTruckDetail(truck);
  showNotif('ট্রাকের তথ্য সেভ হয়েছে ✓', 'var(--green)');
}

async function loadTruckMeta() {
  try {
    var res = await fetch(S_URL + '/rest/v1/truck_meta?select=*', { headers: S_HDR });
    if (!res.ok) return;
    var data = await res.json();
    data.forEach(function (r) {
      truckMeta[r.truck_name] = {
        model: r.model || '', year: r.year || '', color: r.color || '', note: r.note || ''
      };
    });
  } catch (e) { console.warn('loadTruckMeta error:', e); }
}

async function saveTruckList() {
  try {
    // store entire list as a single JSON row with id=1
    await fetch(S_URL + '/rest/v1/truck_list?on_conflict=id', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id: 1, names: JSON.stringify(TRUCK_NAMES) })
    });
  } catch (e) { console.warn('saveTruckList error:', e); }
}

async function loadTruckList() {
  try {
    var res = await fetch(S_URL + '/rest/v1/truck_list?id=eq.1&select=names', { headers: S_HDR });
    if (!res.ok) return;
    var data = await res.json();
    if (data && data[0] && data[0].names) {
      var list = JSON.parse(data[0].names);
      if (Array.isArray(list) && list.length > 0) {
        TRUCK_NAMES.length = 0;
        list.forEach(function (n) { TRUCK_NAMES.push(n); });
        truckNamesChanged(true); // skip render — entries not loaded yet
      }
    }
  } catch (e) { console.warn('loadTruckList error:', e); }
}

function goTruckEntries(truck) {
  document.getElementById('truckFilter').value = truck;
  applyFilters();
  document.querySelectorAll('.nav-btn').forEach((b, i) => { if (i === 2) b.classList.add('active'); else b.classList.remove('active'); });
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-entries').classList.add('active');
}

function adminDeleteEntry(id) {
  if (!confirm('এই এন্ট্রিটি মুছে ফেলবেন?')) return;
  entries = entries.filter(function (e) { return e.id !== id; });
  // delete from Supabase
  fetch(S_URL + '/rest/v1/trips?id=eq.' + id, { method: 'DELETE', headers: S_HDR })
    .catch(function (e) { console.warn('delete failed', e); });
  applyFilters();
  showNotif('এন্ট্রি মুছে ফেলা হয়েছে', 'var(--red)');
}

function adminEditEntry(id) {
  // populate truck dropdown
  var ts = document.getElementById('aeTruck');
  ts.innerHTML = '';
  TRUCK_NAMES.forEach(function (t) { ts.innerHTML += '<option value="' + t + '">' + t + '</option>'; });
  var e = entries.find(function (x) { return x.id === id; });
  if (!e) return;
  document.getElementById('aeId').value = id;
  document.getElementById('aeType').value = e.type;
  document.getElementById('aeTruck').value = e.truck;
  document.getElementById('aeDate').value = e.date;
  document.getElementById('aeAmount').value = e.amount;
  document.getElementById('aeDesc').value = e.description;
  document.getElementById('aeClient').value = e.client || e.category || '';
  document.getElementById('adminEditModal').classList.add('open');
}

function adminSaveEntry() {
  var id = document.getElementById('aeId').value;
  var e = entries.find(function (x) { return x.id === id; });
  if (!e) return;
  e.type = document.getElementById('aeType').value;
  e.truck = document.getElementById('aeTruck').value;
  e.date = document.getElementById('aeDate').value;
  e.amount = parseFloat(document.getElementById('aeAmount').value) || 0;
  e.description = document.getElementById('aeDesc').value;
  e.client = document.getElementById('aeClient').value;
  e.category = e.client;
  // save to Supabase
  fetch(S_URL + '/rest/v1/trips?id=eq.' + id, {
    method: 'PATCH',
    headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
    body: JSON.stringify({
      type: e.type, truck: e.truck, date: e.date,
      amount: e.amount, description: e.description,
      client: e.client, category: e.category
    })
  }).catch(function (err) { console.warn('patch failed', err); });
  document.getElementById('adminEditModal').classList.remove('open');
  applyFilters();
  showNotif('এন্ট্রি আপডেট হয়েছে ✓', 'var(--green)');
}

function openModal(type, sheetRef, truck, date) {
  setModalType(type);
  document.getElementById('modalBg').classList.add('open');
  document.getElementById('fAmount').value = '';
  document.getElementById('fDesc').value = '';
  document.getElementById('fClient').value = '';
  // pre-fill sheet context if provided
  var srEl = document.getElementById('fSheetRef');
  if (srEl) srEl.value = sheetRef || '';
  if (truck) {
    var ft = document.getElementById('fTruck');
    if (ft) ft.value = truck;
  }
  if (date) {
    var fd = document.getElementById('fDate');
    if (fd) fd.value = date;
  }
  // update modal title to show sheet ref
  var title = document.getElementById('modalTitle');
  if (title && sheetRef) title.textContent = 'শিট #' + sheetRef + ' এ যোগ করুন';
  else if (title) title.textContent = 'নতুন এন্ট্রি';
}

function closeModal(e) { if (e.target === document.getElementById('modalBg')) document.getElementById('modalBg').classList.remove('open'); }

function setModalType(type) {
  modalType = type;
  document.getElementById('tabRev').className = 'tab-btn' + (type === 'revenue' ? ' rev-active' : '');
  document.getElementById('tabExp').className = 'tab-btn' + (type === 'expense' ? ' exp-active' : '');
  document.getElementById('fCategoryRow').style.display = type === 'expense' ? 'block' : 'none';
  document.getElementById('fClientRow').style.display = type === 'revenue' ? 'block' : 'none';
  const submitBtn = document.getElementById('modalSubmitBtn');
  submitBtn.textContent = type === 'revenue' ? 'আয় যোগ করুন' : 'ব্যয় যোগ করুন';
  submitBtn.className = 'btn ' + (type === 'revenue' ? 'btn-rev' : 'btn-exp');
}

async function submitEntry() {
  const amt = parseFloat(document.getElementById('fAmount').value);
  if (!amt || amt <= 0) { showNotif('সঠিক পরিমাণ লিখুন', 'var(--red)'); return; }
  const catEl = document.getElementById('fCategory');
  const srEl = document.getElementById('fSheetRef');
  const sheetRef = srEl ? srEl.value || null : null;
  const entry = {
    id: 'm' + Date.now(), type: modalType,
    truck: document.getElementById('fTruck').value,
    date: document.getElementById('fDate').value,
    amount: Math.round(amt),
    description: document.getElementById('fDesc').value || (modalType === 'revenue' ? 'আয় এন্ট্রি' : catEl.value + ' ব্যয়'),
    sheet_ref: sheetRef,
    ...(modalType === 'revenue' ? { client: document.getElementById('fClient').value } : { category: catEl.value }),
  };
  entries.unshift(entry);
  applyFilters();
  document.getElementById('modalBg').classList.remove('open');
  showNotif('⏳ সেভ হচ্ছে...', 'var(--accent)');
  try {
    await dbSave(entry);
    showNotif(modalType === 'revenue' ? '✅ আয়ের এন্ট্রি যোগ হয়েছে!' : '✅ ব্যয়ের এন্ট্রি যোগ হয়েছে!', modalType === 'revenue' ? 'var(--green)' : 'var(--red)');
  } catch(err) {
    showNotif('❌ সেভ ব্যর্থ হয়েছে!', 'var(--red)');
  }
}

function exportCSV() {
  const rows = [['ধরন', 'ট্রাক', 'তারিখ', 'পরিমাণ', 'বিবরণ', 'ক্লায়েন্ট/বিভাগ']];
  filteredEntries.forEach(e => rows.push([e.type === 'revenue' ? 'আয়' : 'ব্যয়', e.truck, e.date, e.amount, e.description, e.client || e.category || '']));
  const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'ফ্লিট-প্রতিবেদন.csv'; a.click();
  showNotif('CSV ডাউনলোড হয়েছে!', 'var(--accent)');
}

function showNotif(msg, color = 'var(--green)') {
  const n = document.getElementById('notif');
  n.textContent = msg; n.style.background = color; n.style.color = '#fff';
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 3000);
}


// ── SCREEN SWITCHER ──
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(function (el) { el.classList.remove('active'); });
  document.getElementById('screen-' + name).classList.add('active');
}

// ── USER SYSTEM ──
var currentUser = null; // { id, username, role }
var allUsers = [];
var selectedUserId = null;

// SHA-256 hash for PIN
async function sha256(str) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function loadUsers() {
  try {
    var r = await fetch(S_URL + '/rest/v1/users?select=id,username,role&order=created_at.asc', { headers: S_HDR });
    if (!r.ok) return;
    allUsers = await r.json();
    renderUserList();
  } catch(e) { console.error('loadUsers error:', e); }
}

function renderUserList() {
  var el = document.getElementById('userList');
  if (!el) return;
  var roleIcon = { admin: '⚙️', operator: '👷', viewer: '👁' };
  var roleLabel = { admin: 'Admin', operator: 'Operator', viewer: 'Viewer' };
  el.innerHTML = allUsers.map(function(u) {
    return '<button data-uid="' + u.id + '" data-uname="' + u.username + '" data-urole="' + u.role + '" onclick="selectUserFromBtn(this)" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;font-family:inherit;font-size:14px;width:100%;text-align:left">'
      + '<span style="font-size:22px">' + roleIcon[u.role] + '</span>'
      + '<div><div style="font-weight:700;color:#1e293b">' + u.username + '</div>'
      + '<div style="font-size:11px;color:#94a3b8">' + roleLabel[u.role] + '</div></div>'
      + '</button>';
  }).join('');
}

function selectUserFromBtn(btn) {
  selectUser(btn.dataset.uid, btn.dataset.uname, btn.dataset.urole);
}
function selectUser(id, username, role) {
  selectedUserId = id;
  document.getElementById('pinIcon').textContent = { admin:'⚙️', operator:'👷', viewer:'👁' }[role] || '🔒';
  document.getElementById('pinTitle').textContent = username;
  document.getElementById('pinSub').textContent = 'PIN দিন';
  document.getElementById('pinErr').textContent = '';
  pinVal = '';
  pinUpdateDots();
  showScreen('pin');
}

async function getDeviceInfo() {
  var ua = navigator.userAgent;
  // OS detection
  var os = 'Unknown';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) os = 'MacBook';
  else if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Linux/.test(ua)) os = 'Linux';

  // Browser detection
  var browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  // Device type
  var device = /Mobile|Android|iPhone|iPad/.test(ua) ? 'Mobile' : 'Desktop';

  // Location via free IP API with fallbacks
  var city = '', region = '';
  try {
    var loc = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(4000) });
    var locData = await loc.json();
    city = locData.cityName || '';
    region = locData.regionName || '';
  } catch(e) {
    try {
      var loc2 = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
      var locData2 = await loc2.json();
      city = locData2.city || '';
      region = locData2.region || '';
    } catch(e2) {}
  }
  return { os: os, browser: browser, device: device, city: city, region: region };
}

async function logActivity(username, role, action) {
  try {
    var info = await getDeviceInfo();
    var deviceStr = info.device + ' · ' + info.os + ' · ' + info.browser;
    var locationStr = [info.city, info.region].filter(Boolean).join(', ');
    await fetch(S_URL + '/rest/v1/activity_log', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        username: username,
        role: role,
        action: action,
        device: deviceStr,
        location: locationStr
      })
    });
  } catch(e) {}
}

// ── PIN ──
var pinTarget = '', pinVal = '';
var pinCodes = { worker: '0000', owner: '1234' };
var pinIcons = { worker: '👷', owner: '📊' };
var pinTitles = { worker: 'Data Entry Access', owner: 'Management Access' };

function pinAsk(role) {
  pinTarget = role; pinVal = '';
  pinUpdateDots();
  document.getElementById('pinIcon').textContent = pinIcons[role];
  document.getElementById('pinTitle').textContent = pinTitles[role];
  document.getElementById('pinErr').textContent = '';
  showScreen('pin');
}
function pinPress(d) {
  if (pinVal.length >= 4) return;
  pinVal += d; pinUpdateDots();
  if (pinVal.length === 4) setTimeout(function() { pinCheck().catch(function(e){ console.error('pinCheck error:',e); }); }, 130);
}
function pinDel() {
  pinVal = pinVal.slice(0, -1); pinUpdateDots();
  document.getElementById('pinErr').textContent = '';
}
function pinUpdateDots() {
  for (var i = 0; i < 4; i++) {
    document.getElementById('pd' + i).className = 'pin-dot' + (i < pinVal.length ? ' on' : '');
  }
}
async function pinCheck() {
  if (!selectedUserId) return;
  var hash = await sha256(pinVal);
  try {
    var r = await fetch(S_URL + '/rest/v1/users?id=eq.' + selectedUserId + '&pin_hash=eq.' + hash + '&select=id,username,role', { headers: S_HDR });
    var matched = await r.json();
    if (matched && matched.length > 0) {
      currentUser = matched[0];
      await logActivity(currentUser.username, currentUser.role, 'login');
      var role = currentUser.role;
      if (role === 'operator') {
        showScreen('worker');
        wInit();
      } else {
        var umBtn = document.getElementById('userMgmtNavBtn');
        if (umBtn) umBtn.style.display = role === 'admin' ? 'inline-flex' : 'none';
        // Set role badge
        var roleIcon = { admin: '⚙️', operator: '👷', viewer: '👁' };
        var roleLabel = { admin: 'Admin', operator: 'Operator', viewer: 'Viewer' };
        var badge = document.getElementById('userRoleBadge');
        if (badge) badge.innerHTML = roleIcon[role] + ' <span>' + currentUser.username + '</span> <span style="opacity:0.6;font-weight:400">(' + roleLabel[role] + ')</span>';
        showScreen('owner');
        Promise.all([dbLoad(), loadTruckList(), loadTruckMeta(), loadDrivers(), loadMaintenance()])
          .then(function(results) {
            var loaded = results[0];
            if (loaded && loaded.length > 0) {
              entries = loaded;
              var addedNew = false;
              entries.forEach(function(e) {
                if (e.truck && TRUCK_NAMES.indexOf(e.truck) === -1) { TRUCK_NAMES.push(e.truck); addedNew = true; }
              });
              if (addedNew) { saveTruckList(); truckNamesChanged(true); }
            } else { entries = []; }
            applyFilters(); renderAll();
          }).catch(function(err) { console.error('load error:', err); applyFilters(); });
      }
    } else {
      document.getElementById('pinErr').textContent = '❌ ভুল পিন। আবার চেষ্টা করুন।';
      pinVal = ''; pinUpdateDots();
      var b = document.querySelector('.pin-box');
      b.style.animation = 'none'; void b.offsetWidth; b.style.animation = 'shake .3s ease';
    }
  } catch(e) {
    console.error('pinCheck error:', e);
    document.getElementById('pinErr').textContent = '❌ সংযোগ ব্যর্থ। আবার চেষ্টা করুন।';
    pinVal = ''; pinUpdateDots();
  }
}

// ── SUPABASE ──
var S_URL = 'https://ggarbfxekttnimdhioga.supabase.co';
var S_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnYXJiZnhla3R0bmltZGhpb2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzA4ODQsImV4cCI6MjA4ODIwNjg4NH0.u_RD1mtHKRI114gnJEaqLBLK3lTF_2MGG3DmnhqWFYM';
var S_HDR = { 'apikey': S_KEY, 'Authorization': 'Bearer ' + S_KEY, 'Content-Type': 'application/json' };

// ── SHEET REFERENCE NUMBER ──
// Format: lastPart(truck)/YYYY/MM/SEQ  e.g. 9862/2026/01/003
function generateSheetRef(truck, date) {
  // extract last segment of truck name (digits after last -)
  var truckCode = truck.replace(/[^0-9]/g, '').slice(-4) || truck.slice(-4);
  var yr  = date.slice(0, 4);
  var mo  = date.slice(5, 7);
  // count existing sheets for this truck+month
  var existing = entries.filter(function(e) {
    return e.truck === truck && e.sheet_ref && e.sheet_ref.startsWith(truckCode + '/' + yr + '/' + mo + '/');
  });
  // find max seq
  var maxSeq = 0;
  existing.forEach(function(e) {
    var parts = e.sheet_ref.split('/');
    var seq = parseInt(parts[3]) || 0;
    if (seq > maxSeq) maxSeq = seq;
  });
  var seq = maxSeq + 1;
  var seqStr = seq < 10 ? '00' + seq : seq < 100 ? '0' + seq : '' + seq;
  return truckCode + '/' + yr + '/' + mo + '/' + seqStr;
}

async function dbLoad() {
  try {
    var r = await fetch(S_URL + '/rest/v1/trips?select=*&order=date.desc', { headers: S_HDR });
    if (!r.ok) {
      console.error('dbLoad failed:', r.status, await r.text());
      return null;
    }
    var data = await r.json();
    console.log('dbLoad: loaded', data.length, 'entries');
    return data;
  } catch (e) {
    console.error('dbLoad error:', e);
    return null;
  }
}
async function dbSave(e) {
  try {
    // only save fields that exist in Supabase trips table
    var payload = {
      type:       e.type,
      truck:      e.truck,
      date:       e.date,
      amount:     e.amount,
      description:e.description,
      client:     e.client     || null,
      category:   e.category   || null,
      sheet_ref:  e.sheet_ref  || null
    };
    var res = await fetch(S_URL + '/rest/v1/trips', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      var err = await res.text();
      console.error('dbSave failed:', res.status, err);
      throw new Error('Save failed: ' + res.status + ' ' + err);
    }
  } catch (x) {
    console.error('dbSave error:', x);
  }
}

// ── WORKER FORM ──
var W_EXPS = [
  { id: 'fuel', bn: 'তেল', en: 'Fuel', auto: false },
  { id: 'labor', bn: 'লেবার', en: 'Labour', auto: false },
  { id: 'toll', bn: 'ব্রিজ/টোল', en: 'Bridge/Toll', auto: false },
  { id: 'police', bn: 'চাঁদা/পুলিশ', en: 'Bribe/Police', auto: false },
  { id: 'commission', bn: 'কমিশন (১০%)', en: 'Commission 10%', auto: true },
  { id: 'allowance', bn: 'দৈনিক ভাতা', en: 'Daily Allowance', auto: false },
  { id: 'tire', bn: 'টায়ার', en: 'Tyre', auto: false },
  { id: 'maintenance', bn: 'মেইনটেন্যান্স', en: 'Maintenance', auto: false },
  { id: 'salary', bn: 'ড্রাইভার স্যালারি', en: 'Driver Salary', auto: false },
  { id: 'annual', bn: 'বার্ষিক গাড়ির কাজ', en: 'Annual Vehicle', auto: false },
  { id: 'fine', bn: 'কেইস/ফাইন', en: 'Case/Fine', auto: false },
  { id: 'other', bn: 'অন্যান্য (৫০০+)', en: 'Other 500+', auto: false },
  { id: 'discount', bn: 'ঐচ্ছিক ছাড়', en: 'Optional Discount', auto: false },
];
var BNN = ['১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০', '১১', '১২'];

// Multi-trip rows array
var wTripData = [];

function wInit() {
  var wp = document.getElementById('wPlate');
  wp.innerHTML = '<option value="">— বেছে নিন —</option>';
  TRUCK_NAMES.forEach(function (t) { wp.innerHTML += '<option value="' + t + '">' + t + '</option>'; });
  var tb = document.getElementById('wExpBody');
  tb.innerHTML = W_EXPS.map(function (e, i) {
    return '<tr><td style="padding:4px 9px"><div class="enum">' + BNN[i] + '</div></td>'
      + '<td><div class="elbl">' + e.bn + '<small>' + e.en + '</small></div></td>'
      + '<td style="padding:4px 11px"><div style="display:flex;align-items:center;gap:4px;justify-content:flex-end">'
      + '<span style="color:#9ca3af;font-size:11px">৳</span>'
      + '<input type="number" id="we_' + e.id + '" class="einp' + (e.auto ? ' ro' : '') + '" '
      + 'placeholder="' + (e.auto ? 'auto' : '০') + '" ' + (e.auto ? 'readonly' : 'oninput="wCalc()"')
      + ' style="width:90px"/></div></td></tr>';
  }).join('');
  // start with 5 empty trip rows — pre-fill today's date
  wTripData = [];
  var todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  for (var i = 0; i < 5; i++) wTripData.push({ date: todayISO, route: '', fare: 0 });
  wRenderTripRows();
  wCalc(); wCalcM();
}

function wRenderTripRows() {
  var today = new Date().toISOString().split('T')[0];
  var tbody = document.getElementById('wTripRows');
  tbody.innerHTML = wTripData.map(function (t, i) {
    var bn = (i + 1).toString().replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
    return '<tr style="border-bottom:1px solid #f1f5f9">'
      + '<td style="padding:6px 10px;font-size:12px;color:#94a3b8;font-weight:700">' + bn + '</td>'
      + '<td style="padding:4px 6px">'
      + '<div style="display:flex;align-items:center;gap:3px">'
      + '<input type="number" min="1" max="31" placeholder="DD" value="' + (t.date ? t.date.split('-')[2] : '') + '" oninput="wUpdateDate(' + i + ',\'d\',this.value)" style="border:1.5px solid #e2e8f0;border-radius:6px;padding:6px 4px;font-size:12px;font-family:inherit;width:42px;text-align:center"/>'
      + '<select onchange="wUpdateDate(' + i + ',\'m\',this.value)" style="border:1.5px solid #e2e8f0;border-radius:6px;padding:6px 4px;font-size:11px;font-family:inherit;font-weight:700;color:#374151">'
      + ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(function (m, mi) { var mv = String(mi + 1).padStart(2, '0'); return '<option value="' + mv + '"' + (t.date && t.date.split('-')[1] === mv ? ' selected' : '') + '>' + m + '</option>'; }).join('')
      + '</select>'
      + '<input type="number" min="2020" max="2099" placeholder="YYYY" value="' + (t.date ? t.date.split('-')[0] : new Date().getFullYear()) + '" oninput="wUpdateDate(' + i + ',\'y\',this.value)" style="border:1.5px solid #e2e8f0;border-radius:6px;padding:6px 4px;font-size:12px;font-family:inherit;width:58px;text-align:center"/>'
      + '</div>'
      + '</td>'
      + '<td style="padding:4px 6px"><input type="text" value="' + t.route + '" placeholder="রুট/গন্তব্য" oninput="wTripData[' + i + '].route=this.value" style="border:1.5px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;width:100%;min-width:120px"/></td>'
      + '<td style="padding:4px 6px">'
      + '<input type="number" value="' + (t.fare || '') + '" placeholder="০" oninput="wTripFareInput(' + i + ',this)" style="border:1.5px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;width:90px;text-align:right"/>'
      + '<div id="wFareBn' + i + '" style="font-size:10px;color:#057a55;text-align:right;min-height:14px">' + (t.fare > 0 ? wFmt(t.fare) : '') + '</div>'
      + '</td>'
      + '<td style="padding:4px 6px;text-align:center">'
      + (wTripData.length > 1 ? '<button onclick="wRemoveTripRow(' + i + ')" style="background:#fde8e8;border:none;border-radius:4px;width:22px;height:22px;cursor:pointer;color:#c81e1e;font-size:14px;line-height:1">×</button>' : '')
      + '</td>'
      + '</tr>';
  }).join('');
  wCalc();
}

function wAddTripRow() {
  wTripData.push({ date: '', route: '', fare: 0 });
  wRenderTripRows();
}

function wRemoveTripRow(i) {
  wTripData.splice(i, 1);
  wRenderTripRows();
}
function wTripFareInput(i, el) {
  wTripData[i].fare = parseFloat(el.value) || 0;
  var bn = document.getElementById('wFareBn' + i);
  if (bn) bn.textContent = wTripData[i].fare > 0 ? wFmt(wTripData[i].fare) : '';
  wCalc();
}

function wUpdateDate(i, part, val) {
  var now = new Date();
  var d = wTripData[i].date;
  // parse existing or use today
  var parts = (d && d.length === 10) ? d.split('-') : [
    now.getFullYear() + '',
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ];
  if (parts.length !== 3) parts = [now.getFullYear() + '', '01', '01'];
  if (part === 'y' && val && val.length === 4) parts[0] = val;
  if (part === 'm') parts[1] = String(parseInt(val) || 1).padStart(2, '0');
  if (part === 'd') parts[2] = String(parseInt(val) || 1).padStart(2, '0');
  wTripData[i].date = parts.join('-');
  wCalc();
}

function wNv(id) { var el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }
function wFmt(n) { var v = Math.abs(Math.round(n)).toString(); var r = v.length > 3 ? v.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + v.slice(-3) : v; return '৳' + r.replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; }); }
function wCalc() {
  // sum all trip fares from wTripData
  var fare = wTripData.reduce(function (s, t) { return s + (t.fare || 0); }, 0);
  var comm = Math.round(fare * .10);
  var cel = document.getElementById('we_commission'); if (cel) cel.value = comm || '';
  var tot = 0; W_EXPS.forEach(function (e) { var el = document.getElementById('we_' + e.id); tot += el ? (parseFloat(el.value) || 0) : 0; });
  var disc = wNv('we_discount'), net = fare - tot, fin = net;
  // update trip total row
  var tg = document.getElementById('wCGross'); if (tg) tg.textContent = wFmt(fare);
  var tg2 = document.getElementById('wCGross2'); if (tg2) tg2.textContent = wFmt(fare);
  document.getElementById('wExpTotal').textContent = wFmt(tot);
  document.getElementById('wCExp').textContent = wFmt(tot);
  var wCNet = document.getElementById('wCNet'); if (wCNet) { wCNet.textContent = wFmt(net); wCNet.style.color = net >= 0 ? '#1a56db' : '#c81e1e'; }
  document.getElementById('wCFinal').textContent = wFmt(fin);
  document.getElementById('wCFinal').style.color = fin >= 0 ? '#fbbf24' : '#fca5a5';
}
function wCalcM() {
  var prev = wNv('wMPrev'), curr = wNv('wMCurr'), lit = wNv('wMLiters'), dist = curr - prev;
  if (dist > 0) document.getElementById('wMDist').value = dist;
  var eff = (lit > 0 && dist > 0) ? (dist / lit).toFixed(2) : null;
  document.getElementById('wMRes').textContent = eff ? eff.replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; }) + '  কি.মি./লি.' : '— কি.মি./লি.';
}
function wPreview() {
  var plate = document.getElementById('wPlate').value;
  if (!plate) { showNotif('গাড়ির নম্বর বেছে নিন', 'var(--red)'); return; }
  var driver = document.getElementById('wDriver').value || '—';
  var validTrips = wTripData.filter(function(t) { return t.fare > 0 && t.route && t.route.trim() && t.date && t.date.length === 10; });
  if (!validTrips.length) { showNotif('কমপক্ষে একটি ট্রিপে রুট ও ভাড়া দিন', 'var(--red)'); return; }

  var fare = wTripData.reduce(function(s, t) { return s + (t.fare || 0); }, 0);
  var tot = 0; W_EXPS.forEach(function(e) { var el = document.getElementById('we_' + e.id); tot += el ? (parseFloat(el.value) || 0) : 0; });
  var fin = fare - tot;
  var note = document.getElementById('wNote') ? document.getElementById('wNote').value : '';

  var tripsHTML = validTrips.map(function(t, i) {
    return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:5px 8px;color:#64748b">' + (i+1) + '</td><td style="padding:5px 8px">' + t.route + '</td><td style="padding:5px 8px;text-align:right;color:#057a55;font-weight:700">' + wFmt(t.fare) + '</td></tr>';
  }).join('');

  var expsHTML = W_EXPS.map(function(e) {
    var el = document.getElementById('we_' + e.id), amt = el ? (parseFloat(el.value) || 0) : 0;
    if (!amt) return '';
    return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:5px 8px;color:#64748b">' + e.bn + '</td><td style="padding:5px 8px;text-align:right;color:#c81e1e;font-weight:600">' + wFmt(amt) + '</td></tr>';
  }).join('');

  var html = '<div style="margin-bottom:12px"><span style="font-size:12px;color:#64748b">ট্রাক</span><div style="font-weight:700;font-size:15px;color:#1e293b">' + plate + '</div></div>'
    + '<div style="margin-bottom:12px"><span style="font-size:12px;color:#64748b">ড্রাইভার</span><div style="font-weight:600">' + driver + '</div></div>'
    + '<div style="margin-bottom:10px;font-weight:700;color:#1e293b;border-bottom:1.5px solid #e2e8f0;padding-bottom:4px">ট্রিপ সমূহ</div>'
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:12px">' + tripsHTML + '</table>'
    + (expsHTML ? '<div style="margin-bottom:10px;font-weight:700;color:#1e293b;border-bottom:1.5px solid #e2e8f0;padding-bottom:4px">খরচ সমূহ</div><table style="width:100%;border-collapse:collapse;margin-bottom:12px">' + expsHTML + '</table>' : '')
    + '<div style="background:#1e293b;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">'
    + '<span style="color:#94a3b8;font-size:13px">নিট ক্যাশ (চূড়ান্ত)</span>'
    + '<span style="font-size:18px;font-weight:800;color:' + (fin >= 0 ? '#34d399' : '#f87171') + '">' + wFmt(fin) + '</span></div>'
    + (note ? '<div style="margin-top:10px;font-size:12px;color:#64748b">মন্তব্য: ' + note + '</div>' : '');

  document.getElementById('previewContent').innerHTML = html;
  document.getElementById('previewBg').style.display = 'block';
}

async function wSubmit() {
  var plate = document.getElementById('wPlate').value;
  if (!plate) { showNotif('গাড়ির নম্বর বেছে নিন', 'var(--red)'); return; }
  var driver = document.getElementById('wDriver').value || '—';

  var validTrips = wTripData.filter(function (t) {
    return t.fare > 0 && t.route && t.route.trim() && t.date && t.date.length === 10;
  });

  if (!validTrips.length) {
    showNotif('কমপক্ষে একটি ট্রিপে রুট ও ভাড়া দিন', 'var(--red)');
    return;
  }

  // use first valid trip date for expenses
  var expDate = validTrips[0].date;

  // generate one sheet reference for this entire submission
  var sheetRef = generateSheetRef(plate, expDate);

  // Duplicate check — same truck + same date already submitted?
  var todaySheets = entries.filter(function(e) {
    return e.truck === plate && e.date === expDate && e.sheet_ref;
  });
  if (todaySheets.length > 0) {
    var existingRef = todaySheets[0].sheet_ref;
    if (!confirm('⚠️ সতর্কতা!\n\n' + plate + ' ট্রাকের জন্য ' + expDate + ' তারিখে ইতিমধ্যে একটি শিট (#' + existingRef + ') জমা আছে।\n\nআবার জমা দিতে চান?')) {
      return;
    }
  }

  var savePromises = [];

  // Capture mileage data
  var mPrev = parseFloat(document.getElementById('wMPrev') ? document.getElementById('wMPrev').value : 0) || 0;
  var mCurr = parseFloat(document.getElementById('wMCurr') ? document.getElementById('wMCurr').value : 0) || 0;
  var mLit  = parseFloat(document.getElementById('wMLiters') ? document.getElementById('wMLiters').value : 0) || 0;
  var mDist = mCurr > mPrev ? mCurr - mPrev : 0;
  var mEff  = (mLit > 0 && mDist > 0) ? parseFloat((mDist / mLit).toFixed(2)) : 0;

  validTrips.forEach(function (t, ti) {
    var rev = { id: 'w' + Date.now() + ti, type: 'revenue', truck: plate, date: t.date, amount: t.fare, description: t.route, client: driver, sheet_ref: sheetRef, mileage: mEff, distance: mDist, fuel_liters: mLit };
    entries.unshift(rev);
    savePromises.push(dbSave(rev));
  });

  W_EXPS.forEach(function (e) {
    var el = document.getElementById('we_' + e.id), amt = el ? (parseFloat(el.value) || 0) : 0;
    if (amt > 0) {
      var exp = { id: 'wx' + Date.now() + e.id, type: 'expense', truck: plate, date: expDate, amount: amt, category: e.bn, description: e.bn + ' ব্যয়', sheet_ref: sheetRef };
      entries.unshift(exp);
      savePromises.push(dbSave(exp));
    }
  });

  // ঐচ্ছিক ছাড় is now part of W_EXPS — handled above

  // wait for all saves — show clear result to operator
  showNotif('⏳ সেভ হচ্ছে...', 'var(--accent)');
  try {
    await Promise.all(savePromises);
    // reset form
    ['wCode', 'wDriver', 'wHelper', 'wMPrev', 'wMCurr', 'wMLiters', 'wMDist'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    W_EXPS.forEach(function (e) { var el = document.getElementById('we_' + e.id); if (el) el.value = ''; });
    wTripData = [];
    var todayISO2 = new Date().toISOString().split('T')[0];
    for (var i = 0; i < 5; i++) wTripData.push({ date: todayISO2, route: '', fare: 0 });
    wRenderTripRows();
    wCalc(); wCalcM();
    applyFilters();
    // big success message for operator
    var btn = document.getElementById('wSubmitBtn');
    if (btn) { btn.textContent = '✅ সফলভাবে জমা হয়েছে!'; btn.style.background = '#057a55'; }
    showNotif('✅ শিট #' + sheetRef + ' সফলভাবে জমা হয়েছে!', 'var(--green)');
    setTimeout(function () {
      if (btn) { btn.textContent = '✅ শিট জমা দিন / Submit All'; btn.style.background = ''; }
      showScreen('role');
    }, 2000);
  } catch (err) {
    console.error('Submit error:', err);
    showNotif('❌ সেভ ব্যর্থ হয়েছে! ইন্টারনেট চেক করুন।', 'var(--red)');
  }
}


// ════════════════════════════════════════════════════════
//  DEPOT FEASIBILITY DASHBOARD
// ════════════════════════════════════════════════════════

var depotRoutes = [];
var depotTrips = [];
var depotCofRate = 0; // annual interest rate %

// ── Supabase DB helpers for depot ──
async function depotLoadRoutes() {
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var res = await fetch(S_URL + '/rest/v1/depot_routes?select=*&order=created_at.asc', { headers: S_HDR });
      if (!res.ok) { console.warn('depotLoadRoutes HTTP:', res.status); return; }
      var data = await res.json();
      depotRoutes = data.map(function (r) {
        return {
          id: r.id, factory: r.factory, depot: r.depot,
          name: r.name, rate: r.rate, breakeven: r.breakeven || 0
        };
      });
      return; // success
    } catch (e) {
      console.warn('depotLoadRoutes attempt ' + attempt + ' failed:', e.message);
      if (attempt < 3) await new Promise(function (r) { setTimeout(r, 800 * attempt); });
    }
  }
}

async function depotLoadTrips() {
  try {
    var res = await fetch(S_URL + '/rest/v1/depot_trips?select=*&order=created_at.desc', { headers: S_HDR });
    if (!res.ok) return;
    var data = await res.json();
    depotTrips = data.map(function (t) {
      return {
        id: t.id, date: t.date, routeId: t.route_id,
        route: t.route, factory: t.factory, depot: t.depot,
        kg: t.kg, rate: t.rate, revenue: t.revenue,
        rent: t.rent, profit: t.profit, note: t.note || ''
      };
    });
  } catch (e) { console.warn('depotLoadTrips error:', e); }
}

async function depotSaveRouteToDB(r) {
  try {
    var res = await fetch(S_URL + '/rest/v1/depot_routes?on_conflict=id', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        id: r.id, factory: r.factory, depot: r.depot,
        name: r.name, rate: r.rate, breakeven: r.breakeven
      })
    });
    if (!res.ok) {
      var errText = await res.text();
      showNotif('DB Error ' + res.status + ': ' + errText.slice(0, 80), 'var(--red)');
    } else {
      showNotif('রুট সেভ হয়েছে ✓', 'var(--green)');
    }
  } catch (e) {
    showNotif('Network error: ' + e.message, 'var(--red)');
  }
}

async function depotSaveTripToDB(t) {
  try {
    var res = await fetch(S_URL + '/rest/v1/depot_trips?on_conflict=id', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        id: t.id, date: t.date, route_id: t.routeId,
        route: t.route, factory: t.factory, depot: t.depot,
        kg: t.kg, rate: t.rate, revenue: t.revenue,
        rent: t.rent, profit: t.profit, note: t.note || null
      })
    });
    if (!res.ok) console.warn('depotSaveTrip failed:', res.status, await res.text());
  } catch (e) { console.warn('depotSaveTrip error:', e); }
}

var MONTHS_BN_D = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
var MONTHS_SH_D = ["জান", "ফেব", "মার", "এপ্র", "মে", "জুন", "জুল", "আগ", "সেপ", "অক্ট", "নভ", "ডিস"];

function dFmt(n) {
  var v = Math.abs(Math.round(n)).toString();
  var r = v.length > 3 ? v.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + v.slice(-3) : v;
  return '৳' + r.replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
}
function dFmtKg(n) {
  return Math.round(n).toString().replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; }) + ' KG';
}
function dFmtNum(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function depotGetFiltered() {
  var fFac = document.getElementById('dFilterFactory') ? document.getElementById('dFilterFactory').value : '';
  var fDep = document.getElementById('dFilterDepot') ? document.getElementById('dFilterDepot').value : '';
  var fMon = document.getElementById('dFilterMonth') ? document.getElementById('dFilterMonth').value : '';
  return depotTrips.filter(function (t) {
    var okF = !fFac || t.factory === fFac;
    var okD = !fDep || t.depot === fDep;
    var okM = !fMon || new Date(t.date).getMonth() === +fMon;
    return okF && okD && okM;
  });
}

function depotRender() {
  var trips = depotGetFiltered();
  depotRenderKPIs(trips);
  depotRenderMonthChart();
  depotRenderBreakeven(trips);
  depotRenderByFactory(trips);
  depotRenderByDepot(trips);
  depotRenderRoutesList();
  depotRenderRouteTable(trips);
  depotRenderTripLog(trips);
  depotPopulateFilters();
}

function depotRenderRoutesList() {
  var el = document.getElementById('depotRoutesList');
  var cnt = document.getElementById('depotRouteCount');
  if (!el) return;
  var n = depotRoutes.length.toString().replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
  if (cnt) cnt.textContent = n + 'টি রুট';
  if (!depotRoutes.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;grid-column:1/-1;padding:12px 0">কোনো রুট নেই — রুট যোগ করুন</div>';
    return;
  }
  el.innerHTML = depotRoutes.map(function (r) {
    return '<div style="background:#f8fafc;border:1.5px solid var(--border);border-radius:9px;padding:12px 14px">'
      + '<div style="font-weight:700;font-size:13px;color:var(--heading);margin-bottom:5px">' + r.name + '</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-bottom:3px">🏭 ' + r.factory + '</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">📦 ' + r.depot + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<span style="background:#eff6ff;color:#1a56db;padding:3px 9px;border-radius:20px;font-size:12px;font-weight:700">৳' + r.rate + '/KG</span>'
      + (r.breakeven ? '<span style="font-size:11px;color:var(--muted)">BE: ' + Math.round(r.breakeven).toLocaleString() + ' KG</span>' : '')
      + '</div>'
      + '<div style="display:flex;gap:6px;border-top:1px solid var(--border);padding-top:9px">'
      + '<button onclick="depotEditRoute(\'' + r.id + '\')" style="background:#fff;border:1.5px solid #e5a000;color:#e5a000;border-radius:20px;padding:4px 12px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit">✏️ Edit</button>'
      + '<button onclick="depotDeleteRoute(\'' + r.id + '\')" style="background:#fff;border:1.5px solid #f98080;color:#c81e1e;border-radius:20px;padding:4px 12px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit">🚫 Delete</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

function depotRenderKPIs(trips) {
  var rev = 0, cost = 0, kg = 0;
  trips.forEach(function (t) { rev += t.revenue; cost += t.rent; kg += t.kg; });
  var totalCof = rev * ((depotCofRate || 0) / 100) * (30 / 365);
  var profit = rev - cost - totalCof;
  document.getElementById('dKpiRev').textContent = dFmt(rev);
  document.getElementById('dKpiCost').textContent = dFmt(cost);
  document.getElementById('dKpiKg').textContent = dFmtNum(kg) + ' KG';
  var pel = document.getElementById('dKpiProfit');
  pel.textContent = (profit < 0 ? '-' : '') + dFmt(Math.abs(profit));
  pel.className = 'kpi-value ' + (profit >= 0 ? 'blue' : 'red');
  pel.closest('.kpi-card').className = 'kpi-card ' + (profit >= 0 ? 'blue' : 'red');
}

function depotRenderMonthChart() {
  var data = {};
  depotTrips.forEach(function (t) {
    var d = new Date(t.date), key = d.getFullYear() + '-' + d.getMonth();
    if (!data[key]) data[key] = { label: MONTHS_SH_D[d.getMonth()], rev: 0, cost: 0, m: d.getMonth(), y: d.getFullYear() };
    data[key].rev += t.revenue;
    data[key].cost += t.rent;
  });
  var months = Object.values(data).sort(function (a, b) { return a.y !== b.y ? a.y - b.y : a.m - b.m; }).slice(-6);
  var max = Math.max.apply(null, months.map(function (m) { return Math.max(m.rev, m.cost); }).concat([1]));
  document.getElementById('depotMonthChart').innerHTML = months.map(function (m) {
    return '<div class="chart-col">'
      + '<div class="chart-bars-inner">'
      + '<div class="bar bar-rev" style="height:' + (m.rev / max * 100) + '%" title="রাজস্ব: ' + dFmt(m.rev) + '"></div>'
      + '<div class="bar bar-exp" style="height:' + (m.cost / max * 100) + '%" title="খরচ: ' + dFmt(m.cost) + '"></div>'
      + '</div><div class="bar-label">' + m.label + '</div></div>';
  }).join('');
}

function depotRenderBreakeven(trips) {
  var rev = 0, cost = 0, kg = 0, n = trips.length;
  trips.forEach(function (t) { rev += t.revenue; cost += t.rent; kg += t.kg; });
  var cofRate = depotCofRate || 0;
  var totalCof = rev * (cofRate / 100) * (30 / 365);
  var totalCost = cost + totalCof;
  var profit = rev - totalCost;
  var margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0';
  var avgProfit = n > 0 ? Math.round(profit / n) : 0;

  // best & worst route by profit
  var routeMap = {};
  trips.forEach(function (t) {
    if (!routeMap[t.route]) routeMap[t.route] = { rev: 0, cost: 0 };
    routeMap[t.route].rev += t.revenue; routeMap[t.route].cost += t.rent;
  });
  var routeArr = Object.keys(routeMap).map(function (k) {
    return { name: k, profit: routeMap[k].rev - routeMap[k].cost };
  }).sort(function (a, b) { return b.profit - a.profit; });
  var bestRoute = routeArr.length ? routeArr[0].name : '—';
  var worstRoute = routeArr.length > 1 ? routeArr[routeArr.length - 1].name : (routeArr.length === 1 ? routeArr[0].name : '—');

  var rows = [
    { label: 'মোট রাজস্ব', val: dFmt(rev), color: 'var(--green)' },
    { label: 'মোট ট্রাক ভাড়া', val: dFmt(cost), color: 'var(--red)' },
    { label: 'তহবিল খরচ (COF)', val: dFmt(Math.round(totalCof)), color: 'var(--red)' },
    { label: 'নিট মুনাফা', val: (profit < 0 ? '-' : '') + dFmt(Math.abs(profit)), color: profit >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'মুনাফার হার', val: fmtPct(margin), color: 'var(--accent2)' },
    { label: 'গড় মুনাফা/ট্রিপ', val: (avgProfit < 0 ? '-' : '') + dFmt(Math.abs(avgProfit)), color: avgProfit >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'মোট কেজি পরিবহন', val: kg.toLocaleString() + ' কেজি', color: 'var(--heading)' },
    { label: 'সর্বোচ্চ লাভজনক রুট', val: bestRoute, color: 'var(--green)' },
    { label: 'সর্বনিম্ন লাভজনক রুট', val: worstRoute, color: 'var(--red)' },
  ];

  document.getElementById('depotBreakeven').innerHTML = rows.map(function (r) {
    return '<div class="d-be-row"><span class="d-be-key">' + r.label + '</span>'
      + '<span class="d-be-val" style="color:' + r.color + '">' + r.val + '</span></div>';
  }).join('');
}


function depotRenderByFactory(trips) {
  var map = {};
  trips.forEach(function (t) {
    if (!map[t.factory]) map[t.factory] = { rev: 0, cost: 0, kg: 0, n: 0 };
    map[t.factory].rev += t.revenue; map[t.factory].cost += t.rent;
    map[t.factory].kg += t.kg; map[t.factory].n++;
  });
  var arr = Object.entries(map).map(function (e) { return { name: e[0], rev: e[1].rev, cost: e[1].cost, profit: e[1].rev - e[1].cost, kg: e[1].kg, n: e[1].n }; })
    .sort(function (a, b) { return b.profit - a.profit; });
  var maxP = Math.max.apply(null, arr.map(function (x) { return Math.abs(x.profit); }).concat([1]));
  document.getElementById('depotByFactory').innerHTML = arr.length ? arr.map(function (x) {
    var pct = (Math.abs(x.profit) / maxP * 100);
    return '<div class="d-bar-row">'
      + '<div class="d-bar-lbl" title="' + x.name + '">' + x.name + '</div>'
      + '<div class="d-bar-track"><div class="d-bar-fill" style="width:' + pct + '%;background:' + (x.profit >= 0 ? 'var(--green)' : 'var(--red)') + '"></div></div>'
      + '<div class="d-bar-val" style="color:' + (x.profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (x.profit < 0 ? '-' : '') + dFmt(Math.abs(x.profit)) + '</div>'
      + '</div>';
  }).join('') : '<p style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center">কোনো ডেটা নেই</p>';
}

function depotRenderByDepot(trips) {
  var map = {};
  trips.forEach(function (t) {
    if (!map[t.depot]) map[t.depot] = { rev: 0, cost: 0, kg: 0, n: 0 };
    map[t.depot].rev += t.revenue; map[t.depot].cost += t.rent;
    map[t.depot].kg += t.kg; map[t.depot].n++;
  });
  var arr = Object.entries(map).map(function (e) { return { name: e[0], rev: e[1].rev, cost: e[1].cost, profit: e[1].rev - e[1].cost }; })
    .sort(function (a, b) { return b.profit - a.profit; });
  var maxP = Math.max.apply(null, arr.map(function (x) { return Math.abs(x.profit); }).concat([1]));
  document.getElementById('depotByDepot').innerHTML = arr.length ? arr.map(function (x) {
    var pct = (Math.abs(x.profit) / maxP * 100);
    return '<div class="d-bar-row">'
      + '<div class="d-bar-lbl" title="' + x.name + '">' + x.name + '</div>'
      + '<div class="d-bar-track"><div class="d-bar-fill" style="width:' + pct + '%;background:' + (x.profit >= 0 ? 'var(--green)' : 'var(--red)') + '"></div></div>'
      + '<div class="d-bar-val" style="color:' + (x.profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (x.profit < 0 ? '-' : '') + dFmt(Math.abs(x.profit)) + '</div>'
      + '</div>';
  }).join('') : '<p style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center">কোনো ডেটা নেই</p>';
}

function depotRenderRouteTable(trips) {
  var map = {};
  trips.forEach(function (t) {
    var k = t.factory + '||' + t.depot + '||' + t.route;
    if (!map[k]) map[k] = { route: t.route, factory: t.factory, depot: t.depot, rev: 0, cost: 0, kg: 0, n: 0, rate: t.rate };
    map[k].rev += t.revenue; map[k].cost += t.rent; map[k].kg += t.kg; map[k].n++;
  });
  var arr = Object.values(map).map(function (x) {
    return Object.assign(x, { profit: x.rev - x.cost, margin: x.rev > 0 ? toBn(((x.rev - x.cost) / x.rev * 100).toFixed(1)) : '০' });
  }).sort(function (a, b) { return b.profit - a.profit; });

  document.getElementById('depotRouteTable').innerHTML = arr.length ? arr.map(function (x, i) {
    var rankCls = i === 0 ? 'rank-1' : i === arr.length - 1 ? 'rank-bad' : 'rank-2';
    var mCls = parseFloat(x.margin) >= 20 ? 'tag-good' : parseFloat(x.margin) >= 0 ? 'tag-mid' : 'tag-bad';
    return '<tr style="border-bottom:1px solid var(--border)">'
      + '<td style="padding:11px 16px;font-weight:600;color:var(--heading)"><span class="route-rank ' + rankCls + '">' + (i + 1) + '</span>' + x.route + '</td>'
      + '<td style="padding:11px 16px;color:var(--muted)">' + x.factory + '</td>'
      + '<td style="padding:11px 16px;color:var(--muted)">' + x.depot + '</td>'
      + '<td style="padding:11px 16px;text-align:right;color:var(--muted)">' + x.n + '</td>'
      + '<td style="padding:11px 16px;text-align:right;color:var(--muted)">' + dFmtNum(x.kg) + '</td>'
      + '<td style="padding:11px 16px;text-align:right;font-weight:600;color:var(--accent)">৳' + x.rate + '</td>'
      + '<td style="padding:11px 16px;text-align:right;font-weight:600;color:var(--green)">' + dFmt(x.rev) + '</td>'
      + '<td style="padding:11px 16px;text-align:right;font-weight:600;color:var(--red)">' + dFmt(x.cost) + '</td>'
      + '<td style="padding:11px 16px;text-align:right;font-size:15px;font-weight:700;color:' + (x.profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (x.profit < 0 ? '-' : '') + dFmt(Math.abs(x.profit)) + '</td>'
      + '<td style="padding:11px 16px;text-align:right"><span class="tag tag-margin ' + mCls + '">' + x.margin + '%</span></td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="10" style="padding:20px;text-align:center;color:var(--muted)">কোনো ডেটা নেই</td></tr>';
}

function depotRenderTripLog(trips) {
  var sorted = trips.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 30);
  document.getElementById('depotTripLog').innerHTML = sorted.length ? sorted.map(function (t) {
    return '<tr style="border-bottom:1px solid var(--border)">'
      + '<td style="padding:10px 14px;color:var(--muted)">' + fmtDate(t.date) + '</td>'
      + '<td style="padding:10px 14px;font-weight:600;color:var(--heading)">' + t.route + '</td>'
      + '<td style="padding:10px 14px;color:var(--muted)">' + t.factory + '</td>'
      + '<td style="padding:10px 14px;color:var(--muted)">' + t.depot + '</td>'
      + '<td style="padding:10px 14px;text-align:right;font-weight:600">' + dFmtNum(t.kg) + '</td>'
      + '<td style="padding:10px 14px;text-align:right;color:var(--accent)">৳' + t.rate + '</td>'
      + '<td style="padding:10px 14px;text-align:right;color:var(--green);font-weight:600">' + dFmt(t.revenue) + '</td>'
      + '<td style="padding:10px 14px;text-align:right;color:var(--red);font-weight:600">' + dFmt(t.rent) + '</td>'
      + '<td style="padding:10px 14px;text-align:right;font-weight:700;color:' + (t.profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (t.profit < 0 ? '-' : '') + dFmt(Math.abs(t.profit)) + '</td>'
      + '<td style="padding:6px 10px;white-space:nowrap">'
      + '<button onclick="depotEditTrip(\'' + t.id + '\')\" style=\"background:#eff6ff;border:1.5px solid #c7d7f8;color:#1a56db;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:inherit;margin-right:3px\">✏️</button>'
      + '<button onclick="depotDeleteTrip(\'' + t.id + '\')\" style=\"background:#fde8e8;border:1.5px solid #f8d0d0;color:#c81e1e;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:inherit\">🗑️</button>'
      + '</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="10" style="padding:20px;text-align:center;color:var(--muted)">কোনো ডেটা নেই</td></tr>';
}

function depotEditTrip(id) {
  var t = depotTrips.find(function (x) { return x.id === id; });
  if (!t) return;
  document.getElementById('dte_id').value = id;
  document.getElementById('dte_date').value = t.date;
  document.getElementById('dte_kg').value = t.kg;
  document.getElementById('dte_rate').value = t.rate;
  document.getElementById('dte_rent').value = t.rent;
  document.getElementById('dte_note').value = t.note || '';
  // populate route dropdown
  var sel = document.getElementById('dte_route');
  sel.innerHTML = depotRoutes.map(function (r) {
    return '<option value="' + r.id + '"' + (r.id === t.routeId ? ' selected' : '') + '>' + r.name + '</option>';
  }).join('');
  document.getElementById('depotTripEditModal').classList.add('open');
}

async function depotSaveEditedTrip() {
  var id = document.getElementById('dte_id').value;
  var t = depotTrips.find(function (x) { return x.id === id; });
  if (!t) return;
  var routeId = document.getElementById('dte_route').value;
  var route = depotRoutes.find(function (r) { return r.id === routeId; });
  t.date = document.getElementById('dte_date').value;
  t.kg = parseFloat(document.getElementById('dte_kg').value) || 0;
  t.rate = parseFloat(document.getElementById('dte_rate').value) || 0;
  t.rent = parseFloat(document.getElementById('dte_rent').value) || 0;
  t.note = document.getElementById('dte_note').value;
  if (route) { t.routeId = route.id; t.route = route.name; t.factory = route.factory; t.depot = route.depot; }
  t.revenue = Math.round(t.kg * t.rate);
  t.profit = t.revenue - t.rent;
  try {
    await fetch(S_URL + '/rest/v1/depot_trips?id=eq.' + id, {
      method: 'PATCH',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        date: t.date, kg: t.kg, rate: t.rate, rent: t.rent,
        revenue: t.revenue, profit: t.profit, note: t.note, route_id: t.routeId,
        route: t.route, factory: t.factory, depot: t.depot
      })
    });
  } catch (e) { console.warn('depot trip patch error', e); }
  document.getElementById('depotTripEditModal').classList.remove('open');
  depotRender();
  showNotif('ট্রিপ আপডেট হয়েছে ✓', 'var(--green)');
}

async function depotDeleteTrip(id) {
  if (!confirm('এই ট্রিপটি মুছে ফেলবেন?')) return;
  depotTrips = depotTrips.filter(function (x) { return x.id !== id; });
  try {
    await fetch(S_URL + '/rest/v1/depot_trips?id=eq.' + id, { method: 'DELETE', headers: S_HDR });
    showNotif('ট্রিপ মুছে ফেলা হয়েছে', 'var(--red)');
  } catch (e) { showNotif('মুছতে সমস্যা হয়েছে', 'var(--red)'); }
  depotRender();
}

function depotPopulateFilters() {
  var factories = [...new Set(depotTrips.map(function (t) { return t.factory; }))];
  var depots = [...new Set(depotTrips.map(function (t) { return t.depot; }))];
  var fEl = document.getElementById('dFilterFactory');
  var dEl = document.getElementById('dFilterDepot');
  var curF = fEl.value, curD = dEl.value;
  fEl.innerHTML = '<option value="">সকল ফ্যাক্টরি</option>' + factories.map(function (f) { return '<option value="' + f + '"' + (f === curF ? ' selected' : '') + '>' + f + '</option>'; }).join('');
  dEl.innerHTML = '<option value="">সকল ডিপো</option>' + depots.map(function (d) { return '<option value="' + d + '"' + (d === curD ? ' selected' : '') + '>' + d + '</option>'; }).join('');

  // populate month filter
  var mEl = document.getElementById('dFilterMonth');
  var curM = mEl.value;
  var months = {};
  depotTrips.forEach(function (t) { var d = new Date(t.date); months[d.getMonth()] = MONTHS_BN_D[d.getMonth()]; });
  mEl.innerHTML = '<option value="">সকল মাস</option>' + Object.entries(months).map(function (e) { return '<option value="' + e[0] + '"' + (e[0] === curM ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('');

  // populate datalists for route modal
  var flEl = document.getElementById('factoryList');
  var dlEl = document.getElementById('depotList');
  if (flEl) flEl.innerHTML = factories.map(function (f) { return '<option value="' + f + '">'; }).join('');
  if (dlEl) dlEl.innerHTML = depots.map(function (d) { return '<option value="' + d + '">'; }).join('');
}

// ── DEPOT MODALS ──
function depotShowModal(type) {
  if (type === 'route') {
    depotPopulateFilters();
    document.getElementById('depotRouteModal').classList.add('open');
  } else {
    document.getElementById('dtDate').value = new Date().toISOString().split('T')[0];
    var sel = document.getElementById('dtRoute');
    sel.innerHTML = '<option value="">— রুট বেছে নিন —</option>' +
      depotRoutes.map(function (r) { return '<option value="' + r.id + '">' + r.name + ' (' + r.factory + ' → ' + r.depot + ')</option>'; }).join('');
    depotCalcTrip();
    document.getElementById('depotTripModal').classList.add('open');
  }
}

function depotFillRate() {
  var id = document.getElementById('dtRoute').value;
  var route = depotRoutes.find(function (r) { return r.id === id; });
  if (route) document.getElementById('dtRate').value = route.rate;
  depotCalcTrip();
}

function depotCalcTrip() {
  var kg = parseFloat(document.getElementById('dtKg').value) || 0;
  var rate = parseFloat(document.getElementById('dtRate').value) || 0;
  var rent = parseFloat(document.getElementById('dtRent').value) || 0;
  var rev = Math.round(kg * rate);
  var prof = rev - rent;
  document.getElementById('dtPrevRev').textContent = dFmt(rev);
  document.getElementById('dtPrevCost').textContent = dFmt(rent);
  document.getElementById('dtPrevProfit').textContent = (prof < 0 ? '-' : '') + dFmt(Math.abs(prof));
  document.getElementById('dtPrevProfit').style.color = prof >= 0 ? 'var(--green)' : 'var(--red)';
}

function depotSaveRoute() {
  var factory = document.getElementById('drFactory').value.trim();
  var depot = document.getElementById('drDepot').value.trim();
  var name = document.getElementById('drName').value.trim();
  var rate = parseFloat(document.getElementById('drRate').value);
  var breakeven = parseFloat(document.getElementById('drBreakeven').value) || 0;
  if (!factory || !depot || !name || !rate) { showNotif('সব তথ্য পূরণ করুন', 'var(--red)'); return; }
  var route = { id: 'r' + Date.now(), factory: factory, depot: depot, name: name, rate: rate, breakeven: breakeven };
  depotRoutes.push(route);
  depotSaveRouteToDB(route);
  document.getElementById('depotRouteModal').classList.remove('open');
  ['drFactory', 'drDepot', 'drName', 'drRate', 'drBreakeven'].forEach(function (id) { document.getElementById(id).value = ''; });
  showNotif('রুট যোগ হয়েছে ✓', 'var(--green)');
  depotRender();
}

function depotSaveTrip() {
  var routeId = document.getElementById('dtRoute').value;
  var date = document.getElementById('dtDate').value;
  var kg = parseFloat(document.getElementById('dtKg').value);
  var rate = parseFloat(document.getElementById('dtRate').value);
  var rent = parseFloat(document.getElementById('dtRent').value);
  if (!routeId || !date || !kg || !rate || !rent) { showNotif('সব তথ্য পূরণ করুন', 'var(--red)'); return; }
  var route = depotRoutes.find(function (r) { return r.id === routeId; });
  var rev = Math.round(kg * rate);
  var trip = {
    id: 'dt' + Date.now(), date: date, routeId: routeId,
    route: route.name, factory: route.factory, depot: route.depot,
    kg: kg, rate: rate, revenue: rev, rent: rent, profit: rev - rent,
    note: document.getElementById('dtNote').value
  };
  depotTrips.unshift(trip);
  depotSaveTripToDB(trip);
  document.getElementById('depotTripModal').classList.remove('open');
  showNotif('ট্রিপ সেভ হয়েছে ✓', 'var(--green)');
  depotRender();
}

function depotEditRoute(id) {
  var r = depotRoutes.find(function (x) { return x.id === id; });
  if (!r) return;
  document.getElementById('drFactory').value = r.factory;
  document.getElementById('drDepot').value = r.depot;
  document.getElementById('drName').value = r.name;
  document.getElementById('drRate').value = r.rate;
  document.getElementById('drBreakeven').value = r.breakeven || '';
  // remove old route so it gets replaced on save
  depotRoutes = depotRoutes.filter(function (x) { return x.id !== id; });
  // also delete from DB so re-save creates fresh
  fetch(S_URL + '/rest/v1/depot_routes?id=eq.' + id, { method: 'DELETE', headers: S_HDR });
  document.getElementById('depotRouteModal').classList.add('open');
}

async function depotDeleteRoute(id) {
  if (!confirm('এই রুটটি মুছে ফেলবেন?')) return;
  depotRoutes = depotRoutes.filter(function (x) { return x.id !== id; });
  try {
    await fetch(S_URL + '/rest/v1/depot_routes?id=eq.' + id, { method: 'DELETE', headers: S_HDR });
    showNotif('রুট মুছে ফেলা হয়েছে', 'var(--red)');
  } catch (e) { showNotif('মুছতে সমস্যা হয়েছে', 'var(--red)'); }
  depotRender();
}

function cofShowEdit() {
  document.getElementById('cofRateInput').value = depotCofRate || '';
  document.getElementById('cofModal').classList.add('open');
}

function cofSave() {
  var rate = parseFloat(document.getElementById('cofRateInput').value) || 0;
  depotCofRate = rate;
  var rateDisplay = rate.toString().replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
  document.getElementById('cofDisplay').textContent = rateDisplay + '% বার্ষিক';
  document.getElementById('cofModal').classList.remove('open');
  showNotif('COF হার আপডেট হয়েছে ✓', 'var(--green)');
  depotRender();
}

// Outstanding balance tracker
var outstandingItems = [];

function renderOutstanding() {
  var filter = document.getElementById('outStatusFilter') ? document.getElementById('outStatusFilter').value : '';
  var items = outstandingItems.filter(function (o) {
    if (!filter) return true;
    return o.status === filter;
  });

  // KPIs
  var totalBilled = outstandingItems.reduce(function (s, o) { return s + o.billed; }, 0);
  var totalReceived = outstandingItems.reduce(function (s, o) { return s + o.received; }, 0);
  var totalOwed = totalBilled - totalReceived;
  var overdue = outstandingItems.filter(function (o) { return o.status === 'overdue'; }).reduce(function (s, o) { return s + (o.billed - o.received); }, 0);

  document.getElementById('outstandingKPIs').innerHTML = [
    { label: 'মোট বিল', val: fmt(totalBilled), color: 'var(--green)', bg: 'green' },
    { label: 'মোট বাকি', val: fmt(totalOwed), color: 'var(--red)', bg: 'red' },
    { label: 'মেয়াদ পেরিয়েছে', val: fmt(overdue), color: '#d97706', bg: 'orange' },
  ].map(function (k) {
    return '<div class="kpi-card ' + k.bg + '"><div class="kpi-label">' + k.label + '</div>'
      + '<div class="kpi-value" style="color:' + k.color + '">' + k.val + '</div></div>';
  }).join('');

  // auto-update overdue status
  var today = new Date().toISOString().split('T')[0];
  outstandingItems.forEach(function (o) {
    if (o.status === 'pending' && o.dueDate && o.dueDate < today) o.status = 'overdue';
  });

  document.getElementById('outstandingTable').innerHTML = items.length ? items.map(function (o) {
    var owed = o.billed - o.received;
    var statusLabel = o.status === 'paid' ? '✅ পরিশোধিত' : o.status === 'overdue' ? '🔴 মেয়াদ পেরিয়েছে' : '🟡 বাকি আছে';
    var statusColor = o.status === 'paid' ? 'var(--green)' : o.status === 'overdue' ? 'var(--red)' : '#d97706';
    return '<tr>'
      + '<td style="font-weight:600">' + o.client + '</td>'
      + '<td style="color:var(--muted)">' + o.truck + '</td>'
      + '<td style="color:var(--muted)">' + fmtDate(o.date) + '</td>'
      + '<td style="color:' + (o.dueDate && o.dueDate < today && o.status !== 'paid' ? 'var(--red)' : 'var(--muted)') + '">' + fmtDate(o.dueDate || '') + '</td>'
      + '<td style="text-align:right;font-weight:600">' + fmt(o.billed) + '</td>'
      + '<td style="text-align:right;color:var(--green);font-weight:600">' + fmt(o.received) + '</td>'
      + '<td style="text-align:right;font-weight:700;color:' + (owed > 0 ? 'var(--red)' : 'var(--green)') + '">' + fmt(owed) + '</td>'
      + '<td><span style="color:' + statusColor + ';font-size:12px;font-weight:600">' + statusLabel + '</span></td>'
      + '<td style="white-space:nowrap">'
      + (o.status !== 'paid' ? ('<button onclick="markOutstandingPaid(\'' + o.id + '\')" style="background:#f0fdf4;border:1.5px solid #a7f3d0;color:#057a55;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;margin-right:3px">✅ পরিশোধ</button>') : '')
      + ('<button onclick="editOutstanding(\'' + o.id + '\')" style="background:#eff6ff;border:1.5px solid #c7d7f8;color:#1a56db;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:inherit;margin-right:3px">✏️</button>')
      + ('<button onclick="deleteOutstanding(\'' + o.id + '\')" style="background:#fde8e8;border:1.5px solid #f8d0d0;color:#c81e1e;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;font-family:inherit">🗑️</button>')
      + '</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:24px">কোনো বাকি হিসাব নেই</td></tr>';
}

function openOutstandingModal(id) {
  var o = id ? outstandingItems.find(function (x) { return x.id === id; }) : null;
  document.getElementById('om_id').value = o ? o.id : '';
  document.getElementById('om_client').value = o ? o.client : '';
  document.getElementById('om_truck').value = o ? o.truck : '';
  document.getElementById('om_date').value = o ? o.date : new Date().toISOString().split('T')[0];
  document.getElementById('om_due').value = o ? (o.dueDate || '') : '';
  document.getElementById('om_billed').value = o ? o.billed : '';
  document.getElementById('om_received').value = o ? o.received : '';
  document.getElementById('om_note').value = o ? (o.note || '') : '';
  // populate truck dropdown
  var ts = document.getElementById('om_truck_sel');
  ts.innerHTML = '<option value="">— বেছে নিন —</option>';
  TRUCK_NAMES.forEach(function (t) { ts.innerHTML += '<option value="' + t + '"' + (o && o.truck === t ? ' selected' : '') + '>' + t + '</option>'; });
  document.getElementById('outstandingModal').classList.add('open');
}

function editOutstanding(id) { openOutstandingModal(id); }

function saveOutstanding() {
  var id = document.getElementById('om_id').value;
  var client = document.getElementById('om_client').value.trim();
  var truck = document.getElementById('om_truck_sel').value;
  var date = document.getElementById('om_date').value;
  var dueDate = document.getElementById('om_due').value;
  var billed = parseFloat(document.getElementById('om_billed').value) || 0;
  var received = parseFloat(document.getElementById('om_received').value) || 0;
  var note = document.getElementById('om_note').value;
  if (!client || !billed) { showNotif('ক্লায়েন্ট ও বিল পরিমাণ দিন', 'var(--red)'); return; }
  var today = new Date().toISOString().split('T')[0];
  var status = received >= billed ? 'paid' : (dueDate && dueDate < today ? 'overdue' : 'pending');
  if (id) {
    var o = outstandingItems.find(function (x) { return x.id === id; });
    if (o) { o.client = client; o.truck = truck; o.date = date; o.dueDate = dueDate; o.billed = billed; o.received = received; o.note = note; o.status = status; }
  } else {
    outstandingItems.push({ id: 'ob' + Date.now(), client: client, truck: truck, date: date, dueDate: dueDate, billed: billed, received: received, note: note, status: status });
  }
  document.getElementById('outstandingModal').classList.remove('open');
  renderOutstanding();
  showNotif((id ? 'আপডেট' : 'যোগ') + ' হয়েছে ✓', 'var(--green)');
}

function markOutstandingPaid(id) {
  var o = outstandingItems.find(function (x) { return x.id === id; });
  if (!o) return;
  o.received = o.billed;
  o.status = 'paid';
  renderOutstanding();
  showNotif('পরিশোধ হিসেবে চিহ্নিত হয়েছে ✓', 'var(--green)');
}

function deleteOutstanding(id) {
  if (!confirm('এই হিসাবটি মুছে ফেলবেন?')) return;
  outstandingItems = outstandingItems.filter(function (x) { return x.id !== id; });
  renderOutstanding();
  showNotif('মুছে ফেলা হয়েছে', 'var(--red)');
}

function depotExportCSV() {
  var trips = depotGetFiltered();
  var rows = [['তারিখ', 'রুট', 'ফ্যাক্টরি', 'ডিপো', 'KG', 'হার (৳/KG)', 'রাজস্ব', 'ট্রাক ভাড়া', 'মুনাফা']];
  trips.forEach(function (t) { rows.push([t.date, t.route, t.factory, t.depot, t.kg, t.rate, t.revenue, t.rent, t.profit]); });
  var csv = '\uFEFF' + rows.map(function (r) { return r.join(','); }).join('\n');
  var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'depot-report.csv'; a.click();
  showNotif('CSV ডাউনলোড হয়েছে', 'var(--accent)');
}

// Auto-render when depot tab is opened — load from DB first
var _origSwitchView = switchView;
switchView = function (v, btn) {
  _origSwitchView(v, btn);
  // show main KPI strip only on dashboard, trucks, entries, reports
  var kpiStrip = document.getElementById('mainKpiStrip');
  if (kpiStrip) {
    if (['dashboard', 'trucks', 'entries', 'reports'].indexOf(v) >= 0) {
      kpiStrip.classList.add('visible');
    } else {
      kpiStrip.classList.remove('visible');
    }
  }
  if (v === 'depot') {
    showNotif('লোড হচ্ছে...', 'var(--accent)');
    Promise.all([depotLoadRoutes(), depotLoadTrips()]).then(function () {
      depotRender();
    });
  }
};


// ════════════════════════════════════════════════════════
//  DRIVER MANAGEMENT
// ════════════════════════════════════════════════════════
var driversData = [];
var maintenanceData = [];
var payrollPaid = {}; // { 'driverId-YYYY-MM': true }

var MONTHS_BN_PR = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

// ── DB helpers ──
async function loadDrivers() {
  try {
    var r = await fetch(S_URL + '/rest/v1/drivers?select=*&order=created_at.asc', { headers: S_HDR });
    if (!r.ok) return;
    driversData = await r.json();
  } catch (e) { console.warn(e); }
}
async function loadMaintenance() {
  try {
    var r = await fetch(S_URL + '/rest/v1/maintenance?select=*&order=date.desc', { headers: S_HDR });
    if (!r.ok) return;
    maintenanceData = await r.json();
  } catch (e) { console.warn(e); }
}
async function saveDriverToDB(d) {
  try {
    await fetch(S_URL + '/rest/v1/drivers', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify(d)
    });
  } catch (e) { console.warn(e); }
}
async function saveMaintenanceToDB(m) {
  try {
    await fetch(S_URL + '/rest/v1/maintenance', {
      method: 'POST',
      headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify(m)
    });
  } catch (e) { console.warn(e); }
}

function dFmtMoney(n) {
  var v = Math.abs(Math.round(n)).toString();
  var r = v.length > 3 ? v.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + v.slice(-3) : v;
  return '৳' + r.replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
}

// ── Driver Modal ──
function driverShowModal(driver) {
  var modal = document.getElementById('driverModal');
  // populate truck dropdown
  var ts = document.getElementById('dvTruck');
  ts.innerHTML = '<option value="">— বেছে নিন —</option>';
  TRUCK_NAMES.forEach(function (t) { ts.innerHTML += '<option value="' + t + '">' + t + '</option>'; });
  if (driver) {
    document.getElementById('driverModalTitle').textContent = '✏️ ড্রাইভার সম্পাদনা';
    document.getElementById('driverId').value = driver.id;
    document.getElementById('dvName').value = driver.name || '';
    document.getElementById('dvPhone').value = driver.phone || '';
    document.getElementById('dvNid').value = driver.nid || '';
    document.getElementById('dvLicense').value = driver.license || '';
    document.getElementById('dvJoining').value = driver.joining_date || '';
    document.getElementById('dvSalary').value = driver.salary || '';
    document.getElementById('dvTruck').value = driver.truck || '';
    document.getElementById('dvEmergency').value = driver.emergency_contact || '';
  } else {
    document.getElementById('driverModalTitle').textContent = '👤 নতুন ড্রাইভার যোগ করুন';
    document.getElementById('driverId').value = '';
    ['dvName', 'dvPhone', 'dvNid', 'dvLicense', 'dvJoining', 'dvSalary', 'dvEmergency'].forEach(function (id) { document.getElementById(id).value = ''; });
    document.getElementById('dvTruck').value = '';
  }
  modal.classList.add('open');
}

async function driverSave() {
  var name = document.getElementById('dvName').value.trim();
  var phone = document.getElementById('dvPhone').value.trim();
  if (!name || !phone) { showNotif('নাম ও ফোন আবশ্যক', 'var(--red)'); return; }
  var id = document.getElementById('driverId').value || 'dr' + Date.now();
  var d = {
    id: id,
    name: name,
    phone: phone,
    nid: document.getElementById('dvNid').value.trim() || null,
    license: document.getElementById('dvLicense').value.trim() || null,
    joining_date: document.getElementById('dvJoining').value || null,
    salary: parseFloat(document.getElementById('dvSalary').value) || 0,
    truck: document.getElementById('dvTruck').value || null,
    emergency_contact: document.getElementById('dvEmergency').value.trim() || null,
  };
  // update or add local
  var idx = driversData.findIndex(function (x) { return x.id === id; });
  if (idx >= 0) driversData[idx] = d; else driversData.push(d);
  await saveDriverToDB(d);
  document.getElementById('driverModal').classList.remove('open');
  showNotif('ড্রাইভার সেভ হয়েছে ✓', 'var(--green)');
  driversRender();
}

function driversRender() {
  var now = new Date();
  var thisMonth = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

  // calc per-driver stats from entries
  var driverStats = {};
  driversData.forEach(function (d) {
    driverStats[d.truck] = { trips: 0, bonus: 0, cashIn: 0, cashExpected: 0 };
  });
  entries.filter(function (e) {
    return e.date && e.date.slice(0, 7) === thisMonth;
  }).forEach(function (e) {
    if (!driverStats[e.truck]) driverStats[e.truck] = { trips: 0, bonus: 0, cashIn: 0, cashExpected: 0 };
    if (e.type === 'revenue') {
      driverStats[e.truck].trips++;
      driverStats[e.truck].cashExpected += e.amount;
    }
  });
  entries.filter(function (e) {
    return e.type === 'expense' && e.category === 'ড্রাইভার স্যালারি' && e.date && e.date.slice(0, 7) === thisMonth;
  }).forEach(function (e) {
    if (!driverStats[e.truck]) driverStats[e.truck] = { trips: 0, bonus: 0, cashIn: 0, cashExpected: 0 };
    driverStats[e.truck].bonus += e.amount;
  });

  // KPIs
  var totalBonus = 0, totalDue = 0, totalTrips = 0;
  driversData.forEach(function (d) {
    var s = driverStats[d.truck] || { trips: 0, bonus: 0, cashExpected: 0 };
    totalBonus += s.bonus;
    totalTrips += s.trips;
  });
  document.getElementById('dvKpiTotal').textContent = driversData.length;
  document.getElementById('dvKpiTrips').textContent = totalTrips;
  document.getElementById('dvKpiBonus').textContent = dFmtMoney(totalBonus);
  document.getElementById('dvKpiDue').textContent = dFmtMoney(totalDue);

  // Table
  document.getElementById('driverTable').innerHTML = driversData.length ? driversData.map(function (d) {
    var s = driverStats[d.truck] || { trips: 0, bonus: 0, cashExpected: 0 };
    return '<tr style="border-bottom:1px solid var(--border)">'
      + '<td class="td"><div style="font-weight:700">' + d.name + '</div><div style="font-size:11px;color:var(--muted)">' + d.phone + '</div></td>'
      + '<td class="td" style="font-size:12px;color:var(--muted)">' + d.phone + '</td>'
      + '<td class="td" style="font-size:12px;color:var(--muted)">' + (d.nid || '—') + '<br><span style="font-size:10px">' + (d.license || '') + '</span></td>'
      + '<td class="td" style="font-size:12px">' + fmtDate(d.joining_date || '') + '</td>'
      + '<td class="td" style="font-weight:600">' + dFmtMoney(d.salary) + '</td>'
      + '<td class="td"><span class="tag" style="background:#eff6ff;color:#1a56db">' + (d.truck || '—') + '</span></td>'
      + '<td class="td" style="text-align:center;font-weight:700">' + s.trips + '</td>'
      + '<td class="td" style="text-align:right;color:var(--yellow);font-weight:700">' + dFmtMoney(s.bonus) + '</td>'
      + '<td class="td" style="text-align:right;color:var(--red);font-weight:700">—</td>'
      + '<td class="td"><button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="driverShowModal(driversData.find(function(x){return x.id===\'' + d.id + '\';}))">✏️</button></td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="10" style="padding:20px;text-align:center;color:var(--muted)">কোনো ড্রাইভার নেই — যোগ করুন</td></tr>';
}

// ════════════════════════════════════════════════════════
//  CASH SETTLEMENT
// ════════════════════════════════════════════════════════
var settlements = []; // {id, truck, driver, date, trips, fare, expenses, netCash, note}

function renderSettlement() {
  // populate truck filter
  var stEl = document.getElementById('settleTruck');
  if (stEl) {
    var curT = stEl.value;
    stEl.innerHTML = '<option value="">সকল ট্রাক</option>';
    TRUCK_NAMES.forEach(function (t) { stEl.innerHTML += '<option value="' + t + '"' + (t === curT ? ' selected' : '') + '>' + t + '</option>'; });
  }
  var period = document.getElementById('settlePeriod') ? document.getElementById('settlePeriod').value : 'month';
  var selTruck = stEl ? stEl.value : '';
  var now = new Date();
  var thisMonth = now.getFullYear() + '-' + (now.getMonth() + 1 < 10 ? '0' : '') + (now.getMonth() + 1);

  // Build settlement data per truck (from entries)
  var trucks = selTruck ? [selTruck] : TRUCK_NAMES;
  var cards = trucks.map(function (truck) {
    var te = entries.filter(function (e) {
      var okT = e.truck === truck;
      var okP = period === 'month' ? (e.date && e.date.slice(0, 7) === thisMonth) : true;
      return okT && okP;
    });
    var fare = te.filter(function (e) { return e.type === 'revenue'; }).reduce(function (s, e) { return s + e.amount; }, 0);
    var expenses = te.filter(function (e) { return e.type === 'expense'; }).reduce(function (s, e) { return s + e.amount; }, 0);
    var trips = te.filter(function (e) { return e.type === 'revenue'; }).length;
    var netCash = fare - expenses;
    var driver = drivers.find(function (d) { return d.truck === truck; });
    // settled amount from settlements array
    var settled = settlements.filter(function (s) { return s.truck === truck && (period === 'month' ? s.date.slice(0, 7) === thisMonth : true); })
      .reduce(function (s, x) { return s + x.settled; }, 0);
    var outstanding = netCash - settled;
    return { truck: truck, driver: driver ? driver.name : '—', fare: fare, expenses: expenses, trips: trips, netCash: netCash, settled: settled, outstanding: outstanding };
  }).filter(function (c) { return c.fare > 0 || c.settled > 0; });

  if (!cards.length) {
    document.getElementById('settlementCards').innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px">এই পিরিয়ডে কোনো ট্রিপ ডেটা নেই</div>';
    return;
  }

  document.getElementById('settlementCards').innerHTML = cards.map(function (c) {
    var pct = c.netCash > 0 ? Math.round(c.settled / c.netCash * 100) : 0;
    var statusColor = c.outstanding <= 0 ? 'var(--green)' : c.outstanding < c.netCash * 0.5 ? '#d97706' : 'var(--red)';
    var statusLabel = c.outstanding <= 0 ? '✅ সম্পূর্ণ পরিশোধ' : c.settled > 0 ? '⚠️ আংশিক পরিশোধ' : '🔴 অপরিশোধিত';
    return '<div class="panel" style="position:relative">'
      // header
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
      + '<div><div style="font-size:15px;font-weight:700;color:var(--heading)">🚚 ' + c.truck + '</div>'
      + '<div style="font-size:11px;color:var(--muted)">ড্রাইভার: ' + c.driver + '</div></div>'
      + '<span style="font-size:11px;font-weight:600;color:' + statusColor + '">' + statusLabel + '</span>'
      + '</div>'
      // rows
      + '<table style="width:100%;font-size:12px;border-collapse:collapse">'
      + '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 0;color:var(--muted)">মোট ট্রিপ</td><td style="text-align:right;font-weight:600">' + c.trips + 'টি</td></tr>'
      + '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 0;color:var(--muted)">মোট ভাড়া আদায়</td><td style="text-align:right;font-weight:600;color:var(--green)">' + fmt(c.fare) + '</td></tr>'
      + '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 0;color:var(--muted)">(-) মোট খরচ</td><td style="text-align:right;font-weight:600;color:var(--red)">' + fmt(c.expenses) + '</td></tr>'
      + '<tr style="border-bottom:2px solid var(--border);background:#f8fafc"><td style="padding:7px 4px;font-weight:700">মালিককে জমা দেওয়ার পরিমাণ</td><td style="text-align:right;font-size:16px;font-weight:800;color:var(--accent)">' + fmt(c.netCash) + '</td></tr>'
      + '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 0;color:var(--muted)">ইতিমধ্যে জমা</td><td style="text-align:right;font-weight:600;color:var(--green)">' + fmt(c.settled) + '</td></tr>'
      + '<tr><td style="padding:5px 0;font-weight:700;color:' + statusColor + '">এখনও বাকি</td><td style="text-align:right;font-size:15px;font-weight:800;color:' + statusColor + '">' + (c.outstanding > 0 ? fmt(c.outstanding) : '—') + '</td></tr>'
      + '</table>'
      // progress bar
      + (c.netCash > 0 ? '<div style="margin:10px 0 4px;background:#e2e8f0;border-radius:4px;height:6px"><div style="height:6px;border-radius:4px;background:' + (pct >= 100 ? 'var(--green)' : '#1a56db') + ';width:' + Math.min(pct, 100) + '%"></div></div>'
        + '<div style="font-size:10px;color:var(--muted);text-align:right">' + pct + '% পরিশোধিত</div>' : '')
      // settle button
      + (c.outstanding > 0
        ? '<button onclick="openSettleModal(\'' + c.truck + '\',' + c.outstanding + ',\'' + c.driver + '\')" style="margin-top:12px;width:100%;background:var(--accent);color:#fff;border:none;border-radius:7px;padding:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">💵 জমা নথিভুক্ত করুন</button>'
        : '<div style="margin-top:12px;text-align:center;font-size:12px;color:var(--green);font-weight:600">সম্পূর্ণ পরিশোধিত ✓</div>')
      + '</div>';
  }).join('');
}

function openSettleModal(truck, outstanding, driver) {
  document.getElementById('sm_truck').value = truck;
  document.getElementById('sm_driver').value = driver;
  document.getElementById('sm_outstanding').textContent = fmt(outstanding);
  document.getElementById('sm_amount').value = outstanding;
  document.getElementById('sm_date').value = new Date().toISOString().split('T')[0];
  document.getElementById('sm_note').value = '';
  document.getElementById('settleModal').classList.add('open');
}

function saveSettlement() {
  var truck = document.getElementById('sm_truck').value;
  var amount = parseFloat(document.getElementById('sm_amount').value) || 0;
  var date = document.getElementById('sm_date').value;
  var note = document.getElementById('sm_note').value;
  var driver = document.getElementById('sm_driver').value;
  if (!amount || !date) { showNotif('পরিমাণ ও তারিখ দিন', 'var(--red)'); return; }
  settlements.push({ id: 'st' + Date.now(), truck: truck, driver: driver, date: date, settled: amount, note: note });
  document.getElementById('settleModal').classList.remove('open');
  renderSettlement();
  renderDriversView();
  showNotif('ক্যাশ জমা নথিভুক্ত হয়েছে ✓', 'var(--green)');
}

// ════════════════════════════════════════════════════════
//  MAINTENANCE
// ════════════════════════════════════════════════════════
function maintenanceShowModal() {
  var ts = document.getElementById('mTruck');
  ts.innerHTML = '<option value="">— বেছে নিন —</option>';
  TRUCK_NAMES.forEach(function (t) { ts.innerHTML += '<option value="' + t + '">' + t + '</option>'; });
  document.getElementById('mDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('mDesc').value = '';
  document.getElementById('mCost').value = '';
  document.getElementById('maintenanceModal').classList.add('open');

  // populate truck filter
  var tf = document.getElementById('mFilterTruck');
  tf.innerHTML = '<option value="">সকল ট্রাক</option>';
  TRUCK_NAMES.forEach(function (t) { tf.innerHTML += '<option value="' + t + '">' + t + '</option>'; });
}

async function maintenanceSave() {
  var truck = document.getElementById('mTruck').value;
  var date = document.getElementById('mDate').value;
  var type = document.getElementById('mType').value;
  var cost = parseFloat(document.getElementById('mCost').value) || 0;
  if (!truck || !date || !cost) { showNotif('ট্রাক, তারিখ ও খরচ আবশ্যক', 'var(--red)'); return; }
  var m = {
    id: 'm' + Date.now(), truck: truck, date: date, type: type,
    description: document.getElementById('mDesc').value || null,
    cost: cost
  };
  maintenanceData.unshift(m);
  await saveMaintenanceToDB(m);
  document.getElementById('maintenanceModal').classList.remove('open');
  showNotif('মেইনটেন্যান্স সেভ হয়েছে ✓', 'var(--green)');
  maintenanceRender();
}

function maintenanceRender() {
  var fTruck = document.getElementById('mFilterTruck') ? document.getElementById('mFilterTruck').value : '';
  var fType = document.getElementById('mFilterType') ? document.getElementById('mFilterType').value : '';
  var now = new Date();
  var thisM = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

  var filtered = maintenanceData.filter(function (m) {
    return (!fTruck || m.truck === fTruck) && (!fType || m.type === fType);
  });

  var total = 0, monthCost = 0;
  filtered.forEach(function (m) { total += m.cost; if (m.date && m.date.slice(0, 7) === thisM) monthCost += m.cost; });

  // per truck totals
  var truckCosts = {};
  filtered.forEach(function (m) { truckCosts[m.truck] = (truckCosts[m.truck] || 0) + m.cost; });
  var worstTruck = Object.entries(truckCosts).sort(function (a, b) { return b[1] - a[1]; })[0];

  document.getElementById('mKpiTotal').textContent = dFmtMoney(total);
  document.getElementById('mKpiMonth').textContent = dFmtMoney(monthCost);
  document.getElementById('mKpiCount').textContent = filtered.length;
  document.getElementById('mKpiWorst').textContent = worstTruck ? worstTruck[0] : '—';

  // bar chart per truck
  var maxC = Math.max.apply(null, Object.values(truckCosts).concat([1]));
  document.getElementById('mTruckBars').innerHTML = Object.entries(truckCosts)
    .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 12).map(function (e) {
      return '<div class="d-bar-row">'
        + '<div class="d-bar-lbl">' + e[0] + '</div>'
        + '<div class="d-bar-track"><div class="d-bar-fill" style="width:' + (e[1] / maxC * 100) + '%;background:var(--red)"></div></div>'
        + '<div class="d-bar-val" style="color:var(--red)">' + dFmtMoney(e[1]) + '</div>'
        + '</div>';
    }).join('') || '<p style="color:var(--muted);font-size:13px;padding:12px 0;text-align:center">কোনো রেকর্ড নেই</p>';

  // table
  var TYPE_COLORS = { 'ইঞ্জিন/যন্ত্রপাতি': '#fee2e2', 'টায়ার পরিবর্তন': '#fef3c7', 'বডি মেরামত': '#ede9fe', 'রুটিন সার্ভিস': '#d1fae5', 'দুর্ঘটনা ক্ষতি': '#fce7f3', 'বার্ষিক ফিটনেস': '#e0f2fe' };
  document.getElementById('maintenanceTable').innerHTML = filtered.length ? filtered.map(function (m) {
    var bg = TYPE_COLORS[m.type] || '#eff6ff';
    return '<tr style="border-bottom:1px solid var(--border)">'
      + '<td class="td">' + fmtDate(m.date) + '</td>'
      + '<td class="td"><span class="tag" style="background:#eff6ff;color:#1a56db">' + m.truck + '</span></td>'
      + '<td class="td"><span class="tag-mtype" style="background:' + bg + '">' + m.type + '</span></td>'
      + '<td class="td" style="color:var(--muted)">' + (m.description || '—') + '</td>'
      + '<td class="td" style="text-align:right;font-weight:700;color:var(--red)">' + dFmtMoney(m.cost) + '</td>'
      + '<td class="td"></td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--muted)">কোনো রেকর্ড নেই</td></tr>';
}

// ════════════════════════════════════════════════════════
//  PAYROLL
// ════════════════════════════════════════════════════════
function payrollPopulateMonths() {
  var sel = document.getElementById('payrollMonth');
  if (!sel) return;
  var now = new Date();
  // build from actual entry dates
  var months = {};
  entries.forEach(function(e){ if(e.date) months[e.date.slice(0,7)] = true; });
  var sorted = Object.keys(months).sort().reverse();
  sel.innerHTML = sorted.map(function(m){
    var d = new Date(m+'-01');
    return '<option value="'+m+'">'+(MONTHS_BN_PR[d.getMonth()])+' '+d.getFullYear()+'</option>';
  }).join('');
  // default to current or latest month
  var cur = now.getFullYear()+'-'+(now.getMonth()+1).toString().padStart(2,'0');
  if (months[cur]) sel.value = cur;
  else if (sorted.length) sel.value = sorted[0];
}

function payrollRender() {
  var sel = document.getElementById('payrollMonth');
  if (!sel) return;
  var month = sel.value;
  if (!month) return;

  var mEntries = entries.filter(function(e){ return e.date && e.date.slice(0,7) === month; });

  // Group by driver name (from sheet client field or description)
  // Each sheet = one day's trips for one truck
  // Revenue entries have driver info in 'client' field
  // Expense entries with category 'কমিশন' or 'দৈনিক ভাতা' are driver costs

  // Group by sheet_ref → per sheet stats
  var sheetMap = {};
  mEntries.forEach(function(e) {
    var key = e.sheet_ref || (e.truck+'|'+e.date);
    if (!sheetMap[key]) sheetMap[key] = {
      ref: e.sheet_ref||'—', truck: e.truck, date: e.date,
      driver: '—', rev: 0, commission: 0, allowance: 0, otherExp: 0, totalExp: 0
    };
    var s = sheetMap[key];
    if (e.type === 'revenue') {
      s.rev += e.amount;
      if (e.client && e.client !== '—' && e.client !== '') s.driver = e.client;
    }
    if (e.type === 'expense') {
      s.totalExp += e.amount;
      var cat = (e.category||'').toLowerCase();
      if (cat.indexOf('কমিশন') !== -1 || cat.indexOf('commission') !== -1) {
        s.commission += e.amount;
      } else if (cat.indexOf('ভাতা') !== -1 || cat.indexOf('allowance') !== -1 || cat.indexOf('দৈনিক') !== -1) {
        s.allowance += e.amount;
      } else {
        s.otherExp += e.amount;
      }
    }
  });

  // Group sheets by driver
  var driverMap = {};
  Object.values(sheetMap).forEach(function(s) {
    var dName = s.driver !== '—' ? s.driver : ('ট্রাক: ' + s.truck);
    if (!driverMap[dName]) driverMap[dName] = {
      name: dName, truck: s.truck, sheets: [], totalRev: 0,
      totalCommission: 0, totalAllowance: 0, totalOtherExp: 0
    };
    var d = driverMap[dName];
    d.sheets.push(s);
    d.totalRev += s.rev;
    d.totalCommission += s.commission;
    d.totalAllowance += s.allowance;
    d.totalOtherExp += s.otherExp;
    // keep truck updated
    if (s.truck) d.truck = s.truck;
  });

  var drivers = Object.values(driverMap).sort(function(a,b){ return b.totalRev - a.totalRev; });

  // KPIs
  var totalRev = drivers.reduce(function(s,d){ return s+d.totalRev; }, 0);
  var totalDriver = drivers.reduce(function(s,d){ return s+d.totalCommission+d.totalAllowance; }, 0);
  var totalOffice = drivers.reduce(function(s,d){ return s+(d.totalRev - d.totalCommission - d.totalAllowance - d.totalOtherExp); }, 0);
  var totalUnpaid = 0;
  drivers.forEach(function(d){
    var key = d.name+'-'+month;
    if (!payrollPaid[key]) totalUnpaid += d.totalCommission + d.totalAllowance;
  });

  document.getElementById('prKpiRev').textContent    = fmt(totalRev);
  document.getElementById('prKpiDriver').textContent = fmt(totalDriver);
  document.getElementById('prKpiOffice').textContent = fmt(totalOffice);
  document.getElementById('prKpiUnpaid').textContent = fmt(totalUnpaid);

  // Render cards
  var container = document.getElementById('payrollCards');
  if (!drivers.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px;font-size:14px">এই মাসে কোনো এন্ট্রি নেই</div>';
    return;
  }

  container.innerHTML = drivers.map(function(d) {
    var key = d.name+'-'+month;
    var paid = !!payrollPaid[key];
    var driverTotal = d.totalCommission + d.totalAllowance;
    var officeDeposit = d.totalRev - d.totalCommission - d.totalAllowance - d.totalOtherExp;
    var commPct = d.totalRev > 0 ? Math.round(d.totalCommission/d.totalRev*100) : 0;

    // sheet breakdown rows
    var sheetRows = d.sheets.sort(function(a,b){ return a.date.localeCompare(b.date); }).map(function(s) {
      var dp = s.date.split('-');
      var net = s.rev - s.commission - s.allowance - s.otherExp;
      return '<tr style="border-bottom:1px solid #f1f5f9;font-size:12px">'
        + '<td style="padding:6px 8px;color:#64748b">'+dp[2]+'/'+dp[1]+'</td>'
        + '<td style="padding:6px 8px"><span style="background:#f0f9ff;color:#0284c7;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700">#'+s.ref+'</span></td>'
        + '<td style="padding:6px 8px;text-align:right;color:#057a55;font-weight:600">'+fmt(s.rev)+'</td>'
        + '<td style="padding:6px 8px;text-align:right;color:#92400e">'+fmt(s.commission)+'</td>'
        + '<td style="padding:6px 8px;text-align:right;color:#6d28d9">'+fmt(s.allowance)+'</td>'
        + '<td style="padding:6px 8px;text-align:right;font-weight:700;color:'+(net>=0?'#057a55':'#c81e1e')+'">'+fmt(net)+'</td>'
        + '</tr>';
    }).join('');

    return '<div style="background:#fff;border-radius:14px;border:1.5px solid '+(paid?'#86efac':'#e2e8f0')+';padding:18px;margin-bottom:14px">'
      // driver header
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:40px;height:40px;background:#f0f9ff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">👤</div>'
      + '<div><div style="font-size:15px;font-weight:700;color:#1e293b">'+d.name+'</div>'
      + '<div style="font-size:11px;color:#94a3b8;margin-top:1px">🚚 '+d.truck+' &nbsp;·&nbsp; '+toBn(d.sheets.length)+'টি শিট &nbsp;·&nbsp; কমিশন '+toBn(commPct)+'%</div>'
      + '</div></div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span onclick="payrollToggle(\''+key+'\')" style="cursor:pointer;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;background:'+(paid?'#dcfce7':'#fff7ed')+';color:'+(paid?'#15803d':'#c2410c')+';border:1.5px solid '+(paid?'#86efac':'#fed7aa')+'">'
      + (paid ? '✓ পরিশোধিত' : '⏳ বকেয়া')+'</span>'
      + '</div></div>'

      // summary row
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
      + '<div style="background:#f0fdf4;border-radius:9px;padding:10px;text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">মোট আয়</div><div style="font-size:15px;font-weight:700;color:#057a55">'+fmt(d.totalRev)+'</div></div>'
      + '<div style="background:#fff7ed;border-radius:9px;padding:10px;text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">কমিশন</div><div style="font-size:15px;font-weight:700;color:#c2410c">'+fmt(d.totalCommission)+'</div></div>'
      + '<div style="background:#f5f3ff;border-radius:9px;padding:10px;text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">দৈনিক ভাতা</div><div style="font-size:15px;font-weight:700;color:#6d28d9">'+fmt(d.totalAllowance)+'</div></div>'
      + '<div style="background:'+(officeDeposit>=0?'#eff6ff':'#fff5f5')+';border-radius:9px;padding:10px;text-align:center;border:1.5px solid '+(officeDeposit>=0?'#bfdbfe':'#fecaca')+'">'
      + '<div style="font-size:10px;color:#64748b;margin-bottom:3px">Office জমা</div>'
      + '<div style="font-size:15px;font-weight:700;color:'+(officeDeposit>=0?'#1a56db':'#c81e1e')+'">'+fmt(officeDeposit)+'</div></div>'
      + '</div>'

      // sheet breakdown table
      + '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;font-weight:600;color:#64748b;padding:4px 0">শিট বিস্তারিত ▸</summary>'
      + '<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;min-width:420px">'
      + '<thead><tr style="background:#f8fafc;font-size:11px;font-weight:600;color:#64748b">'
      + '<th style="padding:6px 8px;text-align:left">তারিখ</th><th style="padding:6px 8px;text-align:left">শিট</th>'
      + '<th style="padding:6px 8px;text-align:right">আয়</th><th style="padding:6px 8px;text-align:right">কমিশন</th>'
      + '<th style="padding:6px 8px;text-align:right">ভাতা</th><th style="padding:6px 8px;text-align:right">Office জমা</th>'
      + '</tr></thead><tbody>'+sheetRows+'</tbody>'
      + '<tfoot><tr style="background:#f8fafc;font-weight:700;font-size:12px">'
      + '<td colspan="2" style="padding:7px 8px">মোট</td>'
      + '<td style="padding:7px 8px;text-align:right;color:#057a55">'+fmt(d.totalRev)+'</td>'
      + '<td style="padding:7px 8px;text-align:right;color:#c2410c">'+fmt(d.totalCommission)+'</td>'
      + '<td style="padding:7px 8px;text-align:right;color:#6d28d9">'+fmt(d.totalAllowance)+'</td>'
      + '<td style="padding:7px 8px;text-align:right;color:'+(officeDeposit>=0?'#1a56db':'#c81e1e')+'">'+fmt(officeDeposit)+'</td>'
      + '</tr></tfoot>'
      + '</table></div></details>'
      + '</div>';
  }).join('');
}

function payrollToggle(key) {
  payrollPaid[key] = !payrollPaid[key];
  payrollRender();
}

function payrollExportCSV() {
  var sel = document.getElementById('payrollMonth');
  var month = sel ? sel.value : '';
  var rows = [['ড্রাইভার', 'ট্রাক', 'শিট সংখ্যা', 'মোট আয়', 'কমিশন', 'দৈনিক ভাতা', 'অন্যান্য খরচ', 'Office জমা', 'অবস্থা']];

  var mEntries = entries.filter(function(e){ return e.date && e.date.slice(0,7) === month; });
  var sheetMap = {};
  mEntries.forEach(function(e) {
    var key = e.sheet_ref || (e.truck+'|'+e.date);
    if (!sheetMap[key]) sheetMap[key] = { truck: e.truck, date: e.date, driver: '—', rev:0, commission:0, allowance:0, otherExp:0 };
    var s = sheetMap[key];
    if (e.type==='revenue') { s.rev += e.amount; if (e.client && e.client!=='—') s.driver = e.client; }
    if (e.type==='expense') {
      var cat = (e.category||'').toLowerCase();
      if (cat.indexOf('কমিশন')!==-1) s.commission += e.amount;
      else if (cat.indexOf('ভাতা')!==-1||cat.indexOf('দৈনিক')!==-1) s.allowance += e.amount;
      else s.otherExp += e.amount;
    }
  });

  var driverMap = {};
  Object.values(sheetMap).forEach(function(s) {
    var dn = s.driver !== '—' ? s.driver : s.truck;
    if (!driverMap[dn]) driverMap[dn] = { name:dn, truck:s.truck, sheets:0, rev:0, commission:0, allowance:0, otherExp:0 };
    var d = driverMap[dn];
    d.sheets++; d.rev+=s.rev; d.commission+=s.commission; d.allowance+=s.allowance; d.otherExp+=s.otherExp;
  });

  Object.values(driverMap).forEach(function(d) {
    var office = d.rev - d.commission - d.allowance - d.otherExp;
    var paid = payrollPaid[d.name+'-'+month] ? 'পরিশোধিত' : 'বকেয়া';
    rows.push([d.name, d.truck, d.sheets, d.rev, d.commission, d.allowance, d.otherExp, office, paid]);
  });

  var csv = '\uFEFF' + rows.map(function(r){ return r.join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'settlement-' + month + '.csv';
  a.click();
  showNotif('CSV ডাউনলোড হয়েছে', 'var(--accent)');
}

// ── patch switchView for new sections ──
var __origSwitchView = switchView;
switchView = function (v, btn) {
  __origSwitchView(v, btn);
  if (v === 'drivers') {
    showNotif('লোড হচ্ছে...', 'var(--accent)');
    loadDrivers().then(function () { driversRender(); });
    renderSettlement();
  }
  if (v === 'maintenance') {
    showNotif('লোড হচ্ছে...', 'var(--accent)');
    // populate truck filter
    var tf = document.getElementById('mFilterTruck');
    if (tf) { tf.innerHTML = '<option value="">সকল ট্রাক</option>'; TRUCK_NAMES.forEach(function (t) { tf.innerHTML += '<option value="' + t + '">' + t + '</option>'; }); }
    loadMaintenance().then(function () { maintenanceRender(); });
  }
  if (v === 'payroll') {
    payrollPopulateMonths();
    loadDrivers().then(function () { payrollRender(); });
  }
};


// ── WORKER TAB SWITCHER ──
function wSwitchTab(tab) {
  // hide all tab contents
  ['truck','depot','mysheets'].forEach(function(t) {
    var el = document.getElementById('wtab-'+t+'-content');
    if (el) el.style.display = 'none';
    var btn = document.getElementById('wtab-'+t);
    if (btn) { btn.style.background = 'transparent'; btn.style.color = '#94a3b8'; }
  });
  // show selected
  var content = document.getElementById('wtab-'+tab+'-content');
  if (content) content.style.display = 'block';
  var activeBtn = document.getElementById('wtab-'+tab);
  if (activeBtn) { activeBtn.style.background = '#1a56db'; activeBtn.style.color = '#fff'; }

  // wbar
  var wbar = document.getElementById('wbar-truck');
  if (wbar) wbar.style.display = tab === 'truck' ? 'block' : 'none';

  if (tab === 'depot') {
    var sel = document.getElementById('wdRoute');
    if (sel) sel.innerHTML = '<option value="">⏳ রুট লোড হচ্ছে...</option>';
    depotLoadRoutes().then(function () {
      wdInit();
      if (depotRoutes.length === 0) {
        if (sel) sel.innerHTML = '<option value="">কোনো রুট নেই — Management থেকে রুট যোগ করুন</option>';
      }
    });
  }
  if (tab === 'mysheets') {
    renderMySheets();
  }
}

function renderMySheets() {
  var container = document.getElementById('mySheetsContainer');
  var monthSel = document.getElementById('mySheetsMonth');
  if (!container) return;

  // populate month filter
  if (monthSel && monthSel.options.length <= 1) {
    var months = {};
    entries.forEach(function(e){ if(e.date) months[e.date.slice(0,7)] = true; });
    monthSel.innerHTML = '<option value="">সকল মাস</option>'
      + Object.keys(months).sort().reverse().map(function(m){
          var d = new Date(m+'-01');
          return '<option value="'+m+'">'+(MONTHS_BN[d.getMonth()])+' '+d.getFullYear()+'</option>';
        }).join('');
    // default to current month
    var curM = new Date().toISOString().slice(0,7);
    if (months[curM]) monthSel.value = curM;
  }

  var selMonth = monthSel ? monthSel.value : '';

  // group entries by sheet_ref
  var sheetMap = {};
  entries.filter(function(e){
    return !selMonth || (e.date && e.date.slice(0,7) === selMonth);
  }).forEach(function(e) {
    var key = e.sheet_ref || (e.truck + '|' + e.date);
    if (!sheetMap[key]) sheetMap[key] = {ref: e.sheet_ref||'—', truck: e.truck, date: e.date, rev:0, exp:0, driver: e.client||'—'};
    if (e.type==='revenue') sheetMap[key].rev += e.amount;
    else sheetMap[key].exp += e.amount;
    if (e.client && e.client !== '—') sheetMap[key].driver = e.client;
  });

  var sheets = Object.values(sheetMap).sort(function(a,b){ return b.date.localeCompare(a.date); });

  if (!sheets.length) {
    container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px 0;font-size:14px">এই মাসে কোনো শিট নেই</div>';
    return;
  }

  container.innerHTML = sheets.map(function(s) {
    var net = s.rev - s.exp;
    var d = s.date.split('-');
    var dateStr = d[2]+'/'+d[1]+'/'+d[0];
    return '<div style="background:#fff;border-radius:12px;border:1.5px solid #e2e8f0;padding:16px;margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      + '<div><div style="font-size:13px;font-weight:700;color:#1e293b">🚚 '+s.truck+'</div>'
      + '<div style="font-size:11px;color:#94a3b8;margin-top:2px">'+dateStr+' &nbsp;·&nbsp; ড্রাইভার: '+s.driver+'</div></div>'
      + '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;color:#0284c7"># '+s.ref+'</div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
      + '<div style="background:#f0fdf4;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:#64748b;margin-bottom:2px">আয়</div><div style="font-size:14px;font-weight:700;color:#057a55">'+fmt(s.rev)+'</div></div>'
      + '<div style="background:#fff5f5;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:#64748b;margin-bottom:2px">ব্যয়</div><div style="font-size:14px;font-weight:700;color:#c81e1e">'+fmt(s.exp)+'</div></div>'
      + '<div style="background:'+(net>=0?'#f0fdf4':'#fff5f5')+';border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:#64748b;margin-bottom:2px">নিট</div><div style="font-size:14px;font-weight:700;color:'+(net>=0?'#057a55':'#c81e1e')+'">'+fmt(net)+'</div></div>'
      + '</div></div>';
  }).join('');
}

// ── DEPOT TRIP FORM (worker side) ──
function wdInit() {
  // populate route dropdown from depotRoutes (loaded from DB)
  var sel = document.getElementById('wdRoute');
  sel.innerHTML = '<option value="">— রুট বেছে নিন —</option>';
  depotRoutes.forEach(function (r) {
    sel.innerHTML += '<option value="' + r.id + '">' + r.name + ' (' + r.factory + ')</option>';
  });
  document.getElementById('wdDate').value = new Date().toISOString().split('T')[0];
  wdCalc();
}

function wdFillRate() {
  var id = document.getElementById('wdRoute').value;
  var route = depotRoutes.find(function (r) { return r.id === id; });
  if (route) {
    document.getElementById('wdRate').value = route.rate;
    document.getElementById('wdRouteInfo').innerHTML =
      '🏭 <strong>ফ্যাক্টরি:</strong> ' + route.factory + ' &nbsp;&nbsp; 📦 <strong>ডিপো:</strong> ' + route.depot;
  } else {
    document.getElementById('wdRate').value = '';
    document.getElementById('wdRouteInfo').textContent = 'রুট বেছে নিলে ফ্যাক্টরি ও ডিপোর তথ্য দেখাবে';
  }
  wdCalc();
}

function wdNv(id) { var el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }
function wdFmtLive(inputId, displayId) {
  var n = parseFloat(document.getElementById(inputId).value) || 0;
  if (!n) { document.getElementById(displayId).textContent = ''; return; }
  // Bengali number format with commas: 0,00,00,000
  var intPart = Math.round(n).toString();
  var formatted = '';
  if (intPart.length > 3) {
    formatted = intPart.slice(-3);
    var rest = intPart.slice(0, -3);
    while (rest.length > 2) { formatted = rest.slice(-2) + ',' + formatted; rest = rest.slice(0, -2); }
    if (rest) formatted = rest + ',' + formatted;
  } else { formatted = intPart; }
  var bn = formatted.replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
  document.getElementById(displayId).textContent = bn;
}

function wdCalc() {
  var kg = wdNv('wdKg'), rate = wdNv('wdRate'), rent = wdNv('wdRent');
  var rev = Math.round(kg * rate), profit = rev - rent;
  var fmt = function (n) { var v = Math.abs(Math.round(n)).toString(); var r = v.length > 3 ? v.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + v.slice(-3) : v; return '৳' + r.replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; }); };
  document.getElementById('wdRevenue').textContent = fmt(rev);
  document.getElementById('wdRentShow').textContent = fmt(rent);
  document.getElementById('wdProfit').textContent = (profit < 0 ? '-' : '') + fmt(Math.abs(profit));
  document.getElementById('wdProfit').style.color = profit >= 0 ? '#fbbf24' : '#fca5a5';
}

async function wdSubmit() {
  var routeId = document.getElementById('wdRoute').value;
  var date = document.getElementById('wdDate').value;
  var kg = wdNv('wdKg');
  var rate = wdNv('wdRate');
  var rent = wdNv('wdRent');
  if (!routeId || !date || !kg || !rate || !rent) { showNotif('সব তথ্য পূরণ করুন', 'var(--red)'); return; }
  var route = depotRoutes.find(function (r) { return r.id === routeId; });
  var rev = Math.round(kg * rate);
  var trip = {
    id: 'dt' + Date.now(), date: date, routeId: routeId,
    route: route.name, factory: route.factory, depot: route.depot,
    kg: kg, rate: rate, revenue: rev, rent: rent, profit: rev - rent,
    note: document.getElementById('wdNote').value || ''
  };
  depotTrips.unshift(trip);
  await depotSaveTripToDB(trip);
  // reset form
  ['wdKg', 'wdRent', 'wdDriver', 'wdNote'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('wdRoute').value = '';
  document.getElementById('wdRate').value = '';
  document.getElementById('wdRouteInfo').textContent = 'রুট বেছে নিলে ফ্যাক্টরি ও ডিপোর তথ্য দেখাবে';
  document.getElementById('wdDate').value = new Date().toISOString().split('T')[0];
  wdCalc();
  showNotif('✅ ডিপো ট্রিপ জমা হয়েছে!', 'var(--green)');
  setTimeout(logout, 300000);
}

// ── LOGOUT ──
async function logout() {
  if (currentUser) {
    await logActivity(currentUser.username, currentUser.role, 'logout');
    currentUser = null;
  }
  selectedUserId = null;
  pinVal = '';
  pinTarget = '';
  // Remove viewer restrictions
  var vStyle = document.getElementById('viewer-restrictions');
  if (vStyle) vStyle.remove();
  // Clear role badge
  var badge = document.getElementById('userRoleBadge');
  if (badge) badge.innerHTML = '';
  // reset worker tab back to truck on next login
  document.getElementById('wtab-truck-content').style.display = 'block';
  document.getElementById('wtab-depot-content').style.display = 'none';
  document.getElementById('wbar-truck').style.display = 'block';
  document.getElementById('wtab-truck').style.background = '#1a56db';
  document.getElementById('wtab-truck').style.color = '#fff';
  document.getElementById('wtab-depot').style.background = 'transparent';
  document.getElementById('wtab-depot').style.color = '#94a3b8';
  showScreen('role');
}

// ── STARTUP ──

// ── USER MANAGEMENT ──
var editingUserId = null;

function showUserModal(userId) {
  editingUserId = userId || null;
  document.getElementById('userModalTitle').textContent = userId ? 'ব্যবহারকারী সম্পাদনা' : 'নতুন ব্যবহারকারী';
  if (userId) {
    var u = allUsers.find(function(x) { return x.id === userId; });
    if (u) {
      document.getElementById('umUsername').value = u.username;
      document.getElementById('umRole').value = u.role;
      document.getElementById('umUsername').disabled = true;
    }
  } else {
    document.getElementById('umUsername').value = '';
    document.getElementById('umPin').value = '';
    document.getElementById('umRole').value = 'operator';
    document.getElementById('umUsername').disabled = false;
  }
  document.getElementById('umPin').value = '';
  document.getElementById('userModalBg').style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('userModalBg').style.display = 'none';
  editingUserId = null;
}

async function saveUser() {
  var username = document.getElementById('umUsername').value.trim();
  var pin = document.getElementById('umPin').value.trim();
  var role = document.getElementById('umRole').value;
  if (!username) { showNotif('Username দিন', 'var(--red)'); return; }
  if (!editingUserId && pin.length !== 4) { showNotif('৪ সংখ্যার PIN দিন', 'var(--red)'); return; }
  try {
    if (editingUserId) {
      // update role (and PIN if provided)
      var payload = { role: role };
      if (pin.length === 4) payload.pin_hash = await sha256(pin);
      var r = await fetch(S_URL + '/rest/v1/users?id=eq.' + editingUserId, {
        method: 'PATCH',
        headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error('Update failed');
    } else {
      var pinHash = await sha256(pin);
      var r = await fetch(S_URL + '/rest/v1/users', {
        method: 'POST',
        headers: Object.assign({}, S_HDR, { 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ username: username, pin_hash: pinHash, role: role })
      });
      if (!r.ok) throw new Error('Create failed');
    }
    showNotif('✅ সেভ হয়েছে!', 'var(--green)');
    closeUserModal();
    await loadUsers();
    renderUserMgmtTable();
  } catch(e) {
    showNotif('❌ Error: ' + e.message, 'var(--red)');
  }
}

async function deleteUser(userId) {
  if (!confirm('এই ব্যবহারকারী মুছে ফেলবেন?')) return;
  try {
    await fetch(S_URL + '/rest/v1/users?id=eq.' + userId, { method: 'DELETE', headers: S_HDR });
    showNotif('✅ মুছে ফেলা হয়েছে', 'var(--green)');
    await loadUsers();
    renderUserMgmtTable();
  } catch(e) { showNotif('❌ Error', 'var(--red)'); }
}

function renderUserMgmtTable() {
  var el = document.getElementById('userMgmtTable');
  if (!el) return;
  var roleLabel = { admin: '⚙️ Admin', operator: '👷 Operator', viewer: '👁 Viewer' };
  var rows = allUsers.map(function(u) {
    return '<tr style="border-bottom:1px solid #f1f5f9">'
      + '<td style="padding:10px 12px;font-weight:700">' + u.username + '</td>'
      + '<td style="padding:10px 12px"><span style="background:#e0e7ff;color:#4338ca;border-radius:5px;padding:2px 9px;font-size:12px;font-weight:600">' + (roleLabel[u.role]||u.role) + '</span></td>'
      + '<td style="padding:10px 12px;white-space:nowrap">'
      + '<button onclick="showUserModal(\"' + u.id + '\")" style="background:#eff6ff;border:1.5px solid #c7d7f8;color:#1a56db;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;margin-right:6px">✏️ সম্পাদনা</button>'
      + (currentUser && u.id !== currentUser.id ? '<button onclick="deleteUser(\"' + u.id + '\")" style="background:#fde8e8;border:1.5px solid #f8d0d0;color:#c81e1e;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit">🗑️</button>' : '')
      + '</td></tr>';
  }).join('');
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden">'
    + '<thead><tr style="background:#f8fafc"><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b">Username</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b">Role</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b">Action</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>';
}

async function loadActivityLog() {
  try {
    var r = await fetch(S_URL + '/rest/v1/activity_log?select=*&order=created_at.desc&limit=50', { headers: S_HDR });
    if (!r.ok) return;
    var logs = await r.json();
    var el = document.getElementById('activityLogTable');
    if (!el) return;
    var rows = logs.map(function(l) {
      var dt = new Date(l.created_at);
      var dtStr = dt.toLocaleDateString('bn-BD') + ' ' + dt.toLocaleTimeString('bn-BD', {hour:'2-digit',minute:'2-digit'});
      var actionColor = l.action === 'login' ? '#057a55' : l.action === 'logout' ? '#c81e1e' : '#1a56db';
      var actionIcon = l.action === 'login' ? '🔓' : l.action === 'logout' ? '🔒' : '⚡';

      // device icon
      var devStr = l.device || '';
      var devIcon = '💻';
      if (/Android|Mobile/.test(devStr)) devIcon = '📱';
      else if (/iPhone/.test(devStr)) devIcon = '📱';
      else if (/iPad/.test(devStr)) devIcon = '📱';
      else if (/MacBook/.test(devStr)) devIcon = '💻';
      else if (/Windows/.test(devStr)) devIcon = '🖥️';

      var locationStr = l.location || '';
      var deviceLine = devStr ? (devIcon + ' ' + devStr) : '';
      var locationLine = locationStr ? ('📍 ' + locationStr) : '';

      return '<tr style="border-bottom:1px solid #f1f5f9">'
        + '<td style="padding:10px 12px"><div style="font-weight:700;color:#1e293b">' + l.username + '</div>'
        + '<div style="font-size:11px;margin-top:2px"><span style="background:#e0e7ff;color:#4338ca;border-radius:4px;padding:1px 6px">' + (l.role||'') + '</span></div></td>'
        + '<td style="padding:10px 12px"><span style="color:'+actionColor+';font-weight:700;font-size:13px">'+actionIcon+' ' + l.action + '</span></td>'
        + '<td style="padding:10px 12px">'
        + (deviceLine ? '<div style="font-size:12px;color:#475569">'+deviceLine+'</div>' : '')
        + (locationLine ? '<div style="font-size:12px;color:#94a3b8;margin-top:2px">'+locationLine+'</div>' : '')
        + (!deviceLine && !locationLine ? '<span style="color:#cbd5e1;font-size:12px">—</span>' : '')
        + '</td>'
        + '<td style="padding:10px 12px;color:#94a3b8;font-size:12px;white-space:nowrap">' + dtStr + '</td>'
        + '</tr>';
    }).join('');
    el.innerHTML = '<table style="width:100%;border-collapse:collapse;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden">'
      + '<thead><tr style="background:#f8fafc"><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b">ব্যবহারকারী</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b">কার্যক্রম</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b">ডিভাইস / লোকেশন</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b">সময়</th></tr></thead>'
      + '<tbody>' + rows + '</tbody></table>';
  } catch(e) {}
}

async function startup() {
  init();
  var kpiStrip = document.getElementById('mainKpiStrip');
  if (kpiStrip) kpiStrip.classList.add('visible');
  showScreen('role');
  // load users for login screen
  await loadUsers();
  // load truck list FIRST so dropdowns are ready, then load entries
  await loadTruckList();

  var results = await Promise.allSettled([dbLoad(), loadTruckMeta(), loadDrivers(), loadMaintenance()]);
  var loaded = results[0].status === 'fulfilled' ? results[0].value : null;
  console.log('startup: entries loaded =', loaded ? loaded.length : 0);
  if (loaded && loaded.length > 0) {
    entries = loaded;
    // Auto-register any missing trucks from the DB
    var addedNew = false;
    entries.forEach(function (e) {
      if (e.truck && TRUCK_NAMES.indexOf(e.truck) === -1) {
        TRUCK_NAMES.push(e.truck);
        addedNew = true;
      }
    });
    if (addedNew) {
      saveTruckList(); // Sync back to the DB to make it official
      truckNamesChanged(true); // Update dropdowns without re-rendering everything yet
    }
  } else {
    entries = [];
  }
  applyFilters();
  renderAll();
}
startup();
