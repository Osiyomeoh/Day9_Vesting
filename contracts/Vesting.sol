pragma solidity ^0.8.0;

contract Vesting {
    address public beneficiary;
    uint256 public lockupDuration;
    uint256 public start;
    uint256 public duration;
    uint256 public totalAmount;
    uint256 public released;

    constructor(
        address _beneficiary,
        uint256 _start,
        uint256 _lockupDuration,
        uint256 _duration
    ) {
        require(_beneficiary != address(0), "Beneficiary is zero address");
        require(_lockupDuration <= _duration, "Lockup is longer than duration");
        require(_duration > 0, "Duration is 0");

        beneficiary = _beneficiary;
        start = _start;
        lockupDuration = _lockupDuration;
        duration = _duration;
    }

    function deposit() public payable {
        totalAmount += msg.value;
    }

    function release() public {
        uint256 unreleased = releasableAmount();
        require(unreleased > 0, "No Ether is due");

        released += unreleased;
        payable(beneficiary).transfer(unreleased);
    }

    function releasableAmount() public view returns (uint256) {
        return vestedAmount() - released;
    }

    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < start + lockupDuration) {
            return 0;
        } else if (block.timestamp >= start + duration) {
            return totalAmount;
        } else {
            return (totalAmount * (block.timestamp - start)) / duration;
        }
    }

    // Function to check the contract's Ether balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
