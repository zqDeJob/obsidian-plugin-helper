import {
	ItemView,
	Notice,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";
import type PluginHelperPlugin from "./main";
import type { InstalledPluginRow } from "./types";
import {
	buildPluginRows,
	openPluginSettings,
	syncDescriptions,
} from "./plugin-data";
import { filterPluginRows, renderPluginCard } from "./render-plugin-card";

export const VIEW_TYPE_PLUGIN_CATALOG = "plugin-helper-catalog";

export class PluginCatalogView extends ItemView {
	plugin: PluginHelperPlugin;
	private rows: InstalledPluginRow[] = [];
	private filter = "";
	private listEl: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: PluginHelperPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_PLUGIN_CATALOG;
	}

	getDisplayText(): string {
		return "插件说明书";
	}

	getIcon(): string {
		return "book-open";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("plugin-helper-catalog");

		const header = container.createDiv({ cls: "plugin-helper-header" });
		const titleRow = header.createDiv({ cls: "plugin-helper-title-row" });
		titleRow.createEl("h4", { text: "插件说明书" });

		const actions = titleRow.createDiv({ cls: "plugin-helper-actions" });
		const refreshBtn = actions.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": "刷新并翻译说明" },
		});
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => void this.handleRefresh());

		header.createDiv({
			cls: "plugin-helper-panel-hint",
			text: "官方说明为原文并附中文注释（只读）；下方「我的说明」可编辑，修改不影响官方数据。",
		});

		const searchWrap = header.createDiv({ cls: "plugin-helper-search-wrap" });
		const searchInput = searchWrap.createEl("input", {
			type: "search",
			placeholder: "搜索插件名或说明…",
			cls: "plugin-helper-search",
		});
		searchInput.addEventListener("input", () => {
			this.filter = searchInput.value;
			this.renderList();
		});

		this.statusEl = header.createDiv({ cls: "plugin-helper-status" });
		this.listEl = container.createDiv({ cls: "plugin-helper-list" });

		await this.loadRows();
	}

	async onClose(): Promise<void> {
		this.listEl = null;
		this.statusEl = null;
	}

	private setStatus(text: string): void {
		if (this.statusEl) this.statusEl.setText(text);
	}

	private async loadRows(): Promise<void> {
		this.setStatus("加载中…");
		try {
			this.rows = await buildPluginRows(this.plugin);
			this.setStatus(`共 ${this.rows.length} 个第三方插件`);
			this.renderList();
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			this.setStatus(`加载失败：${msg}`);
		}
	}

	private async handleRefresh(): Promise<void> {
		this.setStatus("正在拉取官方说明并翻译…");
		try {
			const count = await syncDescriptions(this.plugin, (msg) =>
				this.setStatus(msg),
			);
			this.rows = await buildPluginRows(this.plugin);
			this.setStatus(
				count > 0
					? `已翻译 ${count} 条说明，共 ${this.rows.length} 个插件`
					: `说明已是最新，共 ${this.rows.length} 个插件`,
			);
			this.renderList();
			new Notice(`插件说明书：已更新 ${count} 条翻译`);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			this.setStatus(`刷新失败：${msg}`);
			new Notice(`刷新失败：${msg}`);
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
				variant: "sidebar",
				onOpenSettings: (id) => openPluginSettings(this.app, id),
			});
		}
	}
}
