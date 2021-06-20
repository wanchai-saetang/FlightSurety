const Test = require("../config/testConfig.js");

contract.skip("Flight Surety Tests", async (accounts) => {
  let config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizedContract(
      config.flightSuretyApp.address
    );
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    const status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSuretyData.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  /****************************************************************************************/
  /* flightSuretyData                                                                     */
  /****************************************************************************************/

  it(`have initial airline when contract is deployed`, async () => {
    const initialAirline = await config.flightSuretyData.airlines(accounts[0]);
    const firstAirline = await config.flightSuretyData.airlines(accounts[1]);
    assert.equal(
      initialAirline,
      true,
      "first airline should equal contract owner address"
    );
    assert.equal(
      firstAirline,
      false,
      "should only have one airline at initial"
    );
  });

  it(`can register new airline with existing airline that already funded more than 10 ether`, async () => {
    const funded = await config.flightSuretyData.airlinesFunded(accounts[0]);
    const beforeRegister = await config.flightSuretyData.airlines(accounts[1]);
    await config.flightSuretyData.registerAirline(accounts[1], {
      from: accounts[0],
    });
    const afterRegister = await config.flightSuretyData.airlines(accounts[1]);
    const fundedAirline2 = await config.flightSuretyData.airlinesFunded(
      accounts[1]
    );
    let revertTransaction = false;
    try {
      await config.flightSuretyData.registerAirline(accounts[2], {
        from: accounts[1],
      });
    } catch (err) {
      revertTransaction = true;
    }
    assert.equal(
      funded,
      true,
      "funded should be true (already funded more than 10 ether)"
    );
    assert.equal(
      fundedAirline2,
      false,
      "funded should be false (not yet funded)"
    );
    assert.equal(beforeRegister, false, "should not be registered");
    assert.equal(afterRegister, true, "should be registered");
    assert.equal(revertTransaction, true, "transaction should be reverted");
  });

  it(`can not register new airline with other address that is not registered yet`, async () => {
    const airline = await config.flightSuretyData.airlines(accounts[2]);
    const newAirline = await config.flightSuretyData.airlines(accounts[3]);
    let revertTransaction = false;
    try {
      await config.flightSuretyData.registerAirline(accounts[3], {
        from: accounts[2],
      });
    } catch (err) {
      revertTransaction = true;
    }
    assert.equal(
      airline,
      false,
      "airline that register another airline should haven't registered yet"
    );
    assert.equal(
      newAirline,
      false,
      "new airline should have been registered yet"
    );
    assert.equal(revertTransaction, true, "transaction should be reverted");
  });

  it(`can not register new airline with existing airline that already added other airline at least 4 airline`, async () => {
    // register 10 airlines, so M-of-N equal 7-of-12 (accounts[2] - accounts[11] and include accounts[0], accounts[1]) (for now M-of-N eaul 1-of-2, so it can registerAirline more than 4)
    for (const addr of config.testAddresses) {
      await config.flightSuretyData.registerAirline(addr, {
        from: accounts[0],
      });
    }

    // make accounts[1] can interact with contract
    await config.flightSuretyData.fund({
      from: accounts[1],
      value: web3.utils.toWei("10"),
    });

    // make each airlines funded, so it can participate in contract (7-of-12)
    for (const addr of config.testAddresses) {
      await config.flightSuretyData.fund({
        from: addr,
        value: web3.utils.toWei("10"),
      });
    }

    // start added new 4 airline
    await config.flightSuretyData.registerAirline(accounts[12], {
      from: accounts[1],
    });
    await config.flightSuretyData.registerAirline(accounts[13], {
      from: accounts[1],
    });
    await config.flightSuretyData.registerAirline(accounts[14], {
      from: accounts[1],
    });
    await config.flightSuretyData.registerAirline(accounts[15], {
      from: accounts[1],
    });

    // try add number 5
    await config.flightSuretyData.registerAirline(accounts[16], {
      from: accounts[1],
    });

    const airline5 = await config.flightSuretyData.airlines(accounts[16]);
    assert.equal(
      airline5,
      false,
      "airline number 5 should haven't been registerd yet"
    );
  });

  it(`can register fifth and subsequent airlines when multi-party consensus of 50% of registered airlines`, async () => {
    // accounts 2 added 4 new airline
    await config.flightSuretyData.registerAirline(accounts[30], {
      from: accounts[2],
    });
    await config.flightSuretyData.registerAirline(accounts[31], {
      from: accounts[2],
    });
    await config.flightSuretyData.registerAirline(accounts[32], {
      from: accounts[2],
    });
    await config.flightSuretyData.registerAirline(accounts[33], {
      from: accounts[2],
    });

    await config.flightSuretyData.registerAirline(accounts[16], {
      from: accounts[2],
    });

    const multiRegister = await config.flightSuretyData.getMultiRegister(
      accounts[16]
    );

    // accounts 3 added 4 new airline

    await config.flightSuretyData.registerAirline(accounts[34], {
      from: accounts[3],
    });
    await config.flightSuretyData.registerAirline(accounts[35], {
      from: accounts[3],
    });
    await config.flightSuretyData.registerAirline(accounts[36], {
      from: accounts[3],
    });
    await config.flightSuretyData.registerAirline(accounts[37], {
      from: accounts[3],
    });

    // accounts 4 added 4 new airline

    await config.flightSuretyData.registerAirline(accounts[38], {
      from: accounts[4],
    });
    await config.flightSuretyData.registerAirline(accounts[39], {
      from: accounts[4],
    });
    await config.flightSuretyData.registerAirline(accounts[40], {
      from: accounts[4],
    });
    await config.flightSuretyData.registerAirline(accounts[41], {
      from: accounts[4],
    });

    // accounts 5 added 4 new airline

    await config.flightSuretyData.registerAirline(accounts[42], {
      from: accounts[5],
    });
    await config.flightSuretyData.registerAirline(accounts[43], {
      from: accounts[5],
    });
    await config.flightSuretyData.registerAirline(accounts[44], {
      from: accounts[5],
    });
    await config.flightSuretyData.registerAirline(accounts[45], {
      from: accounts[5],
    });

    // accounts 6 added 4 new airline

    await config.flightSuretyData.registerAirline(accounts[46], {
      from: accounts[6],
    });
    await config.flightSuretyData.registerAirline(accounts[47], {
      from: accounts[6],
    });
    await config.flightSuretyData.registerAirline(accounts[48], {
      from: accounts[6],
    });
    await config.flightSuretyData.registerAirline(accounts[49], {
      from: accounts[6],
    });

    // accounts 7 added 4 new airline

    await config.flightSuretyData.registerAirline(accounts[50], {
      from: accounts[7],
    });
    await config.flightSuretyData.registerAirline(accounts[51], {
      from: accounts[7],
    });
    await config.flightSuretyData.registerAirline(accounts[52], {
      from: accounts[7],
    });
    await config.flightSuretyData.registerAirline(accounts[53], {
      from: accounts[7],
    });

    // multi-party register new airline

    await config.flightSuretyData.registerAirline(accounts[16], {
      from: accounts[3],
    });

    await config.flightSuretyData.registerAirline(accounts[16], {
      from: accounts[4],
    });
    await config.flightSuretyData.registerAirline(accounts[16], {
      from: accounts[5],
    });
    await config.flightSuretyData.registerAirline(accounts[16], {
      from: accounts[6],
    });
    await config.flightSuretyData.registerAirline(accounts[16], {
      from: accounts[7],
    });

    const M = await config.flightSuretyData.M();
    const N = await config.flightSuretyData.N();

    // get airline
    const result = await config.flightSuretyData.airlines(accounts[16]);

    assert.equal(
      multiRegister.length,
      2,
      "New Airline have to be approved from 2 exists airline"
    );
    assert.equal(M, 7, "Number of required keys should be equal 7");
    assert.equal(N, 12, "Number of private keys should be equal 12");
    assert.equal(result, true, "New airline should be registered, when ");
  });

  it(`can purchase insurance for flight by passenger`, async () => {
    const passenger = accounts[50];
    const timestamp = 1624179600;
    await config.flightSuretyData.buy(accounts[1], "BKKJFK", timestamp, {
      from: passenger,
      value: web3.utils.toWei("1"),
    });
    const buyStatus = await config.flightSuretyData.getBuyStatus(
      accounts[1],
      "BKKJFK",
      timestamp,
      {
        from: passenger,
      }
    );

    assert.equal(buyStatus, true, "Buy Statue should be true");
  });

  it(`can not purchase insurance for flight that airline is not funded more than 10 ether`, async () => {
    const passenger = accounts[50];
    const timestamp = 1624179600;
    let revertTransaction = false;
    try {
      await config.flightSuretyData.buy(accounts[16], "BKKJFK", timestamp, {
        from: passenger,
        value: web3.utils.toWei("1"),
      });
    } catch (err) {
      revertTransaction = true;
    }
    const buyStatus = await config.flightSuretyData.getBuyStatus(
      accounts[16],
      "BKKJFK",
      timestamp,
      {
        from: passenger,
      }
    );

    assert.equal(buyStatus, false, "Buy Statue should be false");
    assert.equal(revertTransaction, true, "Transaction should be reverted");
  });

  it(`can not pay for insurance more than 1 ether`, async () => {
    const passenger = accounts[50];
    const timestamp = 1624179600;
    let revertTransaction = false;
    try {
      await config.flightSuretyData.buy(accounts[2], "BKKJFK", timestamp, {
        from: passenger,
        value: web3.utils.toWei("2"),
      });
    } catch (err) {
      revertTransaction = true;
    }
    const buyStatus = await config.flightSuretyData.getBuyStatus(
      accounts[2],
      "BKKJFK",
      timestamp,
      {
        from: passenger,
      }
    );

    assert.equal(buyStatus, false, "Buy Statue should be false");
    assert.equal(revertTransaction, true, "Transaction should be reverted");
  });

  it(`can credit insureee for 1.5x amount`, async () => {
    const timestamp = 1624179600;
    await config.flightSuretyData.creditInsurees(
      accounts[1],
      "BKKJFK",
      timestamp,
      { from: accounts[1] }
    );
    const amount = await config.flightSuretyData.getPassengerWallet(
      accounts[50],
      {
        from: accounts[50],
      }
    );
    const flightInsurance = await config.flightSuretyData.getFlighInsurance(
      accounts[1],
      "BKKJFK",
      timestamp
    );
    const buyAmount = flightInsurance.find(
      (x) => x.passenger == accounts[50]
    ).buyAmount;

    assert.equal(
      amount.toString(),
      web3.utils
        .toBN(buyAmount)
        .add(web3.utils.toBN(buyAmount).div(web3.utils.toBN("2")))
        .toString(),
      "amount should be 1.5x buy amount"
    );
  });

  it(`can withdraw any funds owed to passenger by themselves`, async () => {
    const balanceBefore = await web3.eth.getBalance(accounts[50]);
    const transaction = await config.flightSuretyData.pay(accounts[50], {
      from: accounts[50],
    });
    const transactionByTxh = await web3.eth.getTransaction(transaction.tx);
    const gasFee = web3.utils
      .toBN(transactionByTxh.gasPrice)
      .mul(web3.utils.toBN(transaction.receipt.gasUsed));
    const balanceAfter = await web3.eth.getBalance(accounts[50]);
    const amount = await config.flightSuretyData.getPassengerWallet(
      accounts[50],
      {
        from: accounts[50],
      }
    );
    assert.equal(
      balanceAfter,
      web3.utils
        .toBN(balanceBefore)
        .add(web3.utils.toBN(amount))
        .sub(gasFee)
        .toString(),
      "total balance should equal before balance plus payout from insurance"
    );
  });

  /****************************************************************************************/
  /* flightSuretyApp                                                                      */
  /****************************************************************************************/
  it(`can register flight`, async () => {
    const airline = accounts[1];
    const flight = "BKKJFK";
    const timestamp = 1624179600;
    await config.flightSuretyApp.registerFlight(airline, flight, timestamp);
    const flightCheck = await config.flightSuretyApp.getFlight(
      airline,
      flight,
      timestamp
    );
    assert.equal(flightCheck.isRegistered, true, "flight should be registered");
    const flightList = await config.flightSuretyApp.getAllFlight();
    assert.equal(
      flightList[0].isRegistered,
      true,
      "flight should be on the list"
    );
  });
  it(`can fetch flight status`, async () => {
    const airline = accounts[1];
    const flight = "BKKJFK";
    const timestamp = 1624179600;
    const result = await config.flightSuretyApp.fetchFlightStatus(
      airline,
      flight,
      timestamp
    );
    assert.equal(
      result.logs[0].event,
      "OracleRequest",
      "should submit OracleRequest Event"
    );
  });
});
