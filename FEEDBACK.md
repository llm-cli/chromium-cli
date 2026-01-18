# Feedback complet : chromium-cli

**Date** : 18 janvier 2026
**Testeur** : Claude (Opus 4.5)
**Version testée** : 1.0.0

---

## Résumé exécutif

| Catégorie | Note | Commentaire |
|-----------|------|-------------|
| **Conception** | 9/10 | Architecture claire et extensible |
| **Fonctionnalités** | 8/10 | Couverture large, quelques manques |
| **Code quality** | 8/10 | Lisible, bien structuré |
| **Documentation** | 8/10 | README complet avec exemples |
| **Robustesse** | 7/10 | Quelques bugs, gestion d'erreurs à améliorer |
| **UX** | 7/10 | Bons raccourcis, tab completion manquante |

**Note globale : 8/10**

---

## 1. Architecture

### Vue d'ensemble

```
┌─────────────────┐      HTTP/curl      ┌─────────────────┐     WebSocket      ┌─────────────────┐
│   CLI (Bash)    │ ◄─────────────────► │  Server (Node)  │ ◄────────────────► │   Extension     │
│  chromium-cli   │    localhost:8765   │    index.js     │   ws://...:8765/ws │  Manifest V3    │
└─────────────────┘                     └─────────────────┘                    └─────────────────┘
```

### Points forts architecturaux

| Aspect | Évaluation | Détail |
|--------|------------|--------|
| **Séparation des responsabilités** | Excellente | CLI = interface, Server = routage, Extension = exécution |
| **Protocole** | Simple et efficace | JSON sur WebSocket avec request/response IDs |
| **Extensibilité** | Très bonne | Pattern handler-based : `connection.registerHandler('action', fn)` |
| **Multi-navigateur** | Supporté | ID unique par navigateur, ports multiples (8765-8769) |

### Points faibles architecturaux

| Aspect | Problème | Impact |
|--------|----------|--------|
| **Single point of failure** | Si le serveur tombe, plus de contrôle | Moyen |
| **Pas de file d'attente** | Les commandes pendant une déconnexion sont perdues | Faible |
| **Timeout fixe** | 30s hardcodé dans le serveur | Faible |

---

## 2. CLI (chromium-cli)

### Points positifs

#### 1. Double API (explicite + raccourcis)

```bash
# API explicite
chromium-cli tabs navigate https://example.com
chromium-cli dom text ".selector"

# Raccourcis équivalents
chromium-cli go example.com
chromium-cli text ".selector"
```

#### 2. Bon escaping JSON

```bash
# Utilise jq -R pour échapper correctement les chaînes
data=$(jq -n --arg url "$url" '{url: $url}')
```

#### 3. Formatage lisible par défaut + JSON optionnel

```bash
chromium-cli tabs list        # Tableau formaté
chromium-cli tabs list --json # JSON brut pour scripting
```

#### 4. Option --wait pour navigation

```bash
chromium-cli go example.com --wait  # Attend le chargement complet
```

#### 5. Fermeture multiple

```bash
chromium-cli tabs close 123,456,789  # IDs séparés par virgule
```

### Bugs identifiés

#### Bug 1 : `--output` pour screenshot (confirmé)

```bash
# Ligne 705 du CLI :
local output_file="${SCREENSHOT_OUTPUT:-/tmp/screenshot-$(date +%s).png}"

# Problème : SCREENSHOT_OUTPUT n'est jamais défini car --output est parsé
# APRÈS le shift des arguments principaux (ligne 909-910)
```

**Reproduction** :
```bash
chromium-cli screenshot --output /tmp/test.png
# Résultat : sauvegarde dans /tmp/screenshot-TIMESTAMP.png au lieu de /tmp/test.png
```

#### Bug 2 : Aliases inconsistants

```bash
chromium-cli tabs list    # OK
chromium-cli tabs ls      # OK (alias)
chromium-cli ls           # OK (shortcut)
chromium-cli windows list # OK
chromium-cli windows ls   # FAIL - alias non défini pour windows
```

#### Bug 3 : Pas de validation d'URL

```bash
chromium-cli go "not a url"  # Essaie quand même avec https://
```

### Fonctionnalités manquantes

| Fonctionnalité | Utilité | Difficulté |
|----------------|---------|------------|
| `tabs close-others` | Fermer tous sauf actif | Facile |
| `tabs close-right <id>` | Fermer à droite | Facile |
| `tabs close-duplicates` | Fermer doublons d'URL | Moyenne |
| `--timeout` global | Configurer timeout | Facile |
| Tab completion (bash/zsh) | UX | Moyenne |
| `--dry-run` | Prévisualiser sans exécuter | Moyenne |

---

## 3. Serveur Node.js

### Points positifs

#### 1. Code minimal et lisible (~215 lignes)

#### 2. Gestion des connexions multiples

```javascript
const browsers = new Map();  // browser_id -> { ws, name, connectedAt }
```

#### 3. Système request/response avec timeout

```javascript
const pendingRequests = new Map();  // request_id -> { resolve, reject, timeout }
```

#### 4. Routage dynamique élégant

```javascript
const action = path.slice(1).replace(/\//g, '.');  // /tabs/list -> tabs.list
```

#### 5. Graceful shutdown

```javascript
process.on('SIGINT', () => { wss.close(); httpServer.close(); process.exit(0); });
```

### Améliorations suggérées

#### 1. Logging configurable

```javascript
// Actuellement : console.log partout
// Suggéré : niveau de log configurable (debug, info, warn, error)
```

#### 2. Health check endpoint

```javascript
// Ajouter /health pour monitoring
if (path === '/health') {
  return { success: true, data: { uptime: process.uptime(), connections: browsers.size } };
}
```

#### 3. Métriques

```javascript
// Compteurs de requêtes, latence moyenne, etc.
```

---

## 4. Extension Chrome

### Points positifs

#### 1. Manifest V3 compliant
Prêt pour le futur de Chrome.

#### 2. Service Worker keepalive intelligent

```javascript
// Manifest V3 tue les workers après 30s d'inactivité
chrome.alarms.create('keepalive', { periodInMinutes: 0.4 });  // Ping toutes les 24s
```

#### 3. Reconnexion automatique avec backoff

```javascript
const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
```

#### 4. Browser ID persistant

```javascript
await chrome.storage.local.set({ 'chromium-cli-browser-id': this.browserId });
```

#### 5. Support XPath et CSS

```javascript
if (sel.type === 'xpath') {
  const result = document.evaluate(sel.value, document, null, ...);
} else {
  el = document.querySelector(sel.value);
}
```

#### 6. Simulation complète d'events pour fill/type

```javascript
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
```

### Points faibles

#### 1. URL serveur hardcodée

```javascript
// connection.js:4
this.serverUrl = config.serverUrl || 'ws://127.0.0.1:8765/ws';
// Devrait être configurable via popup ou storage
```

#### 2. Full page screenshot = plusieurs images

```javascript
// screenshot.js retourne un tableau de parts
return { parts: screenshots, ... };
// Le CLI ne les assemble pas, il prend juste la première
```

#### 3. Element screenshot = pas de crop

```javascript
// Retourne les coordonnées mais ne croppe pas
return { dataUrl, crop: { x, y, width, height }, ... };
// Le CLI devrait utiliser ImageMagick/convert pour cropper
```

#### 4. Pas de gestion des iframes

```javascript
// executeScript ne cible que le frame principal
// Sélecteurs dans iframes échouent silencieusement
```

---

## 5. API DOM

### Fonctionnalités couvertes

| Catégorie | Commandes | Status |
|-----------|-----------|--------|
| **Query** | `query`, `text`, `html`, `attr` | Complet |
| **Interaction** | `click`, `fill`, `type`, `clear`, `hover`, `focus` | Complet |
| **Navigation** | `scroll`, `scrollTo` | Complet |
| **Attente** | `wait`, `waitFor` | Complet |
| **Exécution** | `exec` (JS arbitraire) | Complet |
| **Info** | `info` (page metadata) | Complet |
| **Select** | `select` (dropdowns) | Complet |

### Manques notables

| Fonctionnalité | Description |
|----------------|-------------|
| `dom exists` | Vérifier si élément existe (booléen) |
| `dom count` | Compter les éléments matchant un sélecteur |
| `dom visible` | Vérifier si élément est visible |
| `dom screenshot` | Screenshot d'un élément (le crop manque) |
| `dom drag` | Drag & drop |
| `dom upload` | Upload de fichier dans input[type=file] |

---

## 6. Sécurité

### Aspects positifs

#### 1. Écoute localhost uniquement

```javascript
const HOST = '127.0.0.1';  // Pas exposé sur le réseau
```

#### 2. Pas de credentials stockées

### Risques

| Risque | Niveau | Mitigation suggérée |
|--------|--------|---------------------|
| `dom exec` permet JS arbitraire | Moyen | Option `--no-exec` pour désactiver |
| Pas d'authentification | Faible (localhost) | Token optionnel en header |
| Extension a `<all_urls>` | Inhérent | Normal pour ce use case |

---

## 7. Comparaison avec alternatives

| Critère | chromium-cli | Puppeteer | Playwright | Selenium |
|---------|--------------|-----------|------------|----------|
| **Setup** | Extension + server | npm install | npm install | Driver + bindings |
| **Langage** | Bash/shell | JavaScript | Multi | Multi |
| **Browser réel** | Oui (ton navigateur) | Headless par défaut | Headless par défaut | Oui |
| **Sessions existantes** | Oui | Non | Non | Non |
| **Cookies/auth** | Déjà présents | À gérer | À gérer | À gérer |
| **Poids** | ~1000 lignes | Lourd | Lourd | Très lourd |

**Avantage unique** : chromium-cli contrôle ton navigateur existant avec tes sessions actives.

---

## 8. Tests effectués

### Scénario de test

1. **Lister les onglets** : 5 onglets trouvés (Wikipedia, 3x GitHub, Google)
2. **Fermer tous sauf un** : 4 onglets fermés avec succès
3. **Navigation** : `go news.ycombinator.com --wait` fonctionne
4. **Extraction DOM** : `text ".titleline > a"` retourne "Iconify: Library of Open Source Icons"
5. **Screenshot** : Image PNG 2560x1278 générée (bug --output confirmé)

### Résultats

| Test | Résultat | Notes |
|------|----------|-------|
| tabs list | PASS | Formatage clair |
| tabs close (multiple) | PASS | Supporte IDs séparés par virgule |
| go + --wait | PASS | Attend correctement le chargement |
| dom text | PASS | Retourne le texte du premier match |
| screenshot | PARTIAL | Fonctionne mais ignore --output |

---

## 9. Recommandations

### Priorité haute

1. **Corriger le bug `--output`** pour screenshot
   - Déplacer le parsing de `--output` avant le shift des arguments

2. **Ajouter `tabs close-others`**
   ```bash
   chromium-cli tabs close-others  # Ferme tous sauf l'actif
   ```

3. **Implémenter le crop pour element screenshot**
   - Utiliser ImageMagick si disponible, sinon retourner l'image complète avec coordonnées

### Priorité moyenne

4. **Tab completion bash/zsh**
   - Créer `completions/chromium-cli.bash` et `.zsh`

5. **Rendre l'URL serveur configurable dans l'extension**
   - Via le popup ou `chrome.storage.sync`

6. **Ajouter un mode verbose**
   ```bash
   chromium-cli --verbose tabs list
   ```

### Priorité basse

7. **Health check endpoint** `/health`
8. **Logging configurable** dans le serveur
9. **Support des iframes** pour les commandes DOM

---

## 10. Conclusion

chromium-cli est un outil bien conçu qui remplit un besoin réel : automatiser un navigateur existant depuis le terminal. L'architecture CLI → Server → Extension est élégante et le code est propre. Les bugs sont mineurs et facilement corrigeables.

**Points forts majeurs** :
- Contrôle du navigateur existant (avec sessions actives)
- API intuitive avec raccourcis
- Code léger et maintenable
- Support multi-navigateur

**Points d'amélioration** :
- Bugs mineurs à corriger (--output, aliases)
- Commandes bulk manquantes
- Tab completion pour meilleure UX

C'est un excellent outil pour le scripting, l'automatisation et l'intégration avec des agents IA.
