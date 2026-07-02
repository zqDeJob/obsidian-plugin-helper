import type PluginHelperPlugin from "./main";
import type { InstalledPluginRow, PluginEntryMeta } from "./types";
import { ensureEntry, resolveMyDesc } from "./plugin-data";

export type PluginCardVariant = "sidebar" | "modal";

export interface PluginCardOptions {
	variant?: PluginCardVariant;
	onSaved?: () => void;
	onOpenSettings?: (pluginId: string) => void;
}

function renderOfficialWithAnnotation(
	container: HTMLElement,
	official: string,
	annotation: string,
): void {
	container.empty();
	if (!official) {
		container.setText("（暂无官方说明）");
		return;
	}

	container.createSpan({
		cls: "plugin-helper-official-original",
		text: official,
	});

	if (annotation) {
		container.createSpan({
			cls: "plugin-helper-official-annotation",
			text: `（注释：${annotation}）`,
		});
	}
}

/** 侧边栏：官方说明 + 可编辑「我的说明」；弹窗：仅官方说明只读，设置按钮在右上角 */
export function renderPluginCard(
	parent: HTMLElement,
	row: InstalledPluginRow,
	plugin: PluginHelperPlugin,
	options: PluginCardOptions = {},
): void {
	const variant = options.variant ?? "sidebar";
	if (variant === "modal") {
		renderModalCard(parent, row, options);
	} else {
		renderSidebarCard(parent, row, plugin, options);
	}
}

function renderModalCard(
	parent: HTMLElement,
	row: InstalledPluginRow,
	options: PluginCardOptions,
): void {
	const card = parent.createDiv({
		cls: "plugin-helper-card plugin-helper-card-modal",
	});

	const top = card.createDiv({ cls: "plugin-helper-card-top" });
	const topLeft = top.createDiv({ cls: "plugin-helper-card-top-left" });

	topLeft.createEl("span", {
		cls: "plugin-helper-card-name",
		text: row.manifestName,
	});
	topLeft.createSpan({
		cls: row.enabled
			? "plugin-helper-badge plugin-helper-badge-on"
			: "plugin-helper-badge plugin-helper-badge-off",
		text: row.enabled ? "已启用" : "未启用",
	});

	const settingsBtn = top.createEl("button", {
		cls: "plugin-helper-settings-corner",
		text: "打开设置",
	});
	settingsBtn.addEventListener("click", () => {
		options.onOpenSettings?.(row.id);
	});

	card.createDiv({
		cls: "plugin-helper-card-meta",
		text: `v${row.version} · ${row.id}`,
	});

	const officialBlock = card.createDiv({ cls: "plugin-helper-desc-block" });
	officialBlock.createDiv({
		cls: "plugin-helper-desc-label",
		text: "官方说明",
	});
	const officialEl = officialBlock.createDiv({ cls: "plugin-helper-desc-official" });
	renderOfficialWithAnnotation(officialEl, row.officialDesc, row.annotationDesc);
}

function renderSidebarCard(
	parent: HTMLElement,
	row: InstalledPluginRow,
	plugin: PluginHelperPlugin,
	options: PluginCardOptions,
): void {
	const card = parent.createDiv({ cls: "plugin-helper-card" });

	const top = card.createDiv({ cls: "plugin-helper-card-top" });
	const topLeft = top.createDiv({ cls: "plugin-helper-card-top-left" });

	topLeft.createEl("span", {
		cls: "plugin-helper-card-name",
		text: row.manifestName,
	});
	topLeft.createSpan({
		cls: row.enabled
			? "plugin-helper-badge plugin-helper-badge-on"
			: "plugin-helper-badge plugin-helper-badge-off",
		text: row.enabled ? "已启用" : "未启用",
	});

	card.createDiv({
		cls: "plugin-helper-card-meta",
		text: `v${row.version} · ${row.id}`,
	});

	const officialBlock = card.createDiv({ cls: "plugin-helper-desc-block" });
	officialBlock.createDiv({
		cls: "plugin-helper-desc-label",
		text: "官方说明",
	});
	const officialEl = officialBlock.createDiv({ cls: "plugin-helper-desc-official" });
	renderOfficialWithAnnotation(officialEl, row.officialDesc, row.annotationDesc);

	const myBlock = card.createDiv({ cls: "plugin-helper-desc-block" });
	myBlock.createDiv({
		cls: "plugin-helper-desc-label",
		text: "我的说明",
	});
	myBlock.createDiv({
		cls: "plugin-helper-desc-hint",
		text: "默认为自动翻译，可自行修改；修改不会影响上方官方原文与注释。",
	});

	const descInput = myBlock.createEl("textarea", {
		placeholder: "留空则使用自动翻译；点击「刷新翻译」可重新生成",
		cls: "plugin-helper-textarea",
	});
	descInput.value = resolveMyDesc(plugin.settings.entries[row.id] ?? {});

	let saveTimer: number | null = null;
	const scheduleSave = () => {
		if (saveTimer) window.clearTimeout(saveTimer);
		saveTimer = window.setTimeout(() => void saveMyDesc(), 500);
	};

	const saveMyDesc = async () => {
		const e = ensureEntry(plugin.settings, row.id);
		const newDesc = descInput.value.trim();
		const autoDesc = e.autoTranslatedDesc?.trim() ?? "";

		if (!newDesc) {
			e.customDesc = undefined;
			e.descCustomized = false;
		} else if (newDesc === autoDesc) {
			e.customDesc = undefined;
			e.descCustomized = false;
		} else {
			e.customDesc = newDesc;
			e.descCustomized = true;
		}

		await plugin.saveSettings();
		row.myDesc = resolveMyDesc(e);
		row.isDescCustomized = !!e.descCustomized;
		updateResetButton();
		options.onSaved?.();
	};

	descInput.addEventListener("input", scheduleSave);

	const btnRow = card.createDiv({ cls: "plugin-helper-card-btns" });
	let resetBtn: HTMLButtonElement | null = null;

	const settingsBtn = btnRow.createEl("button", { text: "打开插件设置" });
	settingsBtn.addEventListener("click", () => {
		options.onOpenSettings?.(row.id);
	});

	const updateResetButton = () => {
		const e = plugin.settings.entries[row.id];
		const show = !!e?.descCustomized;
		if (show && !resetBtn) {
			resetBtn = btnRow.createEl("button", {
				text: "恢复自动翻译",
				cls: "mod-warning",
			});
			resetBtn.addEventListener("click", async () => {
				const entry = ensureEntry(plugin.settings, row.id);
				entry.customDesc = undefined;
				entry.descCustomized = false;
				descInput.value = entry.autoTranslatedDesc ?? "";
				await plugin.saveSettings();
				row.myDesc = resolveMyDesc(entry);
				row.isDescCustomized = false;
				resetBtn?.remove();
				resetBtn = null;
				options.onSaved?.();
			});
		} else if (!show && resetBtn) {
			resetBtn.remove();
			resetBtn = null;
		}
	};

	updateResetButton();

	card.dataset.pluginId = row.id;
	(card as HTMLElement & { syncFromRow?: (r: InstalledPluginRow) => void }).syncFromRow =
		(updated: InstalledPluginRow) => {
			renderOfficialWithAnnotation(
				officialEl,
				updated.officialDesc,
				updated.annotationDesc,
			);
			if (document.activeElement !== descInput) {
				const entry = plugin.settings.entries[row.id];
				descInput.value = resolveMyDesc(entry ?? {});
			}
			Object.assign(row, updated);
			updateResetButton();
		};
}

export function filterPluginRows(
	rows: InstalledPluginRow[],
	query: string,
): InstalledPluginRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter(
		(r) =>
			r.manifestName.toLowerCase().includes(q) ||
			r.officialDesc.toLowerCase().includes(q) ||
			r.annotationDesc.toLowerCase().includes(q) ||
			r.myDesc.toLowerCase().includes(q) ||
			r.id.toLowerCase().includes(q),
	);
}
