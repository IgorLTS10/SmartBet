const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartBet Contract", function () {

    let SmartBet;
    let smartBet;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        // Cette fonction est exécutée avant chaque test
        // Déployer le contrat avant chaque test
        SmartBet = await ethers.getContractFactory("SmartBet");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        smartBet = await SmartBet.deploy();
        await smartBet.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
          expect(await smartBet.owner()).to.equal(owner.address);
        });
      
        it("Should deploy with the correct initial settings", async function () {
          const entryFee = await smartBet.entryFee();
          expect(entryFee).to.equal(ethers.utils.parseEther("0.01"));
        });
      });
      

    describe("Registering Users", function () {
        it("Should register a user successfully", async function () {
            await smartBet.connect(addr1).registerUser();
            const user = await smartBet.users(addr1.address);
            expect(user.addr).to.equal(addr1.address);
        });
    
        it("Should fail if user tries to register twice", async function () {
            await smartBet.connect(addr1).registerUser();
            await expect(smartBet.connect(addr1).registerUser()).to.be.revertedWith("L'utilisateur est déjà enregistré.");
        });
    });    

    describe("Placing Bets", function () {
        beforeEach(async function () {
            // Ajouter un match avant chaque test de pari
            const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp);
            await smartBet.connect(owner).addMatch("Team1", "Team2", matchTime);
        });
    
        it("Should allow users to place a bet on a match", async function () {
            // Enregistrement de l'utilisateur
            await smartBet.connect(addr1).registerUser();
    
            // Placement d'un pari
            const betAmount = ethers.utils.parseEther("0.01");
            await expect(smartBet.connect(addr1).placeBet(0, 1, 2, { value: betAmount }))
                .to.emit(smartBet, 'BetPlaced')
                .withArgs(addr1.address, 0, 1, 2, betAmount);
    
            // Vérifier si le pari est bien enregistré dans le tableau `bets`
            const bet = await smartBet.bets(0);
            expect(bet.user).to.equal(addr1.address);
            expect(bet.matchId).to.equal(0);
            expect(bet.predictedScoreTeam1).to.equal(1);
            expect(bet.predictedScoreTeam2).to.equal(2);
            expect(bet.amount).to.equal(betAmount);
        });
    
        it("Should not allow bets after the match has started", async function () {
            // Essayer de placer un pari après le début du match
            const matchTime = await ethers.provider.getBlock('latest').then(block => block.timestamp) - 10; // 10 secondes dans le passé
            await smartBet.connect(owner).addMatch("Team1", "Team2", matchTime);
    
            const betAmount = ethers.utils.parseEther("0.01");
            await expect(smartBet.connect(addr1).placeBet(1, 1, 2, { value: betAmount }))
                .to.be.revertedWith("Le pari n'est plus autorisé après le début du match.");
        });
    
        it("Should not allow bets with incorrect entry fee", async function () {
            // Essayer de placer un pari avec un montant incorrect
            const incorrectBetAmount = ethers.utils.parseEther("0.005"); // Moitié de l'`entryFee`
            await expect(smartBet.connect(addr1).placeBet(0, 1, 2, { value: incorrectBetAmount }))
                .to.be.revertedWith("Le montant d'entrée est incorrect.");
        });
    
        it("Should not allow banned users to place bets", async function () {
            // Bannir l'utilisateur
            await smartBet.connect(owner).banUser(addr1.address);
    
            // Essayer de placer un pari en tant qu'utilisateur banni
            const betAmount = ethers.utils.parseEther("0.01");
            await expect(smartBet.connect(addr1).placeBet(0, 1, 2, { value: betAmount }))
                .to.be.revertedWith("L'utilisateur est banni.");
        });
    });
    

    describe("Finishing Matches", function () {
        beforeEach(async function () {
            // Ajouter un match avant chaque test
            const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp);
            const matchTime = currentTime + 86400; // Planifier le match pour 1 jour après le temps actuel
            await smartBet.connect(owner).addMatch("Team1", "Team2", matchTime);
        });
    
        it("Should only allow the owner to finish a match", async function () {
            // Essayer de terminer un match en tant que non-propriétaire doit échouer
            await expect(smartBet.connect(addr1).finishMatch(0, 2, 1)).to.be.revertedWith("Seul le propriétaire peut exécuter cette fonction.");
            
            // Terminer un match en tant que propriétaire doit réussir
            await expect(smartBet.connect(owner).finishMatch(0, 2, 1))
                .to.emit(smartBet, 'MatchFinished')
                .withArgs(0, 2, 1);
        });
    
        it("Should correctly record match scores and mark it as finished", async function () {
            await smartBet.connect(owner).finishMatch(0, 2, 1);
            const match = await smartBet.matches(0);
            
            expect(match.scoreTeam1).to.equal(2);
            expect(match.scoreTeam2).to.equal(1);
            expect(match.finished).to.be.true;
        });
    
        it("Should determine winners correctly and update their winnings", async function () {
            // Supposons que addr1 place un pari gagnant
            await smartBet.connect(addr1).registerUser();
            const betAmount = ethers.utils.parseEther("0.01");
            await smartBet.connect(addr1).placeBet(0, 2, 1, { value: betAmount });
    
            // Terminer le match avec le score prédit par addr1
            await smartBet.connect(owner).finishMatch(0, 2, 1);
    
            // Vérifier que les gains d'addr1 ont été mis à jour
            // Cette vérification dépend de votre logique de distribution des gains
            // Par exemple, si les gains sont égaux au montant du pari:
            const winnings = await smartBet.winnings(addr1.address);
            expect(winnings).to.be.above(0); // Assurez-vous que cette logique correspond à votre mécanisme de distribution des gains
        });
    
        it("Should not allow bets to be placed on a finished match", async function () {
            await smartBet.connect(owner).finishMatch(0, 2, 1);
            
            // Essayer de placer un pari après la fin du match doit échouer
            const betAmount = ethers.utils.parseEther("0.01");
            await expect(smartBet.connect(addr1).placeBet(0, 1, 2, { value: betAmount }))
                .to.be.revertedWith("Le match est déjà terminé.");
        });
    
        // Ajoutez d'autres tests selon les besoins pour couvrir tous les scénarios et chemins de code de cette fonctionnalité
    });
    

    describe("Withdrawing Winnings", function () {
        beforeEach(async function () {
            // Ajouter et terminer un match avec un résultat connu
            const currentTime = await ethers.provider.getBlock('latest').then(block => block.timestamp);
            const matchTime = currentTime + 86400; // Planifier le match pour 1 jour après le temps actuel pour éviter les erreurs de pari
            await smartBet.connect(owner).addMatch("Team1", "Team2", matchTime);
    
            // Simuler un pari gagnant
            await smartBet.connect(addr1).registerUser();
            const betAmount = ethers.utils.parseEther("0.01");
            await smartBet.connect(addr1).placeBet(0, 2, 1, { value: betAmount });
    
            // Terminer le match avec le score sur lequel addr1 a parié
            await smartBet.connect(owner).finishMatch(0, 2, 1);
    
            // Supposons que addr1 est le seul gagnant pour simplifier, ajustez selon votre logique de détermination des gagnants
        });
    
        it("Should allow winners to withdraw their winnings", async function () {
            // Le solde initial d'addr1 avant le retrait
            const initialBalance = await addr1.getBalance();
    
            // Retirer les gains
            const tx = await smartBet.connect(addr1).withdrawWinnings();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    
            // Le solde d'addr1 après le retrait, en ajustant les coûts du gaz
            const finalBalance = await addr1.getBalance();
    
            // Vérifier que le solde final est supérieur au solde initial, en tenant compte du coût du gaz
            expect(finalBalance.add(gasUsed)).to.be.above(initialBalance);
    
            // Vérifier que les gains d'addr1 dans le contrat sont réinitialisés à 0
            const winnings = await smartBet.winnings(addr1.address);
            expect(winnings).to.equal(0);
        });
    
        it("Should not allow users with no winnings to withdraw", async function () {
            // Tenter de retirer sans gains devrait échouer
            await expect(smartBet.connect(addr2).withdrawWinnings()).to.be.revertedWith("Pas de gains à retirer");
        });
    
        it("Should not allow banned users to withdraw winnings", async function () {
            // Bannir l'utilisateur
            await smartBet.connect(owner).banUser(addr1.address);
    
            // Essayer de retirer en tant qu'utilisateur banni
            await expect(smartBet.connect(addr1).withdrawWinnings()).to.be.revertedWith("L'utilisateur est banni.");
        });

        it("Should not allow users to withdraw winnings before the match is finished", async function () {
            // Essayer de retirer avant la fin du match
            await expect(smartBet.connect(addr1).withdrawWinnings()).to.be.revertedWith("Le match n'est pas encore terminé.");
        });
    });

    describe("Updating User Balance", function () {
        it("Should allow the owner to update a user's balance", async function () {
            // Enregistrement d'un utilisateur
            await smartBet.connect(addr1).registerUser();
    
            // Mise à jour du solde de l'utilisateur par l'administrateur
            const newBalance = ethers.utils.parseEther("1");
            await expect(smartBet.connect(owner).updateUserBalance(addr1.address, newBalance))
                .to.emit(smartBet, 'UserBalanceUpdated')
                .withArgs(addr1.address, newBalance);
    
            const user = await smartBet.users(addr1.address);
            expect(user.balance).to.equal(newBalance);
        });
    
        it("Should only allow the owner to update user balances", async function () {
            await expect(smartBet.connect(addr1).updateUserBalance(addr2.address, 1000))
                .to.be.revertedWith("Seul le propriétaire peut exécuter cette fonction.");
        });
    });

    describe("Banning Users", function () {
        it("Should allow the owner to ban a user", async function () {
            // Enregistrement d'un utilisateur
            await smartBet.connect(addr1).registerUser();
    
            // Bannir l'utilisateur par l'administrateur
            await expect(smartBet.connect(owner).banUser(addr1.address))
                .to.emit(smartBet, 'UserBanned')
                .withArgs(addr1.address);
    
            const user = await smartBet.users(addr1.address);
            expect(user.isBanned).to.be.true;
        });
    
        it("Should only allow the owner to ban users", async function () {
            await expect(smartBet.connect(addr1).banUser(addr2.address))
                .to.be.revertedWith("Seul le propriétaire peut exécuter cette fonction.");
        });
    });

    describe("Removing Users", function () {
        it("Should allow the owner to remove a user", async function () {
            // Enregistrement d'un utilisateur
            await smartBet.connect(addr1).registerUser();
    
            // Suppression de l'utilisateur par l'administrateur
            await smartBet.connect(owner).removeUser(addr1.address);
    
            const user = await smartBet.users(addr1.address);
            expect(user.addr).to.equal(ethers.constants.AddressZero); // Vérifie si l'adresse de l'utilisateur est réinitialisée
        });
    
        it("Should only allow the owner to remove users", async function () {
            await expect(smartBet.connect(addr1).removeUser(addr2.address))
                .to.be.revertedWith("Seul le propriétaire peut exécuter cette fonction.");
        });
    });
    
    describe("Adding Matches", function () {
        it("Should allow the owner to add a match", async function () {
            await expect(smartBet.connect(owner).addMatch("Team1", "Team2", matchTime))
                .to.emit(smartBet, 'MatchAdded')
                .withArgs(0, "Team1", "Team2", matchTime);
    
            const match = await smartBet.matches(0);
            expect(match.team1).to.equal("Team1");
            expect(match.team2).to.equal("Team2");
            expect(match.date).to.equal(matchTime);
        });
    
        it("Should only allow the owner to add matches", async function () {
            await expect(smartBet.connect(addr1).addMatch("Team1", "Team2", matchTime))
                .to.be.revertedWith("Seul le propriétaire peut exécuter cette fonction.");
        });
    });
    
    
    
});

