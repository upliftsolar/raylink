# Web BLE example to read voltage/amperage and debugging info 



## USAGE

```bash
 http-server -S -C ssl/server.cert -K ssl/server.key
```

If you don't have access to an uplift device, try using the 'paste' functionality to import some historical bluetooth data. To do so: copy the following to your clipboard, then open up localhost:<port>/monitor.html, and click-and-hold on the graph at the bottom. Type 'paste' when prompted, and you will see that the contents of your clipboard is available on the timeline.


```bash
MzMzMzMzAAAAAAAAAAAACLB7Fz7tgABwQbGEPEGxhDymllZBEBxrV0Rdrr9DNLtQQQAA30H//zMzMzMzMwAAAAAAAAAAAAiwfQX14QAAcEGxhDxBsYQ8zvVSQRAca1dEX6i/QzS7UEEAAN9B//8zMzMzMzMAAAAAAAAAAAAIsH4yqfiAAHBBsYQ8QbGEPJMIVUEQHGtXRAAAAAA0u1BBAADfQf//
```

Here is a longer sinusoidal dataset.
```bash
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
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