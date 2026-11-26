// Reads a Russian phrase with Azure, the stress-marked words spelled in IPA, into an mp3.
//
//   node --env-file=.env say.ts "У него нет ноги́." out.mp3
//
// Mark the stressed vowel of a word the voice could read wrong with U+0301 (ноги́). Needs
// AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (see .env.example); --ssml prints what is sent instead.
import { writeFileSync } from 'node:fs';
import { russianSsml } from './ru-ipa.ts';

const VOICE = 'ru-RU-DmitryNeural';
const args = process.argv.slice(2);
const [text, out = 'out.mp3'] = args.filter((a) => !a.startsWith('--'));
if (!text) {
	console.error('usage: node --env-file=.env say.ts "<phrase>" [out.mp3] [--ssml]');
	process.exit(1);
}
const ssml =
	`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ru-RU">` +
	`<voice name="${VOICE}">${russianSsml(text)}</voice></speak>`;
if (args.includes('--ssml')) {
	console.log(ssml);
	process.exit(0);
}
const { AZURE_SPEECH_KEY: key, AZURE_SPEECH_REGION: region } = process.env;
if (!key || !region) throw new Error('AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are not set');
const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
	method: 'POST',
	headers: {
		'Ocp-Apim-Subscription-Key': key,
		'Content-Type': 'application/ssml+xml',
		'X-Microsoft-OutputFormat': 'audio-48khz-96kbitrate-mono-mp3'
	},
	body: ssml
});
if (!res.ok) throw new Error(`azure ${res.status}: ${await res.text()}`);
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log(`${out} written`);
