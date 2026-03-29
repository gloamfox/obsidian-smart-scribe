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

		// 设置模态框更大尺寸 - 使用CSS类
		this.modalEl.classList.add("ai-optimize-modal");

		contentEl.createEl("h2", { text: this.isPartial ? "AI 文本优化（选中片段）" : "AI 文本优化（全文）" });

		// 主容器 - 左右分栏
		const mainContainer = contentEl.createDiv({ cls: "ai-optimize-container" });

		// 左侧 - 优化后的文本（使用 Obsidian 的 Markdown 编辑器）
		const leftPanel = mainContainer.createDiv({ cls: "ai-optimize-left" });

		// 标签栏容器
		const tabHeader = leftPanel.createDiv({ cls: "ai-optimize-tab-header" });

		// 源码模式标签
		this.sourceTabBtn = tabHeader.createEl("button", {
			text: "源码模式",
			cls: "ai-optimize-tab ai-optimize-tab-active"
		});

		// 阅读视图标签
		this.previewTabBtn = tabHeader.createEl("button", {
			text: "阅读视图",
			cls: "ai-optimize-tab"
		});

		// 标签切换事件
		this.sourceTabBtn.addEventListener("click", () => void this.switchMode("source"));
		this.previewTabBtn.addEventListener("click", () => void this.switchMode("preview"));

		// 刷新按钮（仅在阅读视图显示）
		const refreshBtn = tabHeader.createEl("button", {
			text: "刷新",
			cls: "ai-optimize-refresh-btn"
		});
		refreshBtn.addEventListener("click", () => void this.refreshPreview());
		this.refreshBtn = refreshBtn;

		// 创建编辑器容器
		const editorContainer = leftPanel.createDiv({ cls: "ai-optimize-editor" });

		// 源码模式编辑器 - 使用 contentEditable div
		this.editorEl = editorContainer.createEl("div", { cls: "ai-optimize-editable" });
		this.editorEl.contentEditable = "true";
		this.editorEl.textContent = this.editedText;

		// 阅读视图容器 - 使用 MarkdownRenderer 渲染
		this.previewEl = editorContainer.createEl("div", {
			cls: "ai-optimize-preview markdown-rendered markdown-preview-view"
		});

		// 监听内容变化
		this.editorEl.addEventListener("input", () => {
			this.editedText = this.editorEl.textContent || "";
		});

		// 右侧 - 优化建议
		const rightPanel = mainContainer.createDiv({ cls: "ai-optimize-right" });

		const suggestionContainer = rightPanel.createDiv({ cls: "ai-optimize-suggestions" });

		// 解析并显示优化建议（按条目换行）
		if (this.result.explanation) {
			const suggestions = this.parseSuggestions(this.result.explanation);
			if (suggestions.length > 0) {
				suggestions.forEach((suggestion) => {
					const itemDiv = suggestionContainer.createEl("div", { cls: "ai-optimize-suggestion-item" });

					itemDiv.createEl("span", { text: "• ", cls: "ai-optimize-suggestion-bullet" });

					itemDiv.createEl("span", { text: suggestion, cls: "ai-optimize-suggestion-text" });
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
			this.editorEl.classList.remove("hidden");
			this.previewEl.classList.remove("visible");

			// 更新标签样式
			this.sourceTabBtn.classList.add("ai-optimize-tab-active");
			this.previewTabBtn.classList.remove("ai-optimize-tab-active");

			// 隐藏刷新按钮
			this.refreshBtn.classList.remove("visible");
		} else {
			// 切换到阅读视图
			this.editorEl.classList.add("hidden");
			this.previewEl.classList.add("visible");

			// 更新标签样式
			this.previewTabBtn.classList.add("ai-optimize-tab-active");
			this.sourceTabBtn.classList.remove("ai-optimize-tab-active");

			// 显示刷新按钮
			this.refreshBtn.classList.add("visible");

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
		await MarkdownRenderer.render(
			this.app,
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
		let suggestions = explanation.split(/\d+[.、]\s*/).filter(s => s.trim());

		// 2. 如果没有数字序号，尝试按换行分割
		if (suggestions.length <= 1) {
			suggestions = explanation.split(/\n+/).filter(s => s.trim());
		}

		// 3. 如果还是没有，尝试按中文分号或逗号分割
		if (suggestions.length <= 1) {
			suggestions = explanation.split(/[;；]/).filter(s => s.trim());
		}

		return suggestions.map(s => s.trim()).filter(s => s.length > 0);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.component.unload();
	}
}
