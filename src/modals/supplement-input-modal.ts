import { App, Modal } from "obsidian";

/**
 * 补充描述优化输入弹窗。
 * 用户输入额外要求后，携带该描述重新生成优化内容。
 */
export class SupplementInputModal extends Modal {
	onConfirm: (text: string) => void;

	constructor(app: App, onConfirm: (text: string) => void) {
		super(app);
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "补充问题相关描述以重新生成内容" });

		const inputEl = contentEl.createEl("textarea", {
			cls: "ai-supplement-input",
			attr: {
				placeholder: "如有更多要求可添加说明，例如：更简洁、更正式等",
			},
		});

		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

		const confirmButtonEl = buttonContainer.createEl("button", { text: "确定", cls: "mod-cta" });
		confirmButtonEl.disabled = true;

		const cancelButtonEl = buttonContainer.createEl("button", { text: "取消" });
		cancelButtonEl.addEventListener("click", () => this.close());

		// 输入内容后才允许点击确定
		inputEl.addEventListener("input", () => {
			confirmButtonEl.disabled = inputEl.value.trim().length === 0;
		});

		confirmButtonEl.addEventListener("click", () => {
			const text = inputEl.value.trim();
			if (!text) {
				return;
			}
			this.onConfirm(text);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}