'use strict';

define({
  load: function(name, req, load, config) {
    req(['jquery'], function($) {
      $.get(safari.extension.baseURI + name, function(data) {
        load(data);
      }, 'json');
    });
  }
});
