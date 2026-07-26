// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ArcFoundationTest {
    string public message = "Hello Arc";

    function setMessage(string calldata newMessage) external {
        message = newMessage;
    }
}
