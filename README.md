# VOLWAL - The Volition Reference Wallet

VOLWAL is a browser-based React JS reference wallet implementation for the Volition blockchain project.

### How it Works

Private keys are encrypted with a user-supplied password and held in browser local storage. These keys are only decrypted as needed. VOLWAL does not store your password or any unencrypted keys on your device or send them to a server. (Which is not same thing as being secure; see below.)

VOLWAL supports consensus network multi-tenancy, so add as many networks as you like.

If your browser local storage is deleted, then your encrypted private keys will be lost. Back up your keys!

### Try it Out

The beta version of VOLWAL is hosted at our development server [here](https://beta.volwal.com). The development (singleton) node is [here](https://volition-node-beta.pancakehermit.com).

### Run it Locally

```
git clone git@github.com:cryptogogue/vol-wallet-js.git
cd vol-wallet-js
npm install
npm run
```

A winner is you.

### Is VOLWAL Secure?

TL;DR: No.

Browser local storage is inherently *insecure*. VOLWAL also uses a ton of public, 3rd party Javascript modules (including crypto libraries), wantonly installed from npm. We haven't made the slightest effort to audit these modules and we rely on them for even the most trivial concerns.

While we do encrypt your private keys with whatever password you give us, that is no substitute for a secure key store. Unfortunately, to the best of our knowledge, there is no viable implementation of a secure key store available for a browser-based Javascript environment.

In other words, the only way to "securely" interface with a Volition network is to generate your private keys offline, using cryptography-grade implementations, and to keep those keys offline. This means also preparing and signing your transactions offline.

In the future, we'll support "side-loading" offline-generated transactions into VOLWAL. But for now, here are some things you can do to mitigate the risks of using VOLWAL (and any browser-based wallet):

- Don't use VOLWAL to generate your keys. Generate them on the command line and import them instead.
- Use Volition's key permissioning features to limit the permissions of any keys you use with VOLWAL.
- Keep your most valuable assets in an account accessible only by offline keys.
- Associate a "backup" key with your account. Make sure its private component was generated (and remains) offline.
- Assume that if your machine is compromised, then all of your private keys will also be compromised.
- Assume your machine is compromised.
- Host VOLWAL yourself locally or on your own secure server.
- Carefully audit all of the VOLWAL sourcecode.
- Also audit every 3rd party module used by VOLWAL.
- Rewrite VOLWAL to not use any unecessary/untrusted 3rd party modules.
- Vendor all 3rd party modules into VOLWAL (i.e. don't install from npm).
- Rewrite VOLWAL to use a transaction-signing backend that can interface with a secure key store.
- Host that transaction-signing backend yourself, too.
- Don't use VOLWAL.

### A Bit More About "Offline" Keys

An "offline" key is a key pair that:
- was generated on a secure device (disconnected from any network);
- was generated using a cryptogtaphically robust algorithm;
- the private key of which was transferred to paper storage;
- the private key of which was securely deleted from all digital storage media.

To use an "offline" key to prepare transactions:
- load the key into a secure device (disconnected from any network).
- prepare the transaction body and use the key to sign it with a cryptographically robust algorithm.
- securely delete the key.
- transfer the signed transaction envelope to a network-enabled device.
- send the signed transaction out to the network.

### A Bit More About Key and Account Permissioning

Volition supports irrevocable, user-defined key and account restrictions. As of this writing, there is a minimal implementation of this that simply limits the kinds of transactions a key can perform. As the project matures, a more expressive set of restrictions will be available.

There are a number of strategies for using these permissions to mitigate risk. These include:
- Limit your daily use keys to prevent transfer of assets out of an account.
- Use a separate account with no online key for transferring assets to hold your most valuable assets.
- Limit the amount of currency or number of assets a key can transfer in a given time period.
- Use a key that can only transfer to a "cooling off" account, where assets and currency must "rest" before being transferred again. Store offline a "revocation" key that can reverse or override the transfer.

Be mindful of the spectrum between security and convenience and assume that your keys living at the "convenience" end of that spectrum will eventually be compromised. Volition can't solve that for you, but it *can* give you tools to mitigate the problem and even recover from certain kinds of attack... if you design your key permissioning strategy carefully.

### License

VOLWAL is free to use. Using VOLWAL lawfully is the sole responsibility of the end user. End users indemnify and hold harmless Cryptogogue, Inc. against any damages arising from the use of VOLWAL.

The VOLWAL source code is provided for informational purposes only. It remains the exclusive property of Cryptogogue, Inc. and is licensed to end users only for local hosting on client machines for individual use.

Modifications to VOLWAL's source code are considered derivative works and remain the property or Cryptogogue, Inc., licensed to their authors under the terms of this license.

### Contributing

If you want to contribue a bug fix or feature implementation, please follow our [code style guide](docs/js-code-style-guide.md) and submit pull requests via GitHub from a fork of the repository.

If you have a bug to report, prepare a clear description of the bug along with a repro case and submit it to us via GitHub [issues](https://github.com/cryptogogue/vol-wallet-js/issues).
