import {
	App,
	Component,
	Editor,
	MarkdownRenderer,
	MarkdownView,
	Menu,
	Notice,
	type EditorPosition,
} from "obsidian";
import type { OptimizationResult } from "../ai-provider";
import { SupplementInputModal } from "../modals/supplement-input-modal";

// 优先用 Obsidian 的 activeDocument/activeWindow（弹出窗口兼容），回退到全局 document/window。
// 注意：activeDocument/activeWindow 是挂载在 window 上的运行时变量（window.activeDocument），
// 而不是可直接引用的裸全局，直接引用会在运行时得到 undefined。
const activeDoc: Document = window.activeDocument ?? document;
const activeWin: Window = window.activeWindow ?? window;

// 优化方向选项：标题用于菜单展示，指令作为额外 prompt 传给 AI
const OPTIMIZE_DIRECTIONS: ReadonlyArray<{ title: string; instruction: string }> = [
	{ title: "更长一点", instruction: "请将内容扩展得更长一些，适当补充细节和论证，使表达更充实" },
	{ title: "更短一点", instruction: "请将内容精简得更短一些，只保留核心信息，删除冗余表述" },
	{ title: "更正式", instruction: "请将内容改写得更正式、更专业，使用规范的书面表达" },
	{ title: "更友好", instruction: "请将内容改写得更友好、更亲切，语气温和自然" },
];

/**
 * 选中部分文本时的内联预览浮层。
 * 基于 Obsidian 原生 DOM 创建，使用 Editor 抽象层操作编辑器，兼容桌面端与移动端。
 */
export class InlineOptimizationOverlay {
	private readonly app: App;
	private readonly editor: Editor;
	private readonly view: MarkdownView;
	private readonly originalText: string;
	private readonly from: EditorPosition;
	private readonly to: EditorPosition;
	private readonly optimizeFn: (content: string, extraInstruction?: string) => Promise<OptimizationResult>;
	private readonly onApply: () => void;
	private readonly onCancel: () => void;

	private result: OptimizationResult;
	private component: Component;
	private overlayEl: HTMLElement;
	private previewEl: HTMLElement;

	constructor(
		app: App,
		view: MarkdownView,
		editor: Editor,
		originalText: string,
		from: EditorPosition,
		to: EditorPosition,
		optimizeFn: (content: string, extraInstruction?: string) => Promise<OptimizationResult>,
		initialResult: OptimizationResult,
		onApply: () => void,
		onCancel: () => void,
	) {
		this.app = app;
		this.view = view;
		this.editor = editor;
		this.originalText = originalText;
		this.from = from;
		this.to = to;
		this.optimizeFn = optimizeFn;
		this.result = initialResult;
		this.onApply = onApply;
		this.onCancel = onCancel;

		this.component = new Component();
		this.component.load();
	}

	/** 显示浮层并将优化结果渲染到预览区 */
	async show(): Promise<void> {
		// 创建并定位浮层框架（DOM 挂载必须在渲染前完成，否则浮层迟迟不出现）
		try {
			this.overlayEl = activeDoc.body.createDiv({ cls: "ai-inline-optimization-overlay" });

			// 预览区：展示优化结果（带背景色与原文区分）
			this.previewEl = this.overlayEl.createDiv({ cls: "ai-inline-optimization-preview" });

			// 操作区
			const actions = this.overlayEl.createDiv({ cls: "ai-inline-optimization-actions" });

			const useButton = actions.createEl("button", { text: "使用内容", cls: "mod-cta" });
			useButton.addEventListener("click", () => this.useContent());

			const insertButton = actions.createEl("button", { text: "插入下方" });
			insertButton.addEventListener("click", () => this.insertBelow());

			const directionButton = actions.createEl("button", { text: "优化内容" });
			directionButton.addEventListener("click", (evt) => this.openDirectionMenu(evt));

			this.placeOverlay();

			// 点击浮层外部区域关闭（Obsidian 弹出菜单与弹窗内点击不触发关闭）
			this.component.registerDomEvent(activeDoc, "mousedown", (evt: MouseEvent) =>
				this.handleDocumentMouseDown(evt),
			);
		} catch (error) {
			// 框架创建失败时把异常显式抛给调用方，避免被 void 静默吞掉
			console.error("内联浮层初始化失败:", error);
			new Notice(`内联浮层初始化失败: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}

		// 渲染优化内容到预览区；渲染失败时降级为纯文本展示，保留浮层框架
		try {
			await this.renderPreview(this.result.optimizedText);
		} catch (error) {
			console.error("内联浮层预览渲染失败:", error);
			this.previewEl.empty();
			this.previewEl.createDiv({ text: this.result.optimizedText });
		}
	}

	/** 关闭浮层，不做任何编辑修改 */
	close(): void {
		this.component.unload();
		this.overlayEl.remove();
	}

	/** 使用优化结果替换原文 */
	private useContent(): void {
		const replacement = this.withOriginalTrailingNewline(this.result.optimizedText.trim());
		this.editor.replaceRange(replacement, this.minPosition(), this.maxPosition());
		this.onApply();
		this.close();
	}

	/** 在原文下方插入优化结果，保留原文供对比 */
	private insertBelow(): void {
		const replacement = this.result.optimizedText.trim();
		const insertPos = this.maxPosition();
		this.editor.replaceRange(`\n\n${replacement}`, insertPos, insertPos);
		this.onApply();
		this.close();
	}

	/** 打开优化方向下拉菜单 */
	private openDirectionMenu(evt: MouseEvent): void {
		const menu = new Menu();
		for (const direction of OPTIMIZE_DIRECTIONS) {
			menu.addItem((item) =>
				item
					.setTitle(direction.title)
					.onClick(() => void this.regenerate(direction.instruction)),
			);
		}
		menu.addSeparator();
		menu.addItem((item) =>
			item.setTitle("补充描述优化").onClick(() => this.openSupplementInput()),
		);
		menu.showAtMouseEvent(evt);
	}

	/** 打开补充描述输入弹窗 */
	private openSupplementInput(): void {
		new SupplementInputModal(this.app, (text) => void this.regenerate(text)).open();
	}

	/** 携带额外指令重新调用 AI 并刷新预览区 */
	private async regenerate(extraInstruction: string): Promise<void> {
		if (!extraInstruction || !extraInstruction.trim()) {
			return;
		}

		this.setLoading(true);
		try {
			this.result = await this.optimizeFn(this.originalText, extraInstruction);
			await this.renderPreview(this.result.optimizedText);
		} catch (error) {
			console.error("重新优化失败:", error);
			new Notice(`重新优化失败: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			this.setLoading(false);
		}
	}

	/** 渲染优化结果到预览区（Markdown 渲染） */
	private async renderPreview(text: string): Promise<void> {
		this.previewEl.empty();
		await MarkdownRenderer.render(
			this.app,
			text,
			this.previewEl,
			this.view.file?.path ?? "",
			this.component,
		);
	}

	/** 切换预览区的加载状态；isLoading=false 时不做清空，避免抹掉已渲染的优化结果 */
	private setLoading(isLoading: boolean): void {
		if (isLoading) {
			this.previewEl.empty();
			this.previewEl.createDiv({ text: "润色中...", cls: "ai-inline-optimization-loading" });
		}
	}

	/** 处理文档级 mousedown，点击浮层外部时关闭 */
	private handleDocumentMouseDown(evt: MouseEvent): void {
		const target = evt.target as Element | null;
		if (!target || typeof target.closest !== "function") {
			return;
		}
		// 浮层内部、Obsidian 弹出菜单、弹窗内部均不触发关闭
		if (this.overlayEl.contains(target)) {
			return;
		}
		if (target.closest(".menu") || target.closest(".modal-container")) {
			return;
		}
		this.onCancel();
		this.close();
	}

	/** 计算浮层定位：以编辑器可视区域为可靠锚点，原生选区坐标仅在视口内才采纳，最终钳制在视口内 */
	private placeOverlay(): void {
		const contentRect = this.view.contentEl.getBoundingClientRect();
		const lineHeight = this.readEditorLineHeight();
		const scrollTop = this.editor.getScrollInfo().top;

		// 估算选中行在视口中的纵向位置（编辑器可视区域顶部 + 行偏移，减去滚动量）
		const lineScreenTop = contentRect.top - scrollTop + this.from.line * lineHeight;

		let left = contentRect.left;
		let top = lineScreenTop + lineHeight;

		// 原生选区坐标更精确，但 Obsidian 的 CodeMirror 编辑器选区坐标可能过期或超出视口，需校验后采纳
		const selection = activeWin.getSelection();
		if (selection && selection.rangeCount > 0) {
			const rect = selection.getRangeAt(0).getBoundingClientRect();
			if (this.isRectWithinViewport(rect)) {
				left = rect.left;
				top = rect.bottom;
			}
		}

		// 无论采用哪种来源，最终都钳制到视口内，保证浮层始终可见
		const width = this.overlayEl.offsetWidth || 420;
		const estimatedHeight = this.overlayEl.offsetHeight || 220;
		left = Math.max(8, Math.min(left, activeWin.innerWidth - width - 8));
		top = Math.max(8, Math.min(top + 8, activeWin.innerHeight - estimatedHeight - 8));

		this.overlayEl.setCssStyles({
			left: `${left}px`,
			top: `${top}px`,
		});
	}

	/** 判断选区矩形是否位于当前视口内、且具有一定面积（用于决定是否采用原生选区坐标） */
	private isRectWithinViewport(rect: DOMRect | null): rect is DOMRect {
		if (!rect) {
			return false;
		}
		return (
			(rect.width > 0 || rect.height > 0) &&
			rect.top >= 0 &&
			rect.top < activeWin.innerHeight &&
			rect.left >= 0 &&
			rect.left < activeWin.innerWidth
		);
	}

	/** 读取编辑区行高（CSS line-height），用于估算选区行屏幕位置 */
	private readEditorLineHeight(): number {
		const lineHeight = activeWin.getComputedStyle(this.view.contentEl).lineHeight;
		const parsed = Number.parseFloat(lineHeight);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
	}

	/** 保持原文末尾换行：原文以换行结尾而优化结果没有时补齐，避免破坏后续段落 */
	private withOriginalTrailingNewline(text: string): string {
		if (this.originalText.endsWith("\n") && !text.endsWith("\n")) {
			return `${text}\n`;
		}
		return text;
	}

	private minPosition(): EditorPosition {
		return this.isBefore(this.from, this.to) ? this.from : this.to;
	}

	private maxPosition(): EditorPosition {
		return this.isBefore(this.from, this.to) ? this.to : this.from;
	}

	private isBefore(a: EditorPosition, b: EditorPosition): boolean {
		return a.line < b.line || (a.line === b.line && a.ch <= b.ch);
	}
}