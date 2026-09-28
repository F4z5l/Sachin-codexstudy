/* Shared helpers for batch.html and content.html (static, no backend). */
(function (w) {
  'use strict';
  var LMS = {};
  var cache = null;

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return (typeof v === 'string' || typeof v === 'number') ? String(v).trim() : ''; }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  LMS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* Returns an absolute http(s) URL, or '' if empty/invalid. */
  LMS.safeVideoUrl = function (v) {
    v = str(v);
    if (!v) return '';
    try {
      var u = new URL(v, w.location.href);
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch (e) { return ''; }
  };

  function normalize(raw) {
    var list;
    if (Array.isArray(raw)) list = raw;
    else if (isObj(raw) && Array.isArray(raw.batches)) list = raw.batches;
    else if (isObj(raw) && (Array.isArray(raw.new) || Array.isArray(raw.old))) {
      list = [].concat(Array.isArray(raw.new) ? raw.new : [], Array.isArray(raw.old) ? raw.old : []);
    } else throw new Error('invalid');

    var out = [];
    list.forEach(function (b) {
      if (!isObj(b) || !str(b.id)) return;
      var batch = {
        id: str(b.id),
        title: str(b.title) || str(b.name) || 'Untitled batch',
        thumbnail: str(b.thumbnail) || 'images/sachinlogo.png',
        subjects: []
      };
      (Array.isArray(b.subjects) ? b.subjects : []).forEach(function (s) {
        if (!isObj(s)) return;
        var name = str(s.name) || str(s.title);
        var sid = str(s.id) || slug(name);
        if (!sid) return;
        var subj = { id: sid, name: name || sid, lectures: [] };
        (Array.isArray(s.lectures) ? s.lectures : []).forEach(function (l) {
          if (!isObj(l) || !str(l.id)) return;
          subj.lectures.push({
            id: str(l.id),
            title: str(l.title) || str(l.name) || 'Untitled lecture',
            teacher: str(l.teacher) || str(l.faculty),
            video: str(l.video) || str(l.url)
          });
        });
        batch.subjects.push(subj);
      });
      out.push(batch);
    });
    return out;
  }

  /* Loads and validates batches.json. Rejects with Error(.code = 'missing' | 'invalid'). */
  LMS.load = function () {
    if (cache) return cache;
    cache = fetch('batches.json', { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) { var e = new Error('missing'); e.code = 'missing'; throw e; }
      return res.text();
    }, function () {
      var e = new Error('missing'); e.code = 'missing'; throw e;
    }).then(function (txt) {
      var raw;
      try { raw = JSON.parse(txt); } catch (err) { var e = new Error('invalid'); e.code = 'invalid'; throw e; }
      try { return normalize(raw); } catch (err2) { var e2 = new Error('invalid'); e2.code = 'invalid'; throw e2; }
    });
    return cache;
  };

  LMS.loadErrorMessage = function (err) {
    if (err && err.code === 'invalid') {
      return { title: 'Data file is invalid', msg: 'batches.json could not be read. Please check that it is valid JSON.' };
    }
    var hint = w.location.protocol === 'file:'
      ? ' Open the site through a web server (or your hosting URL) instead of directly from the file system.' : '';
    return { title: 'Could not load lectures', msg: 'batches.json is missing or could not be loaded.' + hint };
  };

  LMS.findBatch = function (batches, id) {
    for (var i = 0; i < batches.length; i++) if (batches[i].id === id) return batches[i];
    return null;
  };

  LMS.findLecture = function (batches, id) {
    for (var i = 0; i < batches.length; i++) {
      var b = batches[i];
      for (var j = 0; j < b.subjects.length; j++) {
        var s = b.subjects[j];
        for (var k = 0; k < s.lectures.length; k++) {
          if (s.lectures[k].id === id) return { batch: b, subject: s, lecture: s.lectures[k], index: k };
        }
      }
    }
    return null;
  };

  LMS.batchUrl = function (b) { return 'batch.html?id=' + encodeURIComponent(b.id); };
  LMS.subjectUrl = function (b, s) { return LMS.batchUrl(b) + '&subject=' + encodeURIComponent(s.id); };
  LMS.lectureUrl = function (l) { return 'content.html?id=' + encodeURIComponent(l.id); };

  /* Friendly state box: kind = 'loading' | 'error' */
  LMS.stateHTML = function (kind, title, msg, actionsHTML) {
    var icon = kind === 'loading'
      ? '<span class="spinner" aria-hidden="true"></span>'
      : '<svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    return '<div class="state-box' + (kind === 'error' ? ' is-error' : '') + '">' + icon +
      '<h2>' + LMS.esc(title) + '</h2>' + (msg ? '<p>' + LMS.esc(msg) + '</p>' : '') +
      (actionsHTML ? '<div class="state-actions">' + actionsHTML + '</div>' : '') + '</div>';
  };

  w.LMS = LMS;
})(window);
