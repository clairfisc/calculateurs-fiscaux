<?php

/**
 * POST /api/signalement.php — formulaire « signaler une erreur / poser une
 * question », relayé par mail vers signalement@clairfisc.fr.
 *
 * Comme /api/avis.php, c'est une exception assumée à la promesse « zéro
 * tracker, aucune donnée transmise » : on ne transmet que ce que le visiteur a
 * saisi. Rien n'est stocké sur disque à part un compteur d'envois du jour —
 * jamais d'IP, jamais d'user-agent, aucun cookie, aucune session. Ce fichier ne
 * doit donc jamais lire $_SERVER['REMOTE_ADDR'] ni $_SERVER['HTTP_USER_AGENT'],
 * ce qui exclut au passage tout anti-abus par adresse : d'où le plafond
 * GLOBAL ci-dessous, seul levier compatible avec la promesse.
 *
 * Réponses : 303 vers /signaler/merci/ (succès, et aussi honeypot déclenché),
 * 422 (validation), 429 (plafond du jour), 500 (envoi impossible), 405, 403.
 *
 * Cible PHP : 7.4 → 8.x (hébergement OVH mutualisé, pas de composer).
 */

// display_errors=On côté hébergeur imprimerait un warning avant nos en-têtes et
// casserait redirections et codes de statut. Les erreurs restent journalisées.
@ini_set('display_errors', '0');

const ORIGINE_ATTENDUE = 'https://clairfisc.fr';

const URL_FORMULAIRE = '/signaler/';
const URL_MERCI = '/signaler/merci/';
const URL_ISSUES = 'https://github.com/clairfisc/calculateurs-fiscaux/issues';

const DESTINATAIRE = 'signalement@clairfisc.fr';
const EXPEDITEUR = 'ne-pas-repondre@clairfisc.fr';
const EXPEDITEUR_AFFICHE = 'Clairfisc <ne-pas-repondre@clairfisc.fr>';

/** Sujets admis (enum fermé : la valeur part dans l'en-tête Subject). */
const SUJETS_AUTORISES = ['erreur', 'question', 'autre'];

const MESSAGE_MAX_CARACTERES = 5000;

/**
 * Bornes en OCTETS appliquées aux valeurs brutes, avant toute autre
 * manipulation. strlen() est en O(1) en PHP : on écarte un envoi démesuré sans
 * jamais parcourir son contenu. Le message est borné à 4 octets par caractère
 * (maximum d'UTF-8) ; la borne en caractères, elle, est vérifiée ensuite.
 */
const MESSAGE_MAX_OCTETS = MESSAGE_MAX_CARACTERES * 4;
const EMAIL_MAX_OCTETS = 254; // longueur maximale d'une adresse (RFC 5321)
const SUJET_MAX_OCTETS = 32;
const CHEMIN_MAX_OCTETS = 100;

/** Plafond global d'envois par jour (protège le quota mail OVH et la boîte). */
const QUOTA_QUOTIDIEN = 20;

/**
 * Émet une page HTML autonome et termine la requête.
 *
 * Les libellés sont écrits ici et JAMAIS construits à partir d'une saisie
 * visiteur ; l'échappement reste appliqué à tout ce qui est émis pour que cette
 * propriété survive à une modification future. ENT_SUBSTITUTE est explicite :
 * sans lui, htmlspecialchars() renvoie une chaîne vide sur de l'UTF-8 invalide,
 * et les valeurs par défaut des drapeaux ont changé entre PHP 7.4 et 8.1.
 *
 * @param int      $code        Code de statut HTTP.
 * @param string   $titre       Titre de la page (texte brut).
 * @param string[] $paragraphes Paragraphes (texte brut).
 * @param array[]  $liens       Liens [['href' => ..., 'texte' => ...], ...],
 *                              href toujours issu d'une constante de ce fichier.
 */
function page_reponse($code, $titre, array $paragraphes, array $liens = [])
{
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');

    $echapper = function ($texte) {
        return htmlspecialchars($texte, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    };

    echo "<!doctype html>\n";
    echo "<html lang=\"fr\">\n<head>\n";
    echo "<meta charset=\"utf-8\">\n";
    echo "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n";
    // Ces pages ne sont que des réponses transactionnelles : hors de l'index.
    echo "<meta name=\"robots\" content=\"noindex\">\n";
    echo '<title>' . $echapper($titre) . " — Clairfisc</title>\n";
    echo "<style>\n";
    echo "body{margin:0;padding:2.5rem 1.25rem;background:#f8fafc;color:#1f2937;";
    echo "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6}\n";
    echo "main{max-width:36rem;margin:0 auto;padding:1.75rem;background:#fff;";
    echo "border:1px solid #e2e8f0;border-radius:.5rem}\n";
    echo "h1{margin:0 0 1rem;font-size:1.25rem;line-height:1.3}\n";
    echo "p{margin:0 0 1rem}\n";
    echo "p:last-child{margin-bottom:0}\n";
    echo "a{color:#1d4ed8}\n";
    echo "</style>\n</head>\n<body>\n<main>\n";
    echo '<h1>' . $echapper($titre) . "</h1>\n";

    foreach ($paragraphes as $paragraphe) {
        echo '<p>' . $echapper($paragraphe) . "</p>\n";
    }
    foreach ($liens as $lien) {
        echo '<p><a href="' . $echapper($lien['href']) . '">' . $echapper($lien['texte']) . "</a></p>\n";
    }

    echo "</main>\n</body>\n</html>\n";
    exit;
}

/**
 * Page 422 : la saisie n'est pas exploitable, on explique quoi corriger.
 */
function erreur_validation($explication)
{
    page_reponse(
        422,
        'Ce signalement n’a pas pu être envoyé',
        [$explication, 'Rien n’a été enregistré : revenez au formulaire et réessayez.'],
        [['href' => URL_FORMULAIRE, 'texte' => '← Retour au formulaire']]
    );
}

/**
 * Page 500 : le problème est de notre côté, on propose la porte de secours.
 */
function erreur_technique()
{
    page_reponse(
        500,
        'Votre message n’a pas pu être transmis',
        [
            'Un incident technique empêche l’envoi du message pour le moment — il ne nous est pas parvenu.',
            'Vous pouvez réessayer plus tard, ou décrire le problème dans une issue GitHub publique (aucun compte Clairfisc nécessaire).',
        ],
        [
            ['href' => URL_ISSUES, 'texte' => 'Ouvrir une issue sur GitHub'],
            ['href' => URL_FORMULAIRE, 'texte' => '← Retour au formulaire'],
        ]
    );
}

/**
 * Redirige vers la page de remerciement. 303 : le rechargement de la page
 * d'arrivée ne rejoue pas le POST.
 */
function rediriger_merci()
{
    header('Location: ' . URL_MERCI, true, 303);
    exit;
}

/**
 * Récupère un champ POST sous forme de chaîne. Un champ envoyé en tableau
 * (« message[]=x ») ne doit jamais atteindre strlen() : TypeError fatale en
 * PHP 8. On le traite comme absent.
 */
function champ($nom)
{
    if (!isset($_POST[$nom]) || !is_string($_POST[$nom])) {
        return '';
    }

    return $_POST[$nom];
}

/**
 * Identique à /api/avis.php : « / » ou segments minuscules/chiffres/tirets avec
 * slash final. \z et non $, car $ tolère un saut de ligne final en PCRE — ce
 * chemin part dans l'en-tête Subject, la nuance est une injection d'en-tête.
 */
function chemin_valide($chemin)
{
    if (!is_string($chemin) || $chemin === '' || strlen($chemin) > CHEMIN_MAX_OCTETS) {
        return false;
    }
    if ($chemin === '/') {
        return true;
    }

    return preg_match('#^/[a-z0-9\-]+(/[a-z0-9\-]+)*/\z#', $chemin) === 1;
}

/**
 * Neutralise une valeur destinée à un en-tête de mail : suppression de tous les
 * caractères de contrôle ASCII. CR et LF sont le vecteur d'injection d'en-tête
 * via mail() ; les autres (NUL, échappements) n'ont rien à faire dans un mail.
 * Appliqué même aux valeurs déjà issues d'un enum ou d'une regex — la défense ne
 * doit pas dépendre de la validation faite ailleurs.
 *
 * La classe ne vise que l'ASCII : aucun octet d'une séquence UTF-8 multi-octets
 * n'y tombe (ils valent tous 0x80 ou plus), le tiret cadratin survit intact.
 */
function nettoyer_entete($valeur)
{
    $propre = preg_replace('/[\x00-\x1F\x7F]/', '', $valeur);

    return is_string($propre) ? $propre : '';
}

/**
 * Longueur en caractères (et non en octets) d'une chaîne UTF-8.
 */
function longueur_caracteres($texte)
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($texte, 'UTF-8');
    }

    // Repli sans mbstring : compte les octets qui ne sont pas une continuation
    // UTF-8 (10xxxxxx), ce qui donne le nombre de points de code.
    return strlen(preg_replace('/[\x80-\xBF]/', '', $texte));
}

/**
 * Encode le Subject si nécessaire. Un sujet purement ASCII imprimable passe tel
 * quel (RFC 5322) ; sinon il faut un encoded-word, sans quoi le tiret cadratin
 * arrive en mojibake. mb_encode_mimeheader gère le repliage sur 75 colonnes ;
 * son repli est un « \r\n » toujours suivi d'une espace (repliage légal), d'où
 * l'ordre impératif : nettoyer_entete() D'ABORD, encoder ENSUITE.
 */
function encoder_sujet($sujet)
{
    if (preg_match('/^[\x20-\x7E]*\z/', $sujet) === 1) {
        return $sujet;
    }
    if (function_exists('mb_encode_mimeheader')) {
        if (function_exists('mb_internal_encoding')) {
            mb_internal_encoding('UTF-8');
        }

        return mb_encode_mimeheader($sujet, 'UTF-8', 'B');
    }

    // Repli sans mbstring : un seul encoded-word. Le sujet est court et de forme
    // contrôlée (enum + chemin borné à 100 octets), on reste dans les clous.
    return '=?UTF-8?B?' . base64_encode($sujet) . '?=';
}

/**
 * Réserve une place dans le quota du jour.
 *
 * Le compteur est incrémenté AVANT l'envoi, pendant que le verrou est tenu :
 * l'incrémenter après laisserait N requêtes concurrentes franchir ensemble le
 * test tant que mail() n'a pas rendu la main. Contrepartie assumée : un envoi
 * qui échoue consomme sa place, ce qui borne aussi les tentatives en boucle.
 *
 * Le nom de fichier ne contient que la date UTC — aucune donnée visiteur
 * n'entre dans un chemin.
 *
 * @return string 'ok' | 'plein' | 'indisponible'
 */
function reserver_quota($dossier)
{
    if (!is_dir($dossier) && !@mkdir($dossier, 0700, true) && !is_dir($dossier)) {
        return 'indisponible';
    }

    $fichier = $dossier . '/signalements-' . gmdate('Ymd') . '.txt';

    // 'c+b' : crée le fichier s'il manque, ne tronque pas, curseur en 0.
    $flux = @fopen($fichier, 'c+b');
    if ($flux === false) {
        return 'indisponible';
    }
    if (!@flock($flux, LOCK_EX)) {
        @fclose($flux);

        return 'indisponible';
    }

    $contenu = @stream_get_contents($flux);
    $compteur = is_string($contenu) ? (int) trim($contenu) : 0;
    if ($compteur < 0) {
        $compteur = 0;
    }

    if ($compteur >= QUOTA_QUOTIDIEN) {
        @flock($flux, LOCK_UN);
        @fclose($flux);

        return 'plein';
    }

    $compteur++;
    $ok = @ftruncate($flux, 0);
    if ($ok) {
        $ok = @rewind($flux);
    }
    if ($ok) {
        $ok = (@fwrite($flux, $compteur . "\n") !== false);
    }
    @fflush($flux);
    @flock($flux, LOCK_UN);
    @fclose($flux);

    // Compteur non réécrit : on refuse plutôt que de perdre le plafond. Un
    // endpoint mail sans compteur fiable est une passerelle à spam ouverte.
    return $ok ? 'ok' : 'indisponible';
}

// --- Méthode -----------------------------------------------------------------

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    page_reponse(
        405,
        'Cette page n’est pas consultable directement',
        ['Le formulaire de signalement se trouve sur la page dédiée.'],
        [['href' => URL_FORMULAIRE, 'texte' => '← Aller au formulaire']]
    );
}

// --- Origine -----------------------------------------------------------------

// Origin absent : accepté (POST de formulaire classique, client non navigateur).
// Origin présent et étranger : un navigateur poste depuis un autre site, refus.
$origine = isset($_SERVER['HTTP_ORIGIN']) && is_string($_SERVER['HTTP_ORIGIN'])
    ? $_SERVER['HTTP_ORIGIN']
    : '';
if ($origine !== '' && $origine !== ORIGINE_ATTENDUE) {
    page_reponse(
        403,
        'Requête refusée',
        ['Ce formulaire ne peut être envoyé que depuis clairfisc.fr.'],
        [['href' => URL_FORMULAIRE, 'texte' => '← Aller au formulaire']]
    );
}

// --- Champs bruts ------------------------------------------------------------

$sujet_brut = champ('sujet');
$message_brut = champ('message');
$email_brut = champ('email');
$page_brute = champ('page');
$honeypot = champ('site_web');

// Honeypot avant toute validation : un bot doit recevoir EXACTEMENT la réponse
// d'un succès, y compris s'il a par ailleurs rempli n'importe quoi. Rien n'est
// envoyé, rien n'est compté.
if (trim($honeypot) !== '') {
    rediriger_merci();
}

// Bornes sur les valeurs brutes, avant tout traitement de leur contenu.
if (
    strlen($sujet_brut) > SUJET_MAX_OCTETS
    || strlen($email_brut) > EMAIL_MAX_OCTETS
    || strlen($page_brute) > CHEMIN_MAX_OCTETS
    || strlen($message_brut) > MESSAGE_MAX_OCTETS
) {
    erreur_validation('Un des champs dépasse la taille autorisée (le message est limité à ' . MESSAGE_MAX_CARACTERES . ' caractères).');
}

// --- Validation --------------------------------------------------------------

if (!in_array($sujet_brut, SUJETS_AUTORISES, true)) {
    erreur_validation('Le motif du signalement n’a pas été reconnu. Choisissez « erreur », « question » ou « autre ».');
}
$sujet = $sujet_brut;

$message = trim($message_brut);
if ($message === '') {
    erreur_validation('Le message est vide : décrivez en quelques mots ce que vous avez constaté.');
}
if (longueur_caracteres($message) > MESSAGE_MAX_CARACTERES) {
    erreur_validation('Le message dépasse ' . MESSAGE_MAX_CARACTERES . ' caractères.');
}
// Un message qui n'est pas de l'UTF-8 valide serait annoncé comme tel dans le
// mail et arriverait illisible : autant le dire tout de suite.
if (function_exists('mb_check_encoding') && !mb_check_encoding($message, 'UTF-8')) {
    erreur_validation('Le message contient des caractères que nous ne savons pas lire. Réessayez en texte simple.');
}

// Adresse : nettoyée d'abord, validée ensuite. Dans cet ordre, une valeur qui
// passe filter_var est nécessairement dépourvue de CR/LF — une tentative
// d'injection devient une adresse invalide, donc simplement ignorée.
$email_nettoye = trim(nettoyer_entete($email_brut));
$email_valide = '';
if ($email_nettoye !== '' && filter_var($email_nettoye, FILTER_VALIDATE_EMAIL) !== false) {
    $email_valide = $email_nettoye;
}

// Chemin invalide : ignoré (champ purement informatif, ce n'est pas au visiteur
// de le corriger).
$page = chemin_valide($page_brute) ? $page_brute : '';

// --- Quota du jour -----------------------------------------------------------

// mail() peut être absente de l'hébergement (disable_functions) : en PHP 8,
// l'appeler serait une Error fatale, donc une page blanche. On vérifie avant de
// consommer une place du quota.
if (!function_exists('mail')) {
    erreur_technique();
}

// __DIR__ vaut <home>/www/api en production : deux crans plus haut pour sortir
// de www/, le dossier de données ne doit jamais être servi par Apache.
$dossier = dirname(__DIR__, 2) . '/clairfisc-donnees';
$quota = reserver_quota($dossier);

if ($quota === 'plein') {
    page_reponse(
        429,
        'Trop de signalements pour aujourd’hui',
        [
            'Le formulaire a atteint son plafond quotidien d’envois — une limite volontaire, puisque le site ne conserve rien qui permettrait de filtrer autrement.',
            'Merci de réessayer demain. Si le sujet est urgent, vous pouvez ouvrir une issue GitHub publique dès maintenant.',
        ],
        [
            ['href' => URL_ISSUES, 'texte' => 'Ouvrir une issue sur GitHub'],
            ['href' => URL_FORMULAIRE, 'texte' => '← Retour au formulaire'],
        ]
    );
}
if ($quota !== 'ok') {
    erreur_technique();
}

// --- Envoi -------------------------------------------------------------------

$page_affichee = $page !== '' ? $page : 'sans page';
$sujet_mail = encoder_sujet(nettoyer_entete('[Clairfisc] ' . $sujet . ' — ' . $page_affichee));

if ($email_valide !== '') {
    $ligne_reponse = $email_valide;
} elseif ($email_nettoye !== '') {
    // Conservé tel quel dans le CORPS (aucun risque d'en-tête) : une adresse mal
    // saisie reste souvent lisible pour un humain.
    $ligne_reponse = 'adresse fournie non valide : ' . $email_nettoye;
} else {
    $ligne_reponse = 'aucune adresse fournie';
}

$corps = "Signalement envoyé depuis clairfisc.fr\n\n"
    . 'Sujet   : ' . $sujet . "\n"
    . 'Page    : ' . $page_affichee . "\n"
    . 'Date    : ' . gmdate('c') . " (UTC)\n"
    . 'Réponse : ' . $ligne_reponse . "\n"
    . "\n--- Message du visiteur ---\n\n"
    . $message . "\n";

$entetes = [
    'From: ' . EXPEDITEUR_AFFICHE,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    // base64 plutôt que 8bit : le message peut être un bloc de 5 000 caractères
    // sans aucun saut de ligne, or SMTP interdit les lignes de plus de 998
    // octets. L'encodage supprime aussi toute question de transport 8 bits.
    'Content-Transfer-Encoding: base64',
];
if ($email_valide !== '') {
    $entetes[] = 'Reply-To: ' . $email_valide;
}

$corps_encode = chunk_split(base64_encode($corps), 76, "\r\n");

// 5e argument : adresse d'enveloppe (-f), sans quoi OVH expédie sous l'adresse
// système et le SPF du domaine ne couvre pas le message. Certains hébergements
// refusent ce paramètre : on retente alors sans, plutôt que de perdre le
// signalement.
$envoye = @mail(DESTINATAIRE, $sujet_mail, $corps_encode, implode("\r\n", $entetes), '-f' . EXPEDITEUR);
if ($envoye !== true) {
    $envoye = @mail(DESTINATAIRE, $sujet_mail, $corps_encode, implode("\r\n", $entetes));
}

if ($envoye !== true) {
    erreur_technique();
}

rediriger_merci();
