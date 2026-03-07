/**
 * MHT . MILESTONE HODL TOKEN - Dashboard Logic
 * Version: 2.3 (1M Milestone & Smart Detection)
 */

// --- 1. CONFIGURATION ---
const contractAddress = "0xe9EBc45CdE442e6f88300AC09A9aaD2c05DDC93c";
const BSC_TESTNET_ID = 97; 
const EXPLORER_URL = "https://testnet.bscscan.com/tx/";

const tokenSymbol = "MHT";
const tokenDecimals = 18;
const tokenImage = "https://votre-site.com/logo.png"; 

const contractABI = [
    "function claimRewards() public", // Correction selon ton contrat Solidity
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function vaultBalance() view returns (uint256)"
];

const btnConnect = document.getElementById('connectWalletBtn');
const statusAccount = document.querySelector('.wallet-card span.text-danger');
const balanceText = document.querySelector('.wallet-col .wallet-card:nth-child(2) span');
const btnClaim = document.querySelector('.btn-claim');

let provider;
let signer;

// --- 2. INITIALISATION WEB3MODAL ---
const providerOptions = {
  injected: {
    display: {
      logo: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Logo.svg",
      name: "MetaMask",
      description: "Connect to your Browser Wallet"
    },
    package: null
  },
  walletconnect: {
    package: window.WalletConnectProvider.default,
    options: {
      rpc: { 97: "https://data-seed-prebsc-1-s1.binance.org:8545/" }
    }
  }
};

const web3Modal = new Web3Modal.default({
  cacheProvider: false,
  theme: "dark",
  providerOptions
});

// --- 3. CONNEXION AVEC DÉTECTION AUTO ---
async function connectWallet() {
    try {
        // Détection si aucune extension n'est présente
        if (!window.ethereum) {
            const install = confirm("Aucun portefeuille détecté. Voulez-vous installer MetaMask ?");
            if (install) {
                window.open('https://metamask.io/download/', '_blank');
                return;
            }
        }

        const instance = await web3Modal.connect();
        provider = new ethers.providers.Web3Provider(instance);
        
        const { chainId } = await provider.getNetwork();
        if (chainId !== BSC_TESTNET_ID) {
            try {
                await instance.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: "0x61" }], 
                });
            } catch (err) {
                alert("Veuillez basculer sur le réseau BSC Testnet.");
                return;
            }
        }

        signer = provider.getSigner();
        const address = await signer.getAddress();
        
        updateUI(address);
        refreshBlockchainData(address);

        instance.on("accountsChanged", () => window.location.reload());
        instance.on("chainChanged", () => window.location.reload());

    } catch (error) {
        console.error("Connexion annulée");
    }
}

// --- 4. LOGIQUE BLOCKCHAIN & MILESTONE 1M ---
async function refreshBlockchainData(address) {
    try {
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const balance = await contract.balanceOf(address);
        const formattedBalance = ethers.utils.formatUnits(balance, 18);
        if (balanceText) {
            balanceText.innerText = parseFloat(formattedBalance).toLocaleString() + " MHT";
        }
        updateMilestoneUI(contract);
    } catch (e) {
        console.log("Erreur lecture balance:", e);
    }
}

async function updateMilestoneUI(contract) {
    try {
        const vaultBal = await contract.vaultBalance(); // Utilise la variable du contrat
        const totalInitialVault = 500000000; // 500M
        const remaining = parseFloat(ethers.utils.formatUnits(vaultBal, 18));
        
        // Calcul pour palier de 1M (libère 5M par palier)
        const released = totalInitialVault - remaining;
        const milestonesReached = Math.floor(released / 5000000);
        
        // Simulation du progrès vers le prochain million (pour le test visuel)
        // En réel, ce sera basé sur le prix. Ici on affiche le palier actuel.
        const progressBar = document.getElementById('milestoneBar');
        const milestoneStatus = document.getElementById('milestoneStatus');
        
        if (progressBar) {
            // Calcul visuel : on montre le remplissage vers le prochain million
            // Pour le test, on met 35% par défaut si 0 milestones
            let displayPercent = milestonesReached > 0 ? (milestonesReached * 10) % 100 : 35; 
            if (displayPercent === 0 && milestonesReached > 0) displayPercent = 100;

            progressBar.style.width = `${displayPercent}%`;
            progressBar.innerText = `$${(milestonesReached * 0.35).toFixed(1)}M / $${(milestonesReached + 1)}M`;
        }
        
        if (milestoneStatus) {
            milestoneStatus.innerText = `${milestonesReached} Milestone(s) Achieved!`;
        }
    } catch (err) {
        console.error("Erreur UI Milestone:", err);
    }
}

// --- 5. CLAIM & ADD TOKEN ---
async function claimRewards() {
    if (!signer) return alert("Veuillez connecter votre wallet.");
    
    try {
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        btnClaim.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Transaction...`;
        btnClaim.disabled = true;

        // Appel de la fonction claimRewards (nom exact dans ton Solidity)
        const tx = await contract.claimRewards();
        alert(`Transaction envoyée ! Suivez-la ici :\n${EXPLORER_URL}${tx.hash}`);

        await tx.wait();
        alert("Bravo ! Vos récompenses sont arrivées.");
        addTokenToWallet();
        window.location.reload();

    } catch (error) {
        btnClaim.innerHTML = `<i class="bi bi-gift me-2"></i>Claim Rewards`;
        btnClaim.disabled = false;
        alert("Erreur : " + (error.data?.message || error.message));
    }
}

async function addTokenToWallet() {
    if (!window.ethereum) return;
    try {
        await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: contractAddress,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals,
                    image: tokenImage,
                },
            },
        });
    } catch (error) { console.log("Refusé"); }
}

// --- 6. UI ---
function updateUI(address) {
    const shortAddr = address.substring(0, 6) + "..." + address.substring(address.length - 4);
    btnConnect.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> ${shortAddr}`;
    if (statusAccount) {
        statusAccount.innerText = "Connected (BSC Testnet)";
        statusAccount.className = "fw-bold text-success";
    }
}

btnConnect.addEventListener('click', connectWallet);
if (btnClaim) btnClaim.onclick = claimRewards;

window.addEventListener('load', () => {
    const publicProvider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/");
    const contract = new ethers.Contract(contractAddress, contractABI, publicProvider);
    updateMilestoneUI(contract);
});
