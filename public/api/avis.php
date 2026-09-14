<?php

/**
 * POST /api/avis.php — vote « cette page vous a-t-elle été utile ? ».
 *
 * Le site promet « zéro tracker, aucune donnée transmise » : cet endpoint est
 * l'exception assumée et il n'a le droit d'enregistrer QUE ce que le visiteur a
 * explicitement cliqué — date, page, valeur du vote. Rien d'autre : jamais d'IP,
 * jamais d'user-agent, aucun cookie, aucune session. Ce fichier ne doit donc
 * jamais lire $_SERVER['REMOTE_ADDR'] ni $_SERVER['HTTP_USER_AGENT'], et deux
 * lignes du CSV ne doivent jamais pouvoir être rattachées au même visiteur.
 *
 * Réponses : 204 (succès, corps vide), 405 (autre méthode que POST), 403
 * (en-tête Origin étranger), 400 (champs invalides). Toute erreur SERVEUR
 * (dossier non inscriptible, disque plein, fichier saturé) répond 204 : un
 * problème d'hébergement n'a pas à se traduire par une erreur devant le
 * visiteur, qui n'y peut rien et dont le vote n'est pas critique.
 *
 * Cible PHP : 7.4 → 8.x (hébergement OVH mutualisé, pas de composer).
 */

// L'hébergeur peut servir avec display_errors=On : un warning s'imprimerait
// dans la réponse et le « headers already sent » qui suit casserait le code de
// statut. Les erreurs restent journalisées côté serveur.
@ini_set('display_errors', '0');

/** Seule origine acceptée ; l'en-tête Origin reste absent sur un POST de formulaire classique. */
const ORIGINE_ATTENDUE = 'https://clairfisc.fr';

/** Valeurs de vote admises (enum fermé : rien d'autre n'atteint le disque). */
const AVIS_AUTORISES = ['utile', 'pas-utile'];

/** Borne de longueur du chemin de page (le charset étant ASCII, octets == caractères). */
const LONGUEUR_MAX_CHEMIN = 100;

/**
 * Plafond de taille du CSV : 2 Mio, soit ~35 000 votes. Au-delà on cesse
 * d'écrire silencieusement — l'offre mutualisée a un quota disque, et un
 * endpoint public sans plafond est une invitation à le remplir.
 */
const TAILLE_MAX_FICHIER = 2097152;

/**
 * Termine la requête sur un code de statut, sans corps.
 */
function repondre($code)
{
    http_response_code($code);
    exit;
}

/**
 * Valide un chemin de page du site : « / » ou une suite de segments
 * minuscules/chiffres/tirets, slash final obligatoire (cf. trailingSlash:
 * 'always' côté Astro).
 *
 * L'alphabet autorisé exclut « ; », « \r » et « \n » : c'est ce qui garantit
 * qu'une valeur validée ne peut ni ajouter une colonne ni ajouter une ligne au
 * CSV. La regex se termine par \z et non $ : en PCRE, $ accepte un saut de
 * ligne final, ce qui laisserait justement passer « /page/\n ».
 */
function chemin_valide($chemin)
{
    if (!is_string($chemin) || $chemin === '' || strlen($chemin) > LONGUEUR_MAX_CHEMIN) {
        return false;
    }
    if ($chemin === '/') {
        return true;
    }

    return preg_match('#^/[a-z0-9\-]+(/[a-z0-9\-]+)*/\z#', $chemin) === 1;
}

// --- Méthode -----------------------------------------------------------------

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    repondre(405);
}

// --- Origine -----------------------------------------------------------------

// Origin absent (POST de formulaire, client non navigateur) : accepté, il n'y a
// rien à protéger — aucun état utilisateur, aucune action privilégiée. Origin
// présent et différent : c'est un navigateur qui poste depuis un autre site, on
// refuse.
$origine = isset($_SERVER['HTTP_ORIGIN']) && is_string($_SERVER['HTTP_ORIGIN'])
    ? $_SERVER['HTTP_ORIGIN']
    : '';
if ($origine !== '' && $origine !== ORIGINE_ATTENDUE) {
    repondre(403);
}

// --- Champs ------------------------------------------------------------------

// is_string() avant tout : « page[]=x » ferait de $_POST['page'] un tableau, et
// strlen(array) est une TypeError fatale en PHP 8.
$page = isset($_POST['page']) ? $_POST['page'] : '';
$avis = isset($_POST['avis']) ? $_POST['avis'] : '';

if (!is_string($page) || !is_string($avis)) {
    repondre(400);
}
if (!chemin_valide($page)) {
    repondre(400);
}
if (!in_array($avis, AVIS_AUTORISES, true)) {
    repondre(400);
}

// --- Écriture ----------------------------------------------------------------

// __DIR__ vaut <home>/www/api en production : on remonte deux crans pour sortir
// de www/, le dossier de données ne doit jamais être servi par Apache.
$dossier = dirname(__DIR__, 2) . '/clairfisc-donnees';
$fichier = $dossier . '/avis.csv';

// Le second is_dir() couvre la course avec une requête concurrente qui vient de
// créer le dossier entre-temps (mkdir échoue alors, sans que ce soit un échec).
if (!is_dir($dossier) && !@mkdir($dossier, 0700, true) && !is_dir($dossier)) {
    repondre(204);
}

clearstatcache(true, $fichier);
if (is_file($fichier)) {
    $taille = @filesize($fichier);
    if ($taille === false || $taille >= TAILLE_MAX_FICHIER) {
        repondre(204);
    }
}

// gmdate plutôt que date : le fuseau de l'hébergeur n'est pas garanti, on fixe
// l'UTC pour que les lignes restent comparables entre elles.
$ligne = gmdate('c') . ';' . $page . ';' . $avis . "\n";

$flux = @fopen($fichier, 'ab');
if ($flux === false) {
    repondre(204);
}

// Mode 'a' : chaque fwrite se place en fin de fichier, indépendamment de la
// position du curseur — le flock ne sert qu'à éviter l'entrelacement de deux
// lignes concurrentes.
if (@flock($flux, LOCK_EX)) {
    @fwrite($flux, $ligne);
    @fflush($flux);
    @flock($flux, LOCK_UN);
}
@fclose($flux);

repondre(204);
