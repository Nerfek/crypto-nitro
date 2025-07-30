// ===== POINTS-SYSTEM.JS - SYSTÈME DE POINTS CRYPTOTRADERS PRO =====

console.log('🎮 Initialisation système de points CryptoTraders Pro');

// ===== VARIABLES GLOBALES =====
let pointsConfig = null;
let currentUserPoints = null;
let isPointsSystemReady = false;

// ===== CONFIGURATION PAR DÉFAUT =====
const DEFAULT_POINTS_CONFIG = {
    rewards: {
        // Trading & Investissement
        profitable_trade_real: 50,        // Trade profitable (réel) → 50-200 points
        profitable_trade_paper: 10,       // Trade profitable (paper) → 10-50 points
        portfolio_transaction: 25,        // Ajout transaction portfolio → 25 points
        winning_streak: 50,               // Série de trades gagnants → Bonus x1.5
        first_trade_month: 100,           // Premier trade du mois → 100 points bonus
        
        // Formation & Engagement
        daily_login: 10,                  // Connexion quotidienne → 10 points
        weekly_streak: 100,               // Semaine complète de connexions → 100 points bonus
        watch_formation_video: 30,        // Regarder une vidéo formation → 30 points
        complete_quiz: 50,                // Compléter un quiz → 50 points
        leave_comment: 20,                // Laisser un commentaire → 20 points
        
        // Défis & Objectifs
        monthly_challenge: 500,           // Défi mensuel complété → 500 points
        profit_goal: 200,                 // Objectif de profit atteint → 200-1000 points
        community_challenge: 300,         // Challenge communautaire → 300 points
        improve_winrate: 150              // Amélioration win rate → 150 points
    },
    levels: {
        1: { min: 0, max: 999, name: "🌟 Astronaute Débutant", avatar: "👨‍🚀" },
        2: { min: 1000, max: 2999, name: "🚀 Pilote Spatial", avatar: "🚀" },
        3: { min: 3000, max: 7499, name: "⭐ Commandant", avatar: "⭐" },
        4: { min: 7500, max: 14999, name: "🎖 Capitaine Stellaire", avatar: "🎖" },
        5: { min: 15000, max: 999999, name: "👑 Maître Trader", avatar: "👑" }
    },
    multipliers: {
        streak_multiplier: 1.5,           // Multiplicateur série gagnante
        weekend_bonus: 1.2,               // Bonus weekend
        special_event: 2.0                // Événement spécial
    }
};

// ===== INITIALISATION SYSTÈME =====
async function initPointsSystem() {
    console.log('🚀 Initialisation système de points...');
    
    try {
        // Attendre Firebase
        await waitForFirebase();
        
        // Charger la configuration
        await loadPointsConfig();
        
        // Charger les points utilisateur
        if (window.currentUser?.id) {
            await loadUserPoints(window.currentUser.id);
        }
        
        // Marquer comme prêt
        isPointsSystemReady = true;
        
        console.log('✅ Système de points initialisé');
        
        // Déclencher événement pour les autres modules
        window.dispatchEvent(new CustomEvent('pointsSystemReady', {
            detail: { pointsConfig, currentUserPoints }
        }));
        
    } catch (error) {
        console.error('❌ Erreur initialisation système points:', error);
        // Utiliser config par défaut
        pointsConfig = DEFAULT_POINTS_CONFIG;
        isPointsSystemReady = true;
    }
}

// ===== ATTENTE FIREBASE =====
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            window.firebaseDb = firebase.firestore();
            resolve();
        } else {
            let attempts = 0;
            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    window.firebaseDb = firebase.firestore();
                    clearInterval(checkFirebase);
                    resolve();
                } else {
                    attempts++;
                    if (attempts > 50) {
                        console.log('⚠️ Firebase non trouvé, mode local');
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }
            }, 100);
        }
    });
}

// ===== CHARGEMENT CONFIGURATION =====
async function loadPointsConfig() {
    try {
        if (!window.firebaseDb) {
            console.log('📋 Utilisation config par défaut (pas de Firebase)');
            pointsConfig = DEFAULT_POINTS_CONFIG;
            return;
        }
        
        // ESSAYER de lire depuis Firebase
        try {
            const configDoc = await window.firebaseDb.collection('config').doc('points').get();
            
            if (configDoc.exists) {
                pointsConfig = configDoc.data();
                console.log('✅ Configuration points chargée depuis Firebase');
                return;
            }
        } catch (permissionError) {
            console.log('⚠️ Pas de permissions Firebase config, utilisation par défaut');
        }
        
        // Utiliser config par défaut si pas d'accès Firebase
        pointsConfig = DEFAULT_POINTS_CONFIG;
        console.log('📋 Configuration par défaut utilisée');
        
    } catch (error) {
        console.error('❌ Erreur chargement config points:', error);
        pointsConfig = DEFAULT_POINTS_CONFIG;
        console.log('📋 Fallback vers configuration par défaut');
    }
}

// ===== CHARGEMENT POINTS UTILISATEUR =====
async function loadUserPoints(userId) {
    // Protection si config pas encore chargée
    if (!pointsConfig) {
        console.log('⏳ Attente chargement config...');
        setTimeout(() => loadUserPoints(userId), 500);
        return;
    }
    try {
        if (!window.firebaseDb || !userId) {
            currentUserPoints = createDefaultUserPoints();
            return;
        }
        
        const userDoc = await window.firebaseDb.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            if (userData.points) {
                currentUserPoints = userData.points;
                // Vérifier et recalculer le niveau si nécessaire
                const newLevel = calculateUserLevel(currentUserPoints.total);
                if (newLevel.level !== currentUserPoints.level) {
                    await updateUserLevel(userId, newLevel);
                }
            } else {
                // Créer structure points pour utilisateur existant
                currentUserPoints = createDefaultUserPoints();
                await saveUserPoints(userId, currentUserPoints);
            }
        } else {
            currentUserPoints = createDefaultUserPoints();
        }
        
        console.log('✅ Points utilisateur chargés:', currentUserPoints.total);
        
    } catch (error) {
        console.error('❌ Erreur chargement points utilisateur:', error);
        currentUserPoints = createDefaultUserPoints();
    }
}

function createDefaultUserPoints() {
    return {
        total: 0,
        level: 1,
        levelName: "🌟 Astronaute Débutant",
        avatar: "👨‍🚀",
        history: [],
        dailyStreak: 0,
        lastLogin: null,
        stats: {
            totalEarned: 0,
            actionsCompleted: 0,
            streaksCompleted: 0
        }
    };
}

// ===== ATTRIBUTION DE POINTS =====
async function awardPoints(userId, action, amount = null, reason = '', multiplier = 1) {
    if (!isPointsSystemReady) {
        console.log('⏳ Système points pas encore prêt, attribution en attente...');
        // Réessayer dans 1 seconde
        setTimeout(() => awardPoints(userId, action, amount, reason, multiplier), 1000);
        return;
    }
    
    if (!userId || !action) {
        console.error('❌ userId ou action manquant pour attribution points');
        return;
    }
    
    try {
        // Déterminer le nombre de points
        let pointsToAward = amount || pointsConfig.rewards[action] || 0;
        
        // Appliquer multiplicateur
        pointsToAward = Math.round(pointsToAward * multiplier);
        
        if (pointsToAward <= 0) {
            console.log(`⚠️ Aucun point à attribuer pour l'action: ${action}`);
            return;
        }
        
        // Charger les points actuels de l'utilisateur
        if (!currentUserPoints) {
            await loadUserPoints(userId);
        }
        
        // Calculer nouveaux totaux
        const oldTotal = currentUserPoints.total;
        const newTotal = oldTotal + pointsToAward;
        
        // Calculer nouveau niveau
        const oldLevel = currentUserPoints.level;
        const newLevelData = calculateUserLevel(newTotal);
        
        // Créer entrée historique
        const historyEntry = {
            action: action,
            points: pointsToAward,
            reason: reason || getActionReason(action),
            date: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
            totalAfter: newTotal,
            multiplier: multiplier !== 1 ? multiplier : null
        };
        
        // Mettre à jour les points utilisateur
        const updatedPoints = {
            ...currentUserPoints,
            total: newTotal,
            level: newLevelData.level,
            levelName: newLevelData.name,
            avatar: newLevelData.avatar,
            history: [...(currentUserPoints.history || []), historyEntry],
            stats: {
                ...(currentUserPoints?.stats || { totalEarned: 0, actionsCompleted: 0, streaksCompleted: 0 }),
                totalEarned: (currentUserPoints?.stats?.totalEarned || 0) + pointsToAward,
                actionsCompleted: (currentUserPoints?.stats?.actionsCompleted || 0) + 1
            }
        };
        
        // Sauvegarder dans Firebase
        await saveUserPoints(userId, updatedPoints);
        
        // Mettre à jour les données locales
        currentUserPoints = updatedPoints;
        
        // Synchroniser avec window.currentUser
        if (window.currentUser && window.currentUser.id === userId) {
            window.currentUser.points = updatedPoints;
            window.currentUser.avatar = newLevelData.avatar;
            window.currentUser.rank = newLevelData.name;
        }
        
        console.log(`🎯 Points attribués: +${pointsToAward} pour "${action}" → Total: ${newTotal}`);
        
        // Notifications
        showPointsNotification(pointsToAward, action, reason);
        
        // Vérifier changement de niveau
        if (newLevelData.level > oldLevel) {
            showLevelUpNotification(newLevelData);
            
            // Synchroniser le rang avec auth.js si disponible
            if (typeof window.updateUserRankGlobally === 'function') {
                // Le nouveau niveau influence le rang basé sur le portfolio, pas directement
                console.log('🏆 Nouveau niveau atteint:', newLevelData.name);
            }
        }
        
        // Déclencher événement pour les autres modules
        window.dispatchEvent(new CustomEvent('pointsAwarded', {
            detail: { 
                userId, 
                action, 
                points: pointsToAward, 
                newTotal, 
                newLevel: newLevelData,
                levelUp: newLevelData.level > oldLevel
            }
        }));
        
        return {
            success: true,
            pointsAwarded: pointsToAward,
            newTotal: newTotal,
            newLevel: newLevelData,
            levelUp: newLevelData.level > oldLevel
        };
        
    } catch (error) {
        console.error('❌ Erreur attribution points:', error);
        return { success: false, error: error.message };
    }
}

// ===== CALCUL NIVEAU =====
function calculateUserLevel(totalPoints) {
    // Protection si config pas encore chargée
    if (!pointsConfig || !pointsConfig.levels) {
        console.log('⚠️ Config points pas encore chargée, utilisation niveau par défaut');
        return {
            level: 1,
            name: "🌟 Astronaute Débutant",
            avatar: "👨‍🚀",
            min: 0,
            max: 999,
            progress: 0
        };
    }
    
    for (const [level, data] of Object.entries(pointsConfig.levels)) {
        if (totalPoints >= data.min && totalPoints <= data.max) {
            return {
                level: parseInt(level),
                name: data.name,
                avatar: data.avatar,
                min: data.min,
                max: data.max,
                progress: data.max > data.min ? ((totalPoints - data.min) / (data.max - data.min) * 100) : 100
            };
        }
    }
    
    // Par défaut niveau 1
    return {
        level: 1,
        name: "🌟 Astronaute Débutant",
        avatar: "👨‍🚀",
        min: 0,
        max: 999,
        progress: 0
    };
}

// ===== SAUVEGARDE POINTS =====
async function saveUserPoints(userId, pointsData, forceWrite = false) {
    try {
        if (!window.firebaseDb || !userId) return;
        
        // ✅ NOUVEAU : Anti-spam - max 1 écriture par 5 minutes
        const now = Date.now();
        const lastWrite = window.lastPointsWrite || 0;
        const timeDiff = now - lastWrite;
        
        if (!forceWrite && timeDiff < 300000) { // 5 minutes
            console.log('🚫 Points pas sauvegardés (< 5min)');
            return;
        }
        
        await window.firebaseDb.collection('users').doc(userId).update({
            points: pointsData,
            lastPointsUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // ✅ Marquer dernière écriture
        window.lastPointsWrite = now;
        
        console.log('💾 Points sauvegardés pour:', userId);
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde points:', error);
    }
}

// ===== MISE À JOUR NIVEAU =====
async function updateUserLevel(userId, newLevelData) {
    try {
        currentUserPoints.level = newLevelData.level;
        currentUserPoints.levelName = newLevelData.name;
        currentUserPoints.avatar = newLevelData.avatar;
        
        // Pas de sauvegarde au chargement, seulement si structure manquante
        console.log('📊 Points utilisateur initialisés (pas de sauvegarde)');
        
    } catch (error) {
        console.error('❌ Erreur mise à jour niveau:', error);
    }
}

// ===== CONNEXION QUOTIDIENNE =====
async function handleDailyLogin(userId) {
    if (!userId || !currentUserPoints) return;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Format: 2025-01-27
    const lastLogin = currentUserPoints.lastLogin;
    
    // Vérifier si déjà connecté aujourd'hui
    if (lastLogin) {
        const lastLoginDate = new Date(lastLogin).toISOString().split('T')[0];
        if (lastLoginDate === today) {
            console.log("📅 Déjà connecté aujourd'hui");
            return;
        }
    }
    
    // Points connexion quotidienne
    await awardPoints(userId, 'daily_login', null, 'Connexion quotidienne');
    
    // Vérifier série hebdomadaire (7 jours consécutifs)
    const daysDiff = lastLogin ? Math.floor((now - new Date(lastLogin)) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysDiff === 1) {
        // Connexion consécutive
        currentUserPoints.dailyStreak = (currentUserPoints.dailyStreak || 0) + 1;
        
        if (currentUserPoints.dailyStreak >= 7) {
            // Bonus série 7 jours
            await awardPoints(userId, 'weekly_streak', null, 'Série de 7 jours de connexion');
            currentUserPoints.stats.streaksCompleted += 1;
            currentUserPoints.dailyStreak = 0; // Reset après bonus
        }
    } else if (daysDiff > 1) {
        // Série cassée
        currentUserPoints.dailyStreak = 1;
    }
    
    // Mettre à jour dernière connexion
    currentUserPoints.lastLogin = now.toISOString();
    await saveUserPoints(userId, currentUserPoints);
}

// ===== NOTIFICATIONS =====
function showPointsNotification(points, action, reason) {
    const message = `🎯 +${points} points • ${reason || getActionReason(action)}`;
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, 'success');
    } else {
        console.log(`🎮 ${message}`);
    }
}

function showLevelUpNotification(newLevelData) {
    const message = `🎉 Niveau ${newLevelData.level} atteint ! ${newLevelData.name}`;
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, 'success');
    } else {
        console.log(`🏆 ${message}`);
    }
}

// ===== UTILITAIRES =====
function getActionReason(action) {
    const reasons = {
        profitable_trade_real: 'Trade profitable (réel)',
        profitable_trade_paper: 'Trade profitable (simulation)',
        portfolio_transaction: 'Transaction portfolio',
        daily_login: 'Connexion quotidienne',
        weekly_streak: 'Série de 7 jours',
        watch_formation_video: 'Vidéo formation',
        complete_quiz: 'Quiz complété',
        monthly_challenge: 'Défi mensuel',
        first_trade_month: 'Premier trade du mois'
    };
    
    return reasons[action] || 'Action récompensée';
}

function getCurrentUserPoints() {
    return currentUserPoints;
}

function getPointsConfig() {
    return pointsConfig;
}

function isSystemReady() {
    return isPointsSystemReady;
}

// ===== GESTION ADMIN - MODIFICATION CONFIG =====
async function updatePointsConfig(newConfig) {
    try {
        if (!window.firebaseDb) {
            console.log('⚠️ Firebase non disponible pour modification config');
            return false;
        }
        
        await window.firebaseDb.collection('config').doc('points').update(newConfig);
        
        // Mettre à jour config locale
        pointsConfig = { ...pointsConfig, ...newConfig };
        
        console.log('✅ Configuration points mise à jour');
        
        // Déclencher événement
        window.dispatchEvent(new CustomEvent('pointsConfigUpdated', {
            detail: { newConfig: pointsConfig }
        }));
        
        return true;
        
    } catch (error) {
        console.error('❌ Erreur mise à jour config:', error);
        return false;
    }
}

// ===== GESTION ADMIN - MODIFICATION POINTS UTILISATEUR =====
async function adminModifyUserPoints(userId, pointsChange, reason = 'Modification admin') {
    try {
        await loadUserPoints(userId);
        
        const oldTotal = currentUserPoints.total;
        const newTotal = Math.max(0, oldTotal + pointsChange); // Pas en dessous de 0
        
        const historyEntry = {
            action: 'admin_modification',
            points: pointsChange,
            reason: reason,
            date: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
            totalAfter: newTotal,
            adminAction: true
        };
        
        const newLevelData = calculateUserLevel(newTotal);
        
        const updatedPoints = {
            ...currentUserPoints,
            total: newTotal,
            level: newLevelData.level,
            levelName: newLevelData.name,
            avatar: newLevelData.avatar,
            history: [...(currentUserPoints.history || []), historyEntry]
        };
        
        await saveUserPoints(userId, updatedPoints);
        
        console.log(`👑 Admin: Points utilisateur ${userId} modifiés: ${pointsChange} → Total: ${newTotal}`);
        
        return {
            success: true,
            oldTotal,
            newTotal,
            change: pointsChange,
            newLevel: newLevelData
        };
        
    } catch (error) {
        console.error('❌ Erreur modification admin points:', error);
        return { success: false, error: error.message };
    }
}

// ===== ACTIONS SPÉCIFIQUES MÉTIER =====

// Trading profitable
async function awardTradingPoints(userId, isRealTrading, profitPercent = 0) {
    const baseAction = isRealTrading ? 'profitable_trade_real' : 'profitable_trade_paper';
    let multiplier = 1;
    
    // Bonus selon performance
    if (profitPercent > 10) multiplier = 1.5;
    if (profitPercent > 20) multiplier = 2.0;
    
    return await awardPoints(userId, baseAction, null, `Trade profitable ${isRealTrading ? '(réel)' : '(simulation)'} +${profitPercent.toFixed(1)}%`, multiplier);
}

// Transaction portfolio
async function awardPortfolioPoints(userId, transactionType = 'add') {
    return await awardPoints(userId, 'portfolio_transaction', null, `Transaction portfolio: ${transactionType}`);
}

// Formation
async function awardLearningPoints(userId, learningType, specificReason = '') {
    const actionMap = {
        'video': 'watch_formation_video',
        'quiz': 'complete_quiz',
        'comment': 'leave_comment'
    };
    
    const action = actionMap[learningType] || 'watch_formation_video';
    return await awardPoints(userId, action, null, specificReason || `Formation: ${learningType}`);
}

// ===== EXPOSITION GLOBALE =====
window.PointsSystem = {
    // Initialisation
    init: initPointsSystem,
    isReady: isSystemReady,
    
    // Attribution points
    awardPoints: awardPoints,
    awardTradingPoints: awardTradingPoints,
    awardPortfolioPoints: awardPortfolioPoints,
    awardLearningPoints: awardLearningPoints,
    
    // Gestion quotidienne
    handleDailyLogin: handleDailyLogin,
    
    // Getters
    getCurrentUserPoints: getCurrentUserPoints,
    getPointsConfig: getPointsConfig,
    calculateUserLevel: calculateUserLevel,
    
    // Admin
    updatePointsConfig: updatePointsConfig,
    adminModifyUserPoints: adminModifyUserPoints,
    
    // Utilitaires
    loadUserPoints: loadUserPoints
};

// ===== AUTO-INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM chargé, initialisation système points...');
    
    // Attendre que auth.js charge currentUser
    let attempts = 0;
    const waitForAuth = setInterval(() => {
        if (window.currentUser?.id || attempts > 30) {
            clearInterval(waitForAuth);
            initPointsSystem();
        }
        attempts++;
    }, 100);
});

// Écouter les changements d'authentification
if (typeof firebase !== 'undefined') {
    window.addEventListener('load', () => {
        if (firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user && isPointsSystemReady) {
                    await loadUserPoints(user.uid);
                    await handleDailyLogin(user.uid);
                }
            });
        }
    });
}

console.log('✅ Points System chargé et prêt');