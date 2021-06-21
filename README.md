# Flight Surety Project

This project for learning Blockchain with Solidity and Web3.js purposes.

Description:
Airlines can register and fund for pay passenger when flight is delay.
Passenger can purchase insurance for each flight.

## Truffle version

1.  Truffle v5.3.9 (core: 5.3.9)

2.  Solidity - ^0.8.0 (solc-js)

3.  Node v14.17.0

4.  Web3.js v1.3.6

## Installation

Clone project repositories, and run below command for install necessary tools and package.

```
npm install
ganache-cli -m "<your mnemonic>" -e 100000 --accounts=100
truffle migrate --reset
npm run server
npm run dapp
```

## Usage

Passenger can interact with smart contract via Front-end:

- Fetch Flight Status - It will show pending first, until oracles have confirmed flight status.
- Purchase flight insurance for fixed flight list

Airlines can interact with smart contract via cmd:

- Feel free to look at test case. it will describe all functions.
