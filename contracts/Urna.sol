// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract Urna is Ownable {
    // OZ v5: é obrigatório passar o owner ao Ownable
    constructor() {}

    enum ElectionState {
        NotStarted,
        Registering,
        Voting,
        Ended
    }
    ElectionState public currentElectionState;

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    struct Voter {
        address walletAddress;
        bool isRegistered;
        bool hasVoted;
    }

    using Counters for Counters.Counter;
    Counters.Counter private _nextCandidateId;

    mapping(uint => Candidate) public candidates;
    uint[] public candidateIds;

    mapping(address => Voter) public voters;

    uint public votingStartTime;
    uint public votingEndTime;

    event VoterRegistered(address indexed _voterAddress);
    event CandidateAdded(uint indexed _candidateId, string _name);
    event VotingPeriodSet(uint _startTime, uint _endTime);

    // Helper de estado
    modifier whenState(ElectionState s) {
        require(currentElectionState == s, "Estado invalido");
        _;
    }

    // ADMIN: registro de votantes durante Registering
    function registerVoter(
        address _voterAddress
    ) public onlyOwner whenState(ElectionState.Registering) {
        require(_voterAddress != address(0), "Endereco invalido do votante");
        require(
            !voters[_voterAddress].isRegistered,
            "Votante ja foi registrado"
        );

        voters[_voterAddress] = Voter({
            walletAddress: _voterAddress,
            isRegistered: true,
            hasVoted: false
        });

        emit VoterRegistered(_voterAddress);
    }

    // ADMIN: adiciona candidatos durante Registering
    function addCandidate(
        string memory _name
    ) public onlyOwner whenState(ElectionState.Registering) {
        require(bytes(_name).length > 0, "Nome do candidato vazio");

        _nextCandidateId.increment();
        uint newId = _nextCandidateId.current();
        candidates[newId] = Candidate(newId, _name, 0);
        candidateIds.push(newId);

        emit CandidateAdded(newId, _name);
    }

    // ADMIN: definir periodo antes de abrir a votacao
    function setVotingPeriod(
        uint _startTime,
        uint _endTime
    ) public onlyOwner whenState(ElectionState.NotStarted) {
        require(_startTime >= block.timestamp, "Start must be in the future");
        require(_endTime > _startTime, "End must be after start");

        votingStartTime = _startTime;
        votingEndTime = _endTime;

        emit VotingPeriodSet(_startTime, _endTime);
    }

    // Helpers de leitura
    function candidatesCount() public view returns (uint) {
        return candidateIds.length;
    }
}
