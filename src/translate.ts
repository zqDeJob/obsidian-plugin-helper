/** 使用 Google 非官方翻译接口，将英文说明译为简体中文 */
export async function translateEnToZh(text: string): Promise<string> {
	const trimmed = text.trim();
	if (!trimmed) return "";

	const url =
		"https://translate.googleapis.com/translate_a/single?" +
		new URLSearchParams({
			client: "gtx",
			sl: "en",
			tl: "zh-CN",
			dt: "t",
			q: trimmed,
		});

	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`翻译请求失败 (${res.status})`);
	}

	const data = (await res.json()) as [Array<[string]>, ...unknown[]];
	if (!Array.isArray(data[0])) return trimmed;

	return data[0]
		.map((chunk) => chunk[0])
		.join("")
		.trim();
}

export async function translateBatch(
	texts: string[],
	onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
	const results: string[] = [];
	for (let i = 0; i < texts.length; i++) {
		const text = texts[i];
		if (!text.trim()) {
			results.push("");
		} else {
			// 简单限速，避免请求过快
			if (i > 0) await sleep(300);
			results.push(await translateEnToZh(text));
		}
		onProgress?.(i + 1, texts.length);
	}
	return results;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
