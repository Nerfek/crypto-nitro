// ===== SYSTÈME DE CHARGEMENT DYNAMIQUE DES CRYPTOS =====

console.log('🚀 Chargement dynamique des cryptomonnaies');


// Valider et corriger les symboles TradingView
function validateTradingViewSymbol(symbol) {
  // Nettoyer le symbole d'abord
  const cleanSymbol = symbol.replace('USDT', '').toUpperCase();
  
  // Cas spéciaux connus
  const specialCases = {
    'LUNA': 'BYBIT:LUNAUSDT',
    'UST': 'BYBIT:USTUSDT',
    'FTM': 'BINANCE:FTMUSDT',
    'NEAR': 'BINANCE:NEARUSDT',
    'ALGO': 'BINANCE:ALGOUSDT',
    'VET': 'BINANCE:VETUSDT'
  };
  
  // Si cas spécial
  if (specialCases[cleanSymbol]) {
    return specialCases[cleanSymbol];
  }
  
  // Pour les cryptos principales, utiliser BINANCE
  const binancePairs = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'DOGE', 'MATIC', 'LTC', 'LINK'];
  if (binancePairs.includes(cleanSymbol)) {
    return `BINANCE:${cleanSymbol}USDT`;
  }
  
  // Pour les autres, essayer COINBASE avec USD
  return `COINBASE:${cleanSymbol}USD`;
}

// Système de chargement des cryptos
class CryptoLoader {
  constructor() {
    this.cryptos = {};
    this.isLoaded = false;
    this.cache = null;
    this.lastUpdate = 0;
    this.cacheTime = 5 * 60 * 1000; // 5 minutes
  }

// Charger les cryptos depuis CoinGecko avec compléments Binance
async loadFromCoinGecko() {
  try {
    console.log('📡 Chargement cryptos depuis CoinGecko + Binance...');
    
    // 1. Récupérer les données de base depuis CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const coins = await response.json();
    
    // 2. Récupérer les vraies stats 24h depuis Binance
    const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    const binanceStats = await binanceResponse.json();
    
    // Créer un map des stats Binance
    const binanceMap = {};
    binanceStats.forEach(stat => {
      binanceMap[stat.symbol] = {
        high: parseFloat(stat.highPrice),
        low: parseFloat(stat.lowPrice),
        volume: parseFloat(stat.quoteVolume),
        change: parseFloat(stat.priceChangePercent)
      };
    });
    
    console.log(`✅ ${coins.length} cryptos chargées depuis CoinGecko + Binance`);
    
    // 3. Combiner les données
    const cryptoData = {};
    
    coins.forEach(coin => {
      const tvSymbol = coin.symbol.toUpperCase() + 'USDT';
      const binanceData = binanceMap[tvSymbol];
      
      cryptoData[tvSymbol] = {
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        icon: this.generateIcon(coin.symbol),
        color: this.generateColor(coin.name),
        price: coin.current_price,
        change24h: binanceData ? binanceData.change : coin.price_change_percentage_24h,
        high24h: binanceData ? binanceData.high : coin.current_price * 1.05,
        low24h: binanceData ? binanceData.low : coin.current_price * 0.95,
        volume: binanceData ? binanceData.volume : coin.total_volume,
        marketCap: coin.market_cap,
        coinGeckoId: coin.id,
        minOrder: this.getMinOrder(coin.current_price)
      };
    });
    
    this.cryptos = cryptoData;
    this.isLoaded = true;
    this.cache = cryptoData;
    this.lastUpdate = Date.now();
    
    return cryptoData;
    
  } catch (error) {
    console.error('❌ Erreur CoinGecko:', error);
    return this.loadFromBinance();
  }
}


  // Charger les cryptos depuis Binance (alternative)
  async loadFromBinance() {
    try {
      console.log('📡 Chargement cryptos depuis Binance...');
      
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const tickers = await response.json();
      console.log(`✅ ${tickers.length} paires chargées depuis Binance`);
      
      // Filtrer seulement les paires USDT
      const usdtPairs = tickers.filter(ticker => 
        ticker.symbol.endsWith('USDT') && 
        !ticker.symbol.includes('UP') && 
        !ticker.symbol.includes('DOWN') &&
        !ticker.symbol.includes('BEAR') &&
        !ticker.symbol.includes('BULL')
      );
      
      // Trier par volume
      usdtPairs.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
      
      // Prendre les 50 plus liquides
      const topPairs = usdtPairs.slice(0, 50);
      
      const cryptoData = {};
      
      topPairs.forEach(ticker => {
        const symbol = ticker.symbol.replace('USDT', '');
        
        cryptoData[ticker.symbol] = {
          name: this.getCryptoName(symbol),
          symbol: symbol,
          icon: this.generateIcon(symbol),
          color: this.generateColor(symbol),
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          volume: parseFloat(ticker.quoteVolume),
          minOrder: this.getMinOrder(parseFloat(ticker.lastPrice))
        };
      });
      
      this.cryptos = cryptoData;
      this.isLoaded = true;
      this.cache = cryptoData;
      this.lastUpdate = Date.now();
      
      return cryptoData;
      
    } catch (error) {
      console.error('❌ Erreur Binance:', error);
      return this.loadFallback();
    }
  }

  // Pas de fallback - toujours les vraies données
  loadFallback() {
    console.log('❌ Pas de fallback, données en attente...');
    return {};
  }

  // Méthode principale de chargement
  async loadCryptos() {
    // Vérifier le cache
    if (this.cache && (Date.now() - this.lastUpdate) < this.cacheTime) {
      console.log('📋 Utilisation du cache cryptos');
      this.cryptos = this.cache;
      this.isLoaded = true;
      return this.cryptos;
    }

    // FORCER le chargement des vraies données
    try {
      const data = await this.loadFromCoinGecko();
      if (Object.keys(data).length > 10) return data;
      throw new Error('Pas assez de cryptos');
    } catch (error) {
      console.log('⚠️ CoinGecko échec, essai Binance...');
      return await this.loadFromBinance();
    }
  }

  // Générer une icône pour une crypto
  generateIcon(symbol) {
    const icons = {
      'BTC': '₿', 'ETH': 'Ξ', 'SOL': '◎', 'ADA': '₳', 'DOGE': 'Ð',
      'XRP': '◆', 'DOT': '●', 'AVAX': '▲', 'LINK': '🔗', 'MATIC': '⬢',
      'LTC': 'Ł', 'BCH': '₿', 'ATOM': '⚛', 'FIL': '🗂', 'TRX': '♦',
      'UNI': '🦄', 'AAVE': '👻', 'SUSHI': '🍣', 'COMP': '🔴', 'MKR': '🟡'
    };
    
    return icons[symbol.toUpperCase()] || '🪙';
  }

  // Générer une couleur pour une crypto
  generateColor(name) {
    const colors = [
      '#f7931a', '#627eea', '#9945ff', '#0033ad', '#c2a633',
      '#23292f', '#e6007a', '#e84142', '#2a5ada', '#8247e5',
      '#345d9d', '#f89c35', '#1e90ff', '#ff6b6b', '#4ecdc4'
    ];
    
    // Hash simple du nom pour couleur consistante
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Obtenir le nom complet d'une crypto
  getCryptoName(symbol) {
    const names = {
      'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana',
      'ADA': 'Cardano', 'DOGE': 'Dogecoin', 'XRP': 'XRP',
      'DOT': 'Polkadot', 'AVAX': 'Avalanche', 'LINK': 'Chainlink',
      'MATIC': 'Polygon', 'LTC': 'Litecoin', 'BCH': 'Bitcoin Cash'
    };
    
    return names[symbol.toUpperCase()] || symbol.toUpperCase();
  }

  // Calculer l'ordre minimum basé sur le prix
  getMinOrder(price) {
    if (price > 1000) return 0.0001;
    if (price > 100) return 0.001;
    if (price > 10) return 0.01;
    if (price > 1) return 0.1;
    return 1;
  }

  // Rechercher des cryptos
  searchCryptos(query) {
    if (!this.isLoaded) return [];
    
    const searchTerm = query.toLowerCase();
    const results = [];
    
    Object.keys(this.cryptos).forEach(symbol => {
      const crypto = this.cryptos[symbol];
      
      if (
        crypto.name.toLowerCase().includes(searchTerm) ||
        crypto.symbol.toLowerCase().includes(searchTerm) ||
        symbol.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          symbol: symbol,
          ...crypto
        });
      }
    });
    
    return results.slice(0, 20); // Limiter à 20 résultats
  }

  // Obtenir les cryptos par catégorie
  getCryptosByCategory(category = 'popular') {
    if (!this.isLoaded) return [];
    
    const allCryptos = Object.keys(this.cryptos).map(symbol => ({
      symbol: symbol,
      ...this.cryptos[symbol]
    }));
    
    switch (category) {
      case 'popular':
        return allCryptos.slice(0, 20);
      case 'volume':
        return allCryptos.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 20);
      case 'gainers':
        return allCryptos.filter(c => c.change24h > 0).sort((a, b) => b.change24h - a.change24h).slice(0, 20);
      case 'losers':
        return allCryptos.filter(c => c.change24h < 0).sort((a, b) => a.change24h - b.change24h).slice(0, 20);
      default:
        return allCryptos.slice(0, 20);
    }
  }
}

// Instance globale
const cryptoLoader = new CryptoLoader();

// Fonctions d'intégration avec le système existant
async function initDynamicCryptoList() {
  console.log('🔄 Initialisation liste dynamique des cryptos...');
  
  // Charger les cryptos ET attendre que ce soit fini
  await cryptoLoader.loadCryptos();
  
  // Mettre à jour l'interface
  updateCryptoSelector();
  
  console.log('✅ Liste dynamique des cryptos initialisée');
  
  // MAINTENANT sélectionner Bitcoin avec les vraies données
  setTimeout(() => {
    const btcData = cryptoLoader.cryptos['BTCUSDT'];
    if (btcData) {
      console.log('🚀 Bitcoin sélectionné avec vraies données:', btcData.price);
      selectDynamicCrypto('BTCUSDT', btcData);
    } else {
      console.log('❌ Pas de données Bitcoin trouvées');
    }
  }, 500);
}

function updateCryptoSelector() {
  const cryptoList = document.querySelector('.crypto-list');
  if (!cryptoList) return;
  
  console.log('🔄 Mise à jour sélecteur de cryptos...');
  
  // Vider la liste actuelle
  cryptoList.innerHTML = '';
  
  // Ajouter une barre de recherche
  const searchContainer = document.createElement('div');
  searchContainer.className = 'crypto-search-container';
  searchContainer.innerHTML = `
    <input type="text" id="crypto-search" placeholder="🔍 Rechercher une crypto..." class="crypto-search-input">
    <div class="crypto-categories">
      <button class="crypto-category-btn active" data-category="popular">📈 Populaires</button>
      <button class="crypto-category-btn" data-category="volume">📊 Volume</button>
      <button class="crypto-category-btn" data-category="gainers">🚀 Gagnants</button>
      <button class="crypto-category-btn" data-category="losers">📉 Perdants</button>
    </div>
  `;
  
  cryptoList.appendChild(searchContainer);
  
  // Container pour les cryptos
  const cryptosContainer = document.createElement('div');
  cryptosContainer.className = 'cryptos-container';
  cryptoList.appendChild(cryptosContainer);

  // Charger les cryptos populaires par défaut
  loadCryptoCategory('popular');
  
  
  // Événements de recherche
  const searchInput = document.getElementById('crypto-search');
  searchInput.addEventListener('input', handleCryptoSearch);
  
  // Événements des catégories
  document.querySelectorAll('.crypto-category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.crypto-category-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadCryptoCategory(e.target.dataset.category);
    });
  });
}

function loadCryptoCategory(category) {
  const cryptos = cryptoLoader.getCryptosByCategory(category);
  displayCryptos(cryptos);
}

function handleCryptoSearch(e) {
  const query = e.target.value.trim();
  
  if (query.length === 0) {
    // Garder la catégorie active
    const activeBtn = document.querySelector('.crypto-category-btn.active');
    const activeCategory = activeBtn ? activeBtn.dataset.category : 'popular';
    loadCryptoCategory(activeCategory);
    return;
  }
  
  if (query.length >= 2) {
    const results = cryptoLoader.searchCryptos(query);
    displayCryptos(results);
  }
}
  
function displayCryptos(cryptos) {
  // ===== SAUVEGARDER POSITION SCROLL =====
  let container = document.querySelector('.cryptos-container');
  const scrollPosition = container ? container.scrollTop : 0;
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'cryptos-container';
    const cryptoList = document.querySelector('.crypto-list');
    if (cryptoList) cryptoList.appendChild(container);
  }
  
  container.innerHTML = '';
  
  if (cryptos.length === 0) {
    container.innerHTML = '<div class="no-cryptos">🔍 Aucune crypto trouvée</div>';
    return;
  }
  
  cryptos.forEach(crypto => {
    const cryptoDiv = document.createElement('div');
    cryptoDiv.className = 'crypto-item';
    cryptoDiv.dataset.symbol = crypto.symbol;
    
    const changeClass = crypto.change24h >= 0 ? 'positive' : 'negative';
    const changeSign = crypto.change24h >= 0 ? '+' : '';
    
cryptoDiv.innerHTML = `
  <img class="crypto-logo" src="https://assets.coincap.io/assets/icons/${crypto.symbol.toLowerCase()}@2x.png" alt="${crypto.symbol}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
  <span class="crypto-icon-fallback" style="color: ${crypto.color}; display: none;">${crypto.icon}</span>
  <div class="crypto-info">
    <strong>${crypto.name}</strong>
    <small>${crypto.symbol}</small>
  </div>
  <div style="text-align: right;">
    <div class="crypto-price">${crypto.price ? '$' + crypto.price.toLocaleString('fr-FR', { minimumFractionDigits: crypto.price > 1 ? 2 : 6, maximumFractionDigits: crypto.price > 1 ? 2 : 6 }) : '$---'}</div>
    ${crypto.change24h ? `<small class="${changeClass}" style="display: block;">${changeSign}${crypto.change24h.toFixed(2)}%</small>` : ''}
  </div>
`;


    // Événement de sélection
    cryptoDiv.addEventListener('click', () => {
      selectDynamicCrypto(crypto.symbol, crypto);
    });
    
    container.appendChild(cryptoDiv);
  });
  
  // ===== RESTAURER POSITION SCROLL =====
  setTimeout(() => {
    container.scrollTop = scrollPosition;
  }, 0);
}

function selectDynamicCrypto(symbol, cryptoData) {
  // Mettre à jour la sélection visuelle
  document.querySelectorAll('.crypto-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  document.querySelector(`[data-symbol="${symbol}"]`)?.classList.add('selected');
  
  // Intégrer avec le système de trading existant
    if (typeof selectCrypto === 'function') {
      selectedCrypto = symbol;
      selectCrypto(symbol);
    }

// Mettre à jour TradingView avec validation du symbole
if (window.tradingViewWidget) {
  // Essayer plusieurs formats pour TradingView
  let validatedSymbol = `BINANCE:${symbol}`;
  
  // Cas spéciaux pour certaines cryptos
  if (symbol === 'BTCUSDT') validatedSymbol = 'BINANCE:BTCUSDT';
  if (symbol === 'ETHUSDT') validatedSymbol = 'BINANCE:ETHUSDT';
  
  try {
    // Essayer la méthode principale
    if (window.tradingViewWidget.setSymbol) {
      window.tradingViewWidget.setSymbol(validatedSymbol);
    } else if (window.tradingViewWidget.chart) {
      window.tradingViewWidget.chart().setSymbol(validatedSymbol);
    }
    console.log("✅ TradingView symbole:", validatedSymbol);
  } catch (error) {
    // Si échec, essayer COINBASE avec USD
    const coinbaseSymbol = `COINBASE:${symbol.replace('USDT', 'USD')}`;
    try {
      if (window.tradingViewWidget.setSymbol) {
        window.tradingViewWidget.setSymbol(coinbaseSymbol);
      } else if (window.tradingViewWidget.chart) {
        window.tradingViewWidget.chart().setSymbol(coinbaseSymbol);
      }
      console.log("✅ TradingView symbole alternatif:", coinbaseSymbol);
    } catch (altError) {
      console.log("❌ Symbole non trouvé:", symbol, error, altError);
    }
  }
}


console.log("🎯 Crypto sélectionnée:", cryptoData.name, symbol);

// Mettre à jour selectedCrypto globalement (convertir vers USDT pour trading-system.js)
const fullSymbol = symbol.endsWith('USDT') ? symbol : symbol + 'USDT';
window.selectedCrypto = fullSymbol;
if (typeof selectedCrypto !== 'undefined') {
  selectedCrypto = fullSymbol;
}
console.log('🎯 selectedCrypto mis à jour vers:', fullSymbol);


// Forcer le rechargement du widget TradingView
setTimeout(() => {
  if (window.tradingViewWidget && window.tradingViewWidget.setSymbol) {
    window.tradingViewWidget.setSymbol(validatedSymbol);
  } else if (window.tradingViewWidget && window.tradingViewWidget.chart) {
    window.tradingViewWidget.chart().setSymbol(validatedSymbol);
  }
}, 100);

// Utiliser les données fraîches mises à jour en temps réel
const freshData = window.cryptoLoader.cryptos[symbol] || cryptoData;



console.log('🔄 Sélection crypto avec données fraîches:', freshData.price);
updateCryptoHeader(freshData, symbol);

}

function updateCryptoHeader(cryptoData, symbol) {
  const headerElement = document.querySelector('.crypto-header');
  
  if (!headerElement) {
    // Pas d'erreur si on n'est pas sur la page trading
    return;
  }
  
  // Toujours utiliser les données fraîches de cryptoLoader au lieu des paramètres
  const currentSymbol = window.selectedCrypto || symbol;
  // Convertir ETH -> ETHUSDT pour trouver les bonnes données
  const fullSymbol = currentSymbol.endsWith('USDT') ? currentSymbol : currentSymbol + 'USDT';
  const freshData = window.cryptoLoader?.cryptos[fullSymbol] || cryptoData;

  console.log('🔄 updateCryptoHeader pour:', currentSymbol, '->', fullSymbol, 'prix:', freshData.price);
  
  // Utiliser freshData au lieu de cryptoData dans tout le reste
  const price = freshData.price || 0;
  const change24h = freshData.change24h || 0;
  const high24h = freshData.high24h || price;
  const low24h = freshData.low24h || price;
  const volume = freshData.volume || 0;
  
  const changeClass = change24h >= 0 ? 'positive' : 'negative';
  const changeSign = change24h >= 0 ? '+' : '';
  
  // Mettre à jour avec les vraies données
  headerElement.innerHTML = `
    <div class="crypto-main-info">
      <div class="crypto-main-icon">
        <img src="https://assets.coincap.io/assets/icons/${freshData.symbol.toLowerCase()}@2x.png" 
             alt="${freshData.symbol}" 
             style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <span style="color: ${freshData.color}; font-size: 1.8rem; font-weight: bold; display: none; width: 48px; height: 48px; align-items: center; justify-content: center;">${freshData.icon}</span>
      </div>
      <div class="crypto-price-info">
        <h2>${freshData.name} / USDT</h2>
        <div class="crypto-price-row">
          <span class="crypto-current-price">$${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: price > 1 ? 2 : 6 })}</span>
          <span class="crypto-change-24h ${changeClass}">${changeSign}${change24h.toFixed(2)}%</span>
        </div>
      </div>
    </div>
    <div class="crypto-stats">
      <div class="stat-group">
        <span class="stat-label">24h Haut</span>
        <span class="stat-value">$${high24h.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="stat-group">
        <span class="stat-label">24h Bas</span>
        <span class="stat-value">$${low24h.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="stat-group">
        <span class="stat-label">Volume 24h</span>
        <span class="stat-value">$${volume.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  `;
}

// Exposer la fonction globalement
window.updateCryptoHeader = updateCryptoHeader;

// Mettre à jour les prix dans la liste en temps réel (même système que le header)
function updateCryptoListPrices() {
  if (!window.cryptoLoader?.isLoaded) return;
  
  // Récupérer les éléments visibles dans la liste
  const visibleCryptoElements = document.querySelectorAll('.crypto-item[data-symbol]');
  
  visibleCryptoElements.forEach(cryptoElement => {
    const symbol = cryptoElement.dataset.symbol;
    
    // Convertir le symbole : BTC → BTCUSDT
    const fullSymbol = symbol.endsWith('USDT') ? symbol : symbol + 'USDT';
    
    // Utiliser les MÊMES données que le header
    const cryptoData = window.cryptoLoader.cryptos[fullSymbol];
    if (!cryptoData) {
      console.log(`❌ Pas de données pour ${symbol} (cherché: ${fullSymbol})`);
      return;
    }
 
    
    // Mettre à jour le prix
    const priceElement = cryptoElement.querySelector('.crypto-price');
    if (priceElement && cryptoData.price) {
      const newPrice = '$' + cryptoData.price.toLocaleString('fr-FR', { 
        minimumFractionDigits: cryptoData.price > 1 ? 2 : 6, 
        maximumFractionDigits: cryptoData.price > 1 ? 2 : 6 
      });
      priceElement.textContent = newPrice;
    }
    
    // Mettre à jour le pourcentage
    const rightDiv = cryptoElement.querySelector('div[style*="text-align: right"] small');
    if (rightDiv && cryptoData.change24h !== undefined) {
      const changeSign = cryptoData.change24h >= 0 ? '+' : '';
      rightDiv.textContent = `${changeSign}${cryptoData.change24h.toFixed(2)}%`;
      rightDiv.className = cryptoData.change24h >= 0 ? 'positive' : 'negative';
    }
  });
}


// Exposer la fonction globalement
window.updateCryptoListPrices = updateCryptoListPrices;

// CSS pour la nouvelle interface
const dynamicCryptoCSS = `
.crypto-sidebar {
  background: rgba(0, 255, 136, 0.05);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 15px;
  padding: 1.5rem;
}

.crypto-logo {
  width: 30px !important;
  height: 30px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
  flex-shrink: 0 !important;
}

.crypto-icon-fallback {
  width: 30px !important;
  text-align: center !important;
  flex-shrink: 0 !important;
  font-size: 1.5rem !important;
}

.crypto-search-container {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(26, 26, 46, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 136, 0.2);
}

.crypto-search-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 20, 40, 0.8);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  color: #ffffff;
  margin-bottom: 1rem;
}

.crypto-search-input:focus {
  outline: none;
  border-color: #00ff88;
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

.crypto-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.crypto-category-btn {
  padding: 0.5rem;
  background: rgba(0, 20, 40, 0.6);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.crypto-category-btn:hover {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
}

.crypto-category-btn.active {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.cryptos-container {
  height: 550px;
  overflow-y: auto;
  overflow-x: hidden;
}


.cryptos-container::-webkit-scrollbar {
  width: 8px;
}

.cryptos-container::-webkit-scrollbar-track {
  background: rgba(0, 20, 40, 0.4);
  border-radius: 4px;
}

.cryptos-container::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 136, 0.6);
  border-radius: 4px;
  border: 1px solid rgba(0, 255, 136, 0.2);
}

.cryptos-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 136, 0.8);
}

.crypto-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(0, 20, 40, 0.4);
  border: 1px solid rgba(0, 255, 136, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.crypto-item:hover {
  background: rgba(0, 255, 136, 0.1);
  border-color: #00ff88;
  transform: translateX(5px);
}

.crypto-item.selected {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.crypto-price-info {
  margin-left: auto;
  text-align: right;
}

.no-cryptos {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.positive {
  color: #00ff88 !important;
}

.negative {
  color: #ff4757 !important;
}
`;

// Injecter le CSS
const style = document.createElement('style');
style.textContent = dynamicCryptoCSS;
document.head.appendChild(style);

// Exposition globale
window.cryptoLoader = cryptoLoader;

// FORCER la mise à jour du dashboard quand les prix changent
window.addEventListener('cryptoPriceUpdate', () => {
    if (typeof window.updateOverviewMetrics === 'function') {
        window.updateOverviewMetrics();
    }
});

window.initDynamicCryptoList = initDynamicCryptoList;

console.log('✅ Système de chargement dynamique des cryptos chargé');

// Fonction pour ouvrir/fermer la sidebar
function toggleCryptoSidebar() {
  const sidebar = document.querySelector('.crypto-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

window.toggleCryptoSidebar = toggleCryptoSidebar;