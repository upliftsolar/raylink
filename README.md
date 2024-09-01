# Web BLE example to read voltage/amperage and debugging info 



## USAGE

```bash
 http-server -S -C ssl/server.cert -K ssl/server.key
```

If you don't have access to an uplift device, try using the 'paste' functionality to import some historical bluetooth data. To do so: copy the following to your clipboard, then open up localhost:<port>/monitor.html, and click-and-hold on the graph at the bottom. Type 'paste' when prompted, and you will see that the contents of your clipboard is available on the timeline.

```bash
MzMzMzMzAAAAAAAAAAAACLB7Fz7tgABwQbGEPEGxhDymllZBEBxrV0Rdrr9DNLtQQQAA30H//zMzMzMzMwAAAAAAAAAAAAiwfQX14QAAcEGxhDxBsYQ8zvVSQRAca1dEX6i/QzS7UEEAAN9B//8zMzMzMzMAAAAAAAAAAAAIsH4yqfiAAHBBsYQ8QbGEPJMIVUEQHGtXRAAAAAA0u1BBAADfQf//
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