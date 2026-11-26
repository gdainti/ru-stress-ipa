# ru-stress-ipa

Azure's Russian voices guess the stress of words spelled alike (но́ги / ноги́, му́ка / мука́,
за́мок / замо́к, пла́чу / плачу́), and often guess wrong even when the sentence makes the meaning
clear. A stress mark in the text (U+0301) is ignored. The word spelled in IPA inside SSML is
followed, as long as every syllable is dotted:

```xml
<phoneme alphabet="ipa" ph="na.ˈɡʲi">ноги</phoneme>
```

`ru-ipa.ts` makes that IPA from a word with its stressed vowel marked: you mark the stress, it
spells the word for the voice.

```ts
import { russianSsml, stressIpa } from './ru-ipa.ts';

stressIpa('ноги́'); // 'na.ˈɡʲi'
stressIpa('пла́чу'); // 'ˈpla.t͡ɕʊ'
russianSsml('Он стои́т у окна́.');
// 'Он <phoneme alphabet="ipa" ph="sta.ˈit">стоит</phoneme> у <phoneme alphabet="ipa" ph="ak.ˈna">окна</phoneme>.'
```

Only marked words are touched; the rest is XML-escaped and left to the voice. A word it cannot
spell (a hyphen, a letter that is not Russian) is read as written, without the mark.

## What was checked

With `ru-RU-DmitryNeural`, by ear, in sentences: ноги, мука/муку, замок, стоит, руки, воды, плачу,
города, кружки, окна, both readings each (the cases are the tests). The IPA is rough on purpose: the
voice cares about the sounds, the syllables and the stress, not fine vowel quality (`mu.ˈku` and
`mʊ.ˈku` both work). Two details mattered:

- an unstressed и must be `ɪ`: with `i`, но́ги came out as "ног";
- ч must be one sound, `t͡ɕ`: with `tɕ`, пла́чу was read плачу́.

Placing the marks is a separate job: in the app they come from the LLM that writes the text (told
to mark only words whose stress depends on the meaning), checked against a list of such forms built
from Wiktionary.

## Try it

Node 22.18 or newer (runs TypeScript as is), no dependencies.

```sh
npm test
cp .env.example .env   # add your Azure Speech key
node --env-file=.env say.ts "Купи муку́ и сахар." out.mp3
node say.ts "У него нет ноги́." --ssml   # print the SSML, no key needed
```
