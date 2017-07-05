# Subutai Social E2E Plugin
Effortlessly secure the doors to your Subutai Social Cloud

Security is utterly important in Subutai Social and this plugin helps keep you and your cloud secure. We use encryption, digital signatures, and keys all over the place. Even simple things you do involve complicated security operations behind the scenes. One of most important principles is to make sure your keys for performing these tasks are never transferred or taken off your computer to get into the wrong hands. To help enforce this, we have to make sure everything transferred is encrypted, or signed end-to-end. We also don't want to slow and weigh you down with complicated things you would have to do manually without this plugin. The complexity could lead to a mistake if you had to do some things manually and that would greatly reduce security.

The Subutai Social E2E plugin works on your computer with your browser to manage the keys to your cloud environments. It works with Subutai Social and the Hub to perform complicated tasks seamlessly for you. These keys are never exposed, or transferred, always staying right where they were created and protected by a passcode. In the future, the plugin will interoperate with USB hardware security modules to not even store keys on your computer and allow them to move around with you and your USB device.

# Development


1) Install Node.js and NPM

        sudo apt-get update
        sudo apt-get install nodejs
        sudo apt-get install nodejs-legacy
        sudo apt-get install npm

    Make sure you have successfully installed node.js and npm on your system

        node --version
        npm --version
2) Install Grunt using NPM
        
        sudo npm install -g grunt
        
    After successful installation make sure grunt has been installed successful and check version.
        
        grunt --version

Run:

    bash setup.sh
