// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Crowdfunding.sol";

/**
 * @title CrowdfundingFactory
 * @notice Factory contract to deploy and track multiple independent Crowdfunding campaigns.
 * @dev Enables decentralized project launchpad capabilities.
 */
contract CrowdfundingFactory {
    // =============================================================
    //                           EVENTS
    // =============================================================
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        uint256 goal,
        uint64 durationSeconds,
        uint256 campaignId
    );

    // =============================================================
    //                       STORAGE VARIABLES
    // =============================================================
    /// @notice Array containing all deployed campaign addresses
    address[] public deployedCampaigns;

    /// @notice Mapping from creator address to their created campaigns
    mapping(address => address[]) public creatorCampaigns;

    /// @notice Upper bound for getCampaigns() page size.
    /// @dev Mitigates RPC-layer DoS: an unbounded `limit` would make nodes
    ///      serialize arbitrarily large arrays in a single eth_call response.
    uint256 public constant MAX_PAGE_SIZE = 100;

    // =============================================================
    //                      EXTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Deploys a new Crowdfunding contract
     * @param _goal Target amount of wei for the campaign
     * @param _durationSeconds Duration of campaign in seconds
     * @return campaignAddress The address of the freshly deployed Crowdfunding contract
     */
    function createCampaign(
        uint256 _goal,
        uint64 _durationSeconds
    ) external returns (address campaignAddress) {
        Crowdfunding campaign = new Crowdfunding(
            msg.sender,
            _goal,
            _durationSeconds
        );

        campaignAddress = address(campaign);
        deployedCampaigns.push(campaignAddress);
        creatorCampaigns[msg.sender].push(campaignAddress);

        emit CampaignCreated(
            campaignAddress,
            msg.sender,
            _goal,
            _durationSeconds,
            deployedCampaigns.length - 1
        );
    }

    /**
     * @notice Returns total number of campaigns ever deployed
     */
    function totalCampaigns() external view returns (uint256) {
        return deployedCampaigns.length;
    }

    /**
     * @notice Returns all campaigns created by a specific address
     */
    function getCampaignsByCreator(address _creator) external view returns (address[] memory) {
        return creatorCampaigns[_creator];
    }

    /**
     * @notice Returns a batch slice of deployed campaigns for frontend pagination
     */
    function getCampaigns(uint256 offset, uint256 limit) external view returns (address[] memory batch) {
        uint256 total = deployedCampaigns.length;
        if (offset >= total) {
            return new address[](0);
        }

        uint256 pageSize = limit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : limit;
        uint256 end = offset + pageSize;
        if (end > total) {
            end = total;
        }

        uint256 size = end - offset;
        batch = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            batch[i] = deployedCampaigns[offset + i];
        }
    }
}
