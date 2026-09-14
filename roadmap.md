# METZY — feuille de route

## Fait
- Base de données complète (villes, catégories, profils, rôles, niveaux, abonnements, commerces, offres, tokens, validations, XP, audit, fraude, favoris, parrainage)
- Design system + navigation mobile
- Accueil public avec deux espaces distincts (particuliers / professionnels)
- Auth particuliers (`/auth`) et auth pro dédiée (`/pro/auth`) + Google, garde `_authenticated`
- Page de confirmation d'e-mail qui redirige selon le type de compte
- Client : accueil, explorer, offre + QR, commerce, carte, récompenses, favoris, profil, abonnement
- Espace commerçant : inscription, dashboard, offres CRUD, scanner QR, gestion d'équipe, contact
- Back-office admin : vue d'ensemble, commerces, offres, fraude, paramètres, accès & rôles
- Comptes admin : liste d'accès par e-mail, attribution automatique du rôle après vérification de l'e-mail, retrait de rôle
- Pas d'essai gratuit ; abonnement non bloquant jusqu'à Stripe (`subscriptions_enforced = false`)
- Pages légales complètes : CGU, confidentialité, mentions légales, FAQ (avec données structurées)
- Espace « Mon compte » : modification des informations, mot de passe, suppression de compte (RGPD)
- Aide & support : formulaire de demande + suivi, back-office `/admin/support`
- Durcissement sécurité : fonctions sensibles inaccessibles aux visiteurs, rôles d'autrui non consultables
- Validation renforcée du formulaire d'offres commerçant (dates, limites, points, photo)

- Avis vérifiés sur les commerces (note 1-5 + commentaire, uniquement après utilisation d'une offre) affichés sur la fiche commerce
- Notifications de nouvelles offres à proximité (`/notifications`, préférence activable, création automatique quand une offre devient active)

## Reste
- [ ] Paiement Stripe (abonnements client + commerçant), puis activer `subscriptions_enforced`


## Ajouté (fidélité, amis, sécurité comptes)
- Cadeaux fidélité : catalogue admin (`/admin/cadeaux`), échange instantané avec débit des points (`/cadeaux`), coupon QR validable dans n'importe quel commerce partenaire, cadeaux postaux transmis aux admins
- Niveaux calculés sur les points cumulés à vie, solde dépensable séparé
- Amis : pseudo unique, recherche, demandes/acceptation, retrait, classement entre amis (`/amis`)
- Un seul compte par pseudo et par numéro de téléphone (unicité en base + vérification avant inscription, particuliers et pros)
- Scanner pro : validation limitée aux offres de son propre commerce (côté base), coupons cadeaux acceptés partout
