# Web BLE example to read voltage/amperage and debugging info 



## USAGE

```bash
 http-server -S -C ssl/server.cert -K ssl/server.key
```

## DEVELOPMENT SETUP

```bash
  npm install -g http-server
```

THANH: please provide a link to the Visual Studio function that you use to start the server for BLE.


## ICD 

ICD: Uplift devices have a defined msg format, from a specific characteristic (notify)
Review the following test, to see the subset that is implement for parsing and sending, client-side.

```bash
npm install -g mocha chai
npx mocha test/cluster_message.test.js
```

Msg structure is

* FROM
* TO
* TIMESTAMP
* SUBSYSTEM
* CONTROL CHARACTER
* msg-specific structure, documented in ICD