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
  var $keyImportTemplate = $('<div></div>');
  var $keyExTemplate = $('<div></div>');
  var $keyDeleteTemplate = $('<div></div>');

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

    $("#goodwill-addresses").find('tbody').empty();

    for (var i in goodwillData) {
      var row = "<tr><td>" + goodwillData[i].name + "</td>" +
        "<td>" + goodwillData[i].address + "</td>" +
        "</tr>";

      $("#goodwill-addresses").find('tbody').append(row);
    }
  }

  function initRebirthUI() {
    porto.extension.sendMessage({
      event: 'get-version'
    }, function(version) {
      $('#version').text('v' + version);
    });
    porto.appendTpl($generateWalletTemplate,porto.extension.getURL('common/ui/_popup-generate-wallet.html'));
    porto.appendTpl($keyImportTemplate, porto.extension.getURL('common/ui/_popup-import-wallet.html'));
    porto.appendTpl($keyExTemplate, porto.extension.getURL('common/ui/_popup-export-wallet.html'));
    porto.appendTpl($keyDeleteTemplate, porto.extension.getURL('common/ui/_popup-delete-wallet.html'));

    $('.bp-generate-wallet-modal').on('click', generateWalletModal);
    $('.bp-import-gw-key-modal').on('click', showImportGwKeyModal);
    $('.export-gw-keys-modal').on('click', showExGwKeyModal);
    $('.delete-gw-keys-modal').on('click', showDeleteGwKeyModal);


    loadKeys();

  }

  function showImportGwKeyModal() {
    swal2({
      html: $keyImportTemplate.html(),
      showCancelButton: false,
      showConfirmButton: false,
      closeOnConfirm: false,
      width: 320,
      animation: false,
      buttonsStyling: false
    }, function(isConfirm) {
      if (isConfirm) {

        var addressName = $('#address-name').val();
        $('#incorrectName').hide();
        if(hasKeyByName(addressName)) {
          $('#incorrectName').show();
        }else {
          var privateKey = $('#address-key').val();
          var addressPassword = $('#address-pwd').val();
          var web3 = new Web3();
          var data = web3.eth.accounts.privateKeyToAccount(privateKey);

          var goodWillData = {
            "name": addressName,
            "address": data.address.toLowerCase(),
            "private-key": encryptPrivateKey(data.privateKey.toLowerCase(), addressPassword),
            "password": encryptPassword(addressPassword)
          };

          var goodWillAddresses = JSON.parse(window.localStorage.getItem("goodwill"));

          if(goodWillAddresses === null || goodWillAddresses === undefined) {
            goodWillAddresses = [];
          }
          goodWillAddresses.push(goodWillData);
          window.localStorage.setItem('goodwill', JSON.stringify(goodWillAddresses));

          triggerImport();
          loadKeys();
        }
      }
    });

    // var $emailField = $('#email');
    // $emailField.focus();
  }

  function showExGwKeyModal() {

    swal2({
      html: $keyExTemplate.html(),
      showCancelButton: false,
      showConfirmButton: false,
      closeOnConfirm: false,
      width: 320,
      animation: false,
      buttonsStyling: false
    }, function(isConfirm) {
      if (isConfirm) {
        var keyName = $('#key-list').find(":selected").text();
        var typedPwd = $('#address-pwd').val();
        var prKey = "";
        $('#incorrectPassword').hide();

        var goodWillAddresses = JSON.parse(window.localStorage.getItem("goodwill"));
        for (var i in goodWillAddresses)
        {
           if (goodwillData[i].name === keyName)
           {
             if(isPasswordCorrect(goodwillData[i].password, typedPwd)){
               prKey =  decryptPrivateKey(goodwillData[i]["private-key"], typedPwd);
               $('#pr-key').val(prKey);
               $('#pr-key-div').show();
             }else {
               $('#incorrectPassword').show();
             }
           }
        }
      }
    });

    var goodwillData = JSON.parse(window.localStorage.getItem("goodwill"));

    for (var i in goodwillData) {
      $('#key-list').append(new Option(goodwillData[i].name, goodwillData[i].name));
    }
  }


  function  hasKeyByName( keyName) {
    var goodWillAddresses = JSON.parse(window.localStorage.getItem("goodwill"));
    for (var i in goodWillAddresses)
    {
      if (goodWillAddresses[i].name === keyName)
      {
        return true;
      }
    }

    return false;
  }

  function showDeleteGwKeyModal() {

    swal2({
      html: $keyDeleteTemplate.html(),
      showCancelButton: false,
      showConfirmButton: false,
      closeOnConfirm: false,
      width: 320,
      animation: false,
      buttonsStyling: false
    }, function(isConfirm) {
      if (isConfirm) {
        var keyName = $('#key-list').find(":selected").text();
        var typedPwd = $('#address-pwd').val();
        $('#incorrectPassword').hide();

        var goodWillAddresses = JSON.parse(window.localStorage.getItem("goodwill"));
        for (var i in goodWillAddresses)
        {
          if (goodwillData[i].name === keyName)
          {
            if(isPasswordCorrect(goodwillData[i].password, typedPwd)){
              var goodWillAddressesNew = [];
              for (var i in goodWillAddresses)
              {
                if (goodwillData[i].name !== keyName){
                  goodWillAddressesNew.push(goodwillData[i]);
                }
              }

              window.localStorage.setItem('goodwill', JSON.stringify(goodWillAddressesNew));
              loadKeys();
              triggerDelete();
            }else {
              $('#incorrectPassword').show();
            }
          }
        }

      }
    });

    var goodwillData = JSON.parse(window.localStorage.getItem("goodwill"));

    for (var i in goodwillData) {
      $('#key-list').append(new Option(goodwillData[i].name, goodwillData[i].name));
    }
  }


  function isPasswordCorrect( storedPassword, typedPassword ){

    try {
      var decPwd = decryptPassword(storedPassword, typedPassword);
      return decPwd === typedPassword;
    }
    catch(err) {
      return false;
    }
  }

  function decryptPassword( encryptedPassword, plainPassword )
  {
    return CryptoJS.AES.decrypt(encryptedPassword, plainPassword).toString(CryptoJS.enc.Utf8);
  }

  function decryptPrivateKey( privateKey, addressPassword) {
    return CryptoJS.AES.decrypt(privateKey, addressPassword).toString(CryptoJS.enc.Utf8);
  }

  function encryptPassword( password )
  {
    return CryptoJS.AES.encrypt(password, password).toString();
  }

  function encryptPrivateKey( privateKey, addressPassword) {
    return CryptoJS.AES.encrypt(privateKey, addressPassword).toString();
  }

  function generateWalletModal() {
    swal2({
      html: $generateWalletTemplate.html(),
      showCancelButton: false,
      showConfirmButton: false,
      closeOnConfirm: false,
      width: 320,
      animation: false,
      buttonsStyling: false
    }, function(isConfirm) {

      $('#incorrectName').hide();
      if (isConfirm) {
        var addressName = $('#address-name').val();

        if(hasKeyByName(addressName)){
          $('#incorrectName').show();
        }else {
          var addressPassword = $('#address-pwd').val();
          generateAddress(addressPassword).then(function (data) {
            var goodWillData = {
              "name": addressName,
              "address": data.address.toLowerCase(),
              "private-key": encryptPrivateKey(data.privateKey.toLowerCase(), addressPassword),
              "password": encryptPassword(addressPassword)
            };
            var goodWillAddresses = JSON.parse(window.localStorage.getItem("goodwill"));

            if(goodWillAddresses === null || goodWillAddresses === undefined) {
              goodWillAddresses = [];
            }

            goodWillAddresses.push(goodWillData);
            window.localStorage.setItem('goodwill', JSON.stringify(goodWillAddresses));
            loadKeys();
          });
          triggerGenerate();
        }


      }
    });
  }

  function generateAddress(password) {
    return new Promise(function (resolve, reject) {
      var web3 = new Web3();
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
        // console.log("some function");
      });
    });
  }

  function triggerDelete() {
    porto.extension.sendMessage({event: 'get-user-ids'}, function (data) {
      swal2({
        title: "Delete wallet",
        text: "Key pair successfully deleted!",
        type: "success",
        customClass: "b-success",
        timer: 1500
      }, function () {
        // console.log("some function");
      });
    });
  }

  function triggerImport() {
    porto.extension.sendMessage({event: 'get-user-ids'}, function (data) {
      swal2({
        title: "Import wallet",
        text: "Key successfully imported!",
        type: "success",
        customClass: "b-success",
        timer: 1500
      }, function () {
        // console.log("some function");
      });
    });
  }

  options.keyringId = keyringId;
  options.event.on('ready', init);

}(options));
