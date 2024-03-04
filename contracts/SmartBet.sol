// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SmartBet {
    struct User {
        address addr;
        uint balance;
        bool isBanned;
    }

    struct Match {
        uint id;
        string team1;
        string team2;
        uint date; // Timestamp de la date/heure du match
        uint scoreTeam1;
        uint scoreTeam2;
        bool finished;
    }

    struct Bet {
        address user;
        uint matchId;
        uint predictedScoreTeam1;
        uint predictedScoreTeam2;
        uint amount;
    }

    address public owner;
    uint public entryFee = 0.01 ether;

    // Stockage des utilisateurs, des matchs et des paris
    mapping(address => User) public users;
    Match[] public matches;
    Bet[] public bets;

    // Mapping pour suivre les gains des utilisateurs
        mapping(address => uint) public winnings;

        // Événement pour le retrait des gains
        event WinningsWithdrawn(address user, uint amount);

    // Événements
    event UserRegistered(address userAddr);
    event BetPlaced(address user, uint matchId, uint predictedScoreTeam1, uint predictedScoreTeam2, uint amount);
    event MatchAdded(uint matchId, string team1, string team2, uint date);
    event MatchFinished(uint matchId, uint scoreTeam1, uint scoreTeam2);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Seul l'administrateur peut effectuer cette action.");
        _;
    }

    function registerUser() external {
        require(users[msg.sender].addr == address(0), "Already registered.");
        users[msg.sender] = User(msg.sender, 0, false);
        emit UserRegistered(msg.sender);
    }

    function addMatch(string memory team1, string memory team2, uint date) external onlyOwner {
        matches.push(Match(matches.length, team1, team2, date, 0, 0, false));
        emit MatchAdded(matches.length - 1, team1, team2, date);
    }

    function placeBet(uint matchId, uint predictedScoreTeam1, uint predictedScoreTeam2) external payable {
        require(!users[msg.sender].isBanned, "L'utilisateur est banni.");
        require(msg.value==entryFee, "Le montant dentree est incorrect.");
        require(matchId < matches.length, "Match invalide.");
        require(!matches[matchId].finished, "Le match est deja termine.");
        require(block.timestamp < matches[matchId].date, "Le pari n est plus autorise apres le debut du match.");

        bets.push(Bet(msg.sender, matchId, predictedScoreTeam1, predictedScoreTeam2, msg.value));
        emit BetPlaced(msg.sender, matchId, predictedScoreTeam1, predictedScoreTeam2, msg.value);
    }

    function finishMatch(uint matchId, uint scoreTeam1, uint scoreTeam2) external onlyOwner {
        require(matchId < matches.length, "Match invalide.");
        Match storage match_ = matches[matchId];
        match_.scoreTeam1 = scoreTeam1;
        match_.scoreTeam2 = scoreTeam2;
        match_.finished = true;
        emit MatchFinished(matchId, scoreTeam1, scoreTeam2); 
    }

    function determineWinners(uint matchId, uint scoreTeam1, uint scoreTeam2) internal {
            uint winnerCount = 0;
            uint totalBets = 0;

            // Calculer le total des mises pour ce match
            for (uint i = 0; i < bets.length; i++) {
                if (bets[i].matchId == matchId) {
                    totalBets += bets[i].amount;
                }
            }

            // Identifier les gagnants et compter le nombre de gagnants
            for (uint i = 0; i < bets.length; i++) {
                if (bets[i].matchId == matchId) {
                    if (bets[i].predictedScoreTeam1 == scoreTeam1 && bets[i].predictedScoreTeam2 == scoreTeam2) {
                        winnerCount++;
                    }
                }
            }

            // Si il y a des gagnants, distribuer les gains
            if (winnerCount > 0) {
                uint winningAmount = totalBets / winnerCount;

                for (uint i = 0; i < bets.length; i++) {
                    if (bets[i].matchId == matchId) {
                        if (bets[i].predictedScoreTeam1 == scoreTeam1 && bets[i].predictedScoreTeam2 == scoreTeam2) {
                            winnings[bets[i].user] += winningAmount;
                        }
                    }
                }
            }

            if (winnerCount == 0) {
                (bool success, ) = owner.call{value: totalBets} ("");
                require(success, "Echec.");
            }
    }
   

        // Fonction permettant aux utilisateurs de retirer leurs gains
    function withdrawWinnings() external {
            require(!users[msg.sender].isBanned, "L'utilisateur est banni.");
            uint amount = winnings[msg.sender];
            require(amount > 0, "Pas de gains");

            winnings[msg.sender] = 0; 
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Echec du transfert");
            emit WinningsWithdrawn(msg.sender, amount);
        }


    // Ajout d'un utilisateur par l'administrateur
    function addUser(address userAddress) external onlyOwner {
        require(users[userAddress].addr == address(0), "User already exist");
        users[userAddress] = User(userAddress, 0, false);
        emit UserRegistered(userAddress);
    }

    // Suppression d'un utilisateur par l'administrateur
    function removeUser(address userAddress) external onlyOwner {
        require(users[userAddress].addr != address(0), "L'utilisateur n'existe pas.");
        delete users[userAddress]; // Supprime l'utilisateur du mapping
    }

    // Mise à jour du solde d'un utilisateur par l'administrateur
    function updateUserBalance(address userAddress, uint newBalance) external onlyOwner {
        require(users[userAddress].addr != address(0), "L'utilisateur n'existe pas.");
        users[userAddress].balance = newBalance;
    }

    // Bannir un utilisateur
    function banUser(address userAddress) external onlyOwner {
        require(users[userAddress].addr != address(0), "L'utilisateur n'existe pas.");
        require(!users[userAddress].isBanned, "Already banned banni.");

        users[userAddress].isBanned = true;
    }


}
