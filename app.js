const btnConnect = document.getElementById('btn-connect');
const statusText = document.getElementById('status-text');

// Fonction pour se connecter (compatible multi-wallets)
async function connectWallet() {
    if (window.ethereum) {
        try {
            // Si plusieurs portefeuilles sont installés, ceci permet souvent de redemander le choix
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts',
                params: [{ forceResync: true }] 
            });
            
            const account = accounts[0];
            statusText.innerText = "Connecté : " + account.substring(0, 6) + "..." + account.substring(account.length - 4);
            statusText.className = "h6 fw-bold text-success";
            btnConnect.innerHTML = '<i class="bi bi-check-circle me-2"></i>Connecté';
            
        } catch (error) {
            console.error("Connexion annulée ou refusée");
        }
    } else {
        // Option WalletConnect (Redirection vers une solution universelle)
        if(confirm("Aucun portefeuille détecté sur le navigateur. Voulez-vous utiliser WalletConnect pour scanner un QR Code ?")) {
            window.open("https://bridge.walletconnect.org", "_blank"); 
            // Note : Pour un vrai QR Code intégré, il faudra passer par un SDK pro plus tard.
        }
    }
}

btnConnect.addEventListener('click', connectWallet);
