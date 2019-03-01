/**
 * Listens for events from options UI in sandbox, forwards requests to pgpModel.js
 */

'use strict';

var porto = porto || null;
var options = options || null;

(function(options) {
  // event controller
  var keyTemplate = null;
  var $generateWalletTemplate = $('<div></div>');
  var keyringId = null;
  function init() {
    keyTemplate = $('.b-main-table .b-main-table-body').html();
    initRebirthUI();
    $('body').on('click', '.bp-close-modal-button', function() {
      swal2.closeModal();
    });
    // swal2.setDefaults({allowEscapeKey: true, allowOutsideClick: false, width: 492});
  }

  function loadKeys() {
    var goodwillData = JSON.parse(window.localStorage.getItem("goodwill"));
    for (var i in goodwillData) {
      var row = "<tr><td>" + goodwillData[i].name + "</td>" +
        "<td>" + goodwillData[i].address + "</td>" +
        "<td>" + "0" + "</td></tr>";

      $("#goodwill-addresses").find('tbody').append(row);
    }
  }

  function initRebirthUI() {
    porto.extension.sendMessage({
      event: 'get-version'
    }, function(version) {
      $('#version').text('v' + version);
    });
    porto.appendTpl($generateWalletTemplate,
      porto.extension.getURL('common/ui/_popup-generate-wallet.html'));
    $('.bp-generate-wallet-modal').on('click', generateWalletModal);
    loadKeys();
    // $('.bp-import-key-modal').on('click', showImportKeyModal);
    // $('.bp-export-keys-modal').on('click', showExportKeysModal);
  }

  function encryptPrivateKey( privateKey, addressPassword) {
    return privateKey;
  }

  function generateWalletModal() {
    console.log('generate wallet modal');
    swal2({
      html: $generateWalletTemplate.html(),
      showCancelButton: false,
      showConfirmButton: false,
      closeOnConfirm: false,
      width: 320,
      animation: false,
      buttonsStyling: false
    }, function(isConfirm) {
      if (isConfirm) {
        var addressName = $('#address-name').val();
        var addressPassword = $('#address-pwd').val();
        generateAddress(addressPassword).then(function (data) {
          var goodWillData = {
            "name": addressName,
            "address": data.address.toLowerCase(),
            "private-key": encryptPrivateKey(data.privateKey.toLowerCase(), addressPassword),
            "password": addressPassword
          };
          var goodWillAddresses = [];
          goodWillAddresses.push(goodWillData);
          window.localStorage.setItem('goodwill', JSON.stringify(goodWillAddresses));
          loadKeys();
        });
        triggerGenerate();
      }
    });

    var $emailField = $('#email');
    $emailField.focus();
  }

  function generateAddress(password) {
    return new Promise(function (resolve, reject) {
      var provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545');
      var web3 = new Web3(provider);
      resolve(web3.eth.accounts.create(password));
    });
  }


  function triggerGenerate() {
    porto.extension.sendMessage({event: 'get-user-ids'}, function (data) {
      swal2({
        title: "Generate wallet key-pair",
        text: "Key pair successfully generated!",
        type: "success",
        customClass: "b-success",
        timer: 1500
      }, function () {
        console.log("some function");
      });
    });
  }

  options.keyringId = keyringId;
  options.event.on('ready', init);

}(options));
