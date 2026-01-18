# TODO

## Priorité Haute

### Tabs - Commandes bulk

- [ ] `tabs close-others` - Fermer tous les onglets sauf l'actif
- [ ] `tabs close-right [id]` - Fermer tous les onglets à droite
- [ ] `tabs close-left [id]` - Fermer tous les onglets à gauche
- [ ] `tabs close-duplicates` - Fermer les onglets avec la même URL

### Screenshot - Amélioration crop

- [ ] Crop automatique pour `screenshot --element` (utiliser ImageMagick si dispo)
- [ ] Assembler les parties pour `screenshot --full` (stitching)

## Priorité Moyenne

### UX - Tab completion

- [x] Créer `completions/chromium-cli.bash` `@18/01`
- [x] Créer `completions/chromium-cli.zsh` `@18/01`
- [ ] Script d'installation des completions

### Extension - Configuration

- [ ] URL serveur configurable dans la popup
- [ ] Port configurable et persisté dans `chrome.storage.sync`
- [ ] Afficher les stats dans la popup (requêtes, uptime)

### CLI - Options globales

- [x] `--timeout <ms>` - Timeout configurable (défaut 30000) `@18/01`
- [ ] `--verbose` - Mode verbose avec logs détaillés
- [ ] `--quiet` - Mode silencieux (juste codes retour)
- [ ] `--dry-run` - Affiche ce qui serait fait sans exécuter

### Serveur - Monitoring

- [ ] Endpoint `/health` (uptime, connexions, stats)
- [ ] Logging configurable (debug, info, warn, error)
- [ ] Métriques (requêtes/s, latence moyenne)

## Priorité Basse

### Sécurité - Options

- [ ] `--no-exec` - Désactiver `dom exec` pour plus de sécurité
- [ ] Token d'authentification optionnel entre CLI et serveur

### Multi-fenêtre

- [ ] `windows close-others` - Fermer toutes les fenêtres sauf active
- [ ] `windows tile` - Arranger les fenêtres en grille

## Complété

- [x] `--output` pour screenshot `@18/01`
- [x] Validation URL pour `go` et `open` `@18/01`
- [x] Raccourcis CLI (go, click, text, etc.) `@18/01`
- [x] Flag `--wait` pour navigation `@18/01`
- [x] Keepalive service worker extension `@18/01`
- [x] Outputs simplifiés (moins de JSON verbeux) `@18/01`
- [x] `dom exists/count/visible` `@18/01`
- [x] `--timeout <ms>` option globale `@18/01`
- [x] Tab completion bash/zsh `@18/01`
- [x] `dom drag <from> <to>` `@18/01`
- [x] `dom upload <selector> <file>` `@18/01`
- [x] Support iframes `--frame <selector>` `@18/01`
- [x] `dom frames` - lister les iframes `@18/01`
