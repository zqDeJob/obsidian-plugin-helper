export interface PluginEntryMeta {
	/** 用户手写/修改后的中文说明（仅下方「我的说明」） */
	customDesc?: string;
	/** 从官方说明自动翻译的缓存（仅下方「我的说明」默认值） */
	autoTranslatedDesc?: string;
	/** 缓存的官方英文说明（上方「官方说明」，只读） */
	officialDesc?: string;
	/** 用户是否手动改过「我的说明」 */
	descCustomized?: boolean;
}

export interface PluginHelperSettings {
	entries: Record<string, PluginEntryMeta>;
	communityFetchedAt?: number;
}

export const DEFAULT_SETTINGS: PluginHelperSettings = {
	entries: {},
};

export interface CommunityPluginInfo {
	id: string;
	name: string;
	description: string;
	author: string;
}

export interface InstalledPluginRow {
	id: string;
	manifestName: string;
	version: string;
	enabled: boolean;
	/** 上方只读：官方英文说明 */
	officialDesc: string;
	/** 官方说明后附的自动翻译注释 */
	annotationDesc: string;
	/** 下方展示：我的说明（翻译或自定义） */
	myDesc: string;
	isDescCustomized: boolean;
}
