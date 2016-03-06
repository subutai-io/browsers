/**
 * Created by talas on 11/19/15.
 */
/* jshint strict: false */
var porto = porto || {};

(function(window, document, undefined) {

  var parser = document.createElement('a');
  parser.href = "document.location";
  //parser.protocol; // => "http:"
  //parser.hostname; // => "example.com"
  //parser.port;     // => "3000"
  //parser.pathname; // => "/pathname/"
  //parser.search;   // => "?search=test"
  //parser.hash;     // => "#hash"
  //parser.host;     // => "example.com:3000"

  var cookie = getCookie('su_fingerprint');

  porto.extension.sendMessage({event: "get-version"}, function(version) {
    var input = $('#bp-plugin-version');
    if (input) {
      input.val(version);
    }
  });

  porto.extension.sendMessage({
    event: "associate-peer-key", su_fingerprint: cookie, url: document.location.origin
  });

  function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

})(window, document);
