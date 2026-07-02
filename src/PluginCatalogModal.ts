import { App, Modal, Notice } from "obsidian";
import type PluginHelperPlugin from "./main";
import type { InstalledPluginRow } from "./types";
import {
	buildPluginRows,
	openPluginSettings,
	syncDescriptions,
} from "./plugin-data";
import { filterPluginRows, renderPluginCard } from "./render-plugin-card";

/**
 * 独立弹窗：只读查阅官方说明（原文+注释），设置按钮在卡片右上角。
 */
export class PluginCatalogModal extends Modal {
	plugin: PluginHelperPlugin;
	private rows: InstalledPluginRow[] = [];
	private filter = "";
	private listEl: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;

	constructor(app: App, plugin: PluginHelperPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		contentEl.empty();
		modalEl.addClass("plugin-helper-modal");
		contentEl.addClass("plugin-helper-catalog", "plugin-helper-modal-content");

		contentEl.createEl("h2", { text: "插件说明书" });
		contentEl.createEl("p", {
			cls: "plugin-helper-modal-hint",
			text: "只读查阅：官方原文 + 中文注释。编辑「我的说明」请使用侧边栏。",
		});

		const toolbar = contentEl.createDiv({ cls: "plugin-helper-modal-toolbar" });

		const searchInput = toolbar.createEl("input", {
			type: "search",
			placeholder: "搜索插件名或说明…",
			cls: "plugin-helper-search",
		});

		const refreshBtn = toolbar.createEl("button", { text: "刷新翻译" });
		this.statusEl = toolbar.createDiv({ cls: "plugin-helper-status" });
		this.listEl = contentEl.createDiv({ cls: "plugin-helper-list" });

		searchInput.addEventListener("input", () => {
			this.filter = searchInput.value;
			this.renderList();
		});

		refreshBtn.addEventListener("click", () => void this.handleRefresh(refreshBtn));

		void this.loadRows();
	}

	onClose(): void {
		this.listEl = null;
		this.statusEl = null;
		this.contentEl.empty();
	}

	private async loadRows(): Promise<void> {
		if (this.statusEl) this.statusEl.setText("加载中…");
		try {
			this.rows = await buildPluginRows(this.plugin);
			if (this.statusEl) {
				this.statusEl.setText(`共 ${this.rows.length} 个插件`);
			}
			this.renderList();
		} catch (e) {
			if (this.statusEl) this.statusEl.setText("加载失败");
			new Notice(String(e));
		}
	}

	private async handleRefresh(refreshBtn: HTMLButtonElement): Promise<void> {
		refreshBtn.disabled = true;
		if (this.statusEl) this.statusEl.setText("翻译中…");
		try {
			const n = await syncDescriptions(this.plugin, (m) => {
				if (this.statusEl) this.statusEl.setText(m);
			});
			this.rows = await buildPluginRows(this.plugin);
			if (this.statusEl) this.statusEl.setText(`完成，更新了 ${n} 条`);
			this.renderList();
			new Notice(`已更新 ${n} 条翻译`);
		} catch (e) {
			if (this.statusEl) this.statusEl.setText("失败");
			new Notice(String(e));
		} finally {
			refreshBtn.disabled = false;
		}
	}

	private renderList(): void {
		if (!this.listEl) return;
		this.listEl.empty();

		const filtered = filterPluginRows(this.rows, this.filter);
		if (filtered.length === 0) {
			this.listEl.createDiv({
				cls: "plugin-helper-empty",
				text: this.filter ? "没有匹配的插件" : "未检测到第三方插件",
			});
			return;
		}

		for (const row of filtered) {
			renderPluginCard(this.listEl, row, this.plugin, {
				variant: "modal",
				onOpenSettings: (id) => {
					this.close();
					openPluginSettings(this.app, id);
				},
			});
		}
	}
}
