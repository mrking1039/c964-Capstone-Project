// ---------------------------------------------------------------------------
//  store.js — shared state backend for the Kick daily sub counter.
//
//  Exposes window.SubStore.create(channel) -> a store object that both the
//  overlay and the control panel use. It transparently uses one of two
//  backends:
//
//    * "firebase" — real-time sync across every device/browser (used when
//      window.FIREBASE_CONFIG.apiKey is filled in).
//    * "local"    — localStorage + BroadcastChannel, syncs only within the
//      SAME browser. Used as a no-setup fallback for testing.
//
//  State shape: { date: "YYYY-MM-DD", count: <number>, goal: <number> }
//
//  API:
//    store.mode                 -> "firebase" | "local"
//    store.subscribe(fn)        -> fn(state) now and on every change
//    store.onStatus(fn)         -> fn(text, kind) connection status updates
//    store.ensureToday()        -> reset count to 0 if the local day changed
//    store.setCount(n)          -> set the count to exactly n
//    store.addCount(n)          -> atomically add n to the count (for live subs)
//    store.setGoal(n)           -> set the goal to exactly n
// ---------------------------------------------------------------------------

(function () {
  "use strict";

  var DEFAULT_GOAL = 5;

  function todayStamp() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function normalize(s) {
    s = s || {};
    return {
      date: s.date || todayStamp(),
      count: Math.max(0, Math.floor(Number(s.count) || 0)),
      goal: Math.max(0, Math.floor(Number(s.goal != null ? s.goal : DEFAULT_GOAL)))
    };
  }

  function hasFirebaseConfig() {
    var c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.databaseURL);
  }

  // -------------------------------------------------------------------------
  //  Firebase backend
  // -------------------------------------------------------------------------
  function firebaseBackend(channel, subs, status) {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    var db = firebase.database();
    var ref = db.ref("kickDailySubs/" + channel);

    var current = normalize({});

    db.ref(".info/connected").on("value", function (snap) {
      if (snap.val() === true) status("Synced (Firebase)", "ok");
      else status("Connecting to Firebase…", "warn");
    });

    ref.on("value", function (snap) {
      current = normalize(snap.val());
      subs.forEach(function (fn) { fn(current); });
    }, function (err) {
      status("Firebase error: " + err.message + " (check database rules)", "err");
    });

    function ensureToday() {
      ref.transaction(function (cur) {
        cur = cur || { date: todayStamp(), count: 0, goal: DEFAULT_GOAL };
        if (cur.goal == null) cur.goal = DEFAULT_GOAL;
        if (cur.count == null) cur.count = 0;
        if (cur.date !== todayStamp()) { cur.date = todayStamp(); cur.count = 0; }
        return cur;
      });
    }

    return {
      mode: "firebase",
      get: function () { return current; },
      ensureToday: ensureToday,
      setCount: function (n) {
        n = Math.max(0, Math.floor(n));
        ref.transaction(function (cur) {
          cur = cur || { date: todayStamp(), goal: DEFAULT_GOAL };
          cur.count = n; cur.date = todayStamp();
          if (cur.goal == null) cur.goal = DEFAULT_GOAL;
          return cur;
        });
      },
      addCount: function (n) {
        n = Math.floor(n);
        ref.transaction(function (cur) {
          cur = cur || { date: todayStamp(), goal: DEFAULT_GOAL, count: 0 };
          if (cur.date !== todayStamp()) { cur.date = todayStamp(); cur.count = 0; }
          cur.count = Math.max(0, (cur.count || 0) + n);
          if (cur.goal == null) cur.goal = DEFAULT_GOAL;
          return cur;
        });
      },
      setGoal: function (n) {
        n = Math.max(0, Math.floor(n));
        ref.transaction(function (cur) {
          cur = cur || { date: todayStamp(), count: 0 };
          cur.goal = n;
          if (cur.date == null) cur.date = todayStamp();
          if (cur.count == null) cur.count = 0;
          return cur;
        });
      }
    };
  }

  // -------------------------------------------------------------------------
  //  Local backend (single browser) — localStorage + BroadcastChannel
  // -------------------------------------------------------------------------
  function localBackend(channel, subs, status) {
    var KEY = "kick-daily-" + channel;
    var bc = null;
    try { bc = new BroadcastChannel(KEY); } catch (e) { bc = null; }

    function read() {
      try { return normalize(JSON.parse(localStorage.getItem(KEY) || "null")); }
      catch (e) { return normalize({}); }
    }
    function write(state) {
      state = normalize(state);
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      if (bc) { try { bc.postMessage(state); } catch (e) {} }
      subs.forEach(function (fn) { fn(state); });
      return state;
    }

    if (bc) bc.onmessage = function (ev) { subs.forEach(function (fn) { fn(normalize(ev.data)); }); };
    window.addEventListener("storage", function (ev) {
      if (ev.key === KEY) subs.forEach(function (fn) { fn(read()); });
    });

    status("Local mode (this browser only) — add Firebase config to sync", "warn");

    return {
      mode: "local",
      get: read,
      ensureToday: function () {
        var s = read();
        if (s.date !== todayStamp()) { s.date = todayStamp(); s.count = 0; write(s); }
      },
      setCount: function (n) { var s = read(); s.count = Math.max(0, Math.floor(n)); s.date = todayStamp(); write(s); },
      addCount: function (n) {
        var s = read();
        if (s.date !== todayStamp()) { s.date = todayStamp(); s.count = 0; }
        s.count = Math.max(0, s.count + Math.floor(n)); write(s);
      },
      setGoal: function (n) { var s = read(); s.goal = Math.max(0, Math.floor(n)); write(s); }
    };
  }

  // -------------------------------------------------------------------------
  //  Public factory
  // -------------------------------------------------------------------------
  window.SubStore = {
    create: function (channel) {
      channel = (channel || "boyking").toLowerCase();
      var subs = [];
      var statusCbs = [];
      var lastStatus = { text: "", kind: "" };
      function status(text, kind) {
        lastStatus = { text: text, kind: kind };
        statusCbs.forEach(function (fn) { fn(text, kind); });
      }

      var backend = hasFirebaseConfig()
        ? firebaseBackend(channel, subs, status)
        : localBackend(channel, subs, status);

      // Make the day-rollover check automatic.
      backend.ensureToday();
      setInterval(backend.ensureToday, 30 * 1000);

      return {
        mode: backend.mode,
        channel: channel,
        subscribe: function (fn) { subs.push(fn); try { fn(backend.get()); } catch (e) {} },
        onStatus: function (fn) { statusCbs.push(fn); fn(lastStatus.text, lastStatus.kind); },
        ensureToday: backend.ensureToday,
        setCount: backend.setCount,
        addCount: backend.addCount,
        setGoal: backend.setGoal
      };
    }
  };
})();
