// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Crowdfunding.sol";

/**
 * @dev TEST-ONLY adversarial contracts for the Hardhat suite.
 *      These are NOT part of the production deployment surface.
 */

/// @notice Re-enters refund() from receive() — the nested call must be blocked
///         by the nonReentrant guard on refund().
contract ReentrancyAttacker {
    Crowdfunding public immutable campaign;

    /// @notice Captured revert data from the re-entrant refund() call —
    ///         proof that the nonReentrant guard blocked the nested call.
    bytes public innerRevertData;

    /// @param _campaign Target campaign. Send ETH to auto-pledge from this contract.
    constructor(Crowdfunding _campaign) payable {
        campaign = _campaign;
        if (msg.value > 0) {
            campaign.pledge{value: msg.value}();
        }
    }

    function attack() external {
        campaign.refund();
    }

    receive() external payable {
        // Re-enters refund() but CONTAINS the revert with a low-level call so the
        // outer (legitimate) refund can still complete. The captured revert data
        // proves the nonReentrant guard rejected the nested call.
        (, bytes memory data) =
            address(campaign).call(abi.encodeWithSelector(Crowdfunding.refund.selector));
        innerRevertData = data;
    }
}

/// @notice Forces ETH into a target address via constructor selfdestruct.
/// @dev EIP-6780 preserves balance transfer even for older contracts. Only code,
///      storage and account deletion require creation in the same transaction.
///      This constructor example works on both pre- and post-Cancun EVMs.
contract ForceEther {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}

/// @notice TEST-ONLY receiver for proving TransferFailed rollback and retry.
/// @dev Deliberately permissionless controls; never use as a production wallet.
contract RejectingReceiver {
    bool public rejectEther = true;

    function setRejectEther(bool reject) external {
        rejectEther = reject;
    }

    function pledge(Crowdfunding campaign) external payable {
        campaign.pledge{value: msg.value}();
    }

    function unpledge(Crowdfunding campaign, uint256 amount) external {
        campaign.unpledge(amount);
    }

    function claim(Crowdfunding campaign) external {
        campaign.claim();
    }

    function refund(Crowdfunding campaign) external {
        campaign.refund();
    }

    function sweep(Crowdfunding campaign) external {
        campaign.sweepExcessEther();
    }

    receive() external payable {
        require(!rejectEther, "Test receiver rejects ETH");
    }
}
