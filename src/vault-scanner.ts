import { TFile, TFolder, Vault, CachedMetadata, TagCache } from "obsidian";

export interface VaultMetadata {
	tags: Map<string, number>; // tag -> usage count
	categories: Map<string, number>; // category -> usage count
}

export class VaultScanner {
	private vault: Vault;
	private getAllTags: () => Record<string, number>;
	private getFileCache: (file: TFile) => CachedMetadata | null;
	private getCachedFiles: () => string[];

	constructor(
		vault: Vault,
		getAllTags: () => Record<string, number>,
		getFileCache: (file: TFile) => CachedMetadata | null,
		getCachedFiles: () => string[]
	) {
		this.vault = vault;
		this.getAllTags = getAllTags;
		this.getFileCache = getFileCache;
		this.getCachedFiles = getCachedFiles;
	}

	/**
	 * 获取所有标签（使用 Obsidian MetadataCache API）
	 */
	getAllVaultTags(): Map<string, number> {
		const tags = new Map<string, number>();
		try {
			const allTags = this.getAllTags();
			if (!allTags || typeof allTags !== 'object') {
				return tags;
			}

			// Obsidian 返回格式: { "#tag": count, "#tag/sub": count }
			for (const [tagWithHash, count] of Object.entries(allTags)) {
				// 移除开头的 #
				const tag = tagWithHash.startsWith("#") ? tagWithHash.slice(1) : tagWithHash;
				tags.set(tag, count);
			}
		} catch (error) {
			console.error("获取标签失败:", error);
		}

		return tags;
	}

	/**
	 * 从 frontmatter 中获取分类（使用 Obsidian MetadataCache，遍历缓存的文件）
	 */
	getCategoriesFromMetadata(): Map<string, number> {
		const categories = new Map<string, number>();

		try {
			// 遍历所有缓存的文件路径（使用 Obsidian API，不直接读取文件）
			const cachedFiles = this.getCachedFiles();
			for (const filePath of cachedFiles) {
				const file = this.vault.getAbstractFileByPath(filePath);
				if (file instanceof TFile) {
					const cache = this.getFileCache(file);
					if (cache?.frontmatter?.category) {
						const category = String(cache.frontmatter.category).trim();
						if (category) {
							categories.set(category, (categories.get(category) || 0) + 1);
						}
					}
				}
			}
		} catch (error) {
			console.error("获取分类失败:", error);
		}

		return categories;
	}

	/**
	 * 从文件夹结构获取分类
	 */
	getCategoriesFromFolders(): Map<string, number> {
		const categories = new Map<string, number>();

		// 获取所有文件夹 - 使用 getRoot() 方法
		const root = this.vault.getRoot();
		this.collectFolderNames(root, categories);

		return categories;
	}

	private collectFolderNames(folder: TFolder, categories: Map<string, number>, depth: number = 0) {
		// 限制深度，避免过深的嵌套
		if (depth > 3) return;

		for (const child of folder.children) {
			if (child instanceof TFolder) {
				const name = child.name;
				if (name && !name.startsWith(".") && name !== "") {
					categories.set(name, (categories.get(name) || 0) + 1);
				}
				this.collectFolderNames(child, categories, depth + 1);
			}
		}
	}

	/**
	 * 获取综合的 Vault 笔记属性
	 */
	getVaultMetadata(useFoldersAsCategories: boolean = true): VaultMetadata {
		const tags = this.getAllVaultTags();
		let categories = this.getCategoriesFromMetadata();

		// 如果 frontmatter 中的分类较少，补充文件夹名称
		if (useFoldersAsCategories && categories.size < 10) {
			const folderCategories = this.getCategoriesFromFolders();
			for (const [cat, count] of folderCategories) {
				categories.set(cat, (categories.get(cat) || 0) + count);
			}
		}

		return { tags, categories };
	}

	/**
	 * 获取最常用的标签（按使用频率排序）
	 */
	getTopTags(tags: Map<string, number>, limit: number = 50): string[] {
		return Array.from(tags.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([tag]) => tag);
	}

	/**
	 * 获取最常用的分类（按使用频率排序）
	 */
	getTopCategories(categories: Map<string, number>, limit: number = 20): string[] {
		return Array.from(categories.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([category]) => category);
	}

	/**
	 * 根据内容推荐相关标签（简单关键词匹配）
	 */
	recommendTags(content: string, existingTags: Map<string, number>, limit: number = 10): string[] {
		const contentLower = content.toLowerCase();
		const scores = new Map<string, number>();

		for (const [tag, _count] of existingTags) {
			let score = 0;
			const tagLower = tag.toLowerCase();

			// 直接匹配
			if (contentLower.includes(tagLower)) {
				score += 10;
			}

			// 部分匹配（处理子标签如 tag/sub）
			const tagParts = tagLower.split("/");
			for (const part of tagParts) {
				if (part.length > 2 && contentLower.includes(part)) {
					score += 3;
				}
			}

			if (score > 0) {
				scores.set(tag, score);
			}
		}

		return Array.from(scores.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, limit)
			.map(([tag]) => tag);
	}

	/**
	 * 根据文件夹结构推断分类
	 */
	getFolderCategories(file: TFile): string[] {
		const categories: string[] = [];
		let current: TFolder | null = file.parent;

		while (current && current.path !== "/" && current.path !== "") {
			categories.push(current.name);
			current = current.parent;
		}

		return categories.reverse();
	}

	/**
	 * 获取文件已有的标签（来自 frontmatter 和内联标签）
	 */
	getFileTags(file: TFile): string[] {
		const tags: string[] = [];

		try {
			const cache = this.getFileCache(file);

			if (cache) {
				// frontmatter 中的标签
				if (cache.frontmatter?.tags) {
					const fmTags = cache.frontmatter.tags;
					if (Array.isArray(fmTags)) {
						tags.push(...fmTags.map((t) => String(t)));
					} else if (typeof fmTags === "string") {
						tags.push(...fmTags.split(/[,\s]+/));
					}
				}

				// 内联标签 #tag
				if (cache.tags) {
					for (const tagInfo of cache.tags) {
						const tag = tagInfo.tag.startsWith("#") ? tagInfo.tag.slice(1) : tagInfo.tag;
						tags.push(tag);
					}
				}
			}
		} catch (error) {
			console.error("获取文件标签失败:", error);
		}

		return [...new Set(tags.filter((t) => t.length > 0))];
	}

	/**
	 * 获取文件的分类（来自 frontmatter）
	 */
	getFileCategory(file: TFile): string | null {
		try {
			const cache = this.getFileCache(file);
			if (cache?.frontmatter?.category) {
				return String(cache.frontmatter.category).trim();
			}
		} catch (error) {
			console.error("获取文件分类失败:", error);
		}
		return null;
	}
}
