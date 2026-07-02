import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type PluginHelperPlugin from "./main";
import { syncDescriptions } from "./plugin-data";

export class PluginHelperSettingTab extends PluginSettingTab {
	plugin: PluginHelperPlugin;

	constructor(app: App, plugin: PluginHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "插件说明书 设置" });

		new Setting(containerEl)
			.setName("打开插件一览（侧边栏）")
			.setDesc("在左侧栏打开常驻面板，适合经常查阅")
			.addButton((btn) =>
				btn.setButtonText("打开侧边栏").onClick(() => {
					void this.plugin.activateCatalogView();
				}),
			);

		new Setting(containerEl)
			.setName("打开插件一览（弹窗）")
			.setDesc("居中浮层，仅官方说明只读查阅，设置按钮在卡片右上角")
			.addButton((btn) =>
				btn.setButtonText("打开弹窗").onClick(() => {
					this.plugin.openCatalogModal();
				}),
			);

		new Setting(containerEl)
			.setName("刷新全部说明")
			.setDesc(
				"从 Obsidian 社区拉取官方英文说明，并自动翻译为中文（已手动修改的说明不会被覆盖）",
			)
			.addButton((btn) =>
				btn.setButtonText("开始翻译").onClick(async () => {
					btn.setDisabled(true);
					try {
						const n = await syncDescriptions(this.plugin);
						new Notice(`已翻译 ${n} 条插件说明`);
					} finally {
						btn.setDisabled(false);
					}
				}),
			);

		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: "侧边栏：官方说明 + 可编辑「我的说明」。弹窗：仅官方说明只读，设置按钮在卡片右上角。",
		});
	}
}
