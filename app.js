/* Danube Dancers Ulm – Termine (dates.json), Navigation, Dialoge */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var DEFAULT_LOCATION = 'Saulgauer Straße 3, 89079 Ulm-Wiblingen';
  var WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var DAY = 24 * 60 * 60 * 1000;

  var calendar = document.getElementById('calendar-container');
  var sliderMin = document.getElementById('date-slider-min');
  var sliderMax = document.getElementById('date-slider-max');
  var rangeFill = document.getElementById('rangeFill');
  var startLabel = document.getElementById('date-start-label');
  var endLabel = document.getElementById('date-end-label');
  var resultsCount = document.getElementById('results-count');
  var filterSquare = document.getElementById('filter-square');
  var filterRound = document.getElementById('filter-round');
  var filterOther = document.getElementById('filter-other');

  var allDates = [], everyDate = [], today = null, lastDate = null, nextEvent = null;

  function parseDate(s) {
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function kind(typ) {
    var t = (typ || '').toLowerCase();
    if (t.indexOf('square') > -1) return 'square';
    if (t.indexOf('round') > -1) return 'round';
    return 'other';
  }
  function cssType(typ) {
    var t = (typ || '').toLowerCase(), k = kind(typ);
    if (k !== 'other') return 'type-' + k;
    if (/special|event|feier|fest/.test(t)) return 'type-special';
    return 'type-other';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(d, opts) { return d.toLocaleDateString('de-DE', opts); }

  // ---------- Termine laden ----------
  function load() {
    today = new Date(); today.setHours(0, 0, 0, 0);
    fetch('dates.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (dates) {
        everyDate = dates
          .map(function (t) { t._date = parseDate(t.datum); return t; })
          .sort(function (a, b) { return a._date - b._date; });
        allDates = everyDate.filter(function (t) { return t._date >= today; });
        nextEvent = allDates[0] || null;

        if (!allDates.length) {
          calendar.innerHTML = '<p class="calendar-empty">Aktuell sind keine zukünftigen Termine eingetragen. Schau bald wieder vorbei!</p>';
          resultsCount.textContent = '0';
          return;
        }
        lastDate = allDates[allDates.length - 1]._date;
        showNextChip(nextEvent);
        updateFill();
        applyFilters();
        [sliderMin, sliderMax].forEach(function (s) { s.addEventListener('input', onSlider); });
        [filterSquare, filterRound, filterOther].forEach(function (c) { c.addEventListener('change', applyFilters); });
      })
      .catch(function (err) {
        console.error('Fehler beim Laden der Termine:', err);
        calendar.innerHTML = '<p class="calendar-empty">Die Termine konnten nicht geladen werden. Bitte lade die Seite neu oder versuche es später noch einmal.</p>';
      });
  }

  function showNextChip(t) {
    var chip = document.getElementById('nextChip'), text = document.getElementById('nextChipText');
    if (!chip || !t) return;
    var d = t._date;
    text.textContent = WEEKDAYS_DE[d.getDay()] + ', ' + fmt(d, { day: 'numeric', month: 'long' }) +
      (t.uhrzeit ? ' · ' + t.uhrzeit + ' Uhr' : '') + ' · ' + (t.typ || 'Termin');
    chip.hidden = false;
  }

  function onSlider(e) {
    var a = parseInt(sliderMin.value, 10), b = parseInt(sliderMax.value, 10);
    if (a > b) {
      if (e.target === sliderMin) sliderMin.value = a = b;
      else sliderMax.value = b = a;
    }
    // der zuletzt bewegte Regler liegt oben, damit sich beide immer greifen lassen
    sliderMin.style.zIndex = e.target === sliderMin ? 3 : 2;
    sliderMax.style.zIndex = e.target === sliderMax ? 3 : 2;
    updateFill();
    applyFilters();
  }
  function updateFill() {
    var a = parseInt(sliderMin.value, 10), b = parseInt(sliderMax.value, 10);
    rangeFill.style.left = a + '%';
    rangeFill.style.width = (b - a) + '%';
  }

  function applyFilters() {
    if (!allDates.length) return;
    var total = Math.ceil((lastDate - today) / DAY);
    var start = new Date(today.getTime() + Math.ceil(sliderMin.value / 100 * total) * DAY);
    var end = new Date(today.getTime() + Math.ceil(sliderMax.value / 100 * total) * DAY);
    var o = { day: 'numeric', month: 'short', year: 'numeric' };
    startLabel.textContent = fmt(start, o);
    endLabel.textContent = fmt(end, o);

    var show = { square: filterSquare.checked, round: filterRound.checked, other: filterOther.checked };
    var list = allDates.filter(function (t) {
      return t._date >= start && t._date <= end && show[kind(t.typ)];
    });
    render(list);
    resultsCount.textContent = list.length;
  }

  function render(list) {
    if (!list.length) {
      calendar.innerHTML = '<p class="calendar-empty">Keine Termine für die ausgewählten Filter gefunden.</p>';
      return;
    }
    var html = '', month = '';
    list.forEach(function (t) {
      var d = t._date;
      var m = fmt(d, { month: 'long', year: 'numeric' });
      if (m !== month) {
        if (month) html += '</div>';
        html += '<div class="month"><h3 class="month-title">' + esc(m) + '</h3>';
        month = m;
      }
      var loc = t.ort && t.ort.trim() !== '' ? t.ort : DEFAULT_LOCATION;
      var isNext = t === nextEvent;
      html +=
        '<article class="event ' + cssType(t.typ) + (isNext ? ' is-next' : '') + '">' +
          '<div class="event-date" aria-label="' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + '">' +
            '<span class="event-weekday">' + WEEKDAYS_DE[d.getDay()] + '</span>' +
            '<span class="event-day">' + d.getDate() + '</span>' +
            '<span class="event-month">' + esc(fmt(d, { month: 'short' }).replace('.', '')) + '</span>' +
          '</div>' +
          '<div class="event-body">' +
            '<div class="event-head">' +
              '<h4 class="event-title">' + esc(t.typ || 'Termin') + '</h4>' +
              (t.level ? '<span class="event-level">' + esc(t.level) + '</span>' : '') +
              (isNext ? '<span class="next-flag">Als Nächstes</span>' : '') +
            '</div>' +
            '<div class="event-meta">' +
              (t.uhrzeit ? '<span><b>' + esc(t.uhrzeit) + ' Uhr</b></span>' : '') +
              (t.caller ? '<span>Caller/Cuer: <b>' + esc(t.caller) + '</b></span>' : '') +
              '<span>Ort: ' + esc(loc) + '</span>' +
            '</div>' +
            (t.extras ? '<p class="event-extra">Info: ' + esc(t.extras) + '</p>' : '') +
          '</div>' +
        '</article>';
    });
    calendar.innerHTML = html + '</div>';
  }

  // ---------- Navigation ----------
  var header = document.getElementById('siteHeader');
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('mainNav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  }
  toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.header-bar')) setMenu(false); });

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {                 // aktiven Abschnitt in der Navigation markieren
    var links = {};
    nav.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = links[en.target.id];
        if (a && en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
          a.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ---------- Impressum / Datenschutz ----------
  document.querySelectorAll('[data-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = document.getElementById(btn.getAttribute('data-dialog'));
      if (dlg && dlg.showModal) dlg.showModal();
      else if (dlg) dlg.setAttribute('open', '');
    });
  });
  document.querySelectorAll('dialog.legal').forEach(function (dlg) {
    dlg.querySelector('.legal-close').addEventListener('click', function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   // Klick auf den Hintergrund
  });

  // ---------- E-Mail kopieren ----------
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.getAttribute('aria-label');
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      function done() {
        btn.classList.add('is-copied'); btn.setAttribute('aria-label', 'Kopiert'); btn.title = 'Kopiert';
        setTimeout(function () { btn.classList.remove('is-copied'); btn.setAttribute('aria-label', label); btn.title = label; }, 1800);
      }
      function select() { var a = btn.previousElementSibling || btn; var r = document.createRange(); r.selectNodeContents(a); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, select);
      else select();
    });
  });

  // ---------- Monatskalender (Dialog) ----------
  var calDlg = document.getElementById('kalender');
  var calGrid = document.getElementById('calGrid');
  var calMonth = document.getElementById('calMonth');
  var calDetail = document.getElementById('calDetail');
  var calPrev = document.getElementById('calPrev');
  var calNext = document.getElementById('calNext');
  var view = null, selected = null;                // view = erster Tag des Monats, selected = 'JJJJ-MM-TT'

  function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function byDay() {
    var m = {};
    everyDate.forEach(function (t) { (m[t.datum] = m[t.datum] || []).push(t); });
    return m;
  }
  function bounds() {                              // vom ersten bis zum letzten Monat mit Terminen (mindestens der aktuelle)
    var lo = new Date(today.getFullYear(), today.getMonth(), 1), hi = new Date(lo);
    if (everyDate.length) {
      var f = everyDate[0]._date, l = everyDate[everyDate.length - 1]._date;
      if (f < lo) lo = new Date(f.getFullYear(), f.getMonth(), 1);
      var lm = new Date(l.getFullYear(), l.getMonth(), 1);
      if (lm > hi) hi = lm;
    }
    return [lo, hi];
  }
  function shortType(typ) {
    var k = kind(typ);
    return k === 'square' ? 'Square' : k === 'round' ? 'Round' : (typ || 'Termin');
  }
  function openCalendar() {
    if (!today) { today = new Date(); today.setHours(0, 0, 0, 0); }
    var start = nextEvent ? nextEvent._date : today;
    view = new Date(start.getFullYear(), start.getMonth(), 1);
    selected = nextEvent ? nextEvent.datum : null;
    renderCal();
    if (calDlg.showModal) calDlg.showModal(); else calDlg.setAttribute('open', '');
  }
  function shiftMonth(n) {
    view = new Date(view.getFullYear(), view.getMonth() + n, 1);
    var b = bounds();
    if (view < b[0]) view = b[0];
    if (view > b[1]) view = b[1];
    renderCal();
  }
  function renderCal() {
    var days = byDay(), b = bounds();
    calMonth.textContent = fmt(view, { month: 'long', year: 'numeric' });
    calPrev.disabled = view <= b[0];
    calNext.disabled = view >= b[1];
    var offset = (view.getDay() + 6) % 7;          // Woche beginnt am Montag
    var cur = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
    var html = '';
    for (var i = 0; i < 42; i++) {
      var k = dayKey(cur), out = cur.getMonth() !== view.getMonth(), evs = out ? [] : days[k] || [];
      if (i === 35 && out) break;                  // keine leere sechste Woche
      var cls = 'cal-day' + (out ? ' is-out' : '') + (cur < today ? ' is-past' : '') + (+cur === +today ? ' is-today' : '') +
                (evs.length ? ' has-events' : '') + (k === selected ? ' is-selected' : '');
      html += '<div class="' + cls + '" data-day="' + k + '"><span class="cal-num">' + cur.getDate() + '</span>';
      evs.forEach(function (t) {
        var label = fmt(t._date, { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + (t.typ || 'Termin') + (t.uhrzeit ? ', ' + t.uhrzeit + ' Uhr' : '');
        html += '<button type="button" class="cal-chip ' + cssType(t.typ) + '" data-day="' + k + '" aria-label="' + esc(label) + '">' +
                '<span class="cal-chip-type">' + esc(shortType(t.typ)) + '</span>' +
                (t.uhrzeit ? '<span class="cal-chip-time">' + esc(t.uhrzeit) + '</span>' : '') + '</button>';
      });
      html += '</div>';
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
    calGrid.innerHTML = html;
    renderDetail(days);
  }
  function renderDetail(days) {
    var evs = selected ? (days || byDay())[selected] || [] : [];
    if (!evs.length) {
      var n = everyDate.filter(function (t) { return t._date.getFullYear() === view.getFullYear() && t._date.getMonth() === view.getMonth(); }).length;
      calDetail.innerHTML = '<p class="cal-hint">' + (n ? 'Tippe auf einen Termin, um mehr zu erfahren.' : 'In diesem Monat sind keine Termine eingetragen.') + '</p>';
      return;
    }
    calDetail.innerHTML = evs.map(function (t) {
      var d = t._date, past = d < today, loc = t.ort && t.ort.trim() !== '' ? t.ort : DEFAULT_LOCATION;
      return '<article class="cal-card ' + cssType(t.typ) + '">' +
        '<p class="cal-card-date">' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + '</p>' +
        '<h3>' + esc(t.typ || 'Termin') + '</h3>' +
        '<div class="cal-card-tags">' + (t.level ? '<span class="event-level">' + esc(t.level) + '</span>' : '') +
          (t === nextEvent ? '<span class="next-flag">Als Nächstes</span>' : '') + (past ? '<span class="past-flag">Vergangen</span>' : '') + '</div>' +
        '<dl class="cal-facts">' +
          (t.uhrzeit ? '<div><dt>Beginn</dt><dd>' + esc(t.uhrzeit) + ' Uhr</dd></div>' : '') +
          (t.caller ? '<div><dt>Caller/Cuer</dt><dd>' + esc(t.caller) + '</dd></div>' : '') +
          '<div><dt>Ort</dt><dd>' + esc(loc) + '<br><a href="https://www.google.com/maps/search/?api=1&amp;query=' +
            encodeURIComponent(loc) + '" target="_blank" rel="noopener">In Google Maps öffnen</a></dd></div>' +
          (t.extras ? '<div><dt>Info</dt><dd>' + esc(t.extras) + '</dd></div>' : '') +
        '</dl></article>';
    }).join('');
  }
  calGrid.addEventListener('click', function (e) {
    var el = e.target.closest('[data-day]');
    if (!el) return;
    var cell = el.closest('.cal-day');
    if (!cell || !cell.classList.contains('has-events')) return;
    selected = el.getAttribute('data-day');
    calGrid.querySelectorAll('.is-selected').forEach(function (x) { x.classList.remove('is-selected'); });
    cell.classList.add('is-selected');
    renderDetail();
    if (window.matchMedia('(max-width: 860px)').matches) calDetail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  calPrev.addEventListener('click', function () { selected = null; shiftMonth(-1); });
  calNext.addEventListener('click', function () { selected = null; shiftMonth(1); });
  document.getElementById('calToday').addEventListener('click', function () {
    view = new Date(today.getFullYear(), today.getMonth(), 1); selected = null; shiftMonth(0);
  });
  calDlg.addEventListener('keydown', function (e) {             // Pfeiltasten blättern die Monate
    if (e.key === 'ArrowLeft' && !calPrev.disabled) { selected = null; shiftMonth(-1); }
    if (e.key === 'ArrowRight' && !calNext.disabled) { selected = null; shiftMonth(1); }
  });
  document.getElementById('openCalendar').addEventListener('click', openCalendar);

  document.getElementById('current-year').textContent = new Date().getFullYear();
  load();
});
