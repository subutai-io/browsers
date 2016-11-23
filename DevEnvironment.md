## Build instructions

If you don’t have grunt and bower installed, yet:

    npm install -g grunt-cli bower

and then get and build the sources:

    git clone https://github.com/subutai-io/browsers.git
    cd browsers
    npm install && bower install && grunt

#### Chrome

    grunt dist-cr

The extension will be in `dist/e2e-plugin.chrome.zip`.

#### Firefox

    grunt dist-ff

This will get you the latest firefox addons-sdk to build the addon.
    
The addon will be in `dist/e2e-plugin.firefox.xpi`.

#### Safari

    in ExtensionBuilder select build/e2e-plugin.safariextension folder 
    https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/UsingExtensionBuilder/UsingExtensionBuilder.html
    

#### Development

Update your local repository:

    # inside browsers folder
    git pull origin master && grunt
    # continue with 'grunt dist-cr' or 'grunt dist-ff'

There are a few more tasks available through grunt:

* watch source code for changes and recompile if needed:

    grunt watch

* reset repository

    grunt clean
    

##### Useful links
  
  Chrome
  https://developer.chrome.com/extensions
  
  Firefox Addon Docu
  https://developer.mozilla.org/en-US/Add-ons/SDK
  https://developer.mozilla.org/en-US/Add-ons/SDK/Tools
  https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Getting_Started_%28jpm%29
  
  Safari
  https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/Introduction/Introduction.html#//apple_ref/doc/uid/TP40009977-CH1-SW1
