// Minimal i18n: flat key → string dictionaries, {param} interpolation.

import { useAppState, type Language } from '../state/store'

const de = {
  // Onboarding
  'onb.welcome': 'Willkommen!',
  'onb.tagline': 'Lerne jedes Checkout – zugeschnitten auf deine Lieblingsdoppel.',
  'onb.language': 'Sprache',
  'onb.next': 'Weiter',
  'onb.pin.title': 'PIN-Sperre',
  'onb.pin.explain': 'Schütze die App mit einer 4-stelligen PIN (optional).',
  'onb.pin.enter': 'PIN eingeben',
  'onb.pin.repeat': 'PIN wiederholen',
  'onb.pin.mismatch': 'Die PINs stimmen nicht überein.',
  'onb.pin.skip': 'Ohne PIN fortfahren',
  'onb.favs.title': 'Deine Lieblingsdoppel',
  'onb.favs.explain':
    'Wähle bis zu 2 Doppel, auf denen du am liebsten checkst. Die Lernrouten werden darauf zugeschnitten. Du kannst das später jederzeit ändern.',
  'onb.favs.first': 'Favorit 1',
  'onb.favs.second': 'Favorit 2',
  'onb.favs.none': 'Keine Auswahl – Standard-Checkouts lernen',
  'onb.favs.madhouse': 'Doppel 1?! Das „Madhouse“ – mutige Strategie! 😄 Wirklich sicher?',
  'onb.favs.unusual': 'Interessante Wahl … ein ungerades Doppel ist ungewöhnlich. Du bist der Boss!',
  'onb.start': "Los geht's!",
  // Home
  'home.streak': 'Tage-Serie',
  'home.best': 'Rekord',
  'home.lesson.start': 'Tageslektion starten',
  'home.lesson.done': 'Lektion für heute geschafft! 🎯',
  'home.lesson.more': 'Noch eine Runde',
  'home.stage.locked': 'Gesperrt',
  'home.stage.progress': '{done} von {total} gemeistert',
  'home.unit': 'Einheit {n}',
  'home.node.start': 'START',
  'home.node.review': 'Üben',
  'home.endless': 'Dauertraining',
  'home.endless.sub': 'Aus allen Einheiten',
  'home.miss': 'Fehlwurf-Training',
  'home.miss.sub': 'Triple → Single',
  'home.miss.locked': 'Übe erst {n} Checkouts',
  // Stages
  'stage.0': 'Zwei Darts: 61–80',
  'stage.1': 'Zwei Darts: 81–100',
  'stage.2': 'Über die 100: 101–120',
  'stage.3': 'Drei Darts: 121–140',
  'stage.4': 'Die großen Fische: 141–170',
  // Lesson
  'lesson.title': 'Lektion',
  'lesson.checkoutPrompt': 'Wie checkst du {score}?',
  'lesson.dartsInHand': '{n} Darts in der Hand',
  'lesson.check': 'Prüfen',
  'lesson.continue': 'Weiter',
  'lesson.correct': 'Richtig! 🎯',
  'lesson.alsoWorks': 'Geht auch! Empfohlen wäre: {route}',
  'lesson.wrong': 'Leider nicht. Die Route ist: {route}',
  'lesson.directHint': 'Direkt ginge auch: {dart}',
  'lesson.proTip': '💡 Profi-Route: {route}',
  'lesson.favRoute': '⭐ Deine Route: {route}',
  'lesson.miss.goodSetup': 'Stark! {leave} bleibt – dein Doppel wartet.',
  'lesson.miss.almostSetup': 'Geht auch! {leave} bleibt – empfohlen: {route} (lässt {bestLeave}).',
  'lesson.miss.wrongSetup': 'Nicht ganz. Empfohlen: {route} (lässt {bestLeave}).',
  'lesson.complete': 'Lektion geschafft!',
  'lesson.summary': '{correct} von {total} richtig',
  'lesson.streakUp': 'Serie: {n} Tage 🔥',
  'lesson.quit': 'Beenden?',
  // Exercises
  'ex.flash.reveal': 'Route zeigen',
  'ex.flash.knew': 'Wusste ich',
  'ex.flash.didntKnow': 'Wusste ich nicht',
  'ex.board.explain': 'Tippe Feld und Ring für jeden Dart.',
  'ex.tiles.explain': 'Baue die Route in der richtigen Reihenfolge.',
  'ex.undo': 'Zurück',
  'ex.clear': 'Löschen',
  'ex.miss.aimedHit': 'Du wolltest {intended} – getroffen: {hit}',
  'ex.miss.finishTask': 'Checke den Rest!',
  'ex.miss.setupTask': 'Kein Checkout – stelle ein Doppel auf!',
  // Settings
  'settings.title': 'Einstellungen',
  'settings.language': 'Sprache',
  'settings.favorites': 'Lieblingsdoppel',
  'settings.favs.changed': 'Routen neu kalibriert – betroffene Checkouts kommen zur Wiederholung.',
  'settings.pin': 'PIN-Sperre',
  'settings.pin.enable': 'PIN aktivieren',
  'settings.pin.disable': 'PIN deaktivieren',
  'settings.pin.change': 'PIN ändern',
  'settings.backup': 'Datensicherung',
  'settings.backup.export': 'Backup exportieren',
  'settings.backup.import': 'Backup importieren',
  'settings.backup.imported': 'Backup wiederhergestellt!',
  'settings.backup.failed': 'Import fehlgeschlagen – ungültige Datei.',
  'settings.reset': 'Alles zurücksetzen',
  'settings.reset.confirm': 'Wirklich ALLE Daten löschen?',
  'settings.none': 'Keins',
  // PIN lock
  'pin.enter': 'PIN eingeben',
  'pin.wrong': 'Falsche PIN',
  // Misc
  'misc.back': 'Zurück',
  'misc.cancel': 'Abbrechen',
  'misc.save': 'Speichern',
  'misc.bull': 'Bull',
  'misc.bogey':
    'Bogey-Zahl! {score} ist mit 3 Darts nicht checkbar – erst stellen.'
}

const en: Record<keyof typeof de, string> = {
  'onb.welcome': 'Welcome!',
  'onb.tagline': 'Learn every checkout — tailored to your favourite doubles.',
  'onb.language': 'Language',
  'onb.next': 'Next',
  'onb.pin.title': 'PIN lock',
  'onb.pin.explain': 'Protect the app with a 4-digit PIN (optional).',
  'onb.pin.enter': 'Enter PIN',
  'onb.pin.repeat': 'Repeat PIN',
  'onb.pin.mismatch': 'The PINs do not match.',
  'onb.pin.skip': 'Continue without PIN',
  'onb.favs.title': 'Your favourite doubles',
  'onb.favs.explain':
    'Pick up to 2 doubles you love finishing on. Learning routes get tailored to them. You can change this anytime.',
  'onb.favs.first': 'Favourite 1',
  'onb.favs.second': 'Favourite 2',
  'onb.favs.none': 'No favourites — learn standard checkouts',
  'onb.favs.madhouse': "Double 1?! The madhouse — bold strategy! 😄 Are you sure?",
  'onb.favs.unusual': 'Interesting choice… an odd double is unusual. You’re the boss!',
  'onb.start': "Let's go!",
  'home.streak': 'day streak',
  'home.best': 'Best',
  'home.lesson.start': "Start today's lesson",
  'home.lesson.done': 'Lesson done for today! 🎯',
  'home.lesson.more': 'One more round',
  'home.stage.locked': 'Locked',
  'home.stage.progress': '{done} of {total} mastered',
  'home.unit': 'Unit {n}',
  'home.node.start': 'START',
  'home.node.review': 'Practice',
  'home.endless': 'Endless practice',
  'home.endless.sub': 'From every unit',
  'home.miss': 'Miss Training',
  'home.miss.sub': 'Triple → Single',
  'home.miss.locked': 'Practice {n} checkouts first',
  'stage.0': 'Two darts: 61–80',
  'stage.1': 'Two darts: 81–100',
  'stage.2': 'Past 100: 101–120',
  'stage.3': 'Three darts: 121–140',
  'stage.4': 'The big fish: 141–170',
  'lesson.title': 'Lesson',
  'lesson.checkoutPrompt': 'How do you check out {score}?',
  'lesson.dartsInHand': '{n} darts in hand',
  'lesson.check': 'Check',
  'lesson.continue': 'Continue',
  'lesson.correct': 'Correct! 🎯',
  'lesson.alsoWorks': 'Also works! Recommended: {route}',
  'lesson.wrong': 'Not quite. The route is: {route}',
  'lesson.directHint': 'Direct would also work: {dart}',
  'lesson.proTip': '💡 Pro route: {route}',
  'lesson.favRoute': '⭐ Your route: {route}',
  'lesson.miss.goodSetup': 'Nice! {leave} left – your double awaits.',
  'lesson.miss.almostSetup': 'Works too! {leave} left – recommended: {route} (leaves {bestLeave}).',
  'lesson.miss.wrongSetup': 'Not quite. Recommended: {route} (leaves {bestLeave}).',
  'lesson.complete': 'Lesson complete!',
  'lesson.summary': '{correct} of {total} correct',
  'lesson.streakUp': 'Streak: {n} days 🔥',
  'lesson.quit': 'Quit?',
  'ex.flash.reveal': 'Reveal route',
  'ex.flash.knew': 'I knew it',
  'ex.flash.didntKnow': "Didn't know",
  'ex.board.explain': 'Tap segment and ring for each dart.',
  'ex.tiles.explain': 'Build the route in the right order.',
  'ex.undo': 'Undo',
  'ex.clear': 'Clear',
  'ex.miss.aimedHit': 'You aimed {intended} – hit: {hit}',
  'ex.miss.finishTask': 'Check out the remainder!',
  'ex.miss.setupTask': 'No checkout – set up a double!',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.favorites': 'Favourite doubles',
  'settings.favs.changed': 'Routes recalibrated — affected checkouts will come up for review.',
  'settings.pin': 'PIN lock',
  'settings.pin.enable': 'Enable PIN',
  'settings.pin.disable': 'Disable PIN',
  'settings.pin.change': 'Change PIN',
  'settings.backup': 'Backup',
  'settings.backup.export': 'Export backup',
  'settings.backup.import': 'Import backup',
  'settings.backup.imported': 'Backup restored!',
  'settings.backup.failed': 'Import failed — invalid file.',
  'settings.reset': 'Reset everything',
  'settings.reset.confirm': 'Really delete ALL data?',
  'settings.none': 'None',
  'pin.enter': 'Enter PIN',
  'pin.wrong': 'Wrong PIN',
  'misc.back': 'Back',
  'misc.cancel': 'Cancel',
  'misc.save': 'Save',
  'misc.bull': 'Bull',
  'misc.bogey': 'Bogey number! {score} cannot be finished with 3 darts — set up first.'
}

export type TranslationKey = keyof typeof de
const dictionaries: Record<Language, Record<TranslationKey, string>> = { de, en }

export function translate(
  lang: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  let s = dictionaries[lang][key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v))
    }
  }
  return s
}

/** React hook returning the translator for the current language. */
export function useT() {
  const { language } = useAppState()
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(language, key, params)
}
