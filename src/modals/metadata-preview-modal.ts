import { App, Modal } from "obsidian";
import type { AnalysisResult } from "../ai-provider";

export class MetadataPreviewModal extends Modal {
	result: AnalysisResult;
	onConfirm: (confirmed: boolean, editedResult?: AnalysisResult) => void = () => {};
	editedResult: AnalysisResult;

	constructor(app: App, result: AnalysisResult, onConfirm: (confirmed: boolean, editedResult?: AnalysisResult) => void) {
		super(app);
		this.result = result;
		this.onConfirm = onConfirm;
		// 深拷贝，确保 tags 是独立的数组
		this.editedResult = {
			title: result.title || "",
			tags: Array.isArray(result.tags) ? [...result.tags] : [],
			category: result.category || "",
			summary: result.summary || "",
			keywords: Array.isArray(result.keywords) ? [...result.keywords] : [],
			share: result.share || false,
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "AI 生成的笔记属性" });

		// 标题
		const titleContainer = contentEl.createDiv();
		titleContainer.createEl("label", { text: "标题:" });
		const titleInput = titleContainer.createEl("input", {
			type: "text",
			value: this.editedResult.title,
			cls: "ai-metadata-input ai-metadata-input-full",
		});
		titleInput.addEventListener("input", (e) => {
			this.editedResult.title = (e.target as HTMLInputElement).value;
		});

		// 标签
		const tagsContainer = contentEl.createDiv({ cls: "ai-metadata-tags" });
		tagsContainer.createEl("label", { text: "标签:" });
		const tagsInput = tagsContainer.createEl("input", {
			type: "text",
			value: this.editedResult.tags.join(", "),
			cls: "ai-metadata-input ai-metadata-input-full",
		});
		tagsInput.addEventListener("input", (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.editedResult.tags = value
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0);
		});

		// 分类
		const categoryContainer = contentEl.createDiv();
		categoryContainer.createEl("label", { text: "分类:" });
		const categoryInput = categoryContainer.createEl("input", {
			type: "text",
			value: this.editedResult.category,
			cls: "ai-metadata-input ai-metadata-input-full",
		});
		categoryInput.addEventListener("input", (e) => {
			this.editedResult.category = (e.target as HTMLInputElement).value;
		});

		// 摘要
		const summaryContainer = contentEl.createDiv();
		summaryContainer.createEl("label", { text: "摘要:" });
		const summaryInput = summaryContainer.createEl("textarea", {
			cls: "ai-metadata-textarea ai-metadata-textarea-full",
		});
		summaryInput.value = this.editedResult.summary;
		summaryInput.addEventListener("input", (e) => {
			this.editedResult.summary = (e.target as HTMLTextAreaElement).value;
		});

		// 关键词
		const keywordsContainer = contentEl.createDiv();
		keywordsContainer.createEl("label", { text: "关键词:" });
		const keywordsInput = keywordsContainer.createEl("input", {
			type: "text",
			value: this.editedResult.keywords?.join(", ") || "",
			cls: "ai-metadata-input ai-metadata-input-full",
		});
		keywordsInput.addEventListener("input", (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.editedResult.keywords = value
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0);
		});

		// 分享选项
		const shareContainer = contentEl.createDiv({ cls: "ai-metadata-share ai-metadata-share-container" });
		const shareLabel = shareContainer.createEl("label", { text: "允许分享: ", cls: "ai-metadata-share-label" });
		const shareCheckbox = shareContainer.createEl("input", {
			type: "checkbox",
		});
		shareCheckbox.checked = this.editedResult.share === true;
		shareCheckbox.addEventListener("change", (e) => {
			this.editedResult.share = (e.target as HTMLInputElement).checked;
		});
		shareContainer.createEl("span", { text: " (选择是则追加 share: true)" });

		// 按钮
		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

		const confirmButton = buttonContainer.createEl("button", {
			text: "应用",
			cls: "mod-cta",
		});
		confirmButton.addEventListener("click", () => {
			if (typeof this.onConfirm === 'function') {
				this.onConfirm(true, this.editedResult);
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

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
