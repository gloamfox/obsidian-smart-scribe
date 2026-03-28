import {
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	TFolder,
} from "obsidian";
import { AnalysisResult, AIPlatform, PLATFORM_DEFAULTS, createAIProvider, AIProviderConfig } from "./src/ai-provider";
import { VaultScanner } from "./src/vault-scanner";
import { AIMetadataSettings, DEFAULT_SETTINGS } from "./src/settings";
import { AIMetadataSettingTab } from "./src/ui/setting-tab";
import { MetadataPreviewModal } from "./src/modals/metadata-preview-modal";
import { TextOptimizationModal } from "./src/modals/text-optimization-modal";
import { BatchConfirmModal } from "./src/modals/batch-confirm-modal";

export default class AIMetadataPlugin extends Plugin {
	settings: AIMetadataSettings;
	vaultScanner: VaultScanner;
	private statusBarItem: HTMLElement | null = null;
	private ribbonIconEl: HTMLElement | null = null;
	private showFileMenu: boolean = false;
	private showFolderMenu: boolean = false;
	private showEditorContextMenu: boolean = false;
	private showOptimizeContextMenu: boolean = false;

	async onload() {
		await this.loadSettings();

		// 使用 Obsidian API 获取标签
		this.vaultScanner = new VaultScanner(
			this.app.vault,
			() => {
				const cache = this.app.metadataCache as unknown as { getTags(): Record<string, number> };
				return cache.getTags();
			},
			(file) => this.app.metadataCache.getFileCache(file),
			() => {
				const cache = this.app.metadataCache as unknown as { getCachedFiles(): string[] };
				return cache.getCachedFiles();
			}
		);

		// 添加状态栏项
		this.statusBarItem = this.addStatusBarItem();

		// 根据设置添加右键菜单
		if (this.settings.showEditorMenu) {
			this.addContextMenus();
		}

		// 根据设置添加优化菜单
		if (this.settings.showOptimizeMenu) {
			this.addOptimizeContextMenus();
		}

		// 注册文件菜单事件（AI生成笔记属性）
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (this.showFileMenu && file instanceof TFile && file.extension === "md") {
					menu.addItem((item) => {
						item
							.setTitle("AI 生成笔记属性")
							.setIcon("sparkles")
							.onClick(async () => {
								if (this.settings.showPreview) {
									await this.generateMetadataWithPreview(file);
								} else {
									await this.generateMetadata(file);
								}
							});
					});
				}
			})
		);

		// 注册文件菜单事件（AI优化文本）
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (this.showOptimizeContextMenu && file instanceof TFile && file.extension === "md") {
					menu.addItem((item) => {
						item
							.setTitle("AI 优化文本")
							.setIcon("wand-2")
							.onClick(async () => {
								// 打开文件并优化全文
								const leaf = this.app.workspace.getLeaf(false);
								await leaf.openFile(file);
								const view = this.app.workspace.getActiveViewOfType(MarkdownView);
								if (view) {
									await this.optimizeText(view.editor, file);
								}
							});
					});
				}
			})
		);

		// 注册编辑器菜单事件
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				if (this.showEditorContextMenu && view.file && view.file.extension === "md") {
					menu.addItem((item) => {
						item
							.setTitle("AI 生成笔记属性")
							.setIcon("sparkles")
							.onClick(async () => {
								if (this.settings.showPreview) {
									await this.generateMetadataWithPreview(view.file);
								} else {
									await this.generateMetadata(view.file);
								}
							});
					});
				}
			})
		);

		// 注册编辑器菜单事件（优化文本）
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				if (this.showOptimizeContextMenu && view.file && view.file.extension === "md") {
					menu.addItem((item) => {
						item
							.setTitle("AI 优化文本")
							.setIcon("wand-2")
							.onClick(async () => {
								await this.optimizeText(editor, view.file);
							});
					});
				}
			})
		);

		// 注册命令
		this.addCommand({
			id: "generate-metadata",
			name: "给当前文章生成笔记属性",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.generateMetadata(view.file);
			},
		});

		this.addCommand({
			id: "generate-metadata-with-preview",
			name: "给当前文章生成笔记属性（预览）",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.generateMetadataWithPreview(view.file);
			},
		});

		// 添加优化文本命令
		this.addCommand({
			id: "optimize-text",
			name: "AI 优化文本",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.optimizeText(editor, view.file);
			},
		});

		this.addCommand({
			id: "optimize-text-with-preview",
			name: "AI 优化文本（预览）",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.optimizeTextWithPreview(editor, view.file);
			},
		});

		// 添加设置面板
		this.addSettingTab(new AIMetadataSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		const loaded = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);

		// 确保所有平台配置都存在
		for (const platform of Object.keys(PLATFORM_DEFAULTS) as AIPlatform[]) {
			if (!this.settings.platforms[platform]) {
				this.settings.platforms[platform] = {
					apiKey: "",
					model: PLATFORM_DEFAULTS[platform].defaultModel,
					baseUrl: PLATFORM_DEFAULTS[platform].baseUrl,
					temperature: 0.7,
					maxTokens: 4096,
				};
			}
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private addRibbonIconButton() {
		if (this.ribbonIconEl) return;
		this.ribbonIconEl = this.addRibbonIcon("sparkles", "AI 生成笔记属性", async () => {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile && activeFile.extension === "md") {
				if (this.settings.showPreview) {
					await this.generateMetadataWithPreview(activeFile);
				} else {
					await this.generateMetadata(activeFile);
				}
			} else {
				new Notice("请先打开一个 Markdown 文件");
			}
		});
	}

	private removeRibbonIconButton() {
		if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = null;
		}
	}

	private addContextMenus() {
		this.showFileMenu = true;
		this.showEditorContextMenu = true;
	}

	private removeContextMenus() {
		this.showFileMenu = false;
		this.showEditorContextMenu = false;
	}

	addOptimizeContextMenus() {
		this.showOptimizeContextMenu = true;
	}

	removeOptimizeContextMenus() {
		this.showOptimizeContextMenu = false;
	}

	updateRibbonIcon() {
		if (this.settings.showRibbonIcon) {
			this.addRibbonIconButton();
		} else {
			this.removeRibbonIconButton();
		}
	}

	updateContextMenus() {
		if (this.settings.showEditorMenu) {
			this.addContextMenus();
		} else {
			this.removeContextMenus();
		}
	}

	private statusBarTimeout: number | null = null;

	private updateStatusBar(text: string, isTransient: boolean = true) {
		if (!this.statusBarItem) return;

		// 清除之前的定时器
		if (this.statusBarTimeout) {
			window.clearTimeout(this.statusBarTimeout);
			this.statusBarTimeout = null;
		}

		this.statusBarItem.setText(`🤖 ${text}`);

		// 临时状态（已完成、已取消、失败等）3秒后消失
		if (isTransient) {
			this.statusBarTimeout = window.setTimeout(() => {
				if (this.statusBarItem) {
					this.statusBarItem.setText("");
				}
			}, 3000);
		}
	}

	private getCurrentPlatformConfig(): AIProviderConfig {
		const platform = this.settings.activePlatform;
		return this.settings.platforms[platform];
	}

	private getAIProvider() {
		const platform = this.settings.activePlatform;
		const config = this.getCurrentPlatformConfig();

		if (!config.apiKey) {
			throw new Error(`请先在设置中配置 ${PLATFORM_DEFAULTS[platform].name} 的 API Key`);
		}

		return createAIProvider(platform, config);
	}

	async generateMetadata(file: TFile | null) {
		if (!file) {
			new Notice("请先打开一个文件");
			return;
		}

		this.updateStatusBar("生成中...", false);
		new Notice(`正在使用 ${PLATFORM_DEFAULTS[this.settings.activePlatform].name} 生成笔记属性...`);

		try {
			const content = await this.app.vault.read(file);
			const cleanContent = this.extractContentWithoutFrontmatter(content);

			// 获取已有的标签和分类（使用 Obsidian API 实时获取）
			const vaultMetadata = this.vaultScanner.getVaultMetadata(this.settings.includeFolderStructure);
			const existingTags = this.vaultScanner.getTopTags(vaultMetadata.tags, this.settings.maxTags);
			const existingCategories = this.vaultScanner.getTopCategories(vaultMetadata.categories, 20);

			// 如果启用，添加文件夹结构作为分类建议
			if (this.settings.includeFolderStructure) {
				const folderCategories = this.vaultScanner.getFolderCategories(file);
				for (const cat of folderCategories) {
					if (!existingCategories.includes(cat)) {
						existingCategories.push(cat);
					}
				}
			}

			const provider = this.getAIProvider();
			const result = await provider.analyze(cleanContent, existingTags, existingCategories);

			// 读取已有 frontmatter，保留 share 字段
			const existingFrontmatter = this.extractFrontmatter(content);
			if (existingFrontmatter.share === true || existingFrontmatter.share === "true") {
				result.share = true;
			}

			await this.applyMetadata(file, content, result);

			this.updateStatusBar("生成完成");
			new Notice(`笔记属性生成完成！\n标题: ${result.title}\n标签: ${result.tags.join(", ")}\n关键词: ${result.keywords?.join(", ") || "无"}`);
		} catch (error) {
			console.error("生成失败:", error);
			this.updateStatusBar("生成失败");
			new Notice(`生成失败: ${error.message}`);
		}
	}

	async generateMetadataWithPreview(file: TFile | null) {
		if (!file) {
			new Notice("请先打开一个文件");
			return;
		}

		this.updateStatusBar("生成中...", false);
		new Notice(`正在使用 ${PLATFORM_DEFAULTS[this.settings.activePlatform].name} 生成笔记属性...`);

		try {
			const content = await this.app.vault.read(file);
			const cleanContent = this.extractContentWithoutFrontmatter(content);

			// 获取已有的标签和分类（使用 Obsidian API 实时获取）
			const vaultMetadata = this.vaultScanner.getVaultMetadata(this.settings.includeFolderStructure);
			const existingTags = this.vaultScanner.getTopTags(vaultMetadata.tags, this.settings.maxTags);
			const existingCategories = this.vaultScanner.getTopCategories(vaultMetadata.categories, 20);

			if (this.settings.includeFolderStructure) {
				const folderCategories = this.vaultScanner.getFolderCategories(file);
				for (const cat of folderCategories) {
					if (!existingCategories.includes(cat)) {
						existingCategories.push(cat);
					}
				}
			}

			const provider = this.getAIProvider();
			const result = await provider.analyze(cleanContent, existingTags, existingCategories);

			// 读取已有 frontmatter，检查 share 字段
			const existingFrontmatter = this.extractFrontmatter(content);
			if (existingFrontmatter.share === true || existingFrontmatter.share === "true") {
				result.share = true;
			}

			this.updateStatusBar("预览中", false);

			// 显示预览模态框
			new MetadataPreviewModal(this.app, result, (confirmed, editedResult) => {
				if (confirmed && editedResult) {
					this.applyMetadata(file, content, editedResult).then(() => {
						this.updateStatusBar("已应用");
						new Notice(`笔记属性已应用！\n标题: ${editedResult.title}\n标签: ${editedResult.tags.join(", ")}\n关键词: ${editedResult.keywords?.join(", ") || "无"}`);
					}).catch((error) => {
						console.error("应用笔记属性失败:", error);
						this.updateStatusBar("应用失败");
						new Notice(`应用失败: ${error.message}`);
					});
				} else {
					this.updateStatusBar("已取消");
				}
			}).open();
		} catch (error) {
			console.error("生成失败:", error);
			this.updateStatusBar("生成失败");
			new Notice(`生成失败: ${error.message}`);
		}
	}

	updateMetadata(file: TFile | null) {
		if (!file) {
			new Notice("请先打开一个文件");
			return;
		}

		this.updateStatusBar("更新中...", false);

		try {
			// 使用 Obsidian API 获取文件的标签和分类
			const fileTags = this.vaultScanner.getFileTags(file);
			const fileCategory = this.vaultScanner.getFileCategory(file);

			this.updateStatusBar("更新完成");
			new Notice(`文件标签: ${fileTags.join(", ") || "无"}, 分类: ${fileCategory || "无"}`);
		} catch (error) {
			console.error("更新失败:", error);
			this.updateStatusBar("更新失败");
			new Notice("更新失败");
		}
	}

	private async applyMetadata(file: TFile, originalContent: string, result: AnalysisResult) {
		// 确保 result 有有效值
		const safeResult: AnalysisResult = {
			title: result?.title || "",
			tags: Array.isArray(result?.tags) ? result.tags : [],
			category: result?.category || "",
			summary: result?.summary || "",
			keywords: Array.isArray(result?.keywords) ? result.keywords : [],
			share: result?.share === true,
		};

		// 获取 date：优先使用已有 frontmatter 中的 date，否则使用文件创建时间
		const existingFrontmatter = this.extractFrontmatter(originalContent);
		let dateStr = existingFrontmatter?.date;
		if (!dateStr) {
			// 使用文件创建时间，格式化为 YYYY-MM-DD HH:mm:ss
			const stat = await this.app.vault.adapter.stat(file.path);
			if (stat) {
				const date = new Date(stat.ctime);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				const seconds = String(date.getSeconds()).padStart(2, '0');
				dateStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
			}
		}
		
		safeResult.date = typeof dateStr === 'string' ? dateStr : undefined;

		const newFrontmatter = this.buildFrontmatter(safeResult);
		const cleanContent = this.extractContentWithoutFrontmatter(originalContent);
		const newContent = `${newFrontmatter}\n${cleanContent}`;

		await this.app.vault.modify(file, newContent);
	}

	private buildFrontmatter(result: AnalysisResult): string {
		// 确保所有字段都有有效值
		const title = result?.title || "";
		const tags = Array.isArray(result?.tags) ? result.tags : [];
		const category = result?.category || "";
		const summary = result?.summary || "";
		const date = result?.date || "";
		const keywords = Array.isArray(result?.keywords) ? result.keywords : [];

		const lines = ["---"];

		if (date) {
			lines.push(`date: ${date}`);
		}

		if (title) {
			lines.push(`title: ${title}`);
		}

		if (tags.length > 0) {
			lines.push(`tags:`);
			for (const tag of tags) {
				lines.push(`  - ${tag}`);
			}
		}

		if (category) {
			lines.push(`category: ${category}`);
		}

		if (keywords.length > 0) {
			lines.push(`keywords:`);
			for (const kw of keywords) {
				lines.push(`  - ${kw}`);
			}
		}

		if (summary) {
			lines.push(`summary: ${summary}`);
		}

		// share 字段：如果为 true 则添加
		if (result?.share === true) {
			lines.push(`share: true`);
		}

		lines.push("---");

		return lines.join("\n");
	}

	private extractContentWithoutFrontmatter(content: string): string {
		const match = content.match(/^---\s*\n[\s\S]*?\n---\s*/);
		if (match) {
			return content.slice(match[0].length).trim();
		}
		return content.trim();
	}

	private extractFrontmatter(content: string): Record<string, unknown> {
		const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
		if (!match) return {};

		const yaml = match[1];
		const result: Record<string, unknown> = {};

		const lines = yaml.split("\n");
		let currentKey = "";
		let inArray = false;

		for (const line of lines) {
			const trimmed = line.trim();
			const colonIndex = line.indexOf(":");

			if (colonIndex > 0 && !inArray) {
				currentKey = line.slice(0, colonIndex).trim();
				const value = line.slice(colonIndex + 1).trim();

				if (value === "") {
					inArray = true;
					result[currentKey] = [];
				} else if (value.startsWith("[") && value.endsWith("]")) {
					result[currentKey] = value
						.slice(1, -1)
						.split(",")
						.map((v) => v.trim().replace(/^["']|["']$/g, ""));
				} else {
					result[currentKey] = value.replace(/^["']|["']$/g, "");
				}
			} else if (trimmed.startsWith("-") && inArray && currentKey) {
				const value = trimmed.slice(1).trim();
				const arr = result[currentKey] as string[];
				arr.push(value.replace(/^["']|["']$/g, ""));
			} else if (trimmed === "" || colonIndex > 0) {
				inArray = false;
			}
		}

		return result;
	}

	private normalizeTags(tags: unknown): string[] {
		if (Array.isArray(tags)) {
			return tags
				.map((t) => String(t).trim())
				.filter((t) => t.length > 0);
		}
		if (typeof tags === "string") {
			return tags
				.split(/[,\s]+/)
				.map((t) => t.trim())
				.filter((t) => t.length > 0);
		}
		return [];
	}

	batchGenerateMetadata(folder: TFolder) {
		// 获取文件夹下所有 markdown 文件
		const files: TFile[] = [];
		const collectFiles = (f: TFolder) => {
			for (const child of f.children) {
				if (child instanceof TFile && child.extension === "md") {
					files.push(child);
				} else if (child instanceof TFolder) {
					collectFiles(child);
				}
			}
		};
		collectFiles(folder);

		if (files.length === 0) {
			new Notice("该文件夹中没有 Markdown 文件");
			return;
		}

		// 显示确认对话框
		new BatchConfirmModal(this.app, files.length, (confirmed) => {
			if (!confirmed) return;

			let successCount = 0;
			let failCount = 0;

			this.updateStatusBar(`批量处理中: 0/${files.length}`, false);

			const processFiles = async () => {
				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					try {
						await this.generateMetadata(file);
						successCount++;
					} catch (error) {
						console.error(`处理文件 ${file.path} 失败:`, error);
						failCount++;
					}
					this.updateStatusBar(`批量处理中: ${i + 1}/${files.length}`, false);
				}

				this.updateStatusBar("批量处理完成");
				new Notice(`批量处理完成！成功: ${successCount}, 失败: ${failCount}`);
			};

			processFiles();
		}).open();
	}

	async optimizeText(editor: Editor, file: TFile | null) {
		if (!file) {
			new Notice("请先打开一个文件");
			return;
		}

		const selection = editor.getSelection();
		const isPartial = selection.length > 0;
		const contentToOptimize = isPartial ? selection : editor.getValue();

		if (!contentToOptimize.trim()) {
			new Notice("没有可优化的内容");
			return;
		}

		this.updateStatusBar("优化中...", false);
		new Notice(`正在使用 ${PLATFORM_DEFAULTS[this.settings.activePlatform].name} 优化文本...`);

		try {
			const provider = this.getAIProvider();
			const result = await provider.optimize(contentToOptimize, isPartial);

			if (this.settings.showOptimizePreview) {
				this.updateStatusBar("预览中", false);
				new TextOptimizationModal(this.app, result, isPartial, (confirmed, editedText) => {
					if (confirmed && editedText) {
						if (isPartial) {
							editor.replaceSelection(editedText);
						} else {
							editor.setValue(editedText);
						}
						this.updateStatusBar("已应用");
						new Notice("文本优化已应用！");
					} else {
						this.updateStatusBar("已取消");
					}
				}).open();
			} else {
				// 直接应用
				if (isPartial) {
					editor.replaceSelection(result.optimizedText);
				} else {
					editor.setValue(result.optimizedText);
				}
				this.updateStatusBar("已应用");
				new Notice("文本优化已应用！");
			}
		} catch (error) {
			console.error("优化失败:", error);
			this.updateStatusBar("优化失败");
			new Notice(`优化失败: ${error.message}`);
		}
	}

	async optimizeTextWithPreview(editor: Editor, file: TFile | null) {
		if (!file) {
			new Notice("请先打开一个文件");
			return;
		}

		const selection = editor.getSelection();
		const isPartial = selection.length > 0;
		const contentToOptimize = isPartial ? selection : editor.getValue();

		if (!contentToOptimize.trim()) {
			new Notice("没有可优化的内容");
			return;
		}

		this.updateStatusBar("优化中...", false);
		new Notice(`正在使用 ${PLATFORM_DEFAULTS[this.settings.activePlatform].name} 优化文本...`);

		try {
			const provider = this.getAIProvider();
			const result = await provider.optimize(contentToOptimize, isPartial);

			this.updateStatusBar("预览中", false);
			new TextOptimizationModal(this.app, result, isPartial, (confirmed, editedText) => {
				if (confirmed && editedText) {
					if (isPartial) {
						editor.replaceSelection(editedText);
					} else {
						editor.setValue(editedText);
					}
					this.updateStatusBar("已应用");
					new Notice("文本优化已应用！");
				} else {
					this.updateStatusBar("已取消");
				}
			}).open();
		} catch (error) {
			console.error("优化失败:", error);
			this.updateStatusBar("优化失败");
			new Notice(`优化失败: ${error.message}`);
		}
	}
}
