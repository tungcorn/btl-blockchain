// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Crowdfunding
 * @notice A secure, decentralized crowdfunding smart contract with target goal and deadline.
 * @dev Implements the Checks-Effects-Interactions (CEI) pattern, Reentrancy Guard,
 *      and Pull-over-Push payment architecture for safe individual refunds.
 */
contract Crowdfunding {
    // =============================================================
    //                           ERRORS
    // =============================================================
    error Unauthorized();
    error CampaignActive();
    error CampaignEnded();
    error GoalNotReached();
    error GoalAlreadyReached();
    error GoalCannotBeZero();
    error InvalidDuration();
    error ZeroPledge();
    error AlreadyClaimed();
    error NothingToRefund();
    error TransferFailed();
    error ReentrancyGuardTriggered();

    // =============================================================
    //                           EVENTS
    // =============================================================
    event Launch(address indexed creator, uint256 goal, uint64 startAt, uint64 endAt);
    event Pledge(address indexed backer, uint256 amount, uint256 totalPledged);
    event Unpledge(address indexed backer, uint256 amount, uint256 totalPledged);
    event Claim(address indexed creator, uint256 totalAmount);
    event Refund(address indexed backer, uint256 amount);
    event Sweep(address indexed creator, uint256 amount);

    // =============================================================
    //                        ENUMS & TYPES
    // =============================================================
    enum CampaignState {
        Active,      // Campaign is ongoing (time remaining, accepting pledges)
        Successful,  // Goal reached, waiting or ready for creator claim
        Failed,      // Deadline passed without reaching goal, refunds open
        Claimed      // Funds claimed by creator
    }

    // =============================================================
    //                       STORAGE VARIABLES
    // =============================================================
    /// @notice Creator and beneficiary of the campaign
    address public immutable creator;

    /// @notice Target funding goal in wei
    uint256 public immutable goal;

    /// @notice Total amount of wei pledged across all backers
    uint256 public pledged;

    /// @notice Campaign start timestamp (Unix epoch seconds)
    /// @dev uint64 (NOT uint32): uint32 overflows in Feb 2106 and silently truncates on cast.
    ///      Because these are `immutable` (embedded in bytecode, zero storage slots),
    ///      the extra 4 bytes only cost bytecode size — negligible vs. the safety win.
    uint64 public immutable startAt;

    /// @notice Campaign deadline timestamp (Unix epoch seconds, safe until year ~5.8e11)
    uint64 public immutable endAt;

    /// @notice Flag tracking if funds have been claimed by creator
    bool public claimed;

    /// @notice Reentrancy lock status (1 = Unlocked, 2 = Locked)
    uint8 private _reentrancyStatus;

    /// @notice Mapping of backer address to their contributed amount in wei
    mapping(address => uint256) public pledgedAmount;

    /// @notice Total number of unique contributors
    uint256 public contributorCount;

    // =============================================================
    //                         MODIFIERS
    // =============================================================
    modifier onlyCreator() {
        if (msg.sender != creator) revert Unauthorized();
        _;
    }

    /**
     * @dev Defense-in-depth mutex, mirroring OpenZeppelin's ReentrancyGuard.
     *      Why not OpenZeppelin 5.x transient storage (EIP-1153 TSTORE/TLOAD)?
     *      Kept storage-based for maximal compatibility with pre-Cancun EVMs;
     *      on Cancun+ networks the SSTORE pair costs ~5,800 gas vs ~200 for TSTORE.
     *      Applied ONLY to functions that perform external calls (unpledge, claim,
     *      refund, sweep). pledge()/receive() make no external calls, so CEI alone
     *      is sufficient there (see pledge() docs).
     */
    modifier nonReentrant() {
        if (_reentrancyStatus == 2) revert ReentrancyGuardTriggered();
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================
    /**
     * @notice Initializes a new Crowdfunding campaign
     * @param _creator Address of the project creator / beneficiary
     * @param _goal Target amount of funds in wei
     * @param _durationSeconds Duration of campaign in seconds
     */
    constructor(
        address _creator,
        uint256 _goal,
        uint64 _durationSeconds
    ) {
        if (_goal == 0) revert GoalCannotBeZero();
        if (_durationSeconds == 0 || _durationSeconds > 365 days) revert InvalidDuration();

        creator = _creator == address(0) ? msg.sender : _creator;
        goal = _goal;
        startAt = uint64(block.timestamp);
        endAt = startAt + _durationSeconds;
        _reentrancyStatus = 1;

        emit Launch(creator, _goal, startAt, endAt);
    }

    // =============================================================
    //                      EXTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Pledge ETH to the campaign while it is active
     * @dev Deliberately WITHOUT nonReentrant: this function performs NO external
     *      calls, so Checks-Effects-Interactions alone is sufficient. Adding the
     *      guard would (1) waste ~5,800 gas (two SSTOREs) per call, and (2) create
     *      a griefing corner case: a backer contract whose receive() auto-pledges
     *      would have every refund()/claim() transfer revert (guard still engaged
     *      during the ETH delivery call).
     */
    function pledge() external payable {
        if (block.timestamp >= endAt) revert CampaignEnded();
        if (msg.value == 0) revert ZeroPledge();

        uint256 prevAmount = pledgedAmount[msg.sender];
        if (prevAmount == 0) {
            contributorCount += 1;
        }

        pledged += msg.value;
        pledgedAmount[msg.sender] = prevAmount + msg.value;

        emit Pledge(msg.sender, msg.value, pledged);
    }

    /**
     * @notice Allows a backer to retract part or all of their pledge while the campaign is still active
     * @param _amount Amount of wei to retract
     */
    function unpledge(uint256 _amount) external nonReentrant {
        if (block.timestamp >= endAt) revert CampaignEnded();
        uint256 currentAmount = pledgedAmount[msg.sender];
        if (_amount == 0 || currentAmount < _amount) revert NothingToRefund();

        // Checks-Effects-Interactions Pattern
        pledged -= _amount;
        pledgedAmount[msg.sender] = currentAmount - _amount;

        if (currentAmount == _amount && contributorCount > 0) {
            contributorCount--;
        }

        emit Unpledge(msg.sender, _amount, pledged);

        // Interaction: External ETH transfer
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Allows the creator to withdraw funds if the goal was reached and deadline passed
     * @dev Sends address(this).balance (not just `pledged`) so accidentally or
     *      forcibly transferred ETH (e.g. selfdestruct on pre-Cancun chains) is
     *      never bricked in a SUCCESSFUL campaign. Note the emitted totalAmount
     *      may exceed `pledged` when forced ETH is present — indexers beware.
     *      In a FAILED campaign the excess cannot go through here; the creator
     *      must use sweepExcessEther().
     */
    function claim() external onlyCreator nonReentrant {
        if (block.timestamp < endAt) revert CampaignActive();
        if (pledged < goal) revert GoalNotReached();
        if (claimed) revert AlreadyClaimed();

        claimed = true;
        uint256 balanceToClaim = address(this).balance;

        emit Claim(creator, balanceToClaim);

        (bool success, ) = payable(creator).call{value: balanceToClaim}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Allows individual backers to reclaim their contribution if the campaign failed
     * @dev Pull over Push pattern avoids DoS if one recipient reverts.
     *      Decrements `pledged` as well, preserving the core invariant
     *      `pledged == Σ pledgedAmount` (which sweepExcessEther() relies on).
     */
    function refund() external nonReentrant {
        if (block.timestamp < endAt) revert CampaignActive();
        if (pledged >= goal) revert GoalAlreadyReached();

        uint256 balance = pledgedAmount[msg.sender];
        if (balance == 0) revert NothingToRefund();

        // Checks-Effects-Interactions (CEI): Zero out balance BEFORE transfer
        pledgedAmount[msg.sender] = 0;
        pledged -= balance; // preserve invariant: pledged == Σ pledgedAmount

        emit Refund(msg.sender, balance);

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Withdraws only the ETH balance that exceeds the accounted `pledged` total
     * @dev Neutralizes the "forced ETH" vector (selfdestruct on pre-Cancun chains,
     *      same-tx contract creation+destruct after EIP-6780): excess ETH sent to
     *      a FAILED campaign would otherwise be bricked forever, because refund()
     *      pays strictly per pledgedAmount. Never touches backer funds: it reverts
     *      unless balance > pledged, so refunds always stay solvent.
     * @return swept The exact amount of excess wei transferred to the creator
     */
    function sweepExcessEther() external onlyCreator nonReentrant returns (uint256 swept) {
        if (address(this).balance <= pledged) revert NothingToRefund();

        swept = address(this).balance - pledged;

        emit Sweep(creator, swept);

        (bool success, ) = payable(creator).call{value: swept}("");
        if (!success) revert TransferFailed();
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Returns the current computed status of the campaign
     */
    function state() external view returns (CampaignState) {
        if (claimed) return CampaignState.Claimed;
        if (block.timestamp < endAt) {
            return CampaignState.Active;
        } else {
            return pledged >= goal ? CampaignState.Successful : CampaignState.Failed;
        }
    }

    /**
     * @notice Returns remaining time in seconds (0 if ended)
     */
    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= endAt) return 0;
        return endAt - block.timestamp;
    }

    /**
     * @notice Returns progress towards goal in basis points (10000 = 100%)
     */
    function progressBasisPoints() external view returns (uint256) {
        if (goal == 0) return 0;
        return (pledged * 10000) / goal;
    }

    // =============================================================
    //                       FALLBACK
    // =============================================================
    /// @dev Direct ETH transfers will automatically trigger pledge()
    receive() external payable {
        if (block.timestamp >= endAt) revert CampaignEnded();
        if (msg.value == 0) revert ZeroPledge();

        if (pledgedAmount[msg.sender] == 0) {
            contributorCount++;
        }

        pledged += msg.value;
        pledgedAmount[msg.sender] += msg.value;

        emit Pledge(msg.sender, msg.value, pledged);
    }
}
