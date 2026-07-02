import type { CommunityPluginInfo } from "./types";

const COMMUNITY_URL =
	"https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";

const CACHE_MS = 24 * 60 * 60 * 1000;

let memoryCache: Map<string, CommunityPluginInfo> | null = null;
let memoryCacheTime = 0;

export async function fetchCommunityPlugins(
	force = false,
): Promise<Map<string, CommunityPluginInfo>> {
	const now = Date.now();
	if (
		!force &&
		memoryCache &&
		now - memoryCacheTime < CACHE_MS
	) {
		return memoryCache;
	}

	const res = await fetch(COMMUNITY_URL);
	if (!res.ok) {
		throw new Error(`拉取社区插件列表失败 (${res.status})`);
	}

	const list = (await res.json()) as CommunityPluginInfo[];
	const map = new Map<string, CommunityPluginInfo>();
	for (const item of list) {
		map.set(item.id, item);
	}

	memoryCache = map;
	memoryCacheTime = now;
	return map;
}

export function getOfficialDescription(
	community: Map<string, CommunityPluginInfo>,
	pluginId: string,
): string {
	return community.get(pluginId)?.description ?? "";
}
