import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const direct = (url, fit = 'crop') => ({ type: 'direct', url, fit });
const openLibraryIsbn = (isbn) => direct(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);
const randomHouseIsbn = (isbn, fit) => direct(`https://images.penguinrandomhouse.com/cover/d/${isbn}`, fit);
const macmillanIsbn = (isbn) => direct(`https://mpd-biblio-covers.imgix.net/${isbn}.jpg?w=1200&fm=jpg&q=90`);

const covers = [
	['tyranny-of-the-minority', randomHouseIsbn('9780593443071')],
	['discipline-is-destiny', randomHouseIsbn('9780593191699')],
	['why-nations-fail', direct('https://dam.bibliolive.com/profile/getimage.aspx?class=books&assetversionid=85374&cat=default&size=origjpg&id=2503')],
	['how-democracies-die', openLibraryIsbn('9781524762933')],
	['meditations', randomHouseIsbn('9780143036272')],
	['who-rules-the-world', macmillanIsbn('9781250131089')],
	['beyond-order', randomHouseIsbn('9780593084649')],
	['12-rules-for-life', randomHouseIsbn('9780345816023')],
	['letters-from-a-stoic', randomHouseIsbn('9780140442106')],
	['antifragile', randomHouseIsbn('9780812979688')],
	['brave-new-world', openLibraryIsbn('9780060850524')],
	['the-hitchhikers-guide-to-the-galaxy', randomHouseIsbn('9780345391803')],
	['fall-of-hyperion', direct('https://www.penguinlibros.com/cl/345777-thickbox_default/la-caida-de-hyperion-los-cantos-de-hyperion-2-los-cantos-de-hyperion-2.jpg', 'trim-nova')],
	['deaths-end', macmillanIsbn('9780765377104')],
	['the-dark-forest', macmillanIsbn('9780765377081')],
	['wind-and-truth', macmillanIsbn('9781250319180')],
	['rhythm-of-war', macmillanIsbn('9780765326386')],
	['oathbringer', macmillanIsbn('9780765326379')],
	['words-of-radiance', macmillanIsbn('9780765326362')],
	['a-dance-with-dragons', randomHouseIsbn('9780553385953')],
	['a-feast-for-crows', randomHouseIsbn('9780553582031')],
	['a-storm-of-swords', randomHouseIsbn('9780553381702')],
	['a-clash-of-kings', randomHouseIsbn('9780553381696')],
	['a-game-of-thrones', randomHouseIsbn('9780553381689')],
	['children-of-dune', randomHouseIsbn('9780593098240', 'fit')],
	['dune-messiah', randomHouseIsbn('9780593098233', 'fit')],
	['dune', randomHouseIsbn('9780441172719', 'fit')],
	['the-way-of-kings', macmillanIsbn('9780765326355')],
	['hyperion', direct('https://www.penguinlibros.com/es/4912050-thickbox_default/hyperion-los-cantos-de-hyperion-1.jpg', 'fit')],
];

const requestedSlugs = new Set(process.argv.slice(2));
const selectedCovers = requestedSlugs.size
	? covers.filter(([slug]) => requestedSlugs.has(slug))
	: covers;

if (selectedCovers.length !== (requestedSlugs.size || covers.length)) {
	const foundSlugs = new Set(selectedCovers.map(([slug]) => slug));
	const missingSlugs = [...requestedSlugs].filter((slug) => !foundSlugs.has(slug));
	throw new Error(`Unknown cover slug(s): ${missingSlugs.join(', ')}`);
}

const outputDirectory = new URL('../public/covers/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'book-covers-'));

function run(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'inherit' });
		child.on('error', reject);
		child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
	});
}

async function sourceUrl(source) {
	if (source.type === 'direct') return source.url;
	const html = await fetch(source.page).then((response) => {
		if (!response.ok) throw new Error(`Publisher page returned ${response.status}: ${source.page}`);
		return response.text();
	});
	const match = html.match(/<meta property="og:image" content="([^"]+)"/i);
	if (!match) throw new Error(`No publisher cover found at ${source.page}`);
	return match[1].replace('-home_default/', '-thickbox_default/');
}

try {
	for (const [index, [slug, source]] of selectedCovers.entries()) {
		const url = await sourceUrl(source);
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Cover returned ${response.status}: ${url}`);
		const contentType = response.headers.get('content-type') ?? '';
		if (!contentType.startsWith('image/')) throw new Error(`Cover was not an image: ${url}`);
		const input = join(temporaryDirectory, `${index}-${slug}`);
		await writeFile(input, Buffer.from(await response.arrayBuffer()));
		const output = new URL(`${slug}.jpg`, outputDirectory).pathname;
		const commonOutputArgs = ['-c:v', 'mjpeg', '-q:v', '4', output];

		if (source.fit === 'trim-nova') {
			await run('ffmpeg', [
				'-hide_banner', '-loglevel', 'error', '-y', '-i', input,
				'-vf', 'crop=1000:1500:50:100,scale=700:1050',
				...commonOutputArgs,
			]);
		} else if (source.fit === 'fit') {
			await run('ffmpeg', [
				'-hide_banner', '-loglevel', 'error', '-y', '-i', input,
				'-filter_complex', [
					'[0:v]split=2[background][cover]',
					'[background]scale=700:1050:force_original_aspect_ratio=increase,crop=700:1050,gblur=sigma=34[background]',
					'[cover]scale=700:1050:force_original_aspect_ratio=decrease[cover]',
					'[background][cover]overlay=(W-w)/2:(H-h)/2',
				].join(';'),
				...commonOutputArgs,
			]);
		} else {
			await run('ffmpeg', [
				'-hide_banner', '-loglevel', 'error', '-y', '-i', input,
				'-vf', 'scale=700:1050:force_original_aspect_ratio=increase,crop=700:1050',
				...commonOutputArgs,
			]);
		}
		console.log(`${index + 1}/${selectedCovers.length} ${slug}`);
	}
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
