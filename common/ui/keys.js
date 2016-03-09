/**
 * Listens for events from options UI in sandbox, forwards requests to pgpModel.js
 */

'use strict';

var porto = porto || null;
var options = options || null;
var swal;

(function(options) {
  // event controller
  var keyTemplate = null;
  var $generateKeyTemplate = $('<div></div>');
  var $keyInfoTemplate = $('<div></div>');
  var $keyImportTemplate = $('<div></div>');
  var $keyExportTemplate = $('<div></div>');
  var keyringId = null;
  var keyFile = null;
  var peersMetadata = [];
  var keyPeerMap = {};
  var demailSuffix = 'de-mail.de';

  function init() {
    console.log("Keys js initialized...");

    keyTemplate = $('.b-main-table .b-main-table-body').html();

    initRebirthUI();
    $('body').on('change', '#protectkey', function() {
      $(".js-passwd-hide").toggleClass("js-passwd-show");
      console.log('toggle passwd');
    });

    $('body').on('change', '#advanced', function() {
      $(".js-advanced-hide").toggleClass("js-advanced-show");
    });

    $('body').on('click', '.bp-close-modal-button', function() {
      swal.closeModal();
    });

    swal.setDefaults({allowEscapeKey: false, allowOutsideClick: false});
  }

  function initRebirthUI() {
    porto.extension.sendMessage({
      event: 'get-version'
    }, function(version) {
      $('#version').text('v' + version);
    });

    var qs = jQuery.parseQuerystring();

    porto.appendTpl($generateKeyTemplate,
      porto.extension.getURL('common/ui/_popup-generate-key.html'));
    porto.appendTpl($keyInfoTemplate,
      porto.extension.getURL('common/ui/_popup-keys-information.html'));
    porto.appendTpl($keyImportTemplate, porto.extension.getURL('common/ui/_popup-import-key.html'));
    porto.appendTpl($keyExportTemplate, porto.extension.getURL('common/ui/_popup-export-key.html'));

    $('.bp-generate-key-modal').on('click', generateKeyModal);
    $('.bp-import-key-modal').on('click', showImportKeyModal);
    $('.bp-export-keys-modal').on('click', showExportKeysModal);

    options.registerL10nMessages(
      ['keygrid_key_not_expire', 'keygrid_delete_confirmation', 'keygrid_primary_label',
        'key_set_as_primary']);
    options.registerL10nMessages(
      ["key_import_error", "key_import_invalid_text", "key_import_exception",
        "alert_header_warning", "alert_header_success"]);

    porto.extension.sendMessage({
      event: 'get-active-keyring'
    }, function(data) {
      keyringId = data || porto.LOCAL_KEYRING_ID;
      options.keyringId = keyringId;

      options.pgpModel('getManagementList', function(err, data) {
        if (qs.hasOwnProperty('peer')) {
          populatePeerList(data, decodeURIComponent(decodeURI(qs.peer)));
        }
        else {
          populatePeerList(data);
        }
      });
    });
  }

  function generateKeyModal() {
    console.log('generate key modal');
    swal({
      html: $generateKeyTemplate.html(),
      showCancelButton: false,
      showConfirmButton: false,
      closeOnConfirm: false,
      width: 320,
      animation: false,
      buttonsStyling: false
    }, function(isConfirm) {
      if (isConfirm) {
        swal.disableButtons();
        var parameters = {};
        parameters.algorithm = $('#algorythm').val();
        parameters.numBits = $('#keysize').val();
        parameters.userIds = [{
          fullName: $('#name').val(), email: $('#email').val()
        }];
        parameters.passphrase = $('#password').val();
        parameters.confirm = $('#password-confirm').val();

        try {
          validateFields(parameters);
          generateKey(parameters)
            .then(function(result) {
              //success
              swal.enableButtons();
              options.event.triggerHandler('keygrid-reload');
              swal({
                title: "Generate key-pair",
                text: "Key pair successfully generated!",
                timer: 1500,
                type: "success",
              }, function() {
                options.keyring('getKeys').then(fillKeysTable);
                $('#key-types').change();
                //populatePeerList(peersMetadata);
              });
            })
            .catch(function(error) {
              //failed
              console.error('generateKey() options.keyring(generateKey)', error);
              console.error(error);
              swal({
                title: "Oh, snap", text: error.message, type: "error"
              });
            })
            .then(function() {
              console.log('Generation completed!');
            });
        }
        catch (error) {
          swal({
            title: "Oh, snap", text: error.message, type: "error", showConfirmButton: true
          });
        }
      }
    });
  }

  function validateFields(parameters) {
    var passwordConfirm = parameters.confirm;
    if (passwordConfirm !== parameters.passphrase) {
      throw Error("Passwords do not match.");
    }
    if (!validateEmail(parameters.userIds[0].email)) {
      throw Error("Invalid e-mail format");
    }
    if (!parameters.userIds[0].email) {
      throw Error("Email cannot be empty");
    }
    if (!parameters.userIds[0].fullName) {
      parameters.userIds[0].fullName = parameters.userIds[0].email.split('@')[0];
      //throw Error("Username cannot be empty");
    }
    if (!passwordConfirm) {
      //throw Error("Password should not be empty");
    }
  }

  function generateKey(parameters) {
    return new Promise(function(resolve, reject) {
      resolve(options.keyring('generateKey', [parameters]));
    });
  }

  function validateEmail(email) {
    var re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    return re.test(email);
  }

  function populatePeerList(peers, preselect) {
    peersMetadata = [];
    console.log('Management hosts');
    console.log(peers);

    var $peersContainer = $('#key-types');
    $peersContainer.children().remove();

    var allElem = $.parseHTML('<option></option>');
    $(allElem).text("All keys");
    $(allElem).attr('data-site', 'all');
    $peersContainer.append(allElem);

    if (peers) {
      peers.forEach(function(peer) {
        if (!peer || !peer.site || !peer.keys) {
          return;
        }

        var subkeyElem = $.parseHTML('<option></option>');
        $(subkeyElem).text(peer.site);
        $(subkeyElem).attr('data-site', peer.site);
        $(subkeyElem).attr('data-keys', JSON.stringify(peer.keys));
        $peersContainer.append(subkeyElem);

        peersMetadata.push(peer);
        if (peer.keys) {
          peer.keys.forEach(function(keyFingerprint) {
            if (keyPeerMap[keyFingerprint]) {
              keyPeerMap[keyFingerprint].push(peer);
            }
            else {
              keyPeerMap[keyFingerprint] = [peer];
            }
          });
        }
      });
    }
    console.log(keyPeerMap);

    $peersContainer.on('change', function() {
      var $element = $(this).find(':selected');
      var site = $element.attr('data-site');
      var keys = $element.attr('data-keys');
      if (typeof keys !== typeof undefined && keys !== false) {
        keys = JSON.parse(keys);
      }
      else {
        keys = null;
      }
      options.keyring('getKeys').then(function(data) {
        if (site === 'all') {
          fillKeysTable(data);
        }
        else {
          fillKeysTable(data, keys);
        }
      });
    });
    if (preselect) {
      $peersContainer.find('option[data-site="' + preselect + '"]').prop('selected', true);
    }
    $peersContainer.change();
  }

  function fillKeysTable(keys, filter) {
    var $tableBody = $('.b-main-table .b-main-table-body');
    $tableBody.empty();
    if (keys && keys.length <= 0) {
      generateKeyModal();
    }
    keys.forEach(function(key) {
      if (filter) {
        if (!filter.includes(key.fingerprint)) {
          return;
        }
      }
      var tableRow = $.parseHTML(keyTemplate);
      $(tableRow).attr('data-keytype', key.type);
      $(tableRow).attr('data-keyguid', key.guid);
      $(tableRow).attr('data-keyid', key.id);
      $(tableRow).attr('data-keyname', key.name);
      $(tableRow).attr('data-keyemail', key.email);
      $(tableRow).attr('data-keyalgorithm', key.algorithm);
      $(tableRow).attr('data-keylength', key.bitLength);
      $(tableRow).attr('data-keycreationdate', key.crDate);
      $(tableRow).attr('data-keyexpirationdate', key.exDate);
      $(tableRow).attr('data-keyfingerprint', key.fingerprint);
      $(tableRow).attr('data-keyvalid', key.validity);
      $(tableRow).attr('data-keyisprimary', false);

      var style = 'style="cursor: default;"';
      if (key.type === 'private') {
        $(tableRow).find('td:nth-child(1)').append(
          '<i class="b-icon b-icon_key-pair"' + style + '></i>');
      }
      else {
        $(tableRow).find('td:nth-child(1)').append(
          '<i class="b-icon b-icon_key"' + style + '></i>');
      }

      $(tableRow).find('td:nth-child(2)').text(key.name);
      //if (options.primaryKeyId === key.id) {
      //  $(tableRow).attr('data-keyisprimary', true);
      //  $(tableRow).find('td:nth-child(2)').append('&nbsp;&nbsp;<span class="label label-warning"
      // data-l10n-id="keygrid_primary_label"></span>'); }
      $(tableRow).find('td:nth-child(3)').text(key.email);
      $(tableRow).find('td:nth-child(4)').text(key.id);

      var mgmts = null;
      if (keyPeerMap[key.fingerprint]) {
        mgmts = $('<a href="managements.html?fp=' +
          key.fingerprint +
          '"><span class="b-tags b-tags_blue" ' +
          '>Peers: ' +
          keyPeerMap[key.fingerprint].length +
          '</span></a>');
      }
      else {
        mgmts = $('<span class="b-tags b-tags_blue"' + style + '>Peers: 0</span>');
      }

      $(tableRow).find('td:nth-child(5)').append(mgmts);

      if (key.type === 'private') {
        $(tableRow).find('.publicKey').remove();
      }
      else {
        $(tableRow).find('.keyPair').remove();
      }

      $(tableRow).find('td:nth-child(6)').on('click', initExportTab);
      $(tableRow).find('td:nth-child(7)').on('click', showKeyInfo);
      $(tableRow).find('td:nth-child(8)').on('click', function() {
        var $entryForRemove = $(this).parent();
        console.log($entryForRemove.attr('data-keyguid'));

        swal({
          title: "Are you sure?",
          text: "You will not be able to recover key!",
          type: "warning",
          showCancelButton: true,
          confirmButtonColor: "#DD6B55",
          confirmButtonText: "Yes, delete it!",
          closeOnConfirm: false
        }, function() {
          options.keyring('removeKey',
            [$entryForRemove.attr('data-keyguid'), $entryForRemove.attr('data-keytype')]);
          swal({
            title: "Deleted.", text: "Key successfully deleted!", timer: 1500, type: "success"
          }, function() {
            options.keyring('getKeys').then(fillKeysTable);
          });
        });
      });

      $tableBody.append(tableRow);
    });
  }

  function showKeyInfo() {
    var $keyData = $(this).parent();
    console.log('key info clicked');

    swal({
      html: $keyInfoTemplate.html(),
      showCloseButton: false,
      showConfirmButton: false,
      animation: false,
      width: 400
    });

    options.keyring('getKeyDetails', [$keyData.attr('data-keyguid')])
           .then(function(result) {
             console.log('key details');
             var details = result;
             initSubKeyTab(details);
             initUserIdsTab(details);
           });

    $('#keytype').val($keyData.attr('data-keytype'));
    $('#keyguid').val($keyData.attr('data-keyguid'));
    $('#keyid').val($keyData.attr('data-keyid'));
    $('#keyname').val($keyData.attr('data-keyname'));
    $('#keyemail').val($keyData.attr('data-keyemail'));
    $('#keyalgorithm').val($keyData.attr('data-keyalgorithm'));
    $('#keylength').val($keyData.attr('data-keylength'));
    $('#keycreationdate').val($keyData.attr('data-keycreationdate'));

    if ($keyData.attr('data-keyexpirationdate') !== 'false') {
      $('#keyexpirationdate').val($keyData.attr('data-keyexpirationdate'));
    }
    else {
      $('#keyexpirationdate').val('The key does not expire');
    }
    $('#keyfingerprint').val($keyData.attr('data-keyfingerprint'));
    $('#keyvalid').val($keyData.attr('data-keyvalid'));
  }

  function initSubKeyTab(details) {
    var $subkeyContainer = $('#subkey_collection');
    $subkeyContainer.children().remove();
    for (var inx = 0; inx < details.subkeys.length; inx++) {
      var subkey = details.subkeys[inx];
      var subkeyElem = $.parseHTML('<option></option>');
      $(subkeyElem).attr('id', subkey.id);
      $(subkeyElem).text(subkey.id);
      $(subkeyElem).attr('data-algorithm', subkey.algorithm);
      $(subkeyElem).attr('data-length', subkey.bitLength);
      $(subkeyElem).attr('data-crdate', subkey.crDate.substr(0, 10));
      $(subkeyElem).attr('data-fingerprint', subkey.fingerprint);
      $(subkeyElem).attr('data-exdate', options.l10n.keygrid_key_not_expire);
      var expDate = subkey.exDate;
      if (expDate !== false) {
        $(subkeyElem).attr('data-exdate', expDate.substr(0, 10));
      }
      else {
        $(subkeyElem).attr('data-exdate', options.l10n.keygrid_key_not_expire);
      }
      $subkeyContainer.append(subkeyElem);
    }

    $subkeyContainer.on('change', function() {
      var $element = $(this).find(':selected');
      $('#subkey_algorithm').val($element.attr('data-algorithm'));
      $('#subkey_length').val($element.attr('data-length'));
      $('#subkey_creationdate').val($element.attr('data-crdate'));
      $('#subkey_expirationdate').val($element.attr('data-exdate'));
      $('#subkey_fingerprint').val($element.attr('data-fingerprint'));
    });
    $subkeyContainer.change();
  }

  function initUserIdsTab(details) {
    var $userContainer = $('#user_collection');
    details.users.forEach(function(userKey, index) {
      var userElem = $.parseHTML('<option></option>');
      $(userElem).attr('data-userid', userKey.userID);
      $(userElem).attr('value', userKey.userID);
      $(userElem).text(userKey.userID);
      $(userElem).attr('data-signatures', JSON.stringify(userKey.signatures));
      $userContainer.append(userElem);
    });

    $userContainer.on('change', function() {
      var $signaturesBody = $('#content3').find('.signature-list');
      $signaturesBody.empty();

      var $element = $(this).find(':selected');
      if (!$element || !$element.attr('data-signatures')) {
        return;
      }
      var signatures = JSON.parse($element.attr('data-signatures'));
      signatures.forEach(function(signature, index) {
        var dataRow = $.parseHTML("<tr>\
          <td></td>\
          <td></td>\
        <td></td>\
        </tr>");
        $(dataRow).find('td:nth-child(1)').text(signature.signer);
        $(dataRow).find('td:nth-child(2)').text(signature.id);
        $(dataRow).find('td:nth-child(3)').text(signature.crDate.substr(0, 10));
        $signaturesBody.append(dataRow);
      });
    });

    $userContainer.change();
  }

  function createFile(filename, content) {
    // release previous url
    if (typeof safari !== 'undefined') {
      $.fileDownload('data:application/pgp-keys;charset=utf-8,' + encodeURIComponent(content));
    }
    else {
      if (keyFile) {
        window.URL.revokeObjectURL(keyFile);
      }
      // create new
      var blob = new Blob([content], {type: 'application/pgp-keys'});
      //saveAs(blob, filename);
      keyFile = window.URL.createObjectURL(blob);
      var download = $('.bp-keypair-export');
      download.attr('download', filename)
              .attr('href', keyFile);
      download.get(0).click();
    }
  }

  function initExportTab() {
    var $keyData = $(this).parent();
    var keyguid = $keyData.attr('data-keyguid');

    options.keyring('getArmoredKeys', [[keyguid], {pub: true, priv: true, all: false}])
           .then(function(result) {
             var keyPair = result[0].armoredPublic + '\n' + result[0].armoredPrivate;
             var filename = $keyData.attr('data-keyname') + '_all.asc';
             swal({
               html: $keyExportTemplate.html(),
               showCancelButton: false,
               animation: false,
               width: 320,
               showConfirmButton: false,
               closeOnConfirm: false,
             }, function() {
               createFile($('.bp-export-filename').val(), keyPair);
             });
             $('.bp-export-clipboard').text(keyPair);
             $('.bp-export-filename').val(filename);
           });
  }

  function showExportKeysModal() {
    options
      .keyring('getArmoredKeys', [[], {pub: true, priv: true, all: true}])
      .then(function(result) {
        var hasPrivate = false;
        var allKeys = result.reduce(function(prev, curr) {
          if (curr.armoredPublic) {
            prev += '\n' + curr.armoredPublic;
          }
          if (curr.armoredPrivate) {
            hasPrivate = true;
            prev += '\n' + curr.armoredPrivate;
          }
          return prev;
        }, '');
        swal({
          html: $keyExportTemplate.html(),
          showCancelButton: false,
          animation: false,
          width: 320,
          showConfirmButton: false,
          closeOnConfirm: false,
        }, function() {
          createFile($('.bp-export-filename').val(), allKeys);
        });
        $('.bp-export-clipboard').text(allKeys);
        $('.bp-export-filename').val('all.asc');
      });
  }

  function onChangeFile(event) {
    var reader = new FileReader();
    var file = event.target.files[0];
    reader.onloadend = function(ev) {
      $('.bp-import-keys').val(ev.target.result);
    };
    reader.readAsText(file);
  }

  function showImportKeyModal() {
    console.log('key import dialog opened');
    swal({
      html: $keyImportTemplate.html(),
      showCancelButton: false,
      showConfirmButton: false,
      animation: false,
      width: 320,
      closeOnConfirm: false
    }, function() {
      swal.disableButtons();
      onImportKey(function(result) {
        if (result.type === 'error') {
          swal({
            title: "Oh, snap", text: "Couldn't import key", type: "error"
          });
        }
        else {
          swal({
            title: "Success", text: "Successfully imported key!", timer: 1500, type: "success"
          }, function() {
            options.keyring('getKeys').then(fillKeysTable);
          });
        }
      });
    });
    $('#uploadBtn').change(onChangeFile);
  }

  function onImportKey(callback) {

    var publicKeyRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
    var privateKeyRegex = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;

    var keyText = $('.bp-import-keys').val();

    // find all public and private keys in the textbox
    var publicKeys = keyText.match(publicKeyRegex);
    var privateKeys = keyText.match(privateKeyRegex);

    var keys = [];

    if (publicKeys) {
      publicKeys.forEach(function(pub) {
        pub = porto.util.decodeQuotedPrint(pub);
        keys.push({type: 'public', armored: pub});
      });
    }

    if (privateKeys) {
      privateKeys.forEach(function(priv) {
        priv = porto.util.decodeQuotedPrint(priv);
        keys.push({type: 'private', armored: priv});
      });
    }

    options
      .keyring('importKeys', [keys])
      .then(function(result) {
        var success = false;
        result.forEach(function(imported) {
          var heading;
          var type = imported.type;
          switch (imported.type) {
            case 'success':
              heading = options.l10n.alert_header_success;
              success = true;
              break;
            case 'warning':
              heading = options.l10n.alert_header_warning;
              break;
            case 'error':
              heading = options.l10n.key_import_error;
              type = 'danger';
              break;
          }
        });
        if (callback) {
          callback(result);
        }
      })
      .catch(function(error) {
        if (callback) {
          callback({type: 'error'});
        }
      });
  }

  options.keyringId = keyringId;
  options.event.on('ready', init);

}(options));
