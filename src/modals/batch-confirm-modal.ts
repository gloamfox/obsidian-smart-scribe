import { App, Modal } from "obsidian";

export class BatchConfirmModal extends Modal {
	fileCount: number;
	onConfirm: (confirmed: boolean) => void;

	constructor(app: App, fileCount: number, onConfirm: (confirmed: boolean) => void) {
		super(app);
		this.fileCount = fileCount;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "确认批量生成" });
		contentEl.createEl("p", { text: `将为 ${this.fileCount} 个文件生成 AI 笔记属性。` });
		contentEl.createEl("p", { text: "此操作可能需要一些时间，请耐心等待。", cls: "mod-warning" });

		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

		const confirmButton = buttonContainer.createEl("button", {
			text: "开始",
			cls: "mod-cta",
		});
		confirmButton.addEventListener("click", () => {
			this.onConfirm(true);
			this.close();
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "取消",
		});
		cancelButton.addEventListener("click", () => {
			this.onConfirm(false);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
