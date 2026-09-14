<?php

/**
 * GET /api/stats.php — page privée de consultation des retours « avis utile »,
 * réservée à l'éditeur du site.
 *
 * Contrairement à /api/avis.php et /api/signalement.php, cet endpoint ne
 * reçoit rien du visiteur ordinaire : il EXPOSE une agrégation des données déjà
 * collectées. L'accès est donc gardé par un jeton secret, lu UNIQUEMENT côté
 * serveur dans <home>/clairfisc-donnees/jeton-stats.txt — ce fichier ne doit
 * jamais entrer dans ce dépôt public (cf. section 5 de DEPLOY.md).
 *
 * Politique de refus : toute anomalie côté jeton (fichier absent, vide, trop
 * court, ou jeton fourni incorrect) répond exactement la même 404 minimale.
 * Le but est de ne rien laisser deviner à un visiteur qui tombe sur l'URL :
 * ni que l'endpoint existe, ni pourquoi l'accès a été refusé.
 *
 * Comme les deux autres endpoints : aucune écriture disque, aucune lecture
 * d'IP/user-agent, aucun cookie. Cible PHP : 7.4 → 8.x (hébergement OVH
 * mutualisé, pas de composer).
 */

// L'hébergeur peut servir avec display_errors=On : un warning s'imprimerait
// dans la réponse et casserait les codes de statut envoyés plus bas. Les
// erreurs restent journalisées côté serveur.
@ini_set('display_errors', '0');

/** Longueur minimale du jeton serveur : un fichier oublié avec « test » dedans
 *  ne doit pas armer l'endpoint. En-deçà, on se comporte comme si le fichier
 *  n'existait pas. */
const LONGUEUR_MIN_JETON = 16;

/** Valeurs de vote admises (identique à AVIS_AUTORISES d'avis.php) : toute
 *  ligne du CSV avec une autre valeur est ignorée comme malformée. */
const AVIS_AUTORISES = ['utile', 'pas-utile'];

/**
 * Plafond de lecture du CSV : 4 Mio. L'écriture (avis.php) est déjà bornée à
 * 2 Mio, cette marge couvre une éventuelle évolution du plafond d'écriture
 * sans qu'on ait à retoucher les deux fichiers ensemble.
 */
const TAILLE_MAX_LECTURE = 4194304;

/** Doit rester synchronisé avec QUOTA_QUOTIDIEN de signalement.php : purement
 *  informatif ici (affichage « N / 20 »), aucune logique n'en dépend. */
const QUOTA_SIGNALEMENTS_JOUR = 20;

/**
 * Échappe une valeur pour affichage HTML. ENT_SUBSTITUTE explicite : sans
 * lui, htmlspecialchars() renvoie une chaîne vide sur de l'UTF-8 invalide, et
 * les valeurs par défaut des drapeaux ont changé entre PHP 7.4 et 8.1.
 */
function echapper($valeur)
{
    return htmlspecialchars((string) $valeur, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Répond 404 avec un corps minimal, toujours identique quelle que soit la
 * raison du refus (fichier jeton absent, vide, trop court, ou jeton fourni
 * incorrect) : c'est ce qui empêche de distinguer « l'endpoint n'existe pas »
 * de « ton jeton est faux ».
 */
function repondre_404()
{
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    echo "Not Found\n";
    exit;
}

/**
 * Récupère le jeton fourni par le visiteur : paramètre de requête `jeton`
 * (usage navigateur, favori/URL) ou en-tête `X-Jeton`. is_string() avant
 * tout : un paramètre envoyé en tableau (`?jeton[]=x`) ne doit jamais
 * atteindre hash_equals(), qui lèverait une TypeError en PHP 8.
 */
function jeton_fourni()
{
    if (isset($_GET['jeton']) && is_string($_GET['jeton'])) {
        return $_GET['jeton'];
    }
    if (isset($_SERVER['HTTP_X_JETON']) && is_string($_SERVER['HTTP_X_JETON'])) {
        return $_SERVER['HTTP_X_JETON'];
    }

    return '';
}

/**
 * Vérifie le jeton fourni contre celui stocké côté serveur.
 *
 * Comparaison en temps constant via hash_equals() (jamais ==, qui court-
 * circuite à la première différence et fuit la longueur du préfixe correct
 * par mesure de temps). Un jeton serveur trop court (< LONGUEUR_MIN_JETON)
 * est traité comme absent : mieux vaut un endpoint désarmé qu'un jeton
 * trivial à deviner.
 */
function jeton_valide($fourni, $fichier_jeton)
{
    if ($fourni === '' || !is_file($fichier_jeton)) {
        return false;
    }

    $contenu = @file_get_contents($fichier_jeton);
    if ($contenu === false) {
        return false;
    }

    $jeton_serveur = trim($contenu);
    if (strlen($jeton_serveur) < LONGUEUR_MIN_JETON) {
        return false;
    }

    return hash_equals($jeton_serveur, $fourni);
}

/**
 * Lit avis.csv borné à TAILLE_MAX_LECTURE octets depuis le début du fichier.
 *
 * @return array{contenu: string, tronque: bool}|null null si le fichier est
 *         absent ou vide.
 */
function lire_csv_borne($fichier)
{
    clearstatcache(true, $fichier);
    if (!is_file($fichier)) {
        return null;
    }

    $taille = @filesize($fichier);
    if ($taille === false || $taille === 0) {
        return null;
    }

    $tronque = $taille > TAILLE_MAX_LECTURE;
    $longueur_lue = $tronque ? TAILLE_MAX_LECTURE : $taille;

    $contenu = @file_get_contents($fichier, false, null, 0, $longueur_lue);
    if ($contenu === false || $contenu === '') {
        return null;
    }

    return ['contenu' => $contenu, 'tronque' => $tronque];
}

/**
 * Parse le contenu lu en lignes agrégées par page. Toute ligne qui n'a pas
 * exactement 3 champs, ou dont le 3e champ n'est pas une valeur d'avis
 * connue, est silencieusement ignorée — un CSV n'est jamais garanti intact
 * (écriture concurrente interrompue, lecture tronquée par TAILLE_MAX_LECTURE).
 *
 * @return array{stats: array<string, array{utile: int, "pas-utile": int}>,
 *               date_min: ?string, date_max: ?string}
 */
function agreger_avis($contenu, $tronque)
{
    $lignes = explode("\n", $contenu);
    if ($tronque) {
        // Dernière ligne potentiellement coupée en plein milieu par la borne
        // de lecture : on la jette plutôt que de risquer un comptage faux.
        array_pop($lignes);
    }

    $stats = [];
    $date_min = null;
    $date_max = null;

    foreach ($lignes as $ligne) {
        $ligne = rtrim($ligne, "\r");
        if ($ligne === '') {
            continue;
        }

        $champs = explode(';', $ligne);
        if (count($champs) !== 3) {
            continue;
        }

        [$date, $page, $avis] = $champs;
        $date = trim($date);
        $page = trim($page);
        $avis = trim($avis);

        if ($date === '' || $page === '' || !in_array($avis, AVIS_AUTORISES, true)) {
            continue;
        }

        if (!isset($stats[$page])) {
            $stats[$page] = ['utile' => 0, 'pas-utile' => 0];
        }
        $stats[$page][$avis]++;

        // Comparaison lexicale : les dates sont écrites par gmdate('c'), donc
        // toutes au format ISO-8601 à largeur fixe et au même fuseau (+00:00)
        // — l'ordre lexical coïncide avec l'ordre chronologique.
        if ($date_min === null || $date < $date_min) {
            $date_min = $date;
        }
        if ($date_max === null || $date > $date_max) {
            $date_max = $date;
        }
    }

    return ['stats' => $stats, 'date_min' => $date_min, 'date_max' => $date_max];
}

/**
 * Ne garde que la partie date (AAAA-MM-JJ) d'un horodatage ISO-8601 et la
 * reformate en JJ/MM/AAAA. Repli sur la valeur brute si le format est
 * inattendu — cette fonction n'affiche jamais rien qui ne soit pas échappé
 * par ailleurs.
 */
function jour_lisible($dateISO)
{
    $jour = substr($dateISO, 0, 10);
    $parties = explode('-', $jour);
    if (count($parties) === 3) {
        return $parties[2] . '/' . $parties[1] . '/' . $parties[0];
    }

    return $dateISO;
}

/**
 * En-tête de page HTML autonome, même sobriété que les pages de réponse de
 * signalement.php. `noindex` en meta ET en en-tête HTTP : page privée, elle
 * ne doit jamais apparaître dans un index de recherche.
 */
function entete_page($titre)
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');

    echo "<!doctype html>\n";
    echo "<html lang=\"fr\">\n<head>\n";
    echo "<meta charset=\"utf-8\">\n";
    echo "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n";
    echo "<meta name=\"robots\" content=\"noindex\">\n";
    echo '<title>' . echapper($titre) . " — Clairfisc</title>\n";
    echo "<style>\n";
    echo "body{margin:0;padding:2.5rem 1.25rem;background:#f8fafc;color:#1f2937;";
    echo "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6}\n";
    echo "main{max-width:48rem;margin:0 auto;padding:1.75rem;background:#fff;";
    echo "border:1px solid #e2e8f0;border-radius:.5rem}\n";
    echo "h1{margin:0 0 1rem;font-size:1.25rem;line-height:1.3}\n";
    echo "p{margin:0 0 1rem}\n";
    echo "table{width:100%;border-collapse:collapse;font-size:.9rem}\n";
    echo "th,td{padding:.4rem .5rem;border-bottom:1px solid #e2e8f0;text-align:right}\n";
    echo "th:first-child,td:first-child{text-align:left}\n";
    echo "th{color:#475569;font-weight:600}\n";
    echo "</style>\n</head>\n<body>\n<main>\n";
    echo '<h1>' . echapper($titre) . "</h1>\n";
}

function pied_page()
{
    echo "</main>\n</body>\n</html>\n";
    exit;
}

/**
 * Affiche, si le fichier du jour existe, le compteur de signalements envoyés
 * aujourd'hui. Absent (aucun signalement aujourd'hui) : rien n'est affiché.
 */
function afficher_compteur_signalements($dossier)
{
    $fichier = $dossier . '/signalements-' . gmdate('Ymd') . '.txt';
    if (!is_file($fichier)) {
        return;
    }

    $contenu = @file_get_contents($fichier);
    $compteur = is_string($contenu) ? (int) trim($contenu) : 0;
    if ($compteur < 0) {
        $compteur = 0;
    }

    echo '<p>Signalements aujourd’hui : ' . echapper($compteur) . ' / ' . QUOTA_SIGNALEMENTS_JOUR . "</p>\n";
}

// --- Méthode -----------------------------------------------------------------

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    exit;
}

// --- Chemins -------------------------------------------------------------

// __DIR__ vaut <home>/www/api en production : on remonte deux crans pour
// sortir de www/, le dossier de données ne doit jamais être servi par Apache.
$dossier = dirname(__DIR__, 2) . '/clairfisc-donnees';
$fichier_jeton = $dossier . '/jeton-stats.txt';
$fichier_avis = $dossier . '/avis.csv';

// --- Jeton -----------------------------------------------------------------

if (!jeton_valide(jeton_fourni(), $fichier_jeton)) {
    repondre_404();
}

// --- Lecture et agrégation ---------------------------------------------------

$lecture = lire_csv_borne($fichier_avis);

if ($lecture === null) {
    entete_page('Statistiques des avis');
    echo "<p>Aucun avis pour l’instant.</p>\n";
    afficher_compteur_signalements($dossier);
    pied_page();
}

$resultat = agreger_avis($lecture['contenu'], $lecture['tronque']);
$stats = $resultat['stats'];

if (empty($stats)) {
    entete_page('Statistiques des avis');
    echo "<p>Aucun avis pour l’instant.</p>\n";
    afficher_compteur_signalements($dossier);
    pied_page();
}

// --- Rendu -------------------------------------------------------------------

entete_page('Statistiques des avis');

if ($lecture['tronque']) {
    echo '<p>Fichier avis.csv plus grand que ' . (TAILLE_MAX_LECTURE / 1048576)
        . " Mio : seul le début du fichier a été lu, ces chiffres sont partiels.</p>\n";
}

if ($resultat['date_min'] !== null && $resultat['date_max'] !== null) {
    echo '<p>Période couverte : du ' . echapper(jour_lisible($resultat['date_min']))
        . ' au ' . echapper(jour_lisible($resultat['date_max'])) . "</p>\n";
}

$total_utile = 0;
$total_pas_utile = 0;
$lignes_tableau = [];
foreach ($stats as $page => $compte) {
    $total = $compte['utile'] + $compte['pas-utile'];
    $pourcentage = $total > 0 ? round($compte['utile'] / $total * 100, 1) : 0;
    $lignes_tableau[] = [
        'page' => $page,
        'utile' => $compte['utile'],
        'pas-utile' => $compte['pas-utile'],
        'total' => $total,
        'pourcentage' => $pourcentage,
    ];
    $total_utile += $compte['utile'];
    $total_pas_utile += $compte['pas-utile'];
}

// Tri par total décroissant. usort n'est pas stable avant PHP 8.0, mais deux
// pages à total strictement égal n'ont pas d'ordre garanti par la spec — sans
// conséquence ici.
usort($lignes_tableau, function ($a, $b) {
    return $b['total'] <=> $a['total'];
});

$total_general = $total_utile + $total_pas_utile;
echo '<p>Total général : ' . echapper($total_general) . ' avis (' . echapper($total_utile)
    . ' 👍, ' . echapper($total_pas_utile) . " 👎)</p>\n";

echo "<table>\n<thead>\n<tr><th>Page</th><th>👍</th><th>👎</th><th>Total</th><th>% utile</th></tr>\n</thead>\n<tbody>\n";
foreach ($lignes_tableau as $ligne) {
    echo '<tr><td>' . echapper($ligne['page']) . '</td><td>' . echapper($ligne['utile'])
        . '</td><td>' . echapper($ligne['pas-utile']) . '</td><td>' . echapper($ligne['total'])
        . '</td><td>' . echapper($ligne['pourcentage']) . "%</td></tr>\n";
}
echo "</tbody>\n</table>\n";

afficher_compteur_signalements($dossier);

pied_page();
