// MÉTÉORITES AMÉLIORÉES - DE GAUCHE À DROITE
function createMeteors() {
    function spawnMeteor() {
        if (Math.random() > 0.8) { // 20% de chance
            createMeteor();
        }
        // Utiliser setTimeout au lieu de setInterval pour éviter l'accumulation
        setTimeout(spawnMeteor, 3000 + Math.random() * 2000); // 3-5 secondes
    }
    spawnMeteor();
}

function createMeteor() {
    const meteor = document.createElement('div');
    meteor.className = 'meteor';
    
    // Position de départ À GAUCHE
    const startX = -100; // Commence hors écran à gauche
    const startY = Math.random() * (window.innerHeight * 0.6) + 50; // Position Y aléatoire
    
    // Position de fin À DROITE
    const endX = window.innerWidth + 100; // Fini hors écran à droite
    const endY = startY + (Math.random() * 200 - 100); // Légère déviation verticale
    
    // Style de la météorite
    meteor.style.position = 'fixed';
    meteor.style.width = '4px';
    meteor.style.height = '60px'; // Plus visible
    meteor.style.background = 'linear-gradient(to right, rgba(255,255,255,1), rgba(0,255,136,0.8), transparent)';
    meteor.style.borderRadius = '50%';
    meteor.style.zIndex = '2';
    meteor.style.left = startX + 'px';
    meteor.style.top = startY + 'px';
    meteor.style.boxShadow = '0 0 10px rgba(255,255,255,0.8)';
    
    // Angle de rotation pour la trajectoire horizontale
    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
    meteor.style.transform = `rotate(${angle}deg)`;
    
    document.body.appendChild(meteor);
    
    // Animation fluide HORIZONTALE
    meteor.animate([
        { 
            left: startX + 'px', 
            top: startY + 'px',
            opacity: 0 
        },
        { 
            left: (startX + 100) + 'px', 
            top: startY + 'px',
            opacity: 1,
            offset: 0.1 
        },
        { 
            left: endX + 'px', 
            top: endY + 'px',
            opacity: 0 
        }
    ], {
        duration: 2500 + Math.random() * 1000, // 2.5-3.5 secondes
        easing: 'ease-out'
    }).onfinish = () => {
        if (meteor.parentNode) {
            meteor.remove();
        }
    };
}// ===== SPACE-ANIMATIONS.JS - ANIMATIONS SPATIALES =====

console.log('🌟 Initialisation des animations spatiales');

// Variables pour les effets
let mouseX = 0, mouseY = 0;
let trailX = 0, trailY = 0;

// Messages de voyage selon le niveau
const JOURNEY_MESSAGES = [
    '🌍 Sur Terre - Prêt au décollage',
    '🚀 Décollage - La Terre s\'éloigne',
    '🛰️ Espace proche - Vue sur la planète bleue',
    '🌌 Espace profond - Entre deux mondes',
    '🌙 Arrivée sur la Lune - Mission accomplie'
];


// APPARENCE DES ÉTOILES SELON LE NIVEAU
function updateStarsAppearance(level) {
    const stars = document.querySelectorAll('.star');
    
    // Couleurs selon la profondeur spatiale
    const starColors = [
        '#ffffff',      // Blanc sur Terre
        '#e6f3ff',      // Bleu très clair en décollage
        '#ccf0ff',      // Bleu clair en espace proche
        '#b3e6ff',      // Bleu moyen en espace profond
        '#99ccff'       // Bleu plus intense sur la Lune
    ];
    
    const starColor = starColors[level] || '#ffffff';
    
    stars.forEach(star => {
        if (!star.classList.contains('near-cursor')) {
            star.style.background = starColor;
        }
    });
}

// Créer les étoiles interactives
function createInteractiveStars() {
    const starsField = document.getElementById('stars-field');
    if (!starsField) return;
    
    // Supprimer les étoiles existantes
    starsField.innerHTML = '';
    
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star interactive';
        
        // Tailles variées
        const size = Math.random() * 3 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        
        // Positions aléatoires
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        
        // Délais d'animation variés
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = (Math.random() * 2 + 2) + 's';
        
        starsField.appendChild(star);
    }
    
    console.log('✅ 200 étoiles interactives créées');
}

// INTERACTION CURSEUR-ÉTOILES
function interactWithStars(mouseX, mouseY) {
    const stars = document.querySelectorAll('.star');
    const interactionRadius = 100;
    
    stars.forEach(star => {
        const rect = star.getBoundingClientRect();
        const starX = rect.left + rect.width / 2;
        const starY = rect.top + rect.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(mouseX - starX, 2) + Math.pow(mouseY - starY, 2)
        );
        
        if (distance < interactionRadius) {
            star.classList.add('near-cursor');
            // Créer un effet de traînée lumineuse
            const intensity = 1 - (distance / interactionRadius);
            star.style.boxShadow = `0 0 ${20 * intensity}px rgba(0, 255, 136, ${intensity})`;
        } else {
            star.classList.remove('near-cursor');
            star.style.boxShadow = '';
        }
    });
}

// Curseur spatial personnalisé ULTRA FLUIDE
function initSpaceCursor() {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        const cursor = document.getElementById('cursor');
        if (cursor) {
            // CURSEUR INSTANTANÉ - pas de délai
            cursor.style.left = mouseX + 'px';
            cursor.style.top = mouseY + 'px';
        }
        
        // Interaction avec les étoiles
        interactWithStars(mouseX, mouseY);
    });
    
    function updateTrail() {
        // TRAÎNÉE ULTRA FLUIDE - vitesse maximale
        trailX += (mouseX - trailX) * 0.25; // Augmenté de 0.15 à 0.25
        trailY += (mouseY - trailY) * 0.25;
        
        const trail = document.getElementById('cursor-trail');
        if (trail) {
            trail.style.left = trailX + 'px';
            trail.style.top = trailY + 'px';
        }
        
        requestAnimationFrame(updateTrail);
    }
    
    updateTrail();
    console.log('✅ Curseur spatial ULTRA FLUIDE activé');
}

// Effet de particules cosmiques en arrière-plan
function initCosmicBackground() {
    setInterval(() => {
        const intensity = Math.sin(Date.now() * 0.002) * 0.03 + 0.97;
        document.body.style.filter = `brightness(${intensity}) contrast(1.05)`;
    }, 100);
    
    console.log('✅ Arrière-plan cosmique activé');
}

// Animation de la fusée selon la navigation
function animateRocket(direction) {
    const rocket = document.querySelector('.rocket');
    if (!rocket) return;
    
    // Marquer comme en mouvement
    rocket.classList.add('moving');
    
    // Direction de retour
    if (direction === 'up') {
        rocket.classList.add('returning');
        document.body.classList.add('returning');
    } else {
        rocket.classList.remove('returning');
        document.body.classList.remove('returning');
    }
    
    // Arrêter l'animation après 3 secondes
    setTimeout(() => {
        rocket.classList.remove('moving');
    }, 3000);
}

// Effet d'explosion d'étoiles lors du changement de niveau
function starExplosionEffect(level) {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        setTimeout(() => {
            // Effet d'explosion temporaire
            star.style.transform = 'scale(3)';
            star.style.opacity = '1';
            star.style.boxShadow = '0 0 30px rgba(0, 255, 136, 1)';
            
            setTimeout(() => {
                star.style.transform = '';
                star.style.opacity = '';
                star.style.boxShadow = '';
            }, 300);
        }, index * 2); // Délai échelonné
    });
}

// Animation de pulsation des planètes
function pulsePlanets() {
    const earth = document.querySelector('.earth');
    const moon = document.querySelector('.moon');
    
    if (earth) {
        earth.style.animation = 'planetPulse 4s ease-in-out infinite';
    }
    
    if (moon) {
        moon.style.animation = 'planetPulse 3s ease-in-out infinite';
    }
}

// MÉTÉORITES AMÉLIORÉES
function createMeteors() {
    setInterval(() => {
        if (Math.random() > 0.8) { // 20% de chance
            createMeteor();
        }
    }, 3000); // Plus fréquent
}

function createMeteor() {
    const meteor = document.createElement('div');
    meteor.className = 'meteor';
    
    // Position de départ aléatoire en haut
    const startX = Math.random() * window.innerWidth;
    const startY = -100;
    
    // Position de fin diagonale
    const endX = startX + (Math.random() * 300 - 150); // Déviation de -150 à 150px
    const endY = window.innerHeight + 100;
    
    // Style de la météorite
    meteor.style.position = 'fixed';
    meteor.style.width = '3px';
    meteor.style.height = '80px'; // Plus long
    meteor.style.background = 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(0,255,136,0.8), transparent)';
    meteor.style.borderRadius = '50%';
    meteor.style.zIndex = '2';
    meteor.style.left = startX + 'px';
    meteor.style.top = startY + 'px';
    meteor.style.boxShadow = '0 0 10px rgba(255,255,255,0.8)';
    
    // Angle de rotation pour la diagonale
    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
    meteor.style.transform = `rotate(${angle + 90}deg)`; // +90 car la météorite pointe vers le bas
    
    document.body.appendChild(meteor);
    
    // Animation fluide
    meteor.animate([
        { 
            left: startX + 'px', 
            top: startY + 'px',
            opacity: 0 
        },
        { 
            left: startX + 'px', 
            top: startY + 50 + 'px',
            opacity: 1,
            offset: 0.1 
        },
        { 
            left: endX + 'px', 
            top: endY + 'px',
            opacity: 0 
        }
    ], {
        duration: 2000 + Math.random() * 1000, // 2-3 secondes
        easing: 'ease-out'
    }).onfinish = () => {
        if (meteor.parentNode) {
            meteor.remove();
        }
    };
}

// Ajout des animations CSS dynamiques
function addSpaceAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes planetPulse {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 0 0 50px rgba(74, 144, 226, 0.3);
            }
            50% { 
                transform: scale(1.05);
                box-shadow: 0 0 80px rgba(74, 144, 226, 0.6);
            }
        }
        
        @keyframes cosmicWave {
            0% { 
                background-position: 0 0, 25px 25px, 75px 75px;
                opacity: 0.8;
            }
            50% { 
                background-position: 25px 25px, 50px 50px, 100px 100px;
                opacity: 1;
            }
            100% { 
                background-position: 0 0, 25px 25px, 75px 75px;
                opacity: 0.8;
            }
        }
        
        .space-background {
            animation: starfield 100s linear infinite, cosmicWave 8s ease-in-out infinite;
        }
        
        .rocket.moving::before {
            animation: rocketBoost 0.5s ease-in-out infinite;
        }
        
        @keyframes rocketBoost {
            0%, 100% { 
                transform: translateY(0) scale(1);
                filter: drop-shadow(0 0 20px rgba(255, 100, 0, 0.8));
            }
            50% { 
                transform: translateY(-5px) scale(1.1);
                filter: drop-shadow(0 0 40px rgba(255, 150, 0, 1));
            }
        }
        
        .meteor {
            pointer-events: none;
            filter: blur(0.5px);
        }
    `;
    document.head.appendChild(style);
}

// Fonction updateSpaceEffects enrichie
function updateSpaceEffects(level) {
    const body = document.body;
    
    // Supprimer toutes les classes de niveau précédentes
    body.className = body.className.replace(/journey-level-\d+/g, '');
    
    // Ajouter la nouvelle classe de niveau
    body.classList.add(`journey-level-${level}`);
    
    console.log(`🚀 VOYAGE NIVEAU ${level} - Planètes repositionnées`);
    console.log(JOURNEY_MESSAGES[level]);
    
    // Mettre à jour l'apparence des étoiles selon le niveau
    updateStarsAppearance(level);
    
    // Effets supplémentaires
    starExplosionEffect(level);
    
    // Animation direction fusée
    if (level > (window.previousLevel || 0)) {
        animateRocket('down');
    } else if (level < (window.previousLevel || 0)) {
        animateRocket('up');
    }
    
    window.previousLevel = level;
}

// Initialisation des animations spatiales
function initSpaceAnimations() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    console.log('🚀 Démarrage des animations spatiales...');
    
    // TOUJOURS créer les étoiles (mobile ET desktop)
    createInteractiveStars();
    
    if (isMobile) {
        console.log('📱 Mobile détecté - Version allégée AVEC étoiles');
        
        // Juste les étoiles, pas le reste
        return;
    }
    
    // Version complète pour desktop (étoiles + tout le reste)
    initSpaceCursor();
    initCosmicBackground();
    addSpaceAnimations();
    pulsePlanets();
    createMeteors();
    updateSpaceEffects(0);
    
    console.log('✅ Animations spatiales opérationnelles!');
}


// Nouvelle fonction pour étoiles mobiles (moins nombreuses)
function createMobileStars() {
    const starsField = document.getElementById('stars-field');
    if (!starsField) return;
    
    // Supprimer les étoiles existantes
    starsField.innerHTML = '';
    
    // SEULEMENT 50 étoiles au lieu de 200
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star mobile';
        
        // Tailles plus petites
        const size = Math.random() * 2 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        
        // Positions aléatoires
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        
        // Délais d'animation variés mais plus lents
        star.style.animationDelay = Math.random() * 5 + 's';
        star.style.animationDuration = (Math.random() * 3 + 3) + 's';
        
        starsField.appendChild(star);
    }
    
    console.log('✅ 50 étoiles mobiles créées (version allégée)');
}

// Lancement automatique des animations
document.addEventListener('DOMContentLoaded', initSpaceAnimations);

// Exposer les fonctions globalement
window.updateSpaceEffects = updateSpaceEffects;
window.createInteractiveStars = createInteractiveStars;
window.animateRocket = animateRocket;