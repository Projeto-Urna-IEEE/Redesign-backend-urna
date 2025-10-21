// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Urna.sol";

contract Eleicao is Urna {
    event StateChanged(ElectionState previous, ElectionState next);
    event Voted(address indexed voter, uint indexed candidateId);

    modifier duringVoting() {
        require(
            currentElectionState == ElectionState.Voting,
            "Votacao inativa"
        );
        require(
            block.timestamp >= votingStartTime &&
                block.timestamp < votingEndTime,
            "Fora do periodo de votacao"
        );
        _;
    }

    constructor() {
        // Inicia sem eleicao em andamento
        currentElectionState = ElectionState.NotStarted;
        // owner = msg.sender vem de Ownable (já definido em Urna)
    }

    // --- ADMIN: fluxo de estados ---
    function openRegistering()
        external
        onlyOwner
        whenState(ElectionState.NotStarted)
    {
        _setState(ElectionState.Registering);
    }

    function closeRegistering()
        external
        onlyOwner
        whenState(ElectionState.Registering)
    {
        // Fecha registro e volta para NotStarted para permitir definir periodo
        _setState(ElectionState.NotStarted);
    }

    function openVoting()
        external
        onlyOwner
        whenState(ElectionState.NotStarted)
    {
        require(
            votingStartTime != 0 && votingEndTime != 0,
            "Periodo nao definido"
        );
        require(block.timestamp >= votingStartTime, "Ainda nao comecou");
        require(block.timestamp < votingEndTime, "Periodo expirado");

        _setState(ElectionState.Voting);
    }

    function closeVoting() external onlyOwner whenState(ElectionState.Voting) {
        require(block.timestamp >= votingEndTime, "Aguarde o fim");
        _setState(ElectionState.Ended);
    }

    // --- VOTO ---
    function vote(
        address _voterAddress, // <--- 1. Recebe o endereço do eleitor
        uint _candidateId
    ) external duringVoting onlyOwner {
        // <--- 2. Protegida por onlyOwner

        Voter storage v = voters[_voterAddress]; // <--- 3. Usa o endereço do eleitor
        require(v.isRegistered, "Eleitor nao registrado");
        require(!v.hasVoted, "Eleitor ja votou");
        require(candidates[_candidateId].id != 0, "Candidato invalido");

        v.hasVoted = true;
        candidates[_candidateId].voteCount += 1;

        emit Voted(_voterAddress, _candidateId); // <--- 4. Emite o endereço do eleitor
    }

    // --- Utils ---
    function _setState(ElectionState next) internal {
        ElectionState prev = currentElectionState;
        currentElectionState = next;
        emit StateChanged(prev, next);
    }

    // Ganhador simples (garante ao menos 1 candidato)
    function winner()
        external
        view
        whenState(ElectionState.Ended)
        returns (uint id, string memory name, uint votes)
    {
        require(candidateIds.length > 0, "Sem candidatos");
        uint bestVotes;
        uint bestId;
        for (uint i = 0; i < candidateIds.length; i++) {
            uint cid = candidateIds[i];
            uint vc = candidates[cid].voteCount;
            if (vc > bestVotes) {
                bestVotes = vc;
                bestId = cid;
            }
        }
        Candidate storage c = candidates[bestId];
        return (c.id, c.name, c.voteCount);
    }

    function getTotalCandidates() public view returns (uint) {
        require(
            currentElectionState == ElectionState.Ended,
            "Eleicao nao acabou"
        );

        return candidateIds.length;
    }

    function getVotesCount(uint _candidateId) public view returns (uint) {
        require(
            currentElectionState == ElectionState.Ended,
            "Eleicao nao acabou"
        );
        require(candidates[_candidateId].id != 0, "Candidato invalido");

        return candidates[_candidateId].voteCount;
    }
}
