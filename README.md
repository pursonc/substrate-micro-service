# substrate-micro-service

## Description

substrate-micro-service integrated with

- [Polkadot](https://wiki.polkadot.network/docs/build-transaction-construction) official tools
- [Nest](https://github.com/nestjs/nest) framework
- gRPC

## Preparation
1. Apply for the polkadot rpc API via [Ankr](https://app.ankr.com/)
2. Create the dotenv file & paste the API
```bash
    touch .env && echo 'POLKADOT_RPC_API="xxxxx"' >> .env
```

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```


