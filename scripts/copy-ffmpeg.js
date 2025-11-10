import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const sourceDir = join(projectRoot, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const targetDir = join(projectRoot, 'static', 'ffmpeg');

if (!existsSync(targetDir)) {
	mkdirSync(targetDir, { recursive: true });
}

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

files.forEach((file) => {
	const source = join(sourceDir, file);
	const target = join(targetDir, file);
	copyFileSync(source, target);
	console.log(`Copied ${file} to static/ffmpeg/`);
});
