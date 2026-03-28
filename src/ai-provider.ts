import { requestUrl } from "obsidian";

export interface AnalysisResult {
	title: string;
	tags: string[];
	category: string;
	summary: string;
	date?: string; // 可选，ISO 格式日期
	keywords?: string[]; // AI 生成的关键词
	share?: boolean; // 是否允许分享
}

export interface OptimizationResult {
	optimizedText: string;
	explanation?: string; // 优化说明
}

export interface AIProvider {
	analyze(content: string, existingTags: string[], existingCategories: string[]): Promise<AnalysisResult>;
	optimize(content: string, isPartial: boolean): Promise<OptimizationResult>;
}

export interface AIProviderConfig {
	apiKey: string;
	model: string;
	baseUrl?: string;
	temperature?: number;
	maxTokens?: number;
}

// 支持的 AI 平台类型
export type AIPlatform = "claude" | "openai" | "deepseek" | "qwen" | "zhipu" | "spark";

// 平台默认配置
export const PLATFORM_DEFAULTS: Record<AIPlatform, { name: string; baseUrl: string; models: string[]; defaultModel: string }> = {
	claude: {
		name: "Claude (Anthropic)",
		baseUrl: "https://api.anthropic.com",
		models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"],
		defaultModel: "claude-sonnet-4-6",
	},
	openai: {
		name: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
		defaultModel: "gpt-4o",
	},
	deepseek: {
		name: "DeepSeek",
		baseUrl: "https://api.deepseek.com",
		models: ["deepseek-chat", "deepseek-coder"],
		defaultModel: "deepseek-chat",
	},
	qwen: {
		name: "通义千问 (Aliyun)",
		baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus"],
		defaultModel: "qwen-plus",
	},
	zhipu: {
		name: "智谱 AI (GLM)",
		baseUrl: "https://open.bigmodel.cn/api/paas/v4",
		models: ["glm-4", "glm-4-flash", "glm-4-air", "glm-4-long"],
		defaultModel: "glm-4",
	},
	spark: {
		name: "讯飞星火",
		baseUrl: "https://spark-api-open.xf-yun.com/v1",
		models: ["lite", "pro", "pro-128k", "max", "4.0-ultra"],
		defaultModel: "pro",
	},
};

// 基础系统提示词
function buildSystemPrompt(existingTags: string[], existingCategories: string[]): string {
	let prompt = `你是一个专业的内容分析助手。请分析用户提供的文章内容，并生成以下元数据：

1. **title**: 一个简洁、准确的标题（不超过50个字符）
2. **tags**: 3-8个相关标签，用于内容分类和检索
3. **category**: 一个主要分类，用于组织内容
4. **summary**: 一段简短的摘要（100-200字），概括文章核心内容
5. **keywords**: 5-10个关键词，用于SEO和搜索优化（不同于tags，keywords更侧重内容核心概念）

请以 JSON 格式返回结果，格式如下：
{
  "title": "生成的标题",
  "tags": ["标签1", "标签2", "标签3"],
  "category": "分类名称",
  "summary": "文章摘要...",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

要求：
- 标签使用中文或英文，保持简洁
- 避免过于宽泛的标签（如"笔记"、"文档"）
- 摘要要准确反映文章的核心观点
- keywords 应该是文章的核心概念、技术术语、关键实体等，用于搜索发现`;

	if (existingTags.length > 0) {
		prompt += `\n\n**重要：优先使用以下已有标签**（如果内容相关）：\n${existingTags.join(", ")}`;
	}

	if (existingCategories.length > 0) {
		prompt += `\n\n**重要：优先从以下已有分类中选择**（如果内容匹配）：\n${existingCategories.join(", ")}`;
	}

	prompt += `\n\n请只返回 JSON 格式的结果，不要包含其他说明文字。`;

	return prompt;
}

// 解析 AI 响应
function parseResponse(response: string): AnalysisResult {
	try {
		// 尝试提取 JSON 部分
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				title: parsed.title || "未命名",
				tags: Array.isArray(parsed.tags) ? parsed.tags : [],
				category: parsed.category || "未分类",
				summary: parsed.summary || "",
				keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
			};
		}
		throw new Error("无法解析 AI 响应");
	} catch (error) {
		console.error("解析 AI 响应失败:", error);
		return {
			title: "解析失败",
			tags: [],
			category: "未分类",
			summary: "",
			keywords: [],
		};
	}
}

// 解析优化响应
function parseOptimizationResponse(response: string): OptimizationResult {
	try {
		// 尝试按新的格式解析（===优化后的文本=== 和 ===优化说明===）
		const textMatch = response.match(/===优化后的文本===\s*\n?([\s\S]*?)(?:\n?===优化说明===|$)/);
		const explanationMatch = response.match(/===优化说明===\s*\n?([\s\S]*?)$/);

		if (textMatch) {
			return {
				optimizedText: textMatch[1].trim(),
				explanation: explanationMatch ? explanationMatch[1].trim() : "",
			};
		}

		// 尝试提取 JSON 部分（兼容旧格式）
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				optimizedText: parsed.optimizedText || parsed.text || response,
				explanation: parsed.explanation || parsed.changes || "",
			};
		}

		// 如果没有匹配到任何格式，返回整个响应作为优化文本
		return {
			optimizedText: response.trim(),
			explanation: "",
		};
	} catch {
		// 解析失败，返回原始响应
		return {
			optimizedText: response.trim(),
			explanation: "",
		};
	}
}

// 构建优化提示词
function buildOptimizePrompt(isPartial: boolean): string {
	if (isPartial) {
		return `你是一位专业的写作编辑。请优化用户提供的文本片段，改进其表达和叙述结构。

要求：
1. 保持原文的核心意思不变
2. 改进语言表达，使其更加流畅、准确
3. 优化句子结构，增强可读性
4. 修正语法错误和不恰当的用词
5. 保持文本片段的原有风格

请按以下格式返回结果：

===优化后的文本===
（在这里输出优化后的文本内容，保持Markdown格式，不要包含JSON格式或代码块）

===优化说明===
1. 改进点一的说明
2. 改进点二的说明
3. 改进点三的说明
（按条目列出主要改进点，纯文本格式，不要使用Markdown加粗、斜体等格式）`;
	} else {
		return `你是一位专业的写作编辑。请优化用户提供的文章，改进其整体表达和叙述结构。

要求：
1. 保持原文的核心意思和主题不变
2. 改进语言表达，使其更加流畅、准确、专业
3. 优化文章结构，增强逻辑性和可读性
4. 修正语法错误、错别字和不恰当的用词
5. 保持文章的原有风格和语气
6. 可以适当调整段落结构，使文章更有层次感

请按以下格式返回结果：

===优化后的文本===
（在这里输出优化后的文本内容，保持Markdown格式，不要包含JSON格式或代码块）

===优化说明===
1. 改进点一的说明
2. 改进点二的说明
3. 改进点三的说明
（按条目列出主要改进点，如结构调整、语言润色等，纯文本格式，不要使用Markdown加粗、斜体等格式）`;
	}
}

// Claude Provider
export class ClaudeProvider implements AIProvider {
	private config: AIProviderConfig;

	constructor(config: AIProviderConfig) {
		this.config = config;
	}

	async analyze(content: string, existingTags: string[] = [], existingCategories: string[] = []): Promise<AnalysisResult> {
		const systemPrompt = buildSystemPrompt(existingTags, existingCategories);

		const response = await requestUrl({
			url: `${this.config.baseUrl || PLATFORM_DEFAULTS.claude.baseUrl}/v1/messages`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.config.apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: this.config.model,
				max_tokens: this.config.maxTokens || 4096,
				system: systemPrompt,
				messages: [
					{
						role: "user",
						content: `请分析以下文章内容，生成合适的元数据：\n\n${content}`,
					},
				],
			}),
		});

		if (response.status !== 200) {
			throw new Error(`Claude API 请求失败: ${response.status} ${response.text}`);
		}

		const data = response.json;
		const textContent = data.content
			.filter((block: { type: string }) => block.type === "text")
			.map((block: { text: string }) => block.text)
			.join("");

		return parseResponse(textContent);
	}

	async optimize(content: string, isPartial: boolean = false): Promise<OptimizationResult> {
		const systemPrompt = buildOptimizePrompt(isPartial);

		const response = await requestUrl({
			url: `${this.config.baseUrl || PLATFORM_DEFAULTS.claude.baseUrl}/v1/messages`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.config.apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: this.config.model,
				max_tokens: this.config.maxTokens || 4096,
				system: systemPrompt,
				messages: [
					{
						role: "user",
						content: content,
					},
				],
			}),
		});

		if (response.status !== 200) {
			throw new Error(`Claude API 请求失败: ${response.status} ${response.text}`);
		}

		const data = response.json;
		const textContent = data.content
			.filter((block: { type: string }) => block.type === "text")
			.map((block: { text: string }) => block.text)
			.join("");

		return parseOptimizationResponse(textContent);
	}
}

// OpenAI 兼容格式 Provider（适用于 OpenAI、DeepSeek、千问、智谱、星火等）
export class OpenAICompatibleProvider implements AIProvider {
	private config: AIProviderConfig;
	private platform: AIPlatform;

	constructor(platform: AIPlatform, config: AIProviderConfig) {
		this.platform = platform;
		this.config = config;
	}

	async analyze(content: string, existingTags: string[] = [], existingCategories: string[] = []): Promise<AnalysisResult> {
		const systemPrompt = buildSystemPrompt(existingTags, existingCategories);
		const baseUrl = this.config.baseUrl || PLATFORM_DEFAULTS[this.platform].baseUrl;

		const response = await requestUrl({
			url: `${baseUrl}/chat/completions`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				model: this.config.model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: `请分析以下文章内容，生成合适的元数据：\n\n${content}` },
				],
				max_tokens: this.config.maxTokens || 4096,
				temperature: this.config.temperature ?? 0.7,
			}),
		});

		if (response.status !== 200) {
			throw new Error(`${PLATFORM_DEFAULTS[this.platform].name} API 请求失败: ${response.status} ${response.text}`);
		}

		const data = response.json;
		const textContent = data.choices?.[0]?.message?.content || "";

		return parseResponse(textContent);
	}

	async optimize(content: string, isPartial: boolean = false): Promise<OptimizationResult> {
		const systemPrompt = buildOptimizePrompt(isPartial);
		const baseUrl = this.config.baseUrl || PLATFORM_DEFAULTS[this.platform].baseUrl;

		const response = await requestUrl({
			url: `${baseUrl}/chat/completions`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				model: this.config.model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: content },
				],
				max_tokens: this.config.maxTokens || 4096,
				temperature: this.config.temperature ?? 0.7,
			}),
		});

		if (response.status !== 200) {
			throw new Error(`${PLATFORM_DEFAULTS[this.platform].name} API 请求失败: ${response.status} ${response.text}`);
		}

		const data = response.json;
		const textContent = data.choices?.[0]?.message?.content || "";

		return parseOptimizationResponse(textContent);
	}
}

// Provider 工厂函数
export function createAIProvider(platform: AIPlatform, config: AIProviderConfig): AIProvider {
	switch (platform) {
		case "claude":
			return new ClaudeProvider(config);
		case "openai":
		case "deepseek":
		case "qwen":
		case "zhipu":
		case "spark":
			return new OpenAICompatibleProvider(platform, config);
		default:
			throw new Error(`不支持的 AI 平台: ${String(platform)}`);
	}
}
