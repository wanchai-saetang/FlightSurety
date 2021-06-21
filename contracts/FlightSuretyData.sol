// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
  using SafeMath for uint256;

  /********************************************************************************************/
  /*                                       DATA VARIABLES                                     */
  /********************************************************************************************/

  address private contractOwner; // Account used to deploy contract
  bool private operational = true; // Blocks all state changes throughout the contract if false
  mapping(address => bool) public airlines;
  mapping(address => bool) public airlinesFunded;
  mapping(address => uint256) private airlinesAmountFunded;
  mapping(address => address[]) public airlinesApproved;
  uint256 public M; // Number of airlines
  uint256 public N; // Number of required airlines for transaction (N / 2) + 1 = M
  mapping(address => address[]) private multiRegister; // Number of current approved for each new airline
  mapping(bytes32 => BuyInfo[]) private flightInsurance; // Passengers who bought insurance map with flight
  mapping(bytes32 => bool) private flightPassengerBuyStatus; // Track passenger already bought insurance
  mapping(address => uint256) private passengerWallet; // for claim due to delay flight

  mapping(address => bool) private authorizedContracts;

  // track buy amount that passenger pay
  struct BuyInfo {
    address passenger;
    uint256 buyAmount;
  }

  /********************************************************************************************/
  /*                                       EVENT DEFINITIONS                                  */
  /********************************************************************************************/

  /**
   * @dev Constructor
   *      The deploying account becomes contractOwner
   */
  constructor() {
    contractOwner = msg.sender;
    authorizedContracts[msg.sender] = true;
    airlines[msg.sender] = true;
    airlinesFunded[msg.sender] = true;
    N = 1;
    M = 1;
  }

  /********************************************************************************************/
  /*                                       FUNCTION MODIFIERS                                 */
  /********************************************************************************************/

  // Modifiers help avoid duplication of code. They are typically used to validate something
  // before a function is allowed to be executed.

  /**
   * @dev Modifier that requires the "operational" boolean variable to be "true"
   *      This is used on all state changing functions to pause the contract in
   *      the event there is an issue that needs to be fixed
   */
  modifier requireIsOperational() {
    require(operational, "Contract is currently not operational");
    _; // All modifiers require an "_" which indicates where the function body will be added
  }

  /**
   * @dev Modifier that requires the "ContractOwner" account to be the function caller
   */
  modifier requireContractOwner() {
    require(msg.sender == contractOwner, "Caller is not contract owner");
    _;
  }

  modifier requireAirlinePermission() {
    require(airlines[msg.sender], "No permission to interacting with contract");
    _;
  }

  modifier requireFunding() {
    require(
      airlinesFunded[msg.sender],
      "No permission, please funding more than 10 ether"
    );
    _;
  }

  modifier requireAirlineInList(address airline) {
    require(airlinesFunded[airline], "This airline is not in the list");
    _;
  }

  modifier limitPrice() {
    require(msg.value <= 1 ether);
    _;
  }

  modifier sufficientFund() {
    uint256 balance = passengerWallet[msg.sender];
    require(balance <= address(this).balance, "Insufficient fund");
    _;
  }

  modifier requirePassenger(address account) {
    require(msg.sender == account, "No permission to watch wallet");
    _;
  }

  modifier isCallerAuthorized() {
    require(authorizedContracts[msg.sender], "Caller is not authorized");
    _;
  }

  /********************************************************************************************/
  /*                                       UTILITY FUNCTIONS                                  */
  /********************************************************************************************/

  /**
   * @dev Get operating status of contract
   *
   * @return A bool that is the current operating status
   */
  function isOperational() public view returns (bool) {
    return operational;
  }

  /**
   * @dev Sets contract operations on/off
   *
   * When operational mode is disabled, all write transactions except for this one will fail
   */
  function setOperatingStatus(bool mode) external requireContractOwner {
    operational = mode;
  }

  /**
   * @dev update N++ and M = N / divisor + 1, for example, N = 100 abd divisor = 2, then M = 100 / 2 + 1 = 51
   */
  function _updatedMtoN(uint256 divisor) private {
    N = N.add(1);
    M = N.div(divisor).add(1);
  }

  /**
   * @dev register new airline
   */

  function _registerAirline(address newAirline) private {
    airlines[newAirline] = true;
    delete multiRegister[newAirline];
  }

  function getApprovedAirline(address airline)
    public
    view
    returns (address[] memory)
  {
    return airlinesApproved[airline];
  }

  function getMultiRegister(address airline)
    public
    view
    returns (address[] memory)
  {
    return multiRegister[airline];
  }

  function getBuyStatus(
    address airline,
    string memory flight,
    uint256 timestamp
  ) public view returns (bool) {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    bytes32 passengerFlightKey = getPassengerFlightKey(flightKey, msg.sender);
    return flightPassengerBuyStatus[passengerFlightKey];
  }

  function getPassengerWallet(address passenger)
    public
    view
    requirePassenger(passenger)
    returns (uint256)
  {
    return passengerWallet[passenger];
  }

  function getFlighInsurance(
    address airline,
    string memory flight,
    uint256 timestamp
  ) public view returns (BuyInfo[] memory) {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    return flightInsurance[flightKey];
  }

  function getFund() public view returns (uint256) {
    return address(this).balance;
  }

  function authorizedContract(address _address) external requireContractOwner {
    authorizedContracts[_address] = true;
  }

  function deauthorizedContract(address _address)
    external
    requireContractOwner
  {
    delete authorizedContracts[_address];
  }

  function getAirlineFunded(address airline) external view returns (bool) {
    return airlinesFunded[airline];
  }

  /********************************************************************************************/
  /*                                     SMART CONTRACT FUNCTIONS                             */
  /********************************************************************************************/

  /**
   * @dev Add an airline to the registration queue
   *      Can only be called from FlightSuretyApp contract
   *
   */
  function registerAirline(address newAirline)
    external
    requireIsOperational
    requireAirlinePermission
    requireFunding
  {
    require(!airlines[newAirline], "This Airline already exists");
    for (uint256 i = 0; i < airlinesApproved[msg.sender].length; i++) {
      require(
        airlinesApproved[msg.sender][i] != newAirline,
        "This Airline already approved by sender"
      );
    }

    airlinesApproved[msg.sender].push(newAirline);

    if (airlinesApproved[msg.sender].length <= 4) {
      _registerAirline(newAirline);
    } else {
      for (uint256 i = 0; i < multiRegister[newAirline].length; i++) {
        require(
          multiRegister[newAirline][i] != msg.sender,
          "This sender already approved this airline"
        );
      }
      multiRegister[newAirline].push(msg.sender);
      if (multiRegister[newAirline].length >= M) {
        _registerAirline(newAirline);
      }
    }
  }

  /**
   * @dev Buy insurance for a flight
   *
   */
  function buy(
    address airline,
    string memory flight,
    uint256 timestamp
  )
    external
    payable
    requireIsOperational
    requireAirlineInList(airline)
    limitPrice
  {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    bytes32 passengerFlightKey = getPassengerFlightKey(flightKey, msg.sender);
    require(
      !flightPassengerBuyStatus[passengerFlightKey],
      "You already brought insurance for this flight"
    );
    flightInsurance[flightKey].push(BuyInfo(msg.sender, msg.value));
    flightPassengerBuyStatus[passengerFlightKey] = true;
  }

  /**
   *  @dev Credits payouts to insurees
   */
  function creditInsurees(
    address airline,
    string memory flight,
    uint256 timestamp
  ) external requireIsOperational isCallerAuthorized {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    BuyInfo[] memory buyInfoForEachPassenger = flightInsurance[flightKey];
    for (uint256 i = 0; i < buyInfoForEachPassenger.length; i++) {
      BuyInfo memory passengerInfo = buyInfoForEachPassenger[i];
      passengerWallet[passengerInfo.passenger] = passengerWallet[
        passengerInfo.passenger
      ]
      .add(passengerInfo.buyAmount.add(passengerInfo.buyAmount.div(2)));
    }
  }

  /**
   *  @dev Transfers eligible payout funds to insuree
   *
   */
  function pay(address insuree)
    external
    requireIsOperational
    sufficientFund
    requirePassenger(insuree)
  {
    uint256 balance = passengerWallet[insuree];
    payable(insuree).transfer(balance);
  }

  /**
   * @dev Initial funding for the insurance. Unless there are too many delayed flights
   *      resulting in insurance payouts, the contract should be self-sustaining
   *
   */
  function fund() public payable requireIsOperational requireAirlinePermission {
    airlinesAmountFunded[msg.sender] = airlinesAmountFunded[msg.sender].add(
      msg.value
    );
    if (
      !airlinesFunded[msg.sender] &&
      airlinesAmountFunded[msg.sender] >= 10 ether
    ) {
      authorizedContracts[msg.sender] = true;
      airlinesFunded[msg.sender] = true;
      _updatedMtoN(2);
    }
  }

  function getFlightKey(
    address airline,
    string memory flight,
    uint256 timestamp
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(airline, flight, timestamp));
  }

  function getPassengerFlightKey(bytes32 flightKey, address passenger)
    internal
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(flightKey, passenger));
  }

  /**
   * @dev Fallback function for funding smart contract.
   *
   */
  fallback() external payable {
    fund();
  }

  receive() external payable {
    fund();
  }
}
