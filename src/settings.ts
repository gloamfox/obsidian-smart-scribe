import type { AIProviderConfig, AIPlatform } from "./ai-provider";
import { PLATFORM_DEFAULTS } from "./ai-provider";

// 各平台的配置
export interface PlatformConfigs {
	claude: AIProviderConfig;
	openai: AIProviderConfig;
	deepseek: AIProviderConfig;
	qwen: AIProviderConfig;
	zhipu: AIProviderConfig;
	spark: AIProviderConfig;
}

export interface AIMetadataSettings {
	// 当前选中的平台
	activePlatform: AIPlatform;
	// 各平台配置
	platforms: PlatformConfigs;
	// 通用设置
	maxTags: number;
	includeFolderStructure: boolean;
	customPrompt: string;
	// 界面设置
	showRibbonIcon: boolean;
	showEditorMenu: boolean;
	// 文本优化设置
	showOptimizeMenu: boolean;
	showOptimizePreview: boolean;
	// 行为设置
	showPreview: boolean;
}

const DEFAULT_PLATFORM_CONFIG: AIProviderConfig = {
	apiKey: "",
	model: "",
	baseUrl: "",
	temperature: 0.7,
	maxTokens: 4096,
};

export const DEFAULT_SETTINGS: AIMetadataSettings = {
	activePlatform: "claude",
	platforms: {
		claude: {
			...DEFAULT_PLATFORM_CONFIG,
			model: PLATFORM_DEFAULTS.claude.defaultModel,
			baseUrl: PLATFORM_DEFAULTS.claude.baseUrl,
		},
		openai: {
			...DEFAULT_PLATFORM_CONFIG,
			model: PLATFORM_DEFAULTS.openai.defaultModel,
			baseUrl: PLATFORM_DEFAULTS.openai.baseUrl,
		},
		deepseek: {
			...DEFAULT_PLATFORM_CONFIG,
			model: PLATFORM_DEFAULTS.deepseek.defaultModel,
			baseUrl: PLATFORM_DEFAULTS.deepseek.baseUrl,
		},
		qwen: {
			...DEFAULT_PLATFORM_CONFIG,
			model: PLATFORM_DEFAULTS.qwen.defaultModel,
			baseUrl: PLATFORM_DEFAULTS.qwen.baseUrl,
		},
		zhipu: {
			...DEFAULT_PLATFORM_CONFIG,
			model: PLATFORM_DEFAULTS.zhipu.defaultModel,
			baseUrl: PLATFORM_DEFAULTS.zhipu.baseUrl,
		},
		spark: {
			...DEFAULT_PLATFORM_CONFIG,
			model: PLATFORM_DEFAULTS.spark.defaultModel,
			baseUrl: PLATFORM_DEFAULTS.spark.baseUrl,
		},
	},
	maxTags: 5,
	includeFolderStructure: true,
	customPrompt: "",
	showRibbonIcon: false,
	showEditorMenu: true,
	showOptimizeMenu: true,
	showOptimizePreview: true,
	showPreview: true,
};
