<head>
  <meta name="Momento Node.js Client Library Documentation" content="Node.js client software development kit for Momento Cache">
</head>
<img src="https://docs.momentohq.com/img/logo.svg" alt="logo" width="400"/>

[![project status](https://momentohq.github.io/standards-and-practices/badges/project-status-official.svg)](https://github.com/momentohq/standards-and-practices/blob/main/docs/momento-on-github.md)
[![project stability](https://momentohq.github.io/standards-and-practices/badges/project-stability-stable.svg)](https://github.com/momentohq/standards-and-practices/blob/main/docs/momento-on-github.md)

# Node.js Client SDK

_Read this in other languages_: [日本語](README.ja.md)

<br>

## Example Requirements

- Node version 14 or higher is required
- A Momento Auth Token is required, you can generate one using the [Momento CLI](https://github.com/momentohq/momento-cli)

To run any of the examples you will need to install the dependencies once first:

```bash
npm install
```

## Running the Basic Example

This example demonstrates a basic set and get from a cache.

```bash
# Run example code
MOMENTO_AUTH_TOKEN=<YOUR AUTH TOKEN> npm run basic
```

Example Code: [basic.ts](basic.ts)

## Running the Advanced Example

This example demonstrates several slightly more advanced concepts, including:

* creating and listing caches
* deleting a key
* issuing multiple concurrent get requests
* using the Middleware API to wrap requests

```bash
# Run example code
MOMENTO_AUTH_TOKEN=<YOUR AUTH TOKEN> npm run advanced
```

Example Code: [advanced.ts](advanced.ts)

## Running the Dictionary Example

This example demonstrates how to use the dictionary data type.

```bash
# Run example code
MOMENTO_AUTH_TOKEN=<YOUR AUTH TOKEN> npm run dictionary
```

Example Code: [dictionary.ts](dictionary.ts)

If you have questions or need help experimenting further, please reach out to us!



