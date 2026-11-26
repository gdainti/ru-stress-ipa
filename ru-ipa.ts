/**
 * Russian words whose stress the voice must not guess. Azure's Russian voice reads но́ги and ноги́
 * the same, whatever the sentence says, and ignores a stress mark (U+0301) in the text. What it does
 * follow is the word spelled in IPA inside SSML, each syllable marked:
 *   <phoneme alphabet="ipa" ph="na.ˈɡʲi">ноги</phoneme>
 * Without the dots it stresses the wrong syllable or swallows sounds.
 *
 * Mark the stressed vowel in the text (ноги́), and `russianSsml` turns each marked word into its IPA.
 *
 * The IPA is rough on purpose: the voice cares about the sounds, the syllables and the stress, not
 * about fine vowel quality (`mu.ˈku` and `mʊ.ˈku` both read муку́ right). Checked by ear: an
 * unstressed и must be `ɪ` (`ˈno.ɡʲi` came out "ног") and ч one sound `t͡ɕ` (`ˈpla.tɕʊ` read плачу́).
 */

export const STRESS = '\u0301';

const VOWELS = 'аоуыэеёиюя';
/** Vowels that soften the consonant before them, or are said with a j after a vowel or a sign */
const SOFTENING = 'еёиюяь';
const IOTATED = 'еёюя';
const CONSONANTS: Record<string, string> = {
	б: 'b',
	в: 'v',
	г: 'ɡ',
	д: 'd',
	ж: 'ʐ',
	з: 'z',
	к: 'k',
	л: 'l',
	м: 'm',
	н: 'n',
	п: 'p',
	р: 'r',
	с: 's',
	т: 't',
	ф: 'f',
	х: 'x',
	ц: 't͡s',
	ч: 't͡ɕ',
	ш: 'ʂ',
	щ: 'ɕː',
	й: 'j'
};
/** Always hard, never take ʲ */
const HARD = 'жшц';
/** Soft by themselves, written without ʲ */
const SOFT = 'чщй';
const STRESSED: Record<string, string> = {
	а: 'a',
	о: 'o',
	у: 'u',
	ы: 'ɨ',
	э: 'e',
	е: 'e',
	ё: 'o',
	и: 'i',
	ю: 'u',
	я: 'a'
};
const UNSTRESSED: Record<string, string> = {
	а: 'a',
	о: 'a',
	у: 'ʊ',
	ы: 'ɨ',
	э: 'ɪ',
	е: 'ɪ',
	ё: 'o',
	и: 'ɪ',
	ю: 'ʊ',
	я: 'ɪ'
};
const DEVOICE: Record<string, string> = { b: 'p', v: 'f', ɡ: 'k', d: 't', ʐ: 'ʂ', z: 's' };
const VOICE: Record<string, string> = Object.fromEntries(
	Object.entries(DEVOICE).map(([voiced, voiceless]) => [voiceless, voiced])
);

interface Segment {
	vowel: boolean;
	ipa: string;
	stressed: boolean;
}

/**
 * The IPA of one word whose stress is marked (`ноги́`, or a ё), each syllable dotted and the stressed
 * one marked `ˈ`: `na.ˈɡʲi`. Null for what it cannot spell: no stress shown, a letter that is not
 * Russian, a hyphen, no vowel
 */
export function stressIpa(word: string): string | null {
	const letters: string[] = [];
	let stress = -1;
	for (const ch of word.toLowerCase().normalize('NFC')) {
		if (ch === STRESS) {
			if (letters.length && VOWELS.includes(letters.at(-1)!)) stress = letters.length - 1;
			continue;
		}
		letters.push(ch);
	}
	if (stress < 0) stress = letters.indexOf('ё');
	if (stress < 0) return null;
	if (!letters.every((ch) => VOWELS.includes(ch) || ch in CONSONANTS || ch === 'ь' || ch === 'ъ'))
		return null;

	const segments: Segment[] = [];
	letters.forEach((ch, i) => {
		const prev = letters[i - 1] ?? '';
		const next = letters[i + 1] ?? '';
		if (VOWELS.includes(ch)) {
			const stressed = i === stress;
			const iotated =
				(IOTATED.includes(ch) &&
					(prev === '' || VOWELS.includes(prev) || prev === 'ь' || prev === 'ъ')) ||
				(ch === 'и' && prev === 'ь');
			let ipa = (stressed ? STRESSED : UNSTRESSED)[ch];
			if (HARD.includes(prev) && (ch === 'и' || (ch === 'е' && !stressed))) ipa = 'ɨ';
			// A last unstressed я is said as а: ня́ня, not ня́ни
			if (ch === 'я' && !stressed && i === letters.length - 1) ipa = 'a';
			segments.push({ vowel: true, ipa: (iotated ? 'j' : '') + ipa, stressed });
		} else if (ch in CONSONANTS) {
			const soft =
				!HARD.includes(ch) && !SOFT.includes(ch) && next !== '' && SOFTENING.includes(next);
			segments.push({ vowel: false, ipa: CONSONANTS[ch] + (soft ? 'ʲ' : ''), stressed: false });
		}
	});
	if (!segments.some((s) => s.vowel)) return null;

	// Voicing, from the end: a voiced consonant goes voiceless at the end of the word and before a
	// voiceless one (кру́жки: ʂ), a voiceless one goes voiced before a voiced one (сдать: z), в aside
	for (let i = segments.length - 1; i >= 0; i--) {
		const s = segments[i];
		if (s.vowel) continue;
		const base = s.ipa.replace('ʲ', '');
		const soft = s.ipa.endsWith('ʲ') ? 'ʲ' : '';
		const next = segments[i + 1];
		const nextBase = next && !next.vowel ? next.ipa.replace('ʲ', '') : null;
		if (!next || (nextBase && nextBase in VOICE)) {
			if (base in DEVOICE) s.ipa = DEVOICE[base] + soft;
		} else if (nextBase && nextBase in DEVOICE && nextBase !== 'v' && base in VOICE) {
			s.ipa = VOICE[base] + soft;
		}
	}

	// Syllables: each vowel takes the one consonant before it, the rest stay with the syllable before
	const vowelAt = segments.flatMap((s, i) => (s.vowel ? [i] : []));
	const starts = [0, ...vowelAt.slice(1).map((v, n) => (v - vowelAt[n] > 1 ? v - 1 : v))];
	return starts
		.map((start, n) => {
			const part = segments.slice(start, starts[n + 1] ?? segments.length);
			return (part.some((s) => s.stressed) ? 'ˈ' : '') + part.map((s) => s.ipa).join('');
		})
		.join('.');
}

const xmlEscape = (text: string) =>
	text.replace(
		/[<>&'"]/g,
		(c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!
	);

/**
 * Russian text as the inside of Azure's `<voice>`: escaped, each word with a stress mark spelled in
 * IPA. A word the IPA cannot be made for is read as written, its mark dropped
 */
export function russianSsml(text: string): string {
	return text
		.split(/([\p{L}\p{M}-]+)/u)
		.map((part, i) => {
			if (i % 2 === 0 || !part.includes(STRESS)) return xmlEscape(part);
			const plain = part.replaceAll(STRESS, '');
			const ipa = stressIpa(part);
			return ipa
				? `<phoneme alphabet="ipa" ph="${ipa}">${xmlEscape(plain)}</phoneme>`
				: xmlEscape(plain);
		})
		.join('');
}

/** The text without stress marks: for a voice that reads them wrong (Google), and for search */
export const withoutStress = (text: string) => text.replaceAll(STRESS, '');
