# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
A chaque déploiement du contrat, il faut ajouter l'adresse du contrat sur la ligne suivante: 
const contractABI = require('./path/to/SmartBet.json').abi;
Afin que l'interface utilisateur fonctionne