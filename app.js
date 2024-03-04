const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
// Demander à l'utilisateur de se connecter à son portefeuille MetaMask
provider.send("eth_requestAccounts", []).then(() => {
    console.log("User connected");
}).catch((err) => {
    console.error(err);
});

const signer = provider.getSigner();
const contractAddress = ""; // Remplacez par l'adresse de votre contrat déployé
const contractABI = require('./artifacts/contracts/SmartBet.sol').abi;
const smartBetContract = new ethers.Contract(contractAddress, contractABI, signer);

document.getElementById("register").addEventListener("click", function() {
    smartBetContract.registerUser()
        .then((tx) => {
            console.log("Register transaction:", tx);
        }).catch((err) => {
            console.error(err);
        });
});

document.getElementById("placeBet").addEventListener("click", function() {
    // Remplacez les valeurs par celles appropriées pour votre fonction `placeBet`
    const matchId = 0; // Exemple
    const predictedScoreTeam1 = 1; // Exemple
    const predictedScoreTeam2 = 2; // Exemple
    const options = {value: ethers.utils.parseEther("0.01")}; // Exemple

    smartBetContract.placeBet(matchId, predictedScoreTeam1, predictedScoreTeam2, options)
        .then((tx) => {
            console.log("Place Bet transaction:", tx);
        }).catch((err) => {
            console.error(err);
        });
});

document.getElementById("withdrawWinnings").addEventListener("click", function() {
    smartBetContract.withdrawWinnings()
        .then((tx) => {
            console.log("Withdraw Winnings transaction:", tx);
        }).catch((err) => {
            console.error(err);
        });
});

