// ===== SCRIPT DE VÉRIFICATION SYSTÈME DE POINTS =====

// 1. Vérifier que le système est présent sur toutes les pages
function verifyPointsSystemIntegration() {
    console.log('🔍 Vérification intégration système de points...');
    
    const checks = {
        pointsSystemLoaded: typeof window.PointsSystem !== 'undefined',
        firebaseAvailable: typeof firebase !== 'undefined',
        currentUserExists: typeof window.currentUser !== 'undefined',
        adminFunctionsLoaded: typeof window.openBulkPointsModal !== 'undefined'
    };
    
    console.log('📊 Résultats vérification:', checks);
    
    // Vérifier chaque point critique
    if (!checks.pointsSystemLoaded) {
        console.error('❌ PointsSystem non chargé - Ajouter <script src="points-system.js"></script>');
    }
    
    if (!checks.firebaseAvailable) {
        console.error('❌ Firebase non disponible - Le système fonctionnera en mode dégradé');
    }
    
    if (!checks.currentUserExists) {
        console.warn('⚠️ currentUser non défini - Vérifier que auth.js est chargé avant');
    }
    
    return checks;
}

// 2. Tester l'attribution de points
async function testPointsAttribution() {
    console.log('🧪 Test attribution points...');
    
    if (!window.PointsSystem) {
        console.error('❌ PointsSystem non disponible');
        return false;
    }
    
    if (!window.currentUser?.id) {
        console.error('❌ Utilisateur non connecté pour test');
        return false;
    }
    
    try {
        // Test attribution points de base
        const result = await window.PointsSystem.awardPoints(
            window.currentUser.id,
            'daily_login',
            10,
            'Test système points'
        );
        
        console.log('✅ Test attribution réussi:', result);
        return result.success;
        
    } catch (error) {
        console.error('❌ Test attribution échoué:', error);
        return false;
    }
}

// 3. Vérifier les fonctions admin
function verifyAdminFunctions() {
    console.log('👑 Vérification fonctions admin...');
    
    const adminFunctions = [
        'openBulkPointsModal',
        'editUserPoints',
        'addUserPoints',
        'resetUserPoints',
        'editPointsConfig'
    ];
    
    const results = {};
    
    adminFunctions.forEach(func => {
        results[func] = typeof window[func] === 'function';
        if (!results[func]) {
            console.error(`❌ Fonction admin manquante: ${func}`);
        }
    });
    
    console.log('📊 Fonctions admin disponibles:', results);
    return results;
}

// 4. Vérifier la configuration des points
async function verifyPointsConfig() {
    console.log('⚙️ Vérification configuration points...');
    
    if (!window.PointsSystem) {
        console.error('❌ PointsSystem non disponible');
        return false;
    }
    
    const config = window.PointsSystem.getPointsConfig();
    
    if (!config) {
        console.error('❌ Configuration points manquante');
        return false;
    }
    
    // Vérifier structure config
    const requiredKeys = ['rewards', 'levels', 'multipliers'];
    const hasAllKeys = requiredKeys.every(key => config[key]);
    
    if (hasAllKeys) {
        console.log('✅ Configuration points valide');
        console.log('📊 Actions récompensées:', Object.keys(config.rewards));
        console.log('🏆 Niveaux disponibles:', Object.keys(config.levels));
    } else {
        console.error('❌ Configuration points incomplète');
    }
    
    return hasAllKeys;
}

// 5. Test complet du système
async function runCompletePointsTest() {
    console.log('🚀 DÉBUT TEST COMPLET SYSTÈME DE POINTS');
    console.log('=====================================');
    
    const results = {
        integration: verifyPointsSystemIntegration(),
        adminFunctions: verifyAdminFunctions(),
        config: await verifyPointsConfig(),
        attribution: false
    };
    
    // Test attribution seulement si base OK
    if (results.integration.pointsSystemLoaded && window.currentUser?.id) {
        results.attribution = await testPointsAttribution();
    }
    
    console.log('=====================================');
    console.log('📊 RÉSULTATS FINAUX:');
    console.log(`✅ Intégration: ${results.integration.pointsSystemLoaded ? 'OK' : 'ÉCHEC'}`);
    console.log(`✅ Config: ${results.config ? 'OK' : 'ÉCHEC'}`);
    console.log(`✅ Attribution: ${results.attribution ? 'OK' : 'ÉCHEC'}`);
    console.log(`✅ Admin: ${Object.values(results.adminFunctions).every(Boolean) ? 'OK' : 'PARTIEL'}`);
    
    const overallSuccess = results.integration.pointsSystemLoaded && 
                          results.config && 
                          Object.values(results.adminFunctions).some(Boolean);
    
    console.log(`🎯 SYSTÈME GLOBAL: ${overallSuccess ? '✅ FONCTIONNEL' : '❌ PROBLÈMES DÉTECTÉS'}`);
    
    return results;
}

// 6. Script d'initialisation pour toutes les pages
function initPointsOnAllPages() {
    console.log('🔧 Initialisation points sur toutes les pages...');
    
    // Attendre que les dépendances soient chargées
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkAndInit = setInterval(() => {
        attempts++;
        
        // Vérifier dépendances
        const hasFirebase = typeof firebase !== 'undefined';
        const hasAuth = typeof window.currentUser !== 'undefined';
        const hasPointsSystem = typeof window.PointsSystem !== 'undefined';
        
        if (hasPointsSystem && (hasFirebase || attempts > 30)) {
            clearInterval(checkAndInit);
            
            console.log('✅ Dépendances trouvées, initialisation...');
            
            // Initialiser le système
            if (window.PointsSystem.init) {
                window.PointsSystem.init();
            }
            
            // Si utilisateur connecté, gérer connexion quotidienne
            if (window.currentUser?.id) {
                setTimeout(() => {
                    if (window.PointsSystem.handleDailyLogin) {
                        window.PointsSystem.handleDailyLogin(window.currentUser.id);
                    }
                }, 2000);
            }
            
        } else if (attempts >= maxAttempts) {
            clearInterval(checkAndInit);
            console.warn('⚠️ Timeout initialisation points - mode dégradé');
        }
    }, 100);
}

// 7. Correction des problèmes courants
function fixCommonPointsIssues() {
    console.log('🔧 Correction problèmes courants...');
    
    // Problème 1: showNotification manquante
    if (typeof window.showNotification !== 'function') {
        window.showNotification = function(message, type = 'info') {
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Créer notification visuelle simple
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#5352ed'};
                color: white;
                padding: 1rem;
                border-radius: 8px;
                z-index: 10000;
                max-width: 300px;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            }, 100);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        };
    }
    
    // Problème 2: Firebase non initialisé
    if (typeof firebase === 'undefined') {
        console.warn('⚠️ Firebase non disponible - système en mode local');
        window.firebaseDb = null;
        window.firebaseAuth = null;
    }
    
    // Problème 3: currentUser manquant
    if (!window.currentUser) {
        console.warn('⚠️ currentUser non défini - attente auth...');
    }
}

// ===== EXPORTATION GLOBALE =====
window.PointsVerification = {
    runCompleteTest: runCompletePointsTest,
    verifyIntegration: verifyPointsSystemIntegration,
    testAttribution: testPointsAttribution,
    verifyAdmin: verifyAdminFunctions,
    verifyConfig: verifyPointsConfig,
    initOnAllPages: initPointsOnAllPages,
    fixCommonIssues: fixCommonPointsIssues
};

// Auto-exécution sur les pages admin
if (window.location.pathname.includes('admin') || window.location.pathname.includes('points')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            fixCommonPointsIssues();
            runCompletePointsTest();
        }, 2000);
    });
}

console.log('🔍 Script de vérification points chargé');
console.log('💡 Utilisez: PointsVerification.runCompleteTest() pour tester le système');