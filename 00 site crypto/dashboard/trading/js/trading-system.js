// ===== TRADINGVIEW/TRADING-SYSTEM.JS - VERSION CORRIGÉE =====
// ===== ATTENDRE FIREBASE =====
function waitForFirebase() {
  return new Promise((resolve) => {
    if (typeof firebase !== 'undefined' && window.firebaseAuth && window.firebaseDb) {
      resolve();
    } else {
      setTimeout(() => waitForFirebase().then(resolve), 500);
    }
  });
}


// ===== AUTO-DÉMARRAGE AVEC FIREBASE AUTH =====
function initTradingAuth() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('👤 Utilisateur Firebase connecté:', user.email);
            } else {
                console.log('❌ Utilisateur non connecté, redirection...');
                window.location.href = '../../index.html';
            }
        });
    } else {
        console.log('⚠️ Firebase non disponible');
    }
}

// Démarrer l'auth au chargement
document.addEventListener('DOMContentLoaded', initTradingAuth);

// ===== VARIABLES GLOBALES =====
let tradingViewWidget = null;
let currentSymbol = 'BINANCE:BTCUSDT';
let currentPrice = 0;
let priceUpdateInterval = null;
let portfolioUpdateInterval = null;
let selectedCrypto = 'BTCUSDT';

// Configuration des cryptos disponibles
const AVAILABLE_CRYPTOS = {
  'BTCUSDT': { 
    name: 'Bitcoin', 
    symbol: 'BTC', 
    icon: '₿', 
    color: '#f7931a',
    minOrder: 0.0001
  },
  'ETHUSDT': { 
    name: 'Ethereum', 
    symbol: 'ETH', 
    icon: 'Ξ', 
    color: '#627eea',
    minOrder: 0.001
  },
  'SOLUSDT': { 
    name: 'Solana', 
    symbol: 'SOL', 
    icon: '◎', 
    color: '#9945ff',
    minOrder: 0.01
  },
  'ADAUSDT': { 
    name: 'Cardano', 
    symbol: 'ADA', 
    icon: '₳', 
    color: '#0033ad',
    minOrder: 1
  },
  'DOGEUSDT': { 
    name: 'Dogecoin', 
    symbol: 'DOGE', 
    icon: 'Ð', 
    color: '#c2a633',
    minOrder: 10
  }
};

// Options de levier disponibles
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];

// Système de trading virtuel avec levier
const VirtualTrading = {
  // Portfolio initial
  portfolio: {
    balance: 500, // 500$ de départ
    cryptos: {},
    totalValue: 500,
    pnl: 0,
    pnlPercent: 0,
    margin: 0, // Marge utilisée
    availableMargin: 500 // Marge disponible
  },
  
  // Positions ouvertes (pour le levier)
  positions: null,
  
  // Historique des trades
  trades: null,
  
  // Prix en cache
  prices: {},
  

  
async init() {  
  // Initialiser les tableaux s'ils sont null
  if (this.positions === null) this.positions = [];
  if (this.trades === null) this.trades = [];
  
  // Charger localStorage d'abord
  this.loadFromStorage();
  
  // FORCER le chargement Firebase MAINTENANT
  if (window.firebaseAuth?.currentUser && window.firebaseDb) {
    try {
      const userDoc = await window.firebaseDb.collection('users').doc(window.firebaseAuth.currentUser.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
      if (data.positions && Array.isArray(data.positions)) {
        this.positions = data.positions;
      }

      if (data.trades && Array.isArray(data.trades)) {
        this.trades = data.trades;
      }

      if (typeof data.portfolio === 'number' && data.portfolio >= 0) {
       
      }
      }
    } catch (error) {
      console.error('❌ Erreur Firebase:', error);
    }
  }
  
  // AFFICHER IMMÉDIATEMENT
  this.updatePortfolioValue();
  this.updatePositionsDisplay();
  this.updateTradeHistory();
  this.checkMissedTPSL();

  // Déclencher l'événement pour le dashboard
  window.dispatchEvent(new CustomEvent('cryptoPriceUpdate'));
  
  await this.syncWithDashboard();
  this.startPriceTracking();
  this.startRealtimeSync();
  this.updatePrices24h();
},

startRealtimeSync() {
    console.log('🔄 Sync Firebase temporairement désactivé');
    return;
},
  
  // Sauvegarder dans localStorage
  saveToStorage() {
    try {
      const data = {
        portfolio: this.portfolio,
        positions: this.positions.slice(-50),
        trades: this.trades.slice(-100),
        lastUpdate: Date.now()
      };
      localStorage.setItem('cryptotraders_portfolio', JSON.stringify(data));
    } catch (error) {
      console.log('⚠️ Sauvegarde localStorage bloquée');
    }
  },

  loadFromStorage() {
  try {
    const data = localStorage.getItem('cryptotraders_portfolio');
    if (data) {
      const parsed = JSON.parse(data);
      this.portfolio = { ...this.portfolio, ...parsed.portfolio };
      this.positions = parsed.positions || [];
      this.trades = parsed.trades || [];
    }
  } catch (error) {
  }
},


async loadFromFirebase() {
  if (!window.currentUser || !window.firebaseAuth || !window.firebaseAuth.currentUser) {
    console.log('🔥 Pas d\'utilisateur connecté');
    return;
  }
  
  try {
    const userDoc = await window.firebaseDb.collection('users').doc(window.firebaseAuth.currentUser.uid).get();
    
    if (userDoc.exists) {
      const data = userDoc.data();
      
      // CHARGER LES DONNÉES FIREBASE
      if (data.positions && Array.isArray(data.positions)) {
        this.positions = data.positions;
      }
      
      if (data.trades && Array.isArray(data.trades)) {
        this.trades = data.trades;
      }
      
      // CHARGER LES DONNÉES PAPER TRADING
      if (data.paperTrading) {
        this.portfolio.balance = data.paperTrading.balance || 500;
        this.portfolio.totalValue = data.paperTrading.balance || 500;
        this.portfolio.pnl = data.paperTrading.totalPnL || 0;

        if (data.paperTrading.openPositions && Array.isArray(data.paperTrading.openPositions)) {
          this.positions = data.paperTrading.openPositions;
        }

        if (data.paperTrading.closedTrades && Array.isArray(data.paperTrading.closedTrades)) {
          this.trades = data.paperTrading.closedTrades;
        }
      }
      
      console.log('🔥 FIREBASE CHARGÉ - Positions:', this.positions.length, 'Trades:', this.trades.length);
      
      // AFFICHER IMMÉDIATEMENT
      this.updatePositionsDisplay();
      this.updateTradeHistory();
    }
  } catch (error) {
    console.error('❌ Erreur Firebase:', error);
  }
},
  
  
  // ===== SYNCHRONISATION AVEC DASHBOARD PRINCIPAL =====
  async syncWithDashboard() {
    if (!window.currentUser) return;
    
    // Synchroniser le solde avec le dashboard principal
    if (window.currentUser.portfolio) {
    }
  },
  
updateDashboardBalance() {
    if (!window.currentUser) return;

    // SUPPRIMER les lignes qui modifient window.currentUser.portfolio
    // Garder SEULEMENT l'affichage local
    this.updatePortfolioDisplay();

    // FORCER la mise à jour du dashboard avec les nouvelles données
    if (window.currentUser) {
        // NE PAS TOUCHER À window.currentUser.portfolio !
        // NE PAS TOUCHER À window.currentUser.dailyGain !
        
        // Appeler directement updateOverviewMetrics si on est sur le dashboard
        if (typeof window.updateOverviewMetrics === 'function') {
            window.updateOverviewMetrics();
        }
    }

    // Mettre à jour l'affichage du dashboard principal
    this.updateMainDashboardDisplay();

    // Forcer la mise à jour de la barre de progression
    if (typeof window.updateAllPagesUI === 'function') {
      window.updateAllPagesUI();
    }
},
  
updateMainDashboardDisplay() {
  // NE PAS MODIFIER window.currentUser.portfolio !
  // Mettre à jour SEULEMENT l'affichage des éléments HTML
  
  // Mettre à jour l'affichage Overview SANS TOUCHER AUX DONNÉES
  const portfolioValueElements = document.querySelectorAll('.metric-value');
  if (portfolioValueElements[0]) {
    // AFFICHER les données paper trading dans l'interface
    portfolioValueElements[0].textContent = '$' + this.portfolio.totalValue.toFixed(2);
  }
  
  if (portfolioValueElements[1]) {
    const sign = this.portfolio.pnl >= 0 ? '+' : '';
    portfolioValueElements[1].textContent = sign + '$' + this.portfolio.pnl.toFixed(2);
  }
  
  // Mettre à jour les couleurs des variations
  const metricChanges = document.querySelectorAll('.metric-change');
  if (metricChanges[1]) {
    metricChanges[1].className = 'metric-change ' + (this.portfolio.pnl >= 0 ? 'positive' : 'negative');
    const sign = this.portfolio.pnl >= 0 ? '+' : '';
    metricChanges[1].textContent = sign + this.portfolio.pnlPercent.toFixed(2) + '% depuis le début';
  }

  // ===== INITIALISER LA LISTE DYNAMIQUE DES CRYPTOS (SEULEMENT UNE FOIS) =====
  if (typeof initDynamicCryptoList === 'function' && !window.cryptoListInitialized) {
    initDynamicCryptoList().then(() => {
      window.cryptoListInitialized = true;
    }).catch(error => {
    });
  } else {
  }
},
  
  // Mettre à jour la valeur totale du portfolio
  updatePortfolioValue() {
    let totalCryptoValue = 0;
    let totalMarginUsed = 0;
    let totalUnrealizedPnL = 0;
    
    // Calculer la valeur des cryptos spot
    Object.keys(this.portfolio.cryptos).forEach(symbol => {
      const amount = this.portfolio.cryptos[symbol];
      const price = this.prices[symbol + 'USDT'] || 0;
      totalCryptoValue += amount * price;
    });
    
    // Calculer les positions avec levier
    this.positions.forEach(position => {
      const currentPrice = this.prices[position.symbol] || position.entryPrice;
      const priceDiff = currentPrice - position.entryPrice;
      
      if (position.type === 'LONG') {
        position.unrealizedPnL = (priceDiff / position.entryPrice) * position.notionalValue;
      } else {
        position.unrealizedPnL = -(priceDiff / position.entryPrice) * position.notionalValue;
      }
      
      totalMarginUsed += position.margin;
      totalUnrealizedPnL += position.unrealizedPnL;
    });
    
    this.portfolio.margin = totalMarginUsed;
    this.portfolio.availableMargin = this.portfolio.balance - totalMarginUsed;
    this.portfolio.totalValue = this.portfolio.balance + totalCryptoValue + totalUnrealizedPnL;
    this.portfolio.pnl = this.portfolio.totalValue - 500;
    this.portfolio.pnlPercent = ((this.portfolio.totalValue - 500) / 500) * 100;
    
    this.updatePortfolioDisplay();
    this.saveToStorage();
 

    // PROTECTION: Fermer toutes les positions si portefeuille <= 0
    if (this.portfolio.totalValue <= 0) {
        console.log('🚨 LIQUIDATION: Portfolio à 0$ - Fermeture automatique des positions');

        // Fermer toutes les positions ouvertes
        const positionsToClose = [...this.positions]; // Copie pour éviter les conflits
        positionsToClose.forEach(position => {
            this.closePosition(position.id);
        });

        // Remettre le solde à 0 minimum
        this.portfolio.balance = Math.max(0, this.portfolio.balance);
        this.portfolio.totalValue = Math.max(0, this.portfolio.totalValue);

        showTradingNotification('🚨 LIQUIDATION: Toutes les positions fermées automatiquement', 'error');
    }

  },




  // Surveillance automatique des TP/SL
  checkTPSLTriggers() {
    if (!this.positions || this.positions.length === 0) return;

    const positionsToClose = [];

    this.positions.forEach(position => {
      if (!position.isActive) return;

      const currentPrice = this.prices[position.symbol];
      if (!currentPrice) return;

      let shouldClose = false;
      let reason = '';

      // Vérifier Take Profit
      if (position.takeProfit) {
        if (position.type === 'LONG' && currentPrice >= position.takeProfit) {
          shouldClose = true;
          reason = `🎯 Take Profit atteint (${position.takeProfit.toFixed(2)}$)`;
        } else if (position.type === 'SHORT' && currentPrice <= position.takeProfit) {
          shouldClose = true;
          reason = `🎯 Take Profit atteint (${position.takeProfit.toFixed(2)}$)`;
        }
      }

      // Vérifier Stop Loss
      if (position.stopLoss && !shouldClose) {
        if (position.type === 'LONG' && currentPrice <= position.stopLoss) {
          shouldClose = true;
          reason = `🛑 Stop Loss atteint (${position.stopLoss.toFixed(2)}$)`;
        } else if (position.type === 'SHORT' && currentPrice >= position.stopLoss) {
          shouldClose = true;
          reason = `🛑 Stop Loss atteint (${position.stopLoss.toFixed(2)}$)`;
        }
      }

      if (shouldClose) {
        positionsToClose.push({ position, reason });
      }
    });

    // Fermer les positions déclenchées
    positionsToClose.forEach(({ position, reason }) => {
      console.log(`🎯 Fermeture automatique: ${reason}`);
      this.closePositionWithReason(position.id, reason);
    });
  },

  // Fermer position avec raison spécifique
  closePositionWithReason(positionId, reason) {
    const positionIndex = this.positions.findIndex(p => p.id === positionId);
    if (positionIndex === -1) return false;

    const position = this.positions[positionIndex];
    const currentPrice = this.prices[position.symbol];

    if (!currentPrice) return false;

    const priceDiff = currentPrice - position.entryPrice;
    let finalPnL = 0;

    if (position.type === 'LONG') {
      finalPnL = (priceDiff / position.entryPrice) * position.notionalValue;
    } else {
      finalPnL = -(priceDiff / position.entryPrice) * position.notionalValue;
    }

    this.portfolio.balance += finalPnL;
    this.positions.splice(positionIndex, 1);

    const trade = {
      id: Date.now(),
      type: `CLOSE ${position.type} (AUTO)`,
      autoText: '(AUTO)',
      symbol: position.symbol.replace('USDT', ''),
      amount: position.notionalValue / currentPrice,
      price: currentPrice,
      value: position.notionalValue,
      pnl: finalPnL,
      margin: position.margin,
      leverage: position.leverage,
      timestamp: new Date(),
      closeReason: reason
    };

    this.trades.push(trade);

    const pnlIcon = finalPnL >= 0 ? '💰' : '💸';
    const pnlSign = finalPnL >= 0 ? '+' : '';
    showTradingNotification(`${pnlIcon} ${reason} - PnL: ${pnlSign}$${finalPnL.toFixed(2)}`, finalPnL >= 0 ? 'success' : 'error');

    // SAUVEGARDER APRÈS FERMETURE AUTO
    if (typeof window.saveTradingData === 'function') {
      window.saveTradingData(this.portfolio.balance, this.trades, this.portfolio.pnl, this.positions);
    }

    this.updatePortfolioValue();
    this.updateTradeHistory();
    this.updatePositionsDisplay();

    return true;
  },


  // Vérifier les TP/SL manqués pendant l'absence
async checkMissedTPSL() {
  if (!this.positions || this.positions.length === 0) return;
  
  console.log('🔍 Vérification des TP/SL manqués...');
  
  const positionsToClose = [];
  
  this.positions.forEach(position => {
    if (!position.isActive) return;
    
    const currentPrice = this.prices[position.symbol];
    if (!currentPrice) return;
    
    let shouldClose = false;
    let reason = '';
    
    // Vérifier si TP aurait dû se déclencher
    if (position.takeProfit) {
      if (position.type === 'LONG' && currentPrice >= position.takeProfit) {
        shouldClose = true;
        reason = `🎯 Take Profit manqué (${position.takeProfit.toFixed(2)}$)`;
      } else if (position.type === 'SHORT' && currentPrice <= position.takeProfit) {
        shouldClose = true;
        reason = `🎯 Take Profit manqué (${position.takeProfit.toFixed(2)}$)`;
      }
    }
    
    // Vérifier si SL aurait dû se déclencher
    if (position.stopLoss && !shouldClose) {
      if (position.type === 'LONG' && currentPrice <= position.stopLoss) {
        shouldClose = true;
        reason = `🛑 Stop Loss manqué (${position.stopLoss.toFixed(2)}$)`;
      } else if (position.type === 'SHORT' && currentPrice >= position.stopLoss) {
        shouldClose = true;
        reason = `🛑 Stop Loss manqué (${position.stopLoss.toFixed(2)}$)`;
      }
    }
    
    if (shouldClose) {
      positionsToClose.push({ position, reason });
    }
  });
  
  if (positionsToClose.length > 0) {
    showTradingNotification(`⚠️ ${positionsToClose.length} position(s) fermée(s) automatiquement pendant votre absence`, 'info');
    
    positionsToClose.forEach(({ position, reason }) => {
      this.closePositionWithReason(position.id, reason);
    });
  }
},

      // Calculer le vrai changement 24h
    getReal24hChange(symbol, currentPrice) {
      // Utiliser le prix d'il y a 24h stocké ou calculé
      const yesterday = this.prices24hAgo[symbol] || currentPrice * 0.99;
      const change = ((currentPrice - yesterday) / yesterday) * 100;
      return change;
    },
    // Stocker les prix pour calculer le 24h
    updatePrices24h() {
      if (!this.prices24hAgo) this.prices24hAgo = {};
      // Sauvegarder les prix actuels comme référence 24h
      Object.keys(this.prices).forEach(symbol => {
        if (!this.prices24hAgo[symbol]) {
          this.prices24hAgo[symbol] = this.prices[symbol] * (0.98 + Math.random() * 0.04);
        }
      });
      // Mettre à jour la barre de progression en temps réel
      if (typeof window.updateAllPagesUI === 'function') {
          window.updateAllPagesUI();
      }
    },
  


// Suivre les prix en temps réel
async startPriceTracking() {
    const fetchPrices = async () => {
      try {
        // Récupérer prix + stats 24h depuis Binance
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
        const allStats = await response.json();
        
        allStats.forEach(item => {
          if (AVAILABLE_CRYPTOS[item.symbol] || window.cryptoLoader?.cryptos[item.symbol]) {
            this.prices[item.symbol] = parseFloat(item.lastPrice);
            
            // METTRE À JOUR AUSSI LES DONNÉES CRYPTO-LOADER
            if (window.cryptoLoader?.cryptos[item.symbol]) {
              window.cryptoLoader.cryptos[item.symbol].price = parseFloat(item.lastPrice);
              window.cryptoLoader.cryptos[item.symbol].change24h = parseFloat(item.priceChangePercent);
              window.cryptoLoader.cryptos[item.symbol].high24h = parseFloat(item.highPrice);
              window.cryptoLoader.cryptos[item.symbol].low24h = parseFloat(item.lowPrice);
              window.cryptoLoader.cryptos[item.symbol].volume = parseFloat(item.quoteVolume);
            }

            // FORCER LA MISE À JOUR DU DASHBOARD À CHAQUE PRIX
            this.updateDashboardBalance();
            
            // Stocker les vraies stats 24h
            this.stats24h = this.stats24h || {};
            this.stats24h[item.symbol] = {
              change: parseFloat(item.priceChangePercent),
              high: parseFloat(item.highPrice),
              low: parseFloat(item.lowPrice),
              volume: parseFloat(item.quoteVolume)
            };
          }
        });
        
        // METTRE À JOUR L'AFFICHAGE SI CRYPTO SÉLECTIONNÉE
        if (window.cryptoLoader?.cryptos[selectedCrypto]) {
          const currentCryptoData = window.cryptoLoader.cryptos[selectedCrypto];
          if (typeof updateCryptoHeader === 'function') {
            updateCryptoHeader(currentCryptoData, selectedCrypto);
          }
        }
        this.updatePortfolioValue();
        this.updatePriceDisplay();
        this.updatePositionsDisplay();
        this.checkTPSLTriggers();


        // Mettre à jour aussi la liste des cryptos
        if (typeof window.updateCryptoListPrices === 'function') {
          window.updateCryptoListPrices();
        }

      } catch (error) {
        console.log('⚠️ Erreur récupération prix:', error);
      }
    };
    
    await fetchPrices();
    priceUpdateInterval = setInterval(fetchPrices, 10000);
  },

  

  
// Ouvrir une position avec levier
openPosition(symbol, type, amountUSD, leverage, takeProfit = null, stopLoss = null) {
  // Utiliser la crypto sélectionnée au lieu du paramètre symbol
  const actualSymbol = window.selectedCrypto || selectedCrypto || symbol;
  const price = this.prices[actualSymbol];
  
  if (!price) {
    showTradingNotification('❌ Prix non disponible', 'error');
    return false;
  }
  
  if (amountUSD < 5) {
    showTradingNotification('❌ Montant minimum: 5$', 'error');
    return false;
  }
  
  const margin = amountUSD;
  const notionalValue = amountUSD * leverage;
  
  if (margin > this.portfolio.availableMargin) {
    showTradingNotification('❌ Marge insuffisante', 'error');
    return false;
  }
  
  const position = {
    id: Date.now(),
    symbol: symbol,
    type: type,
    leverage: leverage,
    margin: margin,
    notionalValue: notionalValue,
    entryPrice: price,
    entryBalance: this.portfolio.balance,
    unrealizedPnL: 0,
    isActive: true,
    timestamp: new Date(),
    takeProfit: takeProfit, // ← NOUVEAU
    stopLoss: stopLoss      // ← NOUVEAU
  };
  
  this.positions.push(position);
  
  const trade = {
    id: Date.now(),
    type: `${type} x${leverage}`,
    symbol: symbol.replace('USDT', ''),
    amount: notionalValue / price,
    price: price,
    value: notionalValue,
    margin: margin,
    leverage: leverage,
    timestamp: new Date()
  };
  
  this.trades.push(trade);
  
  const typeIcon = type === 'LONG' ? '📈' : '📉';
  let tpslInfo = '';
  if (takeProfit) tpslInfo += ` TP:${takeProfit.toFixed(2)}$`;
  if (stopLoss) tpslInfo += ` SL:${stopLoss.toFixed(2)}$`;
  
  showTradingNotification(`✅ ${typeIcon} Position ${type} x${leverage} ouverte: $${notionalValue.toFixed(2)}${tpslInfo}`, 'success');
  
  // SAUVEGARDER APRÈS OUVERTURE TRADE
  if (typeof window.saveTradingData === 'function') {
    window.saveTradingData(this.portfolio.balance, this.trades, this.portfolio.pnl, this.positions);
  }

this.updatePortfolioValue();
this.updateTradeHistory();

// ===== ATTRIBUTION POINTS PAPER TRADING =====
if (window.PointsSystem && window.currentUser && finalPnL > 0) {
    window.PointsSystem.awardTradingPoints(
        window.currentUser.id, 
        false, // paper trading
        Math.abs(finalPerf)
    ).then(() => {
        console.log(`🎯 Points attribués pour trade paper: +${Math.abs(finalPerf).toFixed(1)}%`);
    }).catch(error => {
        console.error('❌ Erreur attribution points paper:', error);
    });
}

this.updatePositionsDisplay();
  
  return true;
},



  
  // Fermer une position
  closePosition(positionId) {
    const positionIndex = this.positions.findIndex(p => p.id === positionId);
    if (positionIndex === -1) {
      showTradingNotification('❌ Position non trouvée', 'error');
      return false;
    }
    
    const position = this.positions[positionIndex];
    const currentPrice = this.prices[position.symbol];
    
    if (!currentPrice) {
      showTradingNotification('❌ Prix non disponible', 'error');
      return false;
    }
    
    const priceDiff = currentPrice - position.entryPrice;
    let finalPnL = 0;
    
    if (position.type === 'LONG') {
      finalPnL = (priceDiff / position.entryPrice) * position.notionalValue;
    } else {
      finalPnL = -(priceDiff / position.entryPrice) * position.notionalValue;
    }
    
    // Rendre SEULEMENT le profit, pas la marge (elle n'a jamais été vraiment soustraite)
    this.portfolio.balance += finalPnL;
    
    this.positions.splice(positionIndex, 1);
    
    const trade = {
      id: Date.now(),
      type: `CLOSE ${position.type}`,
      symbol: position.symbol.replace('USDT', ''),
      amount: position.notionalValue / currentPrice,
      price: currentPrice,
      value: position.notionalValue,
      pnl: finalPnL,
      margin: position.margin,
      leverage: position.leverage,
      timestamp: new Date()
    };
    
    this.trades.push(trade);
    
    const pnlIcon = finalPnL >= 0 ? '💰' : '💸';
    const pnlSign = finalPnL >= 0 ? '+' : '';
    showTradingNotification(`${pnlIcon} Position fermée: ${pnlSign}$${finalPnL.toFixed(2)}`, finalPnL >= 0 ? 'success' : 'error');
    
    // SAUVEGARDER APRÈS FERMETURE TRADE
    if (typeof window.saveTradingData === 'function') {
    window.saveTradingData(this.portfolio.balance, this.trades, this.portfolio.pnl, this.positions);
  }

    this.updatePortfolioValue();
    this.updateTradeHistory();
    // Mettre à jour la barre de progression
    if (typeof window.updateAllPagesUI === 'function') {
        window.updateAllPagesUI();
    }
    this.updatePositionsDisplay();
    
    return true;
  },
  
  // Acheter crypto spot
  buy(symbol, amountUSD) {
    const cryptoKey = symbol.replace('USDT', '');
    // Utiliser la crypto sélectionnée
    const actualSymbol = window.selectedCrypto || selectedCrypto || symbol;
    const price = this.prices[actualSymbol];
    
    if (!price) {
      showTradingNotification('❌ Prix non disponible', 'error');
      return false;
    }
    
    if (amountUSD > this.portfolio.availableMargin) {
      showTradingNotification('❌ Solde insuffisant', 'error');
      return false;
    }
    
    if (amountUSD < 5) {
      showTradingNotification('❌ Montant minimum: 5$', 'error');
      return false;
    }
    
    const cryptoAmount = amountUSD / price;
    const fees = amountUSD * 0.001;
    const totalCost = amountUSD + fees;
    
    if (totalCost > this.portfolio.availableMargin) {
      showTradingNotification('❌ Solde insuffisant (frais inclus)', 'error');
      return false;
    }
    
    this.portfolio.balance -= totalCost;
    this.portfolio.cryptos[cryptoKey] = (this.portfolio.cryptos[cryptoKey] || 0) + cryptoAmount;
    
    const trade = {
      id: Date.now(),
      type: 'BUY SPOT',
      symbol: cryptoKey,
      amount: cryptoAmount,
      price: price,
      value: amountUSD,
      fees: fees,
      timestamp: new Date()
    };
    
    this.trades.push(trade);
    
    showTradingNotification(`✅ Achat: ${cryptoAmount.toFixed(6)} ${cryptoKey} à ${price.toFixed(2)}$`, 'success');
    this.updatePortfolioValue();
    this.updateTradeHistory();
    
    return true;
  },
  
  // Vendre crypto spot
  sell(symbol, percentage = 100) {
    const cryptoKey = symbol.replace('USDT', '');
    // Utiliser la crypto sélectionnée
    const actualSymbol = window.selectedCrypto || selectedCrypto || symbol;
    const price = this.prices[actualSymbol];


    const currentAmount = this.portfolio.cryptos[cryptoKey] || 0;
    
    if (!price) {
      showTradingNotification('❌ Prix non disponible', 'error');
      return false;
    }
    
    if (currentAmount <= 0) {
      showTradingNotification('❌ Aucune position à vendre', 'error');
      return false;
    }
    
    const sellAmount = (currentAmount * percentage) / 100;
    const sellValue = sellAmount * price;
    const fees = sellValue * 0.001;
    const netValue = sellValue - fees;
    
    if (sellValue < 2) {
      showTradingNotification('❌ Montant minimum de vente: 2$', 'error');
      return false;
    }
    
    this.portfolio.balance += netValue;
    this.portfolio.cryptos[cryptoKey] -= sellAmount;
    
    if (this.portfolio.cryptos[cryptoKey] < 0.000001) {
      delete this.portfolio.cryptos[cryptoKey];
    }
    
    const trade = {
      id: Date.now(),
      type: 'SELL SPOT',
      symbol: cryptoKey,
      amount: sellAmount,
      price: price,
      value: sellValue,
      fees: fees,
      timestamp: new Date()
    };
    
    this.trades.push(trade);
    
    showTradingNotification(`✅ Vente: ${sellAmount.toFixed(6)} ${cryptoKey} à ${price.toFixed(2)}$`, 'success');
    this.updatePortfolioValue();
    this.updateTradeHistory();
    
    return true;
  },
  
  // Mettre à jour l'affichage du portfolio
  updatePortfolioDisplay() {
      // FORCER l'utilisation des données paperTrading UNIQUEMENT
      const balanceElement = document.querySelector('.trading-balance');
      if (balanceElement) {
          balanceElement.textContent = `$${this.portfolio.balance.toFixed(2)}`;
      }

      const totalValueElement = document.querySelector('.trading-total-value');
      if (totalValueElement) {
          // Valeur totale = balance + PnL des positions ouvertes
          totalValueElement.textContent = `$${this.portfolio.totalValue.toFixed(2)}`;
      }

      const marginElement = document.querySelector('.trading-margin');
      if (marginElement) {
          marginElement.textContent = `$${this.portfolio.margin.toFixed(2)}`;
      }

      const pnlElement = document.querySelector('.trading-pnl');
      if (pnlElement) {
          const pnlSign = this.portfolio.pnl >= 0 ? '+' : '';
          const pnlClass = this.portfolio.pnl >= 0 ? 'positive' : 'negative';
          pnlElement.textContent = `${pnlSign}$${this.portfolio.pnl.toFixed(2)} (${pnlSign}${this.portfolio.pnlPercent.toFixed(2)}%)`;
          pnlElement.className = `trading-pnl ${pnlClass}`;
      }

      // NE PAS toucher à window.currentUser.portfolio !
      this.updateSpotPositionsDisplay();
  },
  
  // Afficher les positions spot
  updateSpotPositionsDisplay() {
    const positionsContainer = document.querySelector('.spot-positions');
    if (!positionsContainer) return;
    
    positionsContainer.innerHTML = '';
    
    Object.keys(this.portfolio.cryptos).forEach(cryptoKey => {
      const amount = this.portfolio.cryptos[cryptoKey];
      const symbol = cryptoKey + 'USDT';
      const price = this.prices[symbol] || 0;
      const value = amount * price;
      const crypto = Object.values(AVAILABLE_CRYPTOS).find(c => c.symbol === cryptoKey);
      
      if (amount > 0.000001 && crypto) {
        const positionDiv = document.createElement('div');
        positionDiv.className = 'position-item';
        positionDiv.innerHTML = `
          <div class="position-info">
            <span class="crypto-icon" style="color: ${crypto.color}">${crypto.icon}</span>
            <div class="position-details">
              <strong>${crypto.name}</strong>
              <small>${amount.toFixed(6)} ${cryptoKey}</small>
            </div>
          </div>
          <div class="position-value">
            <strong>${value.toFixed(2)}</strong>
            <small>@${price.toFixed(2)}</small>
          </div>
          <button class="btn btn-sm btn-sell" onclick="VirtualTrading.sell('${symbol}', 100)">
            📈 Vendre
          </button>
        `;
        
        positionsContainer.appendChild(positionDiv);
      }
    });
    
    if (Object.keys(this.portfolio.cryptos).length === 0) {
      positionsContainer.innerHTML = '<div class="no-positions">💰 Aucune position spot</div>';
    }
  },
  
  // Afficher les positions avec levier
  updatePositionsDisplay() {
    // CHERCHER TOUS LES CONTAINERS POSSIBLES
    let positionsContainer = document.querySelector('.leverage-positions');
    if (!positionsContainer) {
      positionsContainer = document.querySelector('#positions-container');
    }
    if (!positionsContainer) {
      positionsContainer = document.querySelector('.positions-section .scroll-container');
    }

    if (!positionsContainer) {
    positionsContainer = document.querySelector('.positions-section .scroll-container');
    }
    if (!positionsContainer) {
      positionsContainer = document.querySelector('.position-list');
    }
    if (!positionsContainer) {
      positionsContainer = document.querySelector('.positions-content');
    }
    if (!positionsContainer) {
      positionsContainer = document.querySelector('[data-positions]');
    }
    
    if (!positionsContainer) {
      console.error('❌ Container positions non trouvé - Sélecteurs disponibles:');
    console.log('Classes disponibles:', Array.from(document.querySelectorAll('[class]')).map(el => el.className));
    console.log('IDs disponibles:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      return;
    }
    
    positionsContainer.innerHTML = '';
    
    this.positions.forEach(position => {
      let crypto = Object.values(AVAILABLE_CRYPTOS).find(c => c.symbol + 'USDT' === position.symbol);

      // Si pas trouvé dans AVAILABLE_CRYPTOS, utiliser les données de crypto-loader
      if (!crypto && window.cryptoLoader?.cryptos[position.symbol]) {
        const cryptoData = window.cryptoLoader.cryptos[position.symbol];
        crypto = {
          symbol: cryptoData.symbol,
          name: cryptoData.name,
          icon: cryptoData.icon,
          color: cryptoData.color
        };
      }
      const currentPrice = this.prices[position.symbol] || position.entryPrice;
      const pnlPercent = (position.unrealizedPnL / position.margin) * 100;
      
      if (crypto) {
        const positionDiv = document.createElement('div');
        positionDiv.className = `position-item ${position.type.toLowerCase()}`;
        
        const typeIcon = position.type === 'LONG' ? '📈' : '📉';
        const pnlClass = position.unrealizedPnL >= 0 ? 'positive' : 'negative';
        const pnlSign = position.unrealizedPnL >= 0 ? '+' : '';
        
        positionDiv.innerHTML = `
          <div class="position-info">
            <img class="crypto-logo" src="https://assets.coincap.io/assets/icons/${crypto.symbol.toLowerCase()}@2x.png" alt="${crypto.symbol}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
            <span class="crypto-icon-fallback" style="color: ${crypto.color}; display: none;">${crypto.icon}</span>
            <div class="position-details">
              <strong class="crypto-name-clickable" data-symbol="${position.symbol}" style="cursor: pointer; color: #00ff88;">${typeIcon} ${position.type} x${position.leverage}</strong>
              <small>Marge: ${position.margin.toFixed(2)}</small>
            </div>
          </div>
          <div class="position-value">
            <strong class="${pnlClass}">${pnlSign}$${position.unrealizedPnL.toFixed(2)}</strong>
            <small>${pnlSign}${pnlPercent.toFixed(2)}%</small>
          </div>
          <div style="display: flex; gap: 0.2rem;">
            <button class="btn btn-sm btn-edit" onclick="editPosition(${position.id})">
              ✏️
            </button>
            <button class="btn btn-sm btn-close" onclick="VirtualTrading.closePosition(${position.id})">
              ❌
            </button>
          </div>
        `;
        
        positionsContainer.appendChild(positionDiv);
        // Ajouter l'événement de clic sur le nom de la crypto
        positionDiv.querySelector('.crypto-name-clickable').addEventListener('click', () => {
          const cryptoData = window.cryptoLoader?.cryptos[position.symbol];
          if (cryptoData) {
            selectDynamicCrypto(position.symbol, cryptoData);
          }
        });

      }
    });
    
    if (this.positions.length === 0) {
      positionsContainer.innerHTML = '<div class="no-positions">⚡ Aucune position avec levier</div>';
    }
  },
  
  // Mettre à jour l'affichage des prix
  updatePriceDisplay() {
    Object.keys(AVAILABLE_CRYPTOS).forEach(symbol => {
        const price = this.prices[symbol];
        const priceElement = document.querySelector(`[data-symbol="${symbol}"] .crypto-price`);
        
        if (priceElement && price) {
            priceElement.textContent = `${price.toFixed(price > 1 ? 2 : 6)}`;
        }
    });
    
},

 
  // Mettre à jour l'historique des trades
  updateTradeHistory() {
    let historyContainer = document.querySelector('.trade-history');
    if (!historyContainer) {
      historyContainer = document.querySelector('#history-container');
    }
    if (!historyContainer) {
      return;
    }
  

historyContainer.innerHTML = '';

const recentTrades = this.trades.slice(-10).reverse();

    
recentTrades.forEach(trade => {
  const crypto = Object.values(AVAILABLE_CRYPTOS).find(c => c.symbol === trade.symbol);
  const tradeDiv = document.createElement('div');
  tradeDiv.className = 'trade-item';
  
  let typeIcon = '📊';
  if (trade.type.includes('LONG')) typeIcon = '📈';
  if (trade.type.includes('SHORT')) typeIcon = '📉';
  if (trade.type.includes('BUY')) typeIcon = '💚';
  if (trade.type.includes('SELL')) typeIcon = '❤️';
  if (trade.type.includes('CLOSE')) typeIcon = '🔒';
  
  // FORMAT DATE ET HEURE SIMPLE
  const tradeDate = new Date(trade.timestamp || Date.now());
  const dateStr = tradeDate.toLocaleDateString('fr-FR') || 'Aujourd\'hui';
  const timeStr = tradeDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) || 'Maintenant';
  
  const pnlDisplay = trade.pnl !== undefined ? 
    `<small class="${trade.pnl >= 0 ? 'positive' : 'negative'}">PnL: ${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}$</small>` : 
    `<small>Frais: ${(trade.fees || 0).toFixed(2)}$</small>`;
  
tradeDiv.innerHTML = `
  <div class="trade-info">
    <span class="trade-type">${typeIcon} ${trade.type}</span>
    <div class="trade-separator"></div>
    <div class="trade-details">
      <strong>${crypto ? crypto.name : trade.symbol}</strong>
      <small>${dateStr} ${timeStr}</small>
    </div>
  </div>
  <div class="trade-amount">
    <strong>Montant: ${(trade.value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$</strong>
    ${trade.leverage ? `<small>Levier x${trade.leverage}</small>` : ''}
  </div>
  <div class="trade-value">
    <strong>Prix: ${trade.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$</strong>
    ${pnlDisplay}
  </div>
`;
  
  historyContainer.appendChild(tradeDiv);
});
    
    if (recentTrades.length === 0) {
      historyContainer.innerHTML = '<div class="no-trades">📊 Aucun trade encore</div>';
    }
  }
};

// ===== LIGNES DE POSITION SUR TRADINGVIEW =====
// À ajouter dans trading-system.js


// ===== EXTENSION TRADINGVIEW INTEGRATION =====
class TradingViewIntegration {
  constructor() {
    this.widget = null;
    this.containerId = 'trading-chart';
    this.positionLines = new Map(); // Stocker les lignes de position
  }
  
  init(symbol = 'BINANCE:BTCUSDT') {
    if (typeof TradingView === 'undefined') {
      console.log('⚠️ TradingView non chargé, utilisation du fallback');
      this.createFallbackChart();
      return;
    }
    
    
    try {
      this.widget = new TradingView.widget({
        "width": "100%",
        "height": this.getResponsiveHeight(),
        "symbol": symbol,
        "interval": "15",
        "timezone": "Europe/Paris",
        "theme": "dark",
        "style": "1",
        "locale": "fr",
        "toolbar_bg": "#000011",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": this.containerId,
        "disabled_features": ["use_localstorage_for_settings", "header_symbol_search", "context_menus"],
        "enabled_features": ["side_toolbar_in_fullscreen_mode"],
        "studies": window.innerWidth <= 768 ? [] : ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
        "overrides": {
          "paneProperties.background": "#000011",
          "paneProperties.vertGridProperties.color": "#1a1a2e",
          "paneProperties.horzGridProperties.color": "#1a1a2e",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.textColor": "#ffffff",
          "mainSeriesProperties.candleStyle.upColor": "#00ff88",
          "mainSeriesProperties.candleStyle.downColor": "#ff4757",
          "mainSeriesProperties.candleStyle.borderUpColor": "#00ff88",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ff4757",
          "mainSeriesProperties.candleStyle.wickUpColor": "#00ff88",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ff4757"
        },
        // Callback quand le widget est prêt
        "onChartReady": () => {
          this.onChartReady();
        }

        
      });

      // Forcer l'initialisation après délai
setTimeout(() => {
  if (!this.chart) {
    this.chart = this.widget.chart && this.widget.chart();
    if (this.chart) {
      this.drawExistingPositions();
    }
  }
}, 3000);
      

      // Redimensionner si changement d'orientation
      window.addEventListener('resize', () => {
        if (this.widget) {
          this.widget.options.height = this.getResponsiveHeight();
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur TradingView:', error);
      this.createFallbackChart();
    }
  }
  
  // Callback quand le chart est prêt
  onChartReady() {
    this.chart = this.widget.chart();
    
    // Dessiner les lignes pour les positions existantes
    this.drawExistingPositions();
    
  }

  // Hauteur responsive selon l'écran
getResponsiveHeight() {
  const screenWidth = window.innerWidth;
  
  if (screenWidth <= 480) {
    return "620px"; // Mobile petit
  } else if (screenWidth <= 768) {
    return "680px"; // Mobile/tablette
  } else if (screenWidth <= 1024) {
    return "600px"; // Tablette large
  } else {
    return "700px"; // Desktop
  }
}
  
  // Dessiner les positions existantes
  drawExistingPositions() {
    if (!this.chart || !VirtualTrading.positions) return;
    
    VirtualTrading.positions.forEach(position => {
      this.addPositionLine(position);
    });
  }
  
  // Ajouter une ligne de position
  addPositionLine(position) {
    if (!this.chart) {
      return;
    }
    
    try {
      const lineColor = position.type === 'LONG' ? '#00ff88' : '#ff4757';
      const lineStyle = position.type === 'LONG' ? 2 : 2; // Solid line
      
      const line = this.chart.createShape({
        time: Math.floor(position.timestamp.getTime() / 1000), // Timestamp Unix
        price: position.entryPrice
      }, {
        shape: 'horizontal_line',
        overrides: {
          linecolor: lineColor,
          linestyle: lineStyle,
          linewidth: 2,
          showLabel: true,
          textcolor: lineColor,
          fontsize: 12
        }
      });
      
      // Ajouter le texte de la position
      const positionText = `${position.type} x${position.leverage} - ${position.entryPrice.toFixed(2)}$`;
      
      const textShape = this.chart.createShape({
        time: Math.floor(position.timestamp.getTime() / 1000),
        price: position.entryPrice
      }, {
        shape: 'text',
        text: positionText,
        overrides: {
          color: lineColor,
          fontsize: 10,
          bold: true,
          italic: false
        }
      });
      
      // Stocker les références
      this.positionLines.set(position.id, {
        line: line,
        text: textShape,
        position: position
      });
      
      
    } catch (error) {
      console.error('❌ Erreur création ligne position:', error);
      
      // Fallback avec ligne simple
      this.addFallbackPositionLine(position);
    }
  }
  
  // Fallback: ligne simple sans API avancée
  addFallbackPositionLine(position) {
    try {
      const lineColor = position.type === 'LONG' ? '#00ff88' : '#ff4757';
      
      // Ligne horizontale simple
      const line = this.chart.createHorizontalLine({
        price: position.entryPrice,
        color: lineColor,
        width: 2,
        style: 'solid'
      });
      
      this.positionLines.set(position.id, {
        line: line,
        position: position
      });
      
      
    } catch (error) {
      console.error('❌ Erreur ligne fallback:', error);
    }
  }
  
  // Supprimer une ligne de position
  removePositionLine(positionId) {
    const positionData = this.positionLines.get(positionId);
    
    if (positionData) {
      try {
        if (positionData.line) {
          this.chart.removeEntity(positionData.line);
        }
        if (positionData.text) {
          this.chart.removeEntity(positionData.text);
        }
        
        this.positionLines.delete(positionId);

        
      } catch (error) {
        console.error('❌ Erreur suppression ligne:', error);
      }
    }
  }
  
  // Mettre à jour une ligne de position (PnL)
  updatePositionLine(position) {
    const positionData = this.positionLines.get(position.id);
    
    if (positionData && positionData.text) {
      try {
        const pnlColor = position.unrealizedPnL >= 0 ? '#00ff88' : '#ff4757';
        const pnlSign = position.unrealizedPnL >= 0 ? '+' : '';
        const updatedText = `${position.type} x${position.leverage} - ${position.entryPrice.toFixed(2)}$ (${pnlSign}$${position.unrealizedPnL.toFixed(2)})`;
        
        // Mettre à jour le texte
        positionData.text.setText(updatedText);
        positionData.text.setColor(pnlColor);
        
        
      } catch (error) {
        console.error('❌ Erreur mise à jour ligne:', error);
      }
    }
  }
  
  // Nettoyer toutes les lignes
  clearAllPositionLines() {
    this.positionLines.forEach((data, id) => {
      this.removePositionLine(id);
    });
    
  }
  
  // Changer de symbole (garder les lignes si même crypto)
  changeSymbol(symbol) {
    const currentSymbol = symbol;
    console.log('📊 Changement symbole TradingView:', symbol);
    
    // Nettoyer les lignes de l'ancien symbole
    this.clearAllPositionLines();
    
    if (this.widget && this.widget.chart && this.widget.chart()) {
      this.widget.chart().setSymbol(symbol, () => {
        console.log('✅ Symbole TradingView changé:', symbol);
        // Redessiner les lignes pour le nouveau symbole
        setTimeout(() => {
          this.drawExistingPositions();
        }, 1000);
      });
    } else if (this.widget && this.widget.setSymbol) {
      this.widget.setSymbol(symbol);
      console.log('✅ Symbole TradingView changé (méthode alternative):', symbol);
      setTimeout(() => {
        this.drawExistingPositions();
      }, 1000);
    } else {
      console.log('🔄 Recréation widget TradingView pour:', symbol);
      setTimeout(() => {
        this.init(symbol);
      }, 100);
    }
  }
  
  // Fallback chart avec lignes simulées
  createFallbackChart() {
    const container = document.getElementById(this.containerId);
    if (container) {
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'fallback-chart';
      fallbackDiv.style.height = this.getResponsiveHeight();
      fallbackDiv.style.position = 'relative';
      
      const chartHeader = document.createElement('div');
      chartHeader.className = 'chart-header';
      chartHeader.innerHTML = `
        <h3>📊 Graphique ${selectedCrypto.replace('USDT', '')}/USDT</h3>
        <p>Widget TradingView en cours de chargement...</p>
      `;
      
      const chartPlaceholder = document.createElement('div');
      chartPlaceholder.className = 'chart-placeholder';
      chartPlaceholder.style.cssText = `
        height: 600px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 10px;
        position: relative;
        overflow: hidden;
      `;
      
      const priceDisplay = document.createElement('div');
      priceDisplay.className = 'price-display';
      priceDisplay.innerHTML = `
        <span class="current-price">${(VirtualTrading.prices[selectedCrypto] || 0).toFixed(2)}</span>
        <span class="price-change">Temps réel</span>
      `;
      
      const chartInfo = document.createElement('div');
      chartInfo.className = 'chart-info';
      chartInfo.innerHTML = `
        <p>🚀 Graphique temps réel disponible avec TradingView</p>
        <p>📈 Lignes de position intégrées</p>
      `;
      
      // Ajouter les lignes de position simulées
      this.addFallbackPositionLines(chartPlaceholder);
      
      chartPlaceholder.appendChild(priceDisplay);
      chartPlaceholder.appendChild(chartInfo);
      
      fallbackDiv.appendChild(chartHeader);
      fallbackDiv.appendChild(chartPlaceholder);
      
      container.innerHTML = '';
      container.appendChild(fallbackDiv);
    }
  }
  
  // Lignes de position simulées pour le fallback
  addFallbackPositionLines(container) {
    if (!VirtualTrading.positions || VirtualTrading.positions.length === 0) return;
    
    VirtualTrading.positions.forEach((position, index) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'fallback-position-line';
      lineDiv.style.cssText = `
        position: absolute;
        top: ${200 + (index * 100)}px;
        left: 20px;
        right: 20px;
        height: 2px;
        background: ${position.type === 'LONG' ? '#00ff88' : '#ff4757'};
        z-index: 10;
      `;
      
      const labelDiv = document.createElement('div');
      labelDiv.className = 'fallback-position-label';
      labelDiv.style.cssText = `
        position: absolute;
        top: -25px;
        left: 0;
        background: ${position.type === 'LONG' ? '#00ff88' : '#ff4757'};
        color: #000;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
      `;
      
      const pnlSign = position.unrealizedPnL >= 0 ? '+' : '';
      labelDiv.textContent = `${position.type} x${position.leverage} - ${position.entryPrice.toFixed(2)}$ (${pnlSign}$${position.unrealizedPnL.toFixed(2)})`;
      
      lineDiv.appendChild(labelDiv);
      container.appendChild(lineDiv);
    });
  }
}

// Fonction pour mettre à jour les lignes avec le PnL
function updatePositionLines() {
  if (window.tradingViewWidget && window.tradingViewWidget.updatePositionLine) {
    VirtualTrading.positions.forEach(position => {
      window.tradingViewWidget.updatePositionLine(position);
    });
  }
}

// ===== EXPOSITION GLOBALE =====
window.TradingViewIntegration = TradingViewIntegration;
window.updatePositionLines = updatePositionLines;

console.log('📊 Les positions apparaîtront automatiquement sur le graphique');

// ===== INTERFACE DE TRADING =====
function initTradingInterface() {
  
  // Vérifier que les éléments HTML existent déjà dans index.html
  const tradingChart = document.getElementById('trading-chart');
  const cryptoItems = document.querySelectorAll('.crypto-item');
  const leverageSelect = document.getElementById('leverage-select');
  
  if (!tradingChart) {
    console.error('❌ Element #trading-chart non trouvé dans le HTML');
    return false;
  }
  
  // Initialiser les événements sur les cryptos
  cryptoItems.forEach(item => {
    const symbol = item.dataset.symbol;
    if (symbol) {
      item.addEventListener('click', () => selectCrypto(symbol));
    }
  });
  
// Initialiser le sélecteur de levier (vider d'abord)
if (leverageSelect) {
    leverageSelect.innerHTML = ''; // ← Vider avant d'ajouter
    LEVERAGE_OPTIONS.forEach(leverage => {
        const option = document.createElement('option');
        option.value = leverage;
        option.textContent = `${leverage}x`;
        if (leverage === 10) option.selected = true; // ← Sélectionner 10x par défaut
        leverageSelect.appendChild(option);
    });
}

  
  // Initialiser les boutons de vente spot
  document.querySelectorAll('.btn-sell-percent').forEach((btn, index) => {
    const percentages = [25, 50, 75, 100];
    btn.addEventListener('click', () => executeSpotSell(percentages[index]));
  });
  
  return true;
}



  
// Nouvelle fonction pour lancer le trade
function executeTrade() {
  const directionSelect = document.getElementById('direction-select');
  const direction = directionSelect.value;
  
  const amountInput = document.getElementById('trade-amount');
  const leverageSelect = document.getElementById('leverage-select');
  const amount = parseFloat(amountInput.value);
  const leverage = parseInt(leverageSelect.value);
  
  // Validation obligatoire du montant
  if (!amount || isNaN(amount) || amount <= 0) {
    showTradingNotification('❌ Veuillez saisir un montant valide', 'error');
    amountInput.focus();
    return;
  }

  if (amount < 5) {
    showTradingNotification('❌ Marge minimum: 5$', 'error');
    return;
  }
  
  if (amount > VirtualTrading.portfolio.availableMargin) {
    showTradingNotification(`❌ Solde insuffisant! Maximum: ${VirtualTrading.portfolio.availableMargin.toFixed(2)}$`, 'error');
    return;
  }
  
  
  // Récupérer les valeurs TP/SL
  const takeProfitInput = document.getElementById('take-profit');
  const stopLossInput = document.getElementById('stop-loss');
  const takeProfit = parseFloat(takeProfitInput.value) || null;
  const stopLoss = parseFloat(stopLossInput.value) || null;
  
  if (VirtualTrading.openPosition(selectedCrypto, direction, amount, leverage, takeProfit, stopLoss)) {
    amountInput.value = '';
    document.getElementById('take-profit').value = '';
    document.getElementById('stop-loss').value = '';
    updateTPSLPercentages();
  }
}



// ===== FONCTIONS UTILITAIRES =====
function showTradingNotification(message, type = 'info') {
  if (typeof showNotification === 'function') {
    showNotification(message, type);
  } else {
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}


function selectCrypto(symbol) {
  selectedCrypto = symbol;
  
  document.querySelectorAll('.crypto-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  const selectedItem = document.querySelector(`[data-symbol="${symbol}"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
  
  if (window.tradingViewWidget && window.tradingViewWidget.changeSymbol) {
    const validatedSymbol = validateTradingViewSymbol ? validateTradingViewSymbol(symbol) : `BINANCE:${symbol}`;
    window.tradingViewWidget.changeSymbol(validatedSymbol);
  }
  
}



function executeLeverageTrade(type) {
  const amountInput = document.getElementById('trade-amount');
  const leverageSelect = document.getElementById('leverage-select');
  const amount = parseFloat(amountInput.value);
  const leverage = parseInt(leverageSelect.value);
  
  if (!amount || isNaN(amount) || amount <= 0) {
    showTradingNotification('❌ Veuillez insérer un montant valide', 'error');
    return;
  }

  if (amount < 5) {
    showTradingNotification('❌ Marge minimum: 5$', 'error');
    return;
  }
  
  // Vérifier le solde disponible
  if (amount > VirtualTrading.portfolio.availableMargin) {
    showTradingNotification(`❌ Solde insuffisant! Maximum: ${VirtualTrading.portfolio.availableMargin.toFixed(2)}$`, 'error');
    return;
  }
  
  if (VirtualTrading.openPosition(selectedCrypto, type, amount, leverage)) {
    amountInput.value = '';
  }
}




// Calculer et afficher les pourcentages TP/SL en temps réel
function updateTPSLPercentages() {
  const amountInput = document.getElementById('trade-amount');
  const leverageSelect = document.getElementById('leverage-select');
  const takeProfitInput = document.getElementById('take-profit');
  const stopLossInput = document.getElementById('stop-loss');
  const tpPercentage = document.querySelector('.tp-percentage');
  const slPercentage = document.querySelector('.sl-percentage');
  const directionSelect = document.getElementById('direction-select');
  
  const amount = parseFloat(amountInput.value) || 0;
  const leverage = parseInt(leverageSelect.value) || 1;
  const currentPrice = VirtualTrading.prices[selectedCrypto] || 0;
  const takeProfit = parseFloat(takeProfitInput.value) || 0;
  const stopLoss = parseFloat(stopLossInput.value) || 0;
  const direction = directionSelect.value;
  
  // Validation du montant
  if (amount <= 0) {
    tpPercentage.textContent = 'Entrez un montant valide';
    slPercentage.textContent = 'Entrez un montant valide';
    return;
  }
  
  if (amount > VirtualTrading.portfolio.availableMargin) {
    tpPercentage.textContent = `Solde insuffisant (Max: ${VirtualTrading.portfolio.availableMargin.toFixed(2)}$)`;
    slPercentage.textContent = `Solde insuffisant (Max: ${VirtualTrading.portfolio.availableMargin.toFixed(2)}$)`;
    return;
  }
  
  if (currentPrice <= 0) {
    tpPercentage.textContent = 'Prix non disponible';
    slPercentage.textContent = 'Prix non disponible';
    return;
  }
  
  // Validation et calcul Take Profit
  if (takeProfit > 0) {
    let tpValid = false;
    
    if (direction === 'LONG' && takeProfit > currentPrice) {
      tpValid = true;
    } else if (direction === 'SHORT' && takeProfit < currentPrice) {
      tpValid = true;
    }
    
    if (tpValid) {
      const priceDiff = Math.abs(takeProfit - currentPrice);
      const priceChangePercent = (priceDiff / currentPrice) * 100;
      const tpPnL = (priceChangePercent * leverage * amount) / 100;
      const tpPercent = (tpPnL / amount) * 100;
      
      tpPercentage.textContent = `Gain potentiel: +${tpPercent.toFixed(2)}% (+$${tpPnL.toFixed(2)})`;
      tpPercentage.style.color = '#00ff88';
    } else {
      if (direction === 'LONG') {
        tpPercentage.textContent = `LONG: TP doit être > ${currentPrice.toFixed(2)}$`;
      } else {
        tpPercentage.textContent = `SHORT: TP doit être < ${currentPrice.toFixed(2)}$`;
      }
      tpPercentage.style.color = '#ff4757';
    }
  } else {
    tpPercentage.textContent = 'Gain potentiel: +0%';
    tpPercentage.style.color = '#00ff88';
  }
  
  // Validation et calcul Stop Loss
  if (stopLoss > 0) {
    let slValid = false;
    
    if (direction === 'LONG' && stopLoss < currentPrice) {
      slValid = true;
    } else if (direction === 'SHORT' && stopLoss > currentPrice) {
      slValid = true;
    }
    
    if (slValid) {
      const priceDiff = Math.abs(stopLoss - currentPrice);
      const priceChangePercent = (priceDiff / currentPrice) * 100;
      const slPnL = (priceChangePercent * leverage * amount) / 100;
      const slPercent = (slPnL / amount) * 100;
      
      slPercentage.textContent = `Perte potentielle: -${slPercent.toFixed(2)}% (-$${slPnL.toFixed(2)})`;
      slPercentage.style.color = '#ff4757';
    } else {
      if (direction === 'LONG') {
        slPercentage.textContent = `LONG: SL doit être < ${currentPrice.toFixed(2)}$`;
      } else {
        slPercentage.textContent = `SHORT: SL doit être > ${currentPrice.toFixed(2)}$`;
      }
      slPercentage.style.color = '#ff4757';
    }
  } else {
    slPercentage.textContent = 'Perte potentielle: -0%';
    slPercentage.style.color = '#ff4757';
  }
}




// Ajouter les événements pour le calcul en temps réel
function initTPSLCalculations() {
  const inputs = ['trade-amount', 'leverage-select', 'take-profit', 'stop-loss'];
  
  inputs.forEach(inputId => {
    const element = document.getElementById(inputId);
    if (element) {
      element.addEventListener('input', updateTPSLPercentages);
      element.addEventListener('change', updateTPSLPercentages);
    }
  });
  
  // Mettre à jour quand le prix change
  setInterval(updateTPSLPercentages, 1000);
}






function executeSpotBuy() {
  const amountInput = document.getElementById('spot-amount');
  const amount = parseFloat(amountInput.value);
  
  if (!amount || amount < 5) {
    showTradingNotification('❌ Montant minimum: 5$', 'error');
    return;
  }
  
  if (VirtualTrading.buy(selectedCrypto, amount)) {
    amountInput.value = '';
  }
}

function executeSpotSell(percentage) {
  VirtualTrading.sell(selectedCrypto, percentage);
}

// ===== SCRIPT TRADINGVIEW =====
function loadTradingViewScript() {
  return new Promise((resolve, reject) => {
    if (typeof TradingView !== 'undefined') {
      resolve();
      return;
    }
    
    if (document.querySelector('script[src*="tradingview.com"]')) {
      const checkTradingView = setInterval(() => {
        if (typeof TradingView !== 'undefined') {
          clearInterval(checkTradingView);
          resolve();
        }
      }, 100);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      console.log('📊 TradingView library chargée');
      resolve();
    };
    script.onerror = () => {
      console.log('⚠️ Erreur chargement TradingView');
      reject();
    };
    
    document.head.appendChild(script);
  });
}


// ===== INITIALISATION =====
async function initTradingSystem() {
  console.log('🚀 Initialisation système de trading avec levier...');
  
  // ATTENDRE FIREBASE
  await waitForFirebase();
  console.log('✅ Firebase disponible pour trading');
  
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
  }
  
  // Initialiser l'interface (au lieu de créer du HTML)
  if (!initTradingInterface()) {
    console.error('❌ Échec initialisation interface trading');
    return;
  }
  
  

  await VirtualTrading.init();
  this.lastSyncTime = Date.now();
  
  // ← AJOUTER CES LIGNES :
  // Forcer la mise à jour de l'affichage après chargement
  setTimeout(async () => {
    await VirtualTrading.loadFromFirebase(); // ← CHARGER FIREBASE D'ABORD
    VirtualTrading.updatePortfolioValue();
    VirtualTrading.updatePositionsDisplay();
    VirtualTrading.updateTradeHistory();
    console.log('🔄 Affichage forcé - Portfolio:', VirtualTrading.portfolio.totalValue);
  }, 2000); // ← AUGMENTER LE DÉLAI
  
  await initDynamicCryptoList();
 
  // Initialiser les calculs TP/SL
  setTimeout(() => {
    initTPSLCalculations();
  }, 2000);
  
  
  try {
    await loadTradingViewScript();
    window.tradingViewWidget = new TradingViewIntegration();
    
    setTimeout(() => {
      window.tradingViewWidget.init();
    }, 1000);
    
  } catch (error) {
    console.log('⚠️ TradingView non disponible, utilisation du fallback');
    window.tradingViewWidget = new TradingViewIntegration();
    window.tradingViewWidget.createFallbackChart();
  }
    
  console.log('✅ Système de trading avec levier initialisé');

  // ===== SYNCHRONISATION TEMPS RÉEL =====
function setupRealtimeSync() {
    if (!window.firebaseDb || !window.firebaseAuth?.currentUser) return;
    
    console.log('🔄 Activation sync temps réel');
    
    // Écouter les changements du document utilisateur
    window.realtimeListener = window.firebaseDb
        .collection('users')
        .doc(window.firebaseAuth.currentUser.uid)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Vérifier si ce sont de nouvelles données
                const lastUpdate = data.lastTradingUpdate?.toMillis() || 0;
                const ourLastUpdate = VirtualTrading.lastSyncTime || Date.now() - 10000; // 10 sec dans le passé
                
                if (lastUpdate > ourLastUpdate) {
                    console.log('📨 Nouvelles données détectées - synchronisation');
                    
                    // Mettre à jour le portfolio local
                    if (data.trades) VirtualTrading.trades = data.trades;
                    if (data.positions) VirtualTrading.positions = data.positions;
                    if (data.portfolio) VirtualTrading.portfolio.balance = data.portfolio;
                    if (data.dailyGain) VirtualTrading.portfolio.pnl = data.dailyGain;
                    
                    // Rafraîchir l'affichage
                    VirtualTrading.updatePortfolioValue();
                    VirtualTrading.updatePositionsDisplay();
                    VirtualTrading.updateTradeHistory();
                    
                    // Mettre à jour le timestamp
                    VirtualTrading.lastSyncTime = lastUpdate;
                    
                    showTradingNotification('🔄 Données synchronisées', 'info');
                }
            }
        });
    
      // Nettoyer l'écoute quand on quitte
      window.addEventListener('beforeunload', () => {
          if (window.realtimeListener) {
              window.realtimeListener();
              console.log('🔇 Écouteur Firebase fermé');
          }
      });
}
}

// ===== DÉBOGAGE =====
function debugTradingSystem() {
  console.log('🔍 === DÉBOGAGE SYSTÈME TRADING ===');
  console.log('Portfolio:', VirtualTrading.portfolio);
  console.log('Positions:', VirtualTrading.positions);
  console.log('Trades:', VirtualTrading.trades.length);
  console.log('Prix:', VirtualTrading.prices);
  console.log('TradingView Widget:', window.tradingViewWidget);
  console.log('Selected Crypto:', selectedCrypto);
  console.log('Current User:', window.currentUser);
}




// ===== FONCTION EDIT POSITION =====
function editPosition(positionId) {
  const position = VirtualTrading.positions.find(p => p.id === positionId);
  if (!position) return;
  
  const crypto = Object.values(AVAILABLE_CRYPTOS).find(c => c.symbol + 'USDT' === position.symbol) ||
                window.cryptoLoader?.cryptos[position.symbol];
  
  const currentPrice = VirtualTrading.prices[position.symbol] || position.entryPrice;
  
  // Créer la popup
  const overlay = document.createElement('div');
  overlay.className = 'edit-position-overlay';
  overlay.innerHTML = `
    <div class="edit-position-popup">
      <div class="edit-popup-header">
        <h3>✏️ Modifier Position</h3>
        <button class="edit-popup-close">✕</button>
      </div>
      <div class="edit-popup-body">
        <div class="edit-position-info">
          <h4 style="color: #00ff88; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <img src="https://assets.coincap.io/assets/icons/${crypto?.symbol.toLowerCase()}@2x.png" 
                 alt="${crypto?.symbol}" 
                 style="width: 24px; height: 24px; border-radius: 50%;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
            <span style="color: ${crypto?.color}; font-size: 1.2rem; display: none;">${crypto?.icon}</span>
            ${crypto?.name || position.symbol} - ${position.type} x${position.leverage}
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0.5rem 0;">
            <div>
              <strong style="color: rgba(255,255,255,0.8);">Prix d'entrée:</strong>
              <p style="margin: 0; color: #00ccff; font-size: 1.1rem; font-weight: bold;">${position.entryPrice.toFixed(5)}$</p>
            </div>
            <div>
              <strong style="color: rgba(255,255,255,0.8);">Prix actuel:</strong>
              <p id="live-price" style="margin: 0; color: #00ff88; font-size: 1.1rem; font-weight: bold;">${currentPrice.toFixed(5)}$</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0.5rem 0;">
            <div>
              <strong style="color: rgba(255,255,255,0.8);">Marge utilisée:</strong>
              <p style="margin: 0; color: #ffffff;">${position.margin.toFixed(2)}$</p>
            </div>
            <div>
              <strong style="color: rgba(255,255,255,0.8);">PnL actuel:</strong>
              <p id="live-pnl" style="margin: 0; color: ${position.unrealizedPnL >= 0 ? '#00ff88' : '#ff4757'}; font-weight: bold;">
                ${position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}$
              </p>
            </div>
          </div>
        </div>
        
        <div class="edit-tpsl-inputs">
          <div class="form-group">
            <label>🎯 Take Profit ($)</label>
            <input type="number" id="edit-take-profit" value="${position.takeProfit || ''}" 
                   placeholder="Prix de sortie gagnant" step="0.00001" min="0">
            <small class="tp-info" style="color: #00ff88; font-size: 0.8rem;"></small>
          </div>
          <div class="form-group">
            <label>🛑 Stop Loss ($)</label>
            <input type="number" id="edit-stop-loss" value="${position.stopLoss || ''}" 
                   placeholder="Prix de sortie perdant" step="0.00001" min="0">
            <small class="sl-info" style="color: #ff4757; font-size: 0.8rem;"></small>
          </div>
        </div>
        
        <div class="edit-popup-buttons">
          <button class="btn-edit-cancel">❌ Annuler</button>
          <button class="btn-edit-save">💾 Sauvegarder</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Animer l'ouverture
  setTimeout(() => overlay.classList.add('active'), 10);
  
// Fonctions de validation en temps réel
const updateValidation = () => {
  const tpInput = document.getElementById('edit-take-profit');
  const slInput = document.getElementById('edit-stop-loss');
  const tpInfo = document.querySelector('.tp-info');
  const slInfo = document.querySelector('.sl-info');
  
  const tp = parseFloat(tpInput.value);
  const sl = parseFloat(slInput.value);
  
  // Validation et calcul Take Profit
  if (tp > 0) {
    const tpValid = (position.type === 'LONG' && tp > currentPrice) || 
                   (position.type === 'SHORT' && tp < currentPrice);
    
    if (tpValid) {
      const priceDiff = Math.abs(tp - currentPrice);
      const priceChangePercent = (priceDiff / currentPrice) * 100;
      const tpPnL = (priceChangePercent * position.leverage * position.margin) / 100;
      const tpPercent = (tpPnL / position.margin) * 100;
      
      tpInfo.textContent = `✅ Gain potentiel: +${tpPercent.toFixed(2)}% (+$${tpPnL.toFixed(2)})`;
      tpInfo.style.color = '#00ff88';
    } else {
      tpInfo.textContent = `❌ ${position.type === 'LONG' ? 'TP doit être > ' : 'TP doit être < '}${currentPrice.toFixed(2)}$`;
      tpInfo.style.color = '#ff4757';
    }
  } else {
    tpInfo.textContent = '';
  }
  
  // Validation et calcul Stop Loss
  if (sl > 0) {
    const slValid = (position.type === 'LONG' && sl < currentPrice) || 
                   (position.type === 'SHORT' && sl > currentPrice);
    
    if (slValid) {
      const priceDiff = Math.abs(sl - currentPrice);
      const priceChangePercent = (priceDiff / currentPrice) * 100;
      const slPnL = (priceChangePercent * position.leverage * position.margin) / 100;
      const slPercent = (slPnL / position.margin) * 100;
      
      slInfo.textContent = `✅ Perte potentielle: -${slPercent.toFixed(2)}% (-$${slPnL.toFixed(2)})`;
      slInfo.style.color = '#ff4757';
    } else {
      slInfo.textContent = `❌ ${position.type === 'LONG' ? 'SL doit être < ' : 'SL doit être > '}${currentPrice.toFixed(2)}$`;
      slInfo.style.color = '#ff4757';
    }
  } else {
    slInfo.textContent = '';
  }
};
  
  // Événements
  document.getElementById('edit-take-profit').addEventListener('input', updateValidation);
  document.getElementById('edit-stop-loss').addEventListener('input', updateValidation);
  
  // Fermer popup avec nettoyage
  const closePopupWithCleanup = () => {
    if (typeof priceInterval !== 'undefined') {
      clearInterval(priceInterval);
    }
    overlay.classList.remove('active');
    setTimeout(() => document.body.removeChild(overlay), 300);
  };
  
  overlay.querySelector('.edit-popup-close').addEventListener('click', closePopupWithCleanup);
  overlay.querySelector('.btn-edit-cancel').addEventListener('click', closePopupWithCleanup);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopupWithCleanup();
  });
  
  // Sauvegarder
  overlay.querySelector('.btn-edit-save').addEventListener('click', () => {
    const newTP = parseFloat(document.getElementById('edit-take-profit').value) || null;
    const newSL = parseFloat(document.getElementById('edit-stop-loss').value) || null;
    
    // Mettre à jour la position
    position.takeProfit = newTP;
    position.stopLoss = newSL;
    
    // Sauvegarder
    VirtualTrading.saveToStorage();
    if (typeof window.saveTradingData === 'function') {
      window.saveTradingData(VirtualTrading.portfolio.balance, VirtualTrading.trades, VirtualTrading.portfolio.pnl, VirtualTrading.positions);
    }
    
    showTradingNotification('✅ Position modifiée avec succès!', 'success');
    VirtualTrading.updatePositionsDisplay();
    closePopup();
  });
  

  // Validation initiale
  updateValidation();

  // Mettre à jour les prix en temps réel
  const updateLivePrices = () => {
    const livePrice = VirtualTrading.prices[position.symbol] || position.entryPrice;
    const livePriceElement = document.getElementById('live-price');
    const livePnlElement = document.getElementById('live-pnl');

    if (livePriceElement) {
      livePriceElement.textContent = `${livePrice.toFixed(5)}$`;

      // Calculer le PnL en temps réel
      const priceDiff = livePrice - position.entryPrice;
      let liveUnrealizedPnL = 0;

      if (position.type === 'LONG') {
        liveUnrealizedPnL = (priceDiff / position.entryPrice) * position.notionalValue;
      } else {
        liveUnrealizedPnL = -(priceDiff / position.entryPrice) * position.notionalValue;
      }

      if (livePnlElement) {
        const pnlSign = liveUnrealizedPnL >= 0 ? '+' : '';
        livePnlElement.textContent = `${pnlSign}${liveUnrealizedPnL.toFixed(2)}$`;
        livePnlElement.style.color = liveUnrealizedPnL >= 0 ? '#00ff88' : '#ff4757';
      }

      // Mettre à jour aussi la validation avec le nouveau prix
      updateValidation();
    }
  };

  // Lancer la mise à jour toutes les 2 secondes
  const priceInterval = setInterval(updateLivePrices, 2000);

}









// ===== EXPOSITION GLOBALE =====
window.editPosition = editPosition;
window.VirtualTrading = VirtualTrading;
window.TradingViewIntegration = TradingViewIntegration;
window.initTradingSystem = initTradingSystem;
window.selectCrypto = selectCrypto;
window.executeLeverageTrade = executeLeverageTrade;
window.executeSpotBuy = executeSpotBuy;
window.executeSpotSell = executeSpotSell;
window.debugTradingSystem = debugTradingSystem;
window.LEVERAGE_OPTIONS = LEVERAGE_OPTIONS;
window.executeTrade = executeTrade;


// ===== GESTION ÉVÉNEMENTS =====
window.addEventListener('beforeunload', () => {
  if (priceUpdateInterval) clearInterval(priceUpdateInterval);

// SAUVEGARDE FIREBASE À LA DÉCONNEXION
if (typeof window.saveTradingData === 'function' && window.currentUser && window.isLoggedIn) {
  console.log('💾 Sauvegarde à la déconnexion pour:', window.currentUser.name);
  window.saveTradingData(VirtualTrading.portfolio.balance, VirtualTrading.trades, VirtualTrading.portfolio.pnl, VirtualTrading.positions);
} else {
  console.log('🚫 Sauvegarde annulée - utilisateur déconnecté');
}

  VirtualTrading.saveToStorage();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    VirtualTrading.saveToStorage();
  }
});

console.log('✅ Système de trading avec levier CryptoTraders Pro COMPLET chargé');
console.log('🎯 Fonctionnalités: Levier x1-x100, Long/Short, Spot, Sync Dashboard');
console.log('📊 Utilisez initTradingSystem() pour démarrer');
console.log('🔍 Utilisez debugTradingSystem() pour déboguer');

window.debugPortfolio = () => VirtualTrading.debug();




// ===== CODE DÉPLACÉ DEPUIS DASHBOARD-MAIN.JS =====

// ===== CHARGEMENT TRADING SYSTEM =====
function loadTradingSystem() {
    return new Promise((resolve) => {
        if (typeof VirtualTrading !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = '../tradingview/trading-system.js';
        script.onload = () => {
            console.log('📊 Trading system chargé');
            resolve();
        };
        document.head.appendChild(script);
    });
}

// ===== SYNCHRONISATION OVERVIEW =====
function syncTradingDataToOverview() {
    if (typeof VirtualTrading !== 'undefined' && VirtualTrading.portfolio) {
        // Vérifier que ce ne sont pas les données par défaut
        if (VirtualTrading.portfolio.totalValue === 500 && VirtualTrading.portfolio.pnl === 0) {
            console.log('⏳ Données par défaut, attente données réelles...');
            return;
        }
        
        // Mettre à jour currentUser avec les vraies données
        if (window.currentUser) {
            //window.currentUser.portfolio = VirtualTrading.portfolio.totalValue;
            window.currentUser.dailyGain = VirtualTrading.portfolio.pnl;
        }
        
        // Mettre à jour l'affichage si on est dans le dashboard
        if (typeof updateOverviewMetrics === 'function') {
            updateOverviewMetrics();
        }
        
        console.log('🔄 Overview synchronisé avec trading:', VirtualTrading.portfolio.totalValue);
    }
}

// ===== INITIALISATION AUTOMATIQUE TRADING =====
function initTradingFromDashboard() {
    console.log('📊 Initialisation trading depuis dashboard');
    
    // Code déplacé d'initDashboard
    loadTradingSystem().then(() => {
        setTimeout(() => {
            if (typeof VirtualTrading !== 'undefined') {
                VirtualTrading.loadFromStorage();
                VirtualTrading.init();
                syncTradingDataToOverview();
            }
        }, 1000);
    });
    
    console.log('✅ Trading initialisé depuis dashboard');
}


// Auto-démarrage si on est sur la page trading
if (window.location.pathname.includes('trading.html')) {
    document.addEventListener('DOMContentLoaded', () => {

      // Gestion couleur du select direction
const directionSelect = document.getElementById('direction-select');
if (directionSelect) {
    directionSelect.addEventListener('change', function() {
        directionSelect.classList.remove('long-selected', 'short-selected');
        if (this.value === 'LONG') {
            directionSelect.classList.add('long-selected');
        } else if (this.value === 'SHORT') {
            directionSelect.classList.add('short-selected');
        }
    });
    
    // Initialiser avec la valeur par défaut
    if (directionSelect.value === 'LONG') {
        directionSelect.classList.add('long-selected');
    }
}
        initTradingSystem();
        initTradingFromDashboard();
    });
}