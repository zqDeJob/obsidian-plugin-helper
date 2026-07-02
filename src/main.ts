import {
	Notice,
	Plugin,
	WorkspaceLeaf,
} from "obsidian";
import { PluginCatalogModal } from "./PluginCatalogModal";
import {
	PluginCatalogView,
	VIEW_TYPE_PLUGIN_CATALOG,
} from "./PluginCatalogView";
import { PluginHelperSettingTab } from "./settings-tab";
import { syncDescriptions } from "./plugin-data";
import {
	DEFAULT_SETTINGS,
	type PluginHelperSettings,
} from "./types";

export default class PluginHelperPlugin extends Plugin {
	settings: PluginHelperSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_PLUGIN_CATALOG,
			(leaf) => new PluginCatalogView(leaf, this),
		);

		this.addRibbonIcon("book-open", "插件说明书", () => {
			void this.activateCatalogView();
		});

		this.addCommand({
			id: "open-plugin-catalog-sidebar",
			name: "打开插件说明书（侧边栏）",
			callback: () => void this.activateCatalogView(),
		});

		this.addCommand({
			id: "open-plugin-catalog-modal",
			name: "打开插件说明书（弹窗）",
			callback: () => this.openCatalogModal(),
		});

		this.addCommand({
			id: "refresh-plugin-descriptions",
			name: "刷新插件说明翻译",
			callback: async () => {
				new Notice("正在翻译插件说明…");
				try {
					const n = await syncDescriptions(this);
					new Notice(`完成：更新了 ${n} 条说明`);
				} catch (e) {
					new Notice(`翻译失败：${e}`);
				}
			},
		});

		this.addSettingTab(new PluginHelperSettingTab(this.app, this));

		// 首次启用：后台拉取并翻译（不阻断启动）
		this.app.workspace.onLayoutReady(() => {
			void this.maybeInitialSync();
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	openCatalogModal(): void {
		new PluginCatalogModal(this.app, this).open();
	}

	async activateCatalogView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_PLUGIN_CATALOG);
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({
				type: VIEW_TYPE_PLUGIN_CATALOG,
				active: true,
			});
		}
		await workspace.revealLeaf(leaf);
	}

	private async maybeInitialSync(): Promise<void> {
		const hasAny = Object.values(this.settings.entries).some(
			(e) => e.autoTranslatedDesc || e.customDesc,
		);
		if (hasAny) return;

		try {
			await syncDescriptions(this);
		} catch {
			// 离线或网络问题时静默失败，用户可手动刷新
		}
	}
}
