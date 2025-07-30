// ===== MAIN.JS - STRUCTURE ET FONCTIONNALITÉS DU SITE =====

console.log('🚀 Décollage vers l\'espace crypto!');

// Variables globales
let currentSection = 0;
let isNavigating = false;
const totalSections = 5;

// Fonction principale de navigation
function scrollToSection(targetSection) {
    console.log('🛸 Navigation vers niveau spatial:', targetSection);
    
    if (targetSection === currentSection || isNavigating) {
        console.log('⚠️ Navigation bloquée');
        return;
    }
    
    if (targetSection < 0 || targetSection >= totalSections) {
        console.log('⚠️ Niveau spatial invalide:', targetSection);
        return;
    }
    
    isNavigating = true;
    console.log(`🚀 Voyage spatial: Niveau ${currentSection} → Niveau ${targetSection}`);
    
    // Mettre à jour les sections
    updateSections(targetSection);
    
    // Mettre à jour les indicateurs
    updateIndicators(targetSection);
    
    // Mettre à jour la navigation
    updateNavigation(targetSection);
    
    // Effets spatiaux (défini dans space-animations.js)
    if (typeof updateSpaceEffects === 'function') {
        updateSpaceEffects(targetSection);
    }
    
    currentSection = targetSection;
    
    setTimeout(() => {
        isNavigating = false;
        console.log(`✅ Navigation spatiale terminée - Niveau: ${currentSection}`);
    }, 200);
}

// Mettre à jour les sections
function updateSections(targetSection) {
    const sections = document.querySelectorAll('.scroll-section');
    
    sections.forEach((section, index) => {
        section.classList.remove('active');
        section.style.opacity = '0';
        section.style.visibility = 'hidden';
        section.style.zIndex = '1';
        section.style.transform = 'translateY(100px) scale(0.95)';
    });
    
    // Afficher la section cible
    if (sections[targetSection]) {
        const targetSectionEl = sections[targetSection];
        targetSectionEl.classList.add('active');
        targetSectionEl.style.opacity = '1';
        targetSectionEl.style.visibility = 'visible';
        targetSectionEl.style.zIndex = '10';
        targetSectionEl.style.transform = 'translateY(0) scale(1)';
        console.log(`✅ Arrivée au niveau spatial ${targetSection}`);
    }
}

// Mettre à jour les indicateurs
function updateIndicators(targetSection) {
    const indicators = document.querySelectorAll('.indicator-level');
    
    indicators.forEach((indicator, index) => {
        if (index === targetSection) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Mettre à jour la navigation
function updateNavigation(targetSection) {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach((link, index) => {
        if (index === targetSection) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Navigation avec la molette
function initWheelNavigation() {
    // Désactiver sur mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    if (isMobile) {
        console.log('📱 Navigation molette désactivée sur mobile');
        return;
    }
    
    // Le reste du code existant pour desktop...
    let scrollTimeout = false;
    let lastScrollTime = 0;
    const scrollEvents = ['wheel', 'mousewheel', 'DOMMouseScroll'];
    
    const handleScroll = (e) => {
        // Ignorer si dans le dashboard
        if (document.querySelector('.user-dashboard.active')) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        if (scrollTimeout || isNavigating || (now - lastScrollTime) < 100) return;
        
        lastScrollTime = now;
        scrollTimeout = true;
        
        // Détection de direction universelle
        let deltaY = 0;
        if (e.deltaY !== undefined) {
            deltaY = e.deltaY;
        } else if (e.wheelDelta !== undefined) {
            deltaY = -e.wheelDelta;
        } else if (e.detail !== undefined) {
            deltaY = e.detail * 40;
        }
        
        console.log('🖱️ Propulsion détectée:', deltaY > 0 ? 'vers l\'espace' : 'vers la Terre');
        
        if (deltaY > 0 && currentSection < totalSections - 1) {
            scrollToSection(currentSection + 1);
        } else if (deltaY < 0 && currentSection > 0) {
            scrollToSection(currentSection - 1);
        }
        
        setTimeout(() => {
            scrollTimeout = false;
        }, 800);
    };
    
    scrollEvents.forEach(eventType => {
        window.addEventListener(eventType, handleScroll, { passive: false, capture: true });
    });
    
    console.log('✅ Système de propulsion activé');
}

// Navigation clavier
function initKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
        if (isNavigating) return;
        
        switch(e.key) {
            case 'ArrowDown':
            case 'PageDown':
            case ' ': // Barre d'espace
                e.preventDefault();
                if (currentSection < totalSections - 1) {
                    scrollToSection(currentSection + 1);
                }
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                if (currentSection > 0) {
                    scrollToSection(currentSection - 1);
                }
                break;
            case 'Home':
                e.preventDefault();
                scrollToSection(0);
                break;
            case 'End':
                e.preventDefault();
                scrollToSection(totalSections - 1);
                break;
        }
    });
    
    console.log('✅ Contrôles clavier activés');
}

// Navigation tactile
function initTouchNavigation() {
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    });
    
    document.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].screenY;
        const diff = touchStartY - touchEndY;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentSection < totalSections - 1) {
                scrollToSection(currentSection + 1);
            } else if (diff < 0 && currentSection > 0) {
                scrollToSection(currentSection - 1);
            }
        }
    });
    
    console.log('✅ Contrôles tactiles activés');
}

// Prix Bitcoin en temps réel
async function loadBitcoinPrice() {
    try {
        console.log('💰 Transmission des données Bitcoin...');
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        
        if (data && data.bitcoin) {
            const price = data.bitcoin.usd;
            const change = data.bitcoin.usd_24h_change;
            
            const priceEl = document.getElementById('btc-price');
            const changeEl = document.getElementById('btc-change');
            
            if (priceEl) {
                priceEl.textContent = `${price.toLocaleString()}`;
            }
            
            if (changeEl) {
                changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                changeEl.className = `btc-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
            
            console.log('✅ Données Bitcoin reçues:', price);
        }
    } catch (error) {
        console.log('❌ Perte de signal spatial:', error);
        const priceEl = document.getElementById('btc-price');
        if (priceEl) priceEl.textContent = 'Signal perdu';
    }
}

// Effets hover sur les cartes
function initCardEffects() {
    const cards = document.querySelectorAll('.service-card, .offer-card');
    console.log('🛸 Initialisation effets cartes:', cards.length);
    
    cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px) scale(1.05)';
            card.style.boxShadow = '0 25px 50px rgba(0, 255, 136, 0.4)';
            card.style.borderColor = '#00ff88';
            card.style.background = 'rgba(0, 255, 136, 0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
            card.style.borderColor = '';
            card.style.background = '';
        });
    });
}

// Animation des satellites crypto
function initCryptoSatellites() {
    const satellites = document.querySelectorAll('.crypto-satellite');
    console.log('🛰️ Initialisation satellites crypto:', satellites.length);
    
    satellites.forEach((satellite) => {
        satellite.addEventListener('mouseenter', () => {
            satellite.style.transform = 'scale(1.3)';
            satellite.style.zIndex = '100';
            satellite.style.boxShadow = '0 20px 40px rgba(0, 255, 136, 0.6)';
            satellite.style.filter = 'brightness(1.3)';
        });
        
        satellite.addEventListener('mouseleave', () => {
            satellite.style.transform = '';
            satellite.style.zIndex = '';
            satellite.style.boxShadow = '';
            satellite.style.filter = '';
        });
    });
}

// Easter egg supernova sur le logo
function initLogoSupernova() {
    const logo = document.querySelector('.logo');
    if (logo) {
        console.log('🌟 Easter egg supernova activé');
        logo.addEventListener('click', () => {
            console.log('💥 SUPERNOVA DÉCLENCHÉE!');
            
            // Effet sur les satellites
            const satellites = document.querySelectorAll('.crypto-satellite');
            satellites.forEach((satellite, index) => {
                setTimeout(() => {
                    satellite.style.transform = 'scale(2) rotate(1440deg)';
                    satellite.style.transition = 'transform 2s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    satellite.style.boxShadow = '0 30px 60px rgba(0, 255, 136, 1)';
                }, index * 150);
            });
            
            // Restaurer après 3 secondes
            setTimeout(() => {
                satellites.forEach((satellite) => {
                    satellite.style.transform = '';
                    satellite.style.transition = 'all 0.3s ease';
                    satellite.style.boxShadow = '';
                });
            }, 3000);
        });
    }
}

// Gestion des liens
function initSpaceLinks() {
    console.log('🔗 Initialisation liens spatiaux');
    
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.textContent.includes('Décoller') || 
                btn.textContent.includes('Rejoindre') || 
                btn.textContent.includes('Mission')) {
                e.preventDefault();
                alert('🚀 Système de paiement spatial prêt! (Intégrez votre solution de paiement ici)');
            } else if (btn.textContent.includes('test')) {
                e.preventDefault();
                alert('🎮 Lancement de la mission de test');
            } else if (btn.textContent.includes('Syntoniser')) {
                e.preventDefault();
                alert('📻 Fréquence radio spatiale: Connectez votre Discord/Telegram');
            }
        });
    });
}

// Effet ripple sur les boutons
function initRippleEffect() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ripple = document.createElement('span');
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(0, 255, 136, 0.5)';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.8s linear';
            ripple.style.pointerEvents = 'none';
            
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);
            
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.remove();
                }
            }, 800);
        });
    });
}

// Système de surveillance des sections
function checkSpaceSections() {
    const sections = document.querySelectorAll('.scroll-section');
    const activeSection = document.querySelector('.scroll-section.active');
    
    console.log('📊 Niveaux spatiaux détectés:', sections.length);
    
    if (!activeSection && sections.length > 0) {
        console.log('⚠️ Aucun niveau actif, atterrissage sur Terre');
        sections[0].classList.add('active');
        if (typeof updateSpaceEffects === 'function') {
            updateSpaceEffects(0);
        }
    }
}

// Initialisation principale
function initSpaceMission() {
    console.log('🚀 Démarrage de la mission spatiale...');
    
    // Vérifications
    checkSpaceSections();
    
    // S'assurer de l'atterrissage sur Terre
    const earthSection = document.querySelector('.earth-section');
    if (earthSection) {
        earthSection.classList.add('active');
        earthSection.style.opacity = '1';
        earthSection.style.visibility = 'visible';
        earthSection.style.zIndex = '10';
        earthSection.style.transform = 'translateY(0) scale(1)';
        console.log('🌍 Atterrissage sur Terre confirmé');
    }
    
    // Initialiser tous les systèmes
    initWheelNavigation();
    initKeyboardNavigation();
    initTouchNavigation();
    initCardEffects();
    initCryptoSatellites();
    initLogoSupernova();
    initSpaceLinks();
    initRippleEffect();
    
    // Données Bitcoin
    loadBitcoinPrice();
    setInterval(loadBitcoinPrice, 60000); // Actualiser chaque minute
    
    console.log('✅ Mission spatiale opérationnelle!');
    console.log('🚀 Commandes: Molette=Navigation, Flèches=Déplacement, Espace=Décollage');
}

// CSS pour l'effet ripple
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Lancement de la mission
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpaceMission);
} else {
    initSpaceMission();
}

// Vérification finale
window.addEventListener('load', () => {
    console.log('🎉 Vaisseau spatial entièrement opérationnel!');
    console.log('📊 Niveaux spatiaux:', document.querySelectorAll('.scroll-section').length);
    console.log('🛰️ Satellites crypto:', document.querySelectorAll('.crypto-satellite').length);
    
    setTimeout(() => {
        console.log('🚀 MISSION EN COURS: Voyage de la Terre vers la Lune!');
        console.log('🌍→🛰️→🚀→🌌→🌙 Bonne exploration spatiale!');
    }, 2000);
});

// Exposer la fonction globalement
window.scrollToSection = scrollToSection;

// Toggle dropdown mobile sur index - CORRECTION
document.addEventListener('click', function(e) {
   const userMenu = document.querySelector('.user-menu');
   const userInfo = document.querySelector('.user-info');
   
   if (window.innerWidth <= 768 && userMenu) {
       if (userInfo && userInfo.contains(e.target)) {
           userMenu.classList.toggle('show');
       } else if (!userMenu.contains(e.target)) {
           userMenu.classList.remove('show');
       }
   }
});