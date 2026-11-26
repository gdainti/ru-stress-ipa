import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { russianSsml, stressIpa, withoutStress } from './ru-ipa.ts';

describe('stressIpa', () => {
	// Each of these was played by Azure's ru-RU-DmitryNeural and heard right (2026-11-26)
	for (const [word, ipa] of [
		['но́ги', 'ˈno.ɡʲɪ'],
		['ноги́', 'na.ˈɡʲi'],
		['му́ка', 'ˈmu.ka'],
		['муку́', 'mʊ.ˈku'],
		['за́мок', 'ˈza.mak'],
		['замо́к', 'za.ˈmok'],
		['сто́ит', 'ˈsto.ɪt'],
		['стои́т', 'sta.ˈit'],
		['ру́ки', 'ˈru.kʲɪ'],
		['руки́', 'rʊ.ˈkʲi'],
		['воды́', 'va.ˈdɨ'],
		['во́ды', 'ˈvo.dɨ'],
		['плачу́', 'pla.ˈt͡ɕu'],
		['пла́чу', 'ˈpla.t͡ɕʊ'],
		['города́', 'ɡa.ra.ˈda'],
		['го́рода', 'ˈɡo.ra.da'],
		['кру́жки', 'ˈkruʂ.kʲɪ'],
		['кружки́', 'krʊʂ.ˈkʲi'],
		['окна́', 'ak.ˈna'],
		['о́кна', 'ˈok.na']
	]) {
		it(`${word} -> ${ipa}`, () => assert.equal(stressIpa(word), ipa));
	}

	it('takes ё as the stress', () => {
		assert.equal(stressIpa('всё'), 'ˈfsʲo');
		assert.equal(stressIpa('берёг'), 'bʲɪ.ˈrʲok');
	});

	it('says е, ё, ю, я with a j at the start, after a vowel or a sign', () => {
		assert.equal(stressIpa('моя́'), 'ma.ˈja');
		assert.equal(stressIpa('семью́'), 'sʲɪ.ˈmʲju');
		assert.equal(stressIpa('е́ду'), 'ˈje.dʊ');
	});

	it('keeps ж, ш, ц hard and ч, щ soft', () => {
		assert.equal(stressIpa('жи́ла'), 'ˈʐɨ.la');
		assert.equal(stressIpa('щеки́'), 'ɕːɪ.ˈkʲi');
	});

	it('voices and devoices consonants as said', () => {
		assert.equal(stressIpa('берег'), null);
		assert.equal(stressIpa('бе́рег'), 'ˈbʲe.rʲɪk');
		assert.equal(stressIpa('сда́ть'), 'ˈzdatʲ');
	});

	it('is null when it cannot spell the word', () => {
		assert.equal(stressIpa('ноги'), null);
		assert.equal(stressIpa('ка́кой-то'), null);
		assert.equal(stressIpa('wórd'), null);
	});

	it('reads a capital the same', () => {
		assert.equal(stressIpa('Во́ды'), 'ˈvo.dɨ');
	});
});

describe('russianSsml', () => {
	it('spells only the marked words in IPA', () => {
		assert.equal(russianSsml('Он стои́т у окна́.'), 
			'Он <phoneme alphabet="ipa" ph="sta.ˈit">стоит</phoneme> у ' +
				'<phoneme alphabet="ipa" ph="ak.ˈna">окна</phoneme>.'
		);
	});

	it('escapes the rest and leaves unmarked text alone', () => {
		assert.equal(russianSsml('Кот & пёс <дома>'), 'Кот &amp; пёс &lt;дома&gt;');
	});

	it('reads a word it cannot spell as written, without the mark', () => {
		assert.equal(russianSsml('ка́кой-то день'), 'какой-то день');
	});
});

describe('withoutStress', () => {
	it('removes the marks', () => {
		assert.equal(withoutStress('У него нет ноги́.'), 'У него нет ноги.');
	});
});
