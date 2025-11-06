export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}:${pad(minutes)}:${pad(secs)}`;
	}

	return `${minutes}:${pad(secs)}`;
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

export function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) {
		return 'Just now';
	}

	if (diffMins < 60) {
		return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
	}

	if (diffHours < 24) {
		return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
	}

	if (diffDays === 1) {
		return 'Yesterday';
	}

	if (diffDays < 7) {
		return `${diffDays} days ago`;
	}

	return formatDate(date);
}

export function formatDate(date: Date): string {
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	const month = months[date.getMonth()];
	const day = date.getDate();
	const year = date.getFullYear();

	let hours = date.getHours();
	const minutes = date.getMinutes();
	const ampm = hours >= 12 ? 'PM' : 'AM';

	hours = hours % 12;
	hours = hours ? hours : 12;

	return `${month} ${day}, ${year} at ${hours}:${pad(minutes)} ${ampm}`;
}

function pad(num: number): string {
	return num.toString().padStart(2, '0');
}

export function formatBitrate(kbps: number): string {
	if (kbps >= 1000) {
		return `${(kbps / 1000).toFixed(1)} Mbps`;
	}
	return `${kbps} kbps`;
}
