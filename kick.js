// ---------------------------------------------------------------------------
//  kick.js — listens to Kick's public real-time chat socket for gifted subs.
//
//  window.KickGiftListener.start(channel, chatroomIdOverride, onGift, onStatus)
//    onGift(qty, info)     -> called with the number of subs gifted in an event
//    onStatus(text, kind)  -> connection status ("ok" | "warn" | "err")
//
//  Uses the same unofficial Pusher app the Kick website itself uses.
// ---------------------------------------------------------------------------

(function () {
  "use strict";

  var PUSHER_KEY = "32cbd69e4b950bf97679";
  var PUSHER_URL = "wss://ws-us2.pusher.com/app/" + PUSHER_KEY +
                   "?protocol=7&client=js&version=8.4.0-rc2&flash=false";

  function resolveChatroomId(channel, override) {
    if (override) return Promise.resolve(String(override));
    return fetch("https://kick.com/api/v2/channels/" + encodeURIComponent(channel), {
      headers: { "Accept": "application/json" }
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        var id = j && j.chatroom && j.chatroom.id;
        if (!id) throw new Error("no chatroom id");
        return String(id);
      });
  }

  window.KickGiftListener = {
    start: function (channel, override, onGift, onStatus) {
      onStatus = onStatus || function () {};
      var recent = [];

      function isDuplicate(sig) {
        var now = Date.now();
        recent = recent.filter(function (r) { return now - r.t < 6000; });
        for (var i = 0; i < recent.length; i++) if (recent[i].sig === sig) return true;
        recent.push({ sig: sig, t: now });
        return false;
      }

      function handle(data) {
        var d = data;
        if (typeof d === "string") { try { d = JSON.parse(d); } catch (e) { return; } }
        if (!d) return;
        var usernames = d.gifted_usernames || d.giftedUsernames;
        var qty = Array.isArray(usernames) ? usernames.length
                : (typeof d.quantity === "number" ? d.quantity : 1);
        var gifter = d.gifter_username || d.gifterUsername || "?";
        var sig = gifter + "|" + qty + "|" + (Array.isArray(usernames) ? usernames.join(",") : "");
        if (isDuplicate(sig)) return;
        onGift(qty, { gifter: gifter });
      }

      function connect(chatroomId) {
        var channels = ["chatrooms." + chatroomId + ".v2", "chatrooms." + chatroomId];
        var ws = new WebSocket(PUSHER_URL);
        var pingTimer = null;
        var delay = 2000;

        ws.onopen = function () {
          channels.forEach(function (ch) {
            ws.send(JSON.stringify({ event: "pusher:subscribe", data: { channel: ch } }));
          });
          onStatus("Connected · listening on chatrooms." + chatroomId, "ok");
          clearInterval(pingTimer);
          pingTimer = setInterval(function () {
            if (ws.readyState === 1) ws.send(JSON.stringify({ event: "pusher:ping", data: {} }));
          }, 30000);
          delay = 2000;
        };

        ws.onmessage = function (msg) {
          var frame;
          try { frame = JSON.parse(msg.data); } catch (e) { return; }
          if (!frame || !frame.event) return;
          if (frame.event === "pusher:ping") { ws.send(JSON.stringify({ event: "pusher:pong", data: {} })); return; }
          if (frame.event.indexOf("GiftedSubscriptionsEvent") !== -1) handle(frame.data);
        };

        ws.onclose = function () {
          clearInterval(pingTimer);
          onStatus("Kick socket disconnected — reconnecting…", "warn");
          setTimeout(function () { connect(chatroomId); }, delay);
          delay = Math.min(delay * 2, 30000);
        };
        ws.onerror = function () { try { ws.close(); } catch (e) {} };
      }

      onStatus("Looking up channel “" + channel + "”…", "warn");
      resolveChatroomId(channel, override)
        .then(connect)
        .catch(function (err) {
          onStatus("Can't find chatroom for “" + channel + "”. Add &chatroom_id=NUMBER. (" + err.message + ")", "err");
        });
    }
  };
})();
