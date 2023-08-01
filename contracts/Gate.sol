// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./DocumentaryProducerPass.sol";
import "./Token.sol";

import "hardhat/console.sol";

contract Gate is Ownable, ERC1155Holder {
    using Strings for uint256;

    event ProducerPassStaked(
        address indexed account,
        uint256 chapterId,
        uint256 voteId,
        uint256 amount,
        uint256 tokenAmount
    );

    event ProducerPassUnstaked(
        address indexed account,
        uint256 chapterId,
        uint256 voteId
    );

    // The Producer Pass contract used for staking/voting on chapters
    DocumentaryProducerPass public documentaryProducerPass;
    Token public documentaryToken;

    // The list of chapter IDs (e.g. [1, 2, 3, 4])
    uint256[] public chapters;

    // The voting option IDs by chapterId (e.g. 1 => [1, 2])
    mapping(uint256 => uint256[]) private _chapterOptions;

    // A mapping from chapterId to whether or not voting is enabled
    mapping(uint256 => bool) public votingEnabledForChapter;

    // The total vote counts for each chapter voting option, agnostic of users
    // _chapterVotesByOptionId[chapterId][voteOptionId] => number of votes
    mapping(uint256 => mapping(uint256 => uint256))
        private _chapterVotesByOptionId;

    // A mapping of how many Producer Passes have been staked per user per chapters per option
    // e.g. _usersStakedChapterVotingOptionsCount[address][chapterId][voteOptionId] => number staked
    // These values will be updated/decremented when Producer Passes are unstaked
    mapping(address => mapping(uint256 => mapping(uint256 => uint256)))
        private _usersStakedChapterVotingOptionsCount;


    constructor() {
        Token token = new Token("Documentary Fractional Token", "DFT");
        documentaryToken = token;
    }

    /**
     * @dev Sets the Producer Pass contract to be used
     */
    function setDocumentaryProducerPass(
        address _documentaryProducerPassContract
    ) external onlyOwner {
        documentaryProducerPass = DocumentaryProducerPass(
            _documentaryProducerPassContract
        );
    }

    function setChapters(uint256[] calldata _chapters) external onlyOwner {
        chapters = _chapters;
    }

    /**
     * @dev Sets the voting option IDs for a given chapter.
     *
     * Requirements:
     *
     * - The provided chapter ID exists in our list of `chapters`
     */
    function setChapterOptions(
        uint256 chapterId,
        uint256[] calldata chapterOptionIds
    ) external onlyOwner {
        require(chapterId <= chapters.length, "chapter does not exist");
        _chapterOptions[chapterId] = chapterOptionIds;
    }

    /**
     * @dev Owner method to toggle the voting state of a given chapter.
     *
     * Requirements:
     *
     * - The provided chapter ID exists in our list of `chapters`
     * - The voting state is different than the current state
     */
    function setVotingEnabledForChapter(uint256 chapterId, bool enabled)
        public
        onlyOwner
    {
        require(chapterId <= chapters.length, "Chapter does not exist");
        require(
            votingEnabledForChapter[chapterId] != enabled,
            "Voting state unchanged"
        );
        votingEnabledForChapter[chapterId] = enabled;
    }

    function stakeProducerPassAndVote(
        uint256 chapterId,
        uint256 voteOptionId,
        uint256 amount
    ) public {
        require(chapterId <= chapters.length, "Chapter does not exist");
        require(votingEnabledForChapter[chapterId], "Voting not enabled");
        require(amount > 0, "Cannot stake 0");
        require(
            documentaryProducerPass.balanceOf(msg.sender, chapterId) >= amount,
            "Insufficient pass balance"
        );
        uint256[] memory votingOptionsForThisChapter = _chapterOptions[
            chapterId
        ];
        // vote options should be [1, 2], ID <= length
        require(
            votingOptionsForThisChapter.length >= voteOptionId,
            "Invalid voting option"
        );

        uint256 currentTotalVoteCount =
            _chapterVotesByOptionId[chapterId][voteOptionId];
        // user's vote count for selected chapter & option
        uint256 userCurrentVoteCount =
            _usersStakedChapterVotingOptionsCount[msg.sender][chapterId][voteOptionId];
        // Get total vote count of this option user is voting/staking for
        uint256 userNewVoteCount = userCurrentVoteCount + amount;
        _chapterVotesByOptionId[chapterId][voteOptionId] = currentTotalVoteCount + amount;
        _usersStakedChapterVotingOptionsCount[msg.sender][chapterId][voteOptionId] = userNewVoteCount;

        uint256 tokensAllocated = getTokenAllocationForStaking(chapterId, amount);

        // Take custody of producer passes from user
        documentaryProducerPass.safeTransferFrom(
            msg.sender,
            address(this),
            chapterId,
            amount,
            ""
        );
        // Distribute tokens to user
        documentaryToken.mint(msg.sender, tokensAllocated);

        emit ProducerPassStaked(
            msg.sender,
            chapterId,
            voteOptionId,
            amount,
            tokensAllocated
        );
    }

    function unstakeProducerPass(uint256 chapterId, uint256 voteOptionId) public {
        require(!votingEnabledForChapter[chapterId], "Voting is still enabled");
        uint256 stakedProducerPassCount =
            _usersStakedChapterVotingOptionsCount[msg.sender][chapterId][voteOptionId];
        require(stakedProducerPassCount > 0, "No producer passes staked");

        _usersStakedChapterVotingOptionsCount[msg.sender][chapterId][voteOptionId] = 0;
        documentaryProducerPass.safeTransferFrom(
            address(this),
            msg.sender,
            chapterId,
            stakedProducerPassCount,
            ""
        );
        emit ProducerPassUnstaked(
            msg.sender,
            chapterId,
            voteOptionId
        );
    }

    function getTokenAllocationForStaking(
        uint256 chapterId,
        uint256 amount
    ) public view returns (uint256) {
        ProducerPass memory pass = documentaryProducerPass
            .getChapterToProducerPass(chapterId);

        return 10 * amount;
        // uint256 maxSupply = pass.maxSupply;
        // uint256 totalSupply = documentaryToken.totalSupply();
        // return (amount * totalSupply) / maxSupply;
    }
}