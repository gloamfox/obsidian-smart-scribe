import { App, Component, MarkdownRenderer, Modal } from "obsidian";
import type { OptimizationResult } from "../ai-provider";

export class TextOptimizationModal extends Modal {
	result: OptimizationResult;
	isPartial: boolean;
	onConfirm: (confirmed: boolean, editedText?: string) => void = () => {};
	editedText: string;
	private editorEl: HTMLElement;
	private previewEl: HTMLElement;
	private currentMode: "source" | "preview" = "source";
	private sourceTabBtn: HTMLElement;
	private previewTabBtn: HTMLElement;
	private refreshBtn: HTMLElement;
	private component: Component;

	constructor(app: App, result: OptimizationResult, isPartial: boolean, onConfirm: (confirmed: boolean, editedText?: string) => void) {
		super(app);
		this.result = result;
		this.isPartial = isPartial;
		this.onConfirm = onConfirm;
		this.editedText = result.optimizedText || "";
		this.component = new Component();
		this.component.load();
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 设置模态框更大尺寸
		this.modalEl.style.width = "90vw";
		this.modalEl.style.maxWidth = "1200px";
		this.modalEl.style.height = "90vh";

		contentEl.createEl("h2", { text: this.isPartial ? "AI 文本优化（选中片段）" : "AI 文本优化（全文）" });

		// 主容器 - 左右分栏
		const mainContainer = contentEl.createDiv({ cls: "ai-optimize-container" });
		mainContainer.style.display = "flex";
		mainContainer.style.gap = "20px";
		mainContainer.style.height = "calc(90vh - 180px)";
		mainContainer.style.minHeight = "400px";
		mainContainer.style.marginBottom = "20px";

		// 左侧 - 优化后的文本（使用 Obsidian 的 Markdown 编辑器）
		const leftPanel = mainContainer.createDiv({ cls: "ai-optimize-left" });
		leftPanel.style.flex = "1";
		leftPanel.style.display = "flex";
		leftPanel.style.flexDirection = "column";
		leftPanel.style.minWidth = "0";
		leftPanel.style.overflow = "hidden";

		// 标签栏容器
		const tabHeader = leftPanel.createDiv({ cls: "ai-optimize-tab-header" });
		tabHeader.style.display = "flex";
		tabHeader.style.gap = "4px";
		tabHeader.style.padding = "4px 4px 0 4px";
		tabHeader.style.backgroundColor = "var(--background-secondary)";
		tabHeader.style.borderBottom = "1px solid var(--background-modifier-border)";
		tabHeader.style.marginBottom = "0";
		tabHeader.style.borderRadius = "4px 4px 0 0";

		// 源码模式标签
		this.sourceTabBtn = tabHeader.createEl("button", {
			text: "源码模式",
			cls: "ai-optimize-tab ai-optimize-tab-active"
		});
		this.sourceTabBtn.style.padding = "6px 16px";
		this.sourceTabBtn.style.border = "1px solid transparent";
		this.sourceTabBtn.style.borderBottom = "none";
		this.sourceTabBtn.style.borderRadius = "4px 4px 0 0";
		this.sourceTabBtn.style.background = "var(--background-primary)";
		this.sourceTabBtn.style.cursor = "pointer";
		this.sourceTabBtn.style.color = "var(--text-normal)";
		this.sourceTabBtn.style.fontWeight = "500";
		this.sourceTabBtn.style.fontSize = "13px";
		this.sourceTabBtn.style.transition = "all 0.15s ease";

		// 阅读视图标签
		this.previewTabBtn = tabHeader.createEl("button", {
			text: "阅读视图",
			cls: "ai-optimize-tab"
		});
		this.previewTabBtn.style.padding = "6px 16px";
		this.previewTabBtn.style.border = "1px solid transparent";
		this.previewTabBtn.style.borderBottom = "none";
		this.previewTabBtn.style.borderRadius = "4px 4px 0 0";
		this.previewTabBtn.style.background = "transparent";
		this.previewTabBtn.style.cursor = "pointer";
		this.previewTabBtn.style.color = "var(--text-muted)";
		this.previewTabBtn.style.fontWeight = "400";
		this.previewTabBtn.style.fontSize = "13px";
		this.previewTabBtn.style.transition = "all 0.15s ease";

		// 标签切换事件
		this.sourceTabBtn.addEventListener("click", () => this.switchMode("source"));
		this.previewTabBtn.addEventListener("click", () => this.switchMode("preview"));

		// 刷新按钮（仅在阅读视图显示）
		const refreshBtn = tabHeader.createEl("button", {
			text: "刷新",
			cls: "ai-optimize-refresh-btn"
		});
		refreshBtn.style.marginLeft = "auto";
		refreshBtn.style.padding = "4px 12px";
		refreshBtn.style.fontSize = "12px";
		refreshBtn.style.border = "1px solid var(--background-modifier-border)";
		refreshBtn.style.borderRadius = "4px";
		refreshBtn.style.background = "var(--background-primary)";
		refreshBtn.style.color = "var(--text-muted)";
		refreshBtn.style.cursor = "pointer";
		refreshBtn.style.opacity = "0";
		refreshBtn.style.pointerEvents = "none";
		refreshBtn.style.transition = "all 0.15s ease";
		refreshBtn.addEventListener("click", () => this.refreshPreview());
		refreshBtn.addEventListener("mouseenter", () => {
			refreshBtn.style.color = "var(--text-normal)";
			refreshBtn.style.borderColor = "var(--interactive-accent)";
		});
		refreshBtn.addEventListener("mouseleave", () => {
			refreshBtn.style.color = "var(--text-muted)";
			refreshBtn.style.borderColor = "var(--background-modifier-border)";
		});
		this.refreshBtn = refreshBtn;

		// 创建编辑器容器
		const editorContainer = leftPanel.createDiv({ cls: "ai-optimize-editor" });
		editorContainer.style.flex = "1";
		editorContainer.style.border = "1px solid var(--background-modifier-border)";
		editorContainer.style.borderTop = "none";
		editorContainer.style.borderRadius = "0 0 4px 4px";
		editorContainer.style.overflow = "auto";
		editorContainer.style.backgroundColor = "var(--background-primary)";

		// 源码模式编辑器 - 使用 contentEditable div
		this.editorEl = editorContainer.createEl("div", { cls: "ai-optimize-editable" });
		this.editorEl.contentEditable = "true";
		this.editorEl.style.width = "100%";
		this.editorEl.style.minHeight = "100%";
		this.editorEl.style.padding = "12px";
		this.editorEl.style.outline = "none";
		this.editorEl.style.lineHeight = "1.6";
		this.editorEl.style.whiteSpace = "pre-wrap";
		this.editorEl.style.wordWrap = "break-word";
		this.editorEl.style.fontFamily = "var(--font-mono)";
		this.editorEl.style.fontSize = "var(--font-text-size)";
		this.editorEl.textContent = this.editedText;

		// 阅读视图容器 - 使用 MarkdownRenderer 渲染
		this.previewEl = editorContainer.createEl("div", {
			cls: "ai-optimize-preview markdown-rendered markdown-preview-view"
		});
		this.previewEl.style.width = "100%";
		this.previewEl.style.minHeight = "100%";
		this.previewEl.style.padding = "12px";
		this.previewEl.style.display = "none";
		this.previewEl.style.lineHeight = "1.6";

		// 监听内容变化
		this.editorEl.addEventListener("input", () => {
			this.editedText = this.editorEl.textContent || "";
		});

		// 右侧 - 优化建议
		const rightPanel = mainContainer.createDiv({ cls: "ai-optimize-right" });
		rightPanel.style.width = "300px";
		rightPanel.style.flexShrink = "0";
		rightPanel.style.display = "flex";
		rightPanel.style.flexDirection = "column";
		rightPanel.style.overflow = "hidden";

		const rightLabel = rightPanel.createEl("label", { text: "优化建议:" });
		rightLabel.style.marginBottom = "8px";
		rightLabel.style.fontWeight = "bold";

		const suggestionContainer = rightPanel.createDiv({ cls: "ai-optimize-suggestions" });
		suggestionContainer.style.flex = "1";
		suggestionContainer.style.border = "1px solid var(--background-modifier-border)";
		suggestionContainer.style.borderRadius = "4px";
		suggestionContainer.style.padding = "12px";
		suggestionContainer.style.backgroundColor = "var(--background-secondary)";
		suggestionContainer.style.overflow = "auto";
		suggestionContainer.style.fontSize = "13px";
		suggestionContainer.style.lineHeight = "1.6";

		// 解析并显示优化建议（按条目换行）
		if (this.result.explanation) {
			const suggestions = this.parseSuggestions(this.result.explanation);
			if (suggestions.length > 0) {
				suggestions.forEach((suggestion, index) => {
					const itemDiv = suggestionContainer.createEl("div", { cls: "ai-optimize-suggestion-item" });
					itemDiv.style.marginBottom = "8px";
					itemDiv.style.paddingBottom = "8px";
					itemDiv.style.borderBottom = index < suggestions.length - 1 ? "1px solid var(--background-modifier-border)" : "none";

					const bullet = itemDiv.createEl("span", { text: "• " });
					bullet.style.color = "var(--interactive-accent)";
					bullet.style.fontWeight = "bold";

					const text = itemDiv.createEl("span", { text: suggestion });
					text.style.color = "var(--text-normal)";
				});
			} else {
				suggestionContainer.createEl("div", {
					text: this.result.explanation,
					cls: "ai-optimize-suggestion-text"
				});
			}
		} else {
			suggestionContainer.createEl("div", {
				text: "无优化建议",
				cls: "ai-optimize-no-suggestions"
			});
		}

		// 按钮
		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

		const confirmButton = buttonContainer.createEl("button", {
			text: "应用",
			cls: "mod-cta",
		});
		confirmButton.addEventListener("click", () => {
			if (typeof this.onConfirm === 'function') {
				this.onConfirm(true, this.editedText);
			}
			this.close();
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "取消",
		});
		cancelButton.addEventListener("click", () => {
			if (typeof this.onConfirm === 'function') {
				this.onConfirm(false);
			}
			this.close();
		});
	}

	/**
	 * 切换编辑器模式
	 */
	private async switchMode(mode: "source" | "preview") {
		if (this.currentMode === mode) return;

		this.currentMode = mode;

		if (mode === "source") {
			// 切换到源码模式
			this.editorEl.style.display = "block";
			this.previewEl.style.display = "none";

			// 更新标签样式
			this.sourceTabBtn.style.background = "var(--background-primary)";
			this.sourceTabBtn.style.borderColor = "var(--background-modifier-border)";
			this.sourceTabBtn.style.color = "var(--text-normal)";
			this.sourceTabBtn.style.fontWeight = "500";

			this.previewTabBtn.style.background = "transparent";
			this.previewTabBtn.style.borderColor = "transparent";
			this.previewTabBtn.style.color = "var(--text-muted)";
			this.previewTabBtn.style.fontWeight = "400";

			// 隐藏刷新按钮
			this.refreshBtn.style.opacity = "0";
			this.refreshBtn.style.pointerEvents = "none";
		} else {
			// 切换到阅读视图
			this.editorEl.style.display = "none";
			this.previewEl.style.display = "block";

			// 更新标签样式
			this.previewTabBtn.style.background = "var(--background-primary)";
			this.previewTabBtn.style.borderColor = "var(--background-modifier-border)";
			this.previewTabBtn.style.color = "var(--text-normal)";
			this.previewTabBtn.style.fontWeight = "500";

			this.sourceTabBtn.style.background = "transparent";
			this.sourceTabBtn.style.borderColor = "transparent";
			this.sourceTabBtn.style.color = "var(--text-muted)";
			this.sourceTabBtn.style.fontWeight = "400";

			// 显示刷新按钮
			this.refreshBtn.style.opacity = "1";
			this.refreshBtn.style.pointerEvents = "auto";

			// 同步最新内容并渲染
			await this.refreshPreview();
		}
	}

	/**
	 * 刷新预览内容
	 */
	private async refreshPreview() {
		// 从编辑器同步最新内容
		this.editedText = this.editorEl.textContent || "";

		// 清空预览区域并重新渲染
		this.previewEl.empty();
		await MarkdownRenderer.renderMarkdown(
			this.editedText,
			this.previewEl,
			"",
			this.component
		);
	}

	/**
	 * 解析优化建议，按条目分割
	 */
	private parseSuggestions(explanation: string): string[] {
		if (!explanation) return [];

		// 尝试多种分隔方式
		// 1. 按数字序号分割 (1. 2. 3. 或 1、2、3、)
		let suggestions = explanation.split(/\d+[\.、]\s*/).filter(s => s.trim());

		// 2. 如果没有数字序号，尝试按换行分割
		if (suggestions.length <= 1) {
			suggestions = explanation.split(/\n+/).filter(s => s.trim());
		}

		// 3. 如果还是没有，尝试按中文分号或逗号分割
		if (suggestions.length <= 1) {
			suggestions = explanation.split(/[；;]/).filter(s => s.trim());
		}

		return suggestions.map(s => s.trim()).filter(s => s.length > 0);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.component.unload();
	}
}
