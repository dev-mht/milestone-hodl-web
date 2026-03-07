/**
 * MHT DASHBOARD - V2.4 (OpenZeppelin v5.0 Compatible)
 */
const contractAddress = "0xAda33C64977cF1813a9aE8778a3c65b31AfC7e75"; // <--- COPIE L'ADRESSE ICI
const contractABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function claimRewards() public",
    "function vaultBalance() view returns (uint256)",
    "function nextMilestoneUSD() view returns (uint256)",
    "function milestoneRewardPerToken() view returns (uint256)",
    "function userRewardPerTokenPaid(address) view returns (uint256)",
    "function rewards(address) view returns (uint256)"
];

let provider, signer, contract;

async function init() {
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        contract = new ethers.Contract(contractAddress, contractABI, signer);
        const address = await signer.getAddress();
        refreshData(address);
    }
}

async function refreshData(address) {
    try {
        // 1. Solde
        const balance = await contract.balanceOf(address);
        document.getElementById('balanceText').innerText = 
            parseFloat(ethers.utils.formatEther(balance)).toLocaleString() + " MHT";

        // 2. Calcul des Rewards (v5.0 Logic)
        const pending = await contract.rewards(address);
        const rewardPerToken = await contract.milestoneRewardPerToken();
        const paid = await contract.userRewardPerTokenPaid(address);
        const latent = balance.mul(rewardPerToken.sub(paid)).div(ethers.utils.parseEther("1"));
        const total = pending.add(latent);

        const btn = document.getElementById('btnClaim');
        if (total.gt(0)) {
            btn.innerHTML = `Claim ${parseFloat(ethers.utils.formatEther(total)).toFixed(2)} MHT`;
            btn.disabled = false;
        } else {
            btn.innerHTML = "No Rewards Yet";
            btn.disabled = true;
        }

        // 3. Milestone Progress
        const vault = await contract.vaultBalance();
        const nextTarget = await contract.nextMilestoneUSD();
        // Simule une barre à 35% si aucun milestone n'est passé
        const progress = vault.lt(ethers.utils.parseEther("500000000")) ? 100 : 35;
        document.getElementById('milestoneBar').style.width = progress + "%";
        
    } catch (e) { console.error("Sync Error:", e); }
}

init();
