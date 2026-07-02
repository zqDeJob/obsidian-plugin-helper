import type { App } from "obsidian";
import type PluginHelperPlugin from "./main";
import type { InstalledPluginRow, PluginEntryMeta, PluginHelperSettings } from "./types";
import { fetchCommunityPlugins, getOfficialDescription } from "./community";
import { translateEnToZh } from "./translate";

export async function buildPluginRows(
	plugin: PluginHelperPlugin,
): Promise<InstalledPluginRow[]> {
	const app = plugin.app;
	const community = await fetchCommunityPlugins().catch(() => new Map());
	const manifests = app.plugins.manifests;
	const enabledIds = app.plugins.enabledPlugins;

	const rows: InstalledPluginRow[] = [];

	for (const id of Object.keys(manifests)) {
		if (id === plugin.manifest.id) continue;

		const manifest = manifests[id];
		const entry = ensureEntry(plugin.settings, id);
		const official =
			getOfficialDescription(community, id) ||
			entry.officialDesc ||
			manifest.description ||
			"";

		if (official) {
			entry.officialDesc = official;
		}

		rows.push({
			id,
			manifestName: manifest.name,
			version: manifest.version,
			enabled: enabledIds.has(id),
			officialDesc: official,
			annotationDesc: entry.autoTranslatedDesc?.trim() ?? "",
			myDesc: resolveMyDesc(entry),
			isDescCustomized: !!entry.descCustomized,
		});
	}

	rows.sort((a, b) =>
		a.manifestName.localeCompare(b.manifestName, "zh-CN"),
	);

	await plugin.saveSettings();
	return rows;
}

/** 下方「我的说明」：优先用户自定义，否则自动翻译 */
export function resolveMyDesc(entry: PluginEntryMeta): string {
	if (entry.descCustomized && entry.customDesc?.trim()) {
		return entry.customDesc.trim();
	}
	if (entry.autoTranslatedDesc?.trim()) {
		return entry.autoTranslatedDesc.trim();
	}
	return "";
}

export function ensureEntry(
	settings: PluginHelperSettings,
	pluginId: string,
): PluginEntryMeta {
	if (!settings.entries[pluginId]) {
		settings.entries[pluginId] = {};
	}
	return settings.entries[pluginId];
}

export async function syncDescriptions(
	plugin: PluginHelperPlugin,
	onProgress?: (message: string) => void,
): Promise<number> {
	const community = await fetchCommunityPlugins(true).catch(() => new Map());
	const manifests = plugin.app.plugins.manifests;
	let translated = 0;

	plugin.settings.communityFetchedAt = Date.now();

	for (const id of Object.keys(manifests)) {
		if (id === plugin.manifest.id) continue;

		const entry = ensureEntry(plugin.settings, id);
		const official =
			getOfficialDescription(community, id) ||
			manifests[id].description ||
			"";

		if (!official) continue;

		const officialChanged = entry.officialDesc !== official;
		entry.officialDesc = official;

		if (entry.descCustomized) continue;

		const needsTranslate =
			!entry.autoTranslatedDesc?.trim() || officialChanged;

		if (!needsTranslate) continue;

		onProgress?.(`正在翻译：${manifests[id].name}…`);
		try {
			entry.autoTranslatedDesc = await translateEnToZh(official);
			translated++;
			await sleep(300);
		} catch {
			// 单条失败不阻断
		}
	}

	await plugin.saveSettings();
	return translated;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function openPluginSettings(app: App, pluginId: string): void {
	const setting = (app as App & {
		setting?: { open: () => void; openTabById?: (id: string) => void };
	}).setting;
	if (!setting) return;
	setting.open();
	setTimeout(() => {
		if (typeof setting.openTabById === "function") {
			setting.openTabById(pluginId);
		}
	}, 50);
}
