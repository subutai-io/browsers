'use strict';

var porto = porto || null;

(function() {
  var id, name, port, l10n;

  function init() {
    if (document.body.dataset.porto) {
      return;
    }
    document.body.dataset.porto = true;
    // open port to background page
    var qs = jQuery.parseQuerystring();
    id = qs.id;
    name = 'gwsDialog-' + id;
    port = porto.extension.connect({name: name});
    port.onMessage.addListener(messageListener);
    porto.l10n.getMessages([
      'sign_gw_dialog_header',
      'form_cancel',
      'form_ok',
      'form_busy'
    ], function(result) {
      port.postMessage({event: 'gw_sign-dialog-init', sender: name});
      l10n = result;
    });
  }

  function load(content) {
    $('body').html(content);
    porto.l10n.localizeHTML(l10n);
    $('#okBtn')
      .attr({
        'data-loading-text': l10n.form_busy
      })
      .click(onOk);
    $('#cancelBtn').click(onCancel);
    $('#keyDialog').fadeIn('fast');
    // align width
    $.setEqualWidth($('#okBtn'), $('#cancelBtn'));
    $.setEqualWidth($('#addBtn'), $('#deleteBtn'));
  }

  function onOk() {
    // $('body').addClass('busy');
    // $('#okBtn').button('loading');
    $("#incorrectPassword").hide();
    var keyName = $('#gwKeySelect').val();
    var keyPwd = $('#password').val();
    var prKey = "";
    var goodwillData = JSON.parse(window.localStorage.getItem("goodwill"));

    var wrongPwd = true;
    goodwillData.forEach(function(item) {
      if(item.name === keyName){
        if(isPasswordCorrect(item.password, keyPwd)){
          wrongPwd = false;
          prKey = item['private-key'];
        }
      }
    });

    if(wrongPwd === true){

      $("#incorrectPassword").show();

    }else {
      var provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545');
      var web3 = new Web3(provider);
      var message = web3.eth.accounts.sign("Hello", decryptPrivateKey(prKey, keyPwd));

      // set-editor-output
      port.postMessage({event: 'gw-sign-dialog-ok', sender: name, data: JSON.stringify ({signature: message.signature, messageHash: message.messageHash})});

      onCancel();
    }

    return false;
  }

  function onCancel() {
    logUserInput('security_log_dialog_cancel');
    port.postMessage({event: 'sign-dialog-cancel', sender: name});
    return false;
  }

  /**
   * send log entry for the extension
   * @param {string} type
   */
  function logUserInput(type) {
    port.postMessage({
      event: 'editor-user-input',
      sender: name,
      source: 'security_log_sign_dialog',
      type: type
    });
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


  function messageListener(msg) {
    switch (msg.event) {
      case 'gw-sign-dialog-content':
        load(msg.data);
        break;
      case 'web3-sign-data':
        console.log(msg);
        break;
      case 'gw-signing-data':
        console.log(msg.gwdata);
        var keySelect = $('#gwKeySelect');
        msg.gwdata.forEach(function(item) {
          keySelect.append(new Option(item.name.toLowerCase(), item.name.toLowerCase()));
        });
        break;
      default:
        console.log('unknown event', msg.event);
    }
  }

  $(document).ready(init);

}());
