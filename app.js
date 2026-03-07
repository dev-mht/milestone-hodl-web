// Configuration des éléments HTML
const btnConnect = document.getElementById('btn-connect');
const statusText = document.getElementById('status-text');

// 1. Initialisation de WalletConnect (Remplacer PROJECT_ID par le tien plus tard)
// Pour l'instant, on utilise un provider standard
async function connectWallet() {
    
    // CAS A : L'utilisateur a une extension (MetaMask, Rabby, etc.)
    if (window.ethereum) {
        try {
            statusText.innerText = "Connexion en cours...";
            
            // Demande la connexion
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            // Vérification du réseau (Force la BNB Chain)
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== '0x38') { // 0x38 = 56 (BNB Chain)
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x38' }],
                    });
                } catch (switchError) {
                    // Si le réseau n'est pas configuré, on propose de l'ajouter
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x38',
                                chainName: 'BNB Smart Chain',
                                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                                blockExplorerUrls: ['https://bscscan.com/']
                            }]
                        });
                    }
                }
            }

            displaySuccess(account);

        } catch (error) {
            console.error("Erreur ou refus de connexion", error);
            statusText.innerText = "Connexion annulée";
        }
    } 
    
    // CAS B : Pas d'extension (Mobile ou Navigateur sans Wallet) -> ON LANCE LE QR CODE
    else {
        launchWalletConnect();
    }
}

// Fonction pour WalletConnect (Génère le QR Code)
async function launchWalletConnect() {
    // Note : On utilise ici la librairie Web3Modal (Standard 2026)
    // Cela ouvre une fenêtre avec un QR Code automatiquement
    alert("Ouverture du QR Code WalletConnect... Scannez avec votre mobile.");
    
    // Ici, le SDK Web3Modal prend le relais pour afficher la modale
    // (Nécessite l'intégration des scripts CDN dans le HTML)
}

function displaySuccess(account) {
    const shortAddr = account.substring(0, 6) + "..." + account.substring(account.length - 4);
    statusText.innerText = "Connecté : " + shortAddr;
    statusText.className = "h6 fw-bold text-success";
    btnConnect.innerHTML = '<i class="bi bi-check-circle me-2"></i>Connected';
    btnConnect.classList.replace('btn-primary', 'btn-success');
}

btnConnect.addEventListener('click', connectWallet);

// Écouteur de changement de compte (si l'utilisateur change dans MetaMask)
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) displaySuccess(accounts[0]);
        else location.reload();
    });
}
