// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

struct DocumentaryPass {
    uint256 price;
    uint256 chapterId;
    uint256 maxSupply;
    uint256 maxPerWallet;
}

contract DocumentaryPassToken is ERC1155, ERC1155Supply, Ownable {
    using Strings for uint256;

    // Event emitted when a Producer Pass is bought
    event DocumentaryPassBought(
        uint256 chapterId,
        address indexed account,
        uint256 amount
    );

    address payable public creator;

    // A mapping of the number of Producer Passes minted per chapterId per user
    // userPassesMintedPerChapterId[msg.sender][chapterId] => number of minted passes
    mapping(address => mapping(uint256 => uint256)) private userPassesMintedPerChapterId;

    // A mapping from chapterId to its Producer Pass
    mapping(uint256 => DocumentaryPass) private chapterToDocumentaryPass;

    constructor(string memory baseURI) ERC1155(baseURI) {}

    /**
     * @dev Retrieves the Producer Pass for a given chapter.
     */
    function getChapterToDocumentaryPass(uint256 chapterId)
        external
        view
        returns (DocumentaryPass memory)
    {
        return chapterToDocumentaryPass[chapterId];
    }

    function documentaryPass (
        uint256 chapterId
    ) external view returns (uint256, uint256, uint256, uint256) {
        DocumentaryPass memory pass = chapterToDocumentaryPass[chapterId];
        return (pass.price, pass.chapterId, pass.maxSupply, pass.maxPerWallet);
    }

    /**
     * @dev Retrieves the number of Producer Passes a user has minted by chapterId.
     */
    function userPassesMintedByChapterId(uint256 chapterId)
        external
        view
        returns (uint256)
    {
        return userPassesMintedPerChapterId[msg.sender][chapterId];
    }

    /**
     * @dev Contracts the metadata URI for the Producer Pass of the given chapterId.
     *
     * Requirements:
     *
     * - The Producer Pass exists for the given chapter
     */
    function uri(uint256 chapterId)
        public
        view
        override
        returns (string memory)
    {
        require(
            chapterToDocumentaryPass[chapterId].chapterId != 0,
            "Invalid chapter"
        );
        return
            string(
                abi.encodePacked(
                    super.uri(chapterId),
                    chapterId.toString(),
                    ".json"
                )
            );
    }

    /**
     * @dev Sets the base URI for the Producer Pass metadata.
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _setURI(baseURI);
    }

    /**
     * @dev Sets the parameters on the Producer Pass struct for the given chapter.
     */
    function setDocumentaryPass(
        uint256 price,
        uint256 chapterId,
        uint256 maxSupply,
        uint256 maxPerWallet
    ) external onlyOwner {
        chapterToDocumentaryPass[chapterId] = DocumentaryPass(
            price,
            chapterId,
            maxSupply,
            maxPerWallet
        );
    }

    function setCreator(address _creator) external {
        creator = payable(_creator);
    }

    /**
     * @dev Mints a set number of Producer Passes for a given chapter.
     *
     * Emits a `DocumentaryPassBought` event indicating the Producer Pass was minted successfully.
     *
     * Requirements:
     *
     * - There are Producer Passes available to mint for the given chapter
     * - The user is not trying to mint more than the maxSupply
     * - The user is not trying to mint more than the maxPerWallet
     * - The user has enough ETH for the transaction
     */
    function mintDocumentaryPass(uint256 chapterId, uint256 amount)
        external
        payable
    {
        DocumentaryPass memory pass = chapterToDocumentaryPass[chapterId];
        require(totalSupply(chapterId) < pass.maxSupply, "Sold out");
        require(
            totalSupply(chapterId) + amount <= pass.maxSupply,
            "Cannot mint that many"
        );

        uint256 totalMintedPasses = userPassesMintedPerChapterId[msg.sender][
            chapterId
        ];
        require(
            totalMintedPasses + amount <= pass.maxPerWallet,
            "Exceeding maximum per wallet"
        );
        require(msg.value == pass.price * amount, "Not enough eth");

        userPassesMintedPerChapterId[msg.sender][chapterId] =
            totalMintedPasses +
            amount;
        _mint(msg.sender, chapterId, amount, "");
        emit DocumentaryPassBought(chapterId, msg.sender, amount);
    }

    function withdraw() external onlyOwner {
        bool success;

        (success, ) = creator.call{value: address(this).balance}("");
        require(success, "Withdraw unsuccessful");
    }

    /**
     * @dev Boilerplate override for `_beforeTokenTransfer`
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}
