import { App, PluginSettingTab, Setting } from "obsidian";
import { PLATFORM_DEFAULTS, type AIPlatform } from "../ai-provider";
import type AIMetadataPlugin from "../../main";

export class AIMetadataSettingTab extends PluginSettingTab {
	plugin: AIMetadataPlugin;
	activeTab: string = "model";

	constructor(app: App, plugin: AIMetadataPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// 创建 Tab 导航 - 参考 Enveloppe 风格
		const tabBar = containerEl.createEl("nav", { cls: "ai-settings-tab-bar" });

		// AI 模型配置 Tab
		const modelTab = tabBar.createEl("div", {
			cls: "ai-settings-tab" + (this.activeTab === "model" ? " ai-settings-tab-active" : " ai-settings-tab-inactive"),
		});

		// 图标 - 使用 createSvg 代替 innerHTML
		const modelIcon = modelTab.createEl("div", { cls: "ai-settings-tab-icon" });
		const modelSvg = modelIcon.createSvg("svg", {
			attr: {
				xmlns: "http://www.w3.org/2000/svg",
				width: "18",
				height: "18",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}
		});
		modelSvg.createSvg("path", { attr: { d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" } });

		// 文字
		modelTab.createEl("div", {
			cls: "ai-settings-tab-name",
			text: "AI 模型配置"
		});

		// 插件功能配置 Tab
		const featureTab = tabBar.createEl("div", {
			cls: "ai-settings-tab" + (this.activeTab === "feature" ? " ai-settings-tab-active" : " ai-settings-tab-inactive"),
		});

		// 图标 - 使用 createSvg 代替 innerHTML
		const featureIcon = featureTab.createEl("div", { cls: "ai-settings-tab-icon" });
		const featureSvg = featureIcon.createSvg("svg", {
			attr: {
				xmlns: "http://www.w3.org/2000/svg",
				width: "18",
				height: "18",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}
		});
		featureSvg.createSvg("circle", { attr: { cx: "12", cy: "12", r: "3" } });
		featureSvg.createSvg("path", { attr: { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" } });

		// 文字
		featureTab.createEl("div", {
			cls: "ai-settings-tab-name",
			text: "插件功能配置"
		});

		// 设置选中状态样式
		if (this.activeTab === "model") {
			modelTab.classList.add("ai-settings-tab-active");
			modelTab.classList.remove("ai-settings-tab-inactive");
			featureTab.classList.add("ai-settings-tab-inactive");
			featureTab.classList.remove("ai-settings-tab-active");
		} else {
			featureTab.classList.add("ai-settings-tab-active");
			featureTab.classList.remove("ai-settings-tab-inactive");
			modelTab.classList.add("ai-settings-tab-inactive");
			modelTab.classList.remove("ai-settings-tab-active");
		}

		// hover 效果
		modelTab.addEventListener("mouseenter", () => {
			if (this.activeTab !== "model") {
				modelTab.classList.add("ai-settings-tab-hover");
			}
		});
		modelTab.addEventListener("mouseleave", () => {
			modelTab.classList.remove("ai-settings-tab-hover");
		});

		// hover 效果
		featureTab.addEventListener("mouseenter", () => {
			if (this.activeTab !== "feature") {
				featureTab.classList.add("ai-settings-tab-hover");
			}
		});
		featureTab.addEventListener("mouseleave", () => {
			featureTab.classList.remove("ai-settings-tab-hover");
		});

		// Tab 切换事件
		modelTab.addEventListener("click", () => {
			this.activeTab = "model";
			this.display();
		});

		featureTab.addEventListener("click", () => {
			this.activeTab = "feature";
			this.display();
		});

		// 根据当前 Tab 显示对应内容
		if (this.activeTab === "model") {
			this.displayModelSettings(containerEl);
		} else {
			this.displayFeatureSettings(containerEl);
		}
	}

	displayModelSettings(containerEl: HTMLElement): void {
		// 平台选择
		new Setting(containerEl)
			.setName("AI 平台")
			.setDesc("选择要使用的 AI 平台")
			.addDropdown((dropdown) => {
				for (const [key, value] of Object.entries(PLATFORM_DEFAULTS)) {
					dropdown.addOption(key, value.name);
				}
				dropdown
					.setValue(this.plugin.settings.activePlatform)
					.onChange(async (value) => {
						this.plugin.settings.activePlatform = value as AIPlatform;
						await this.plugin.saveSettings();
						// 刷新设置面板以显示对应平台的配置
						this.display();
					});
			});

		// 当前平台的配置
		const currentPlatform = this.plugin.settings.activePlatform;
		const platformConfig = this.plugin.settings.platforms[currentPlatform];
		const platformDefaults = PLATFORM_DEFAULTS[currentPlatform];

		new Setting(containerEl)
			.setName(`${platformDefaults.name} 配置`)
			.setHeading();

		// API Key
		new Setting(containerEl)
			.setName("API key")
			.setDesc(`${platformDefaults.name} 的 API key`)
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("输入 API key...")
					.setValue(platformConfig.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].apiKey = value;
						await this.plugin.saveSettings();
					});
			});

		// 模型选择
		new Setting(containerEl)
			.setName("模型")
			.setDesc("选择使用的模型")
			.addDropdown((dropdown) => {
				for (const model of platformDefaults.models) {
					dropdown.addOption(model, model);
				}
				dropdown
					.setValue(platformConfig.model || platformDefaults.defaultModel)
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].model = value;
						await this.plugin.saveSettings();
					});
			});

		// Base URL（可选，用于自定义端点）
		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("可选，用于自定义 API 端点或代理")
			.addText((text) => {
				text
					.setPlaceholder(platformDefaults.baseUrl)
					.setValue(platformConfig.baseUrl || "")
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].baseUrl = value || platformDefaults.baseUrl;
						await this.plugin.saveSettings();
					});
			});

		// Temperature
		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("生成随机性（0-2，越低越确定）")
			.addSlider((slider) =>
				slider
					.setLimits(0, 2, 0.1)
					.setValue(platformConfig.temperature ?? 0.7)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].temperature = value;
						await this.plugin.saveSettings();
					})
			);

		// Max Tokens
		new Setting(containerEl)
			.setName("Max tokens")
			.setDesc("最大生成令牌数")
			.addSlider((slider) =>
				slider
					.setLimits(512, 8192, 512)
					.setValue(platformConfig.maxTokens || 4096)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.platforms[currentPlatform].maxTokens = value;
						await this.plugin.saveSettings();
					})
			);
	}

	displayFeatureSettings(containerEl: HTMLElement): void {
		// 笔记属性
		new Setting(containerEl)
			.setName("笔记属性设置")
			.setHeading();

		// Max Tags
		new Setting(containerEl)
			.setName("最大标签数")
			.setDesc("生成时参考的已有标签最大数量")
			.addSlider((slider) =>
				slider
					.setLimits(1, 10, 1)
					.setValue(this.plugin.settings.maxTags)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxTags = value;
						await this.plugin.saveSettings();
					})
			);

		// Include Folder Structure
		new Setting(containerEl)
			.setName("包含文件夹结构")
			.setDesc("将文件所在文件夹作为分类建议")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeFolderStructure)
					.onChange(async (value) => {
						this.plugin.settings.includeFolderStructure = value;
						await this.plugin.saveSettings();
					})
			);

		// Show Preview
		new Setting(containerEl)
			.setName("生成前显示预览")
			.setDesc("开启后，生成笔记属性时会先显示预览窗口；关闭选项则直接应用")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showPreview)
					.onChange(async (value) => {
						this.plugin.settings.showPreview = value;
						await this.plugin.saveSettings();
					})
			);

		// Show Editor Menu
		new Setting(containerEl)
			.setName("显示右键菜单")
			.setDesc("在文件浏览器和编辑器右键菜单中显示 AI 生成笔记属性选项")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showEditorMenu)
					.onChange(async (value) => {
						this.plugin.settings.showEditorMenu = value;
						await this.plugin.saveSettings();
						this.plugin.updateContextMenus();
					})
			);

		// 文本优化设置
		new Setting(containerEl)
			.setName("文本优化设置")
			.setHeading();

		// Show Optimize Preview
		new Setting(containerEl)
			.setName("优化前显示预览")
			.setDesc("开启后，优化文本前会先显示预览窗口；关闭选项则直接应用")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showOptimizePreview)
					.onChange(async (value) => {
						this.plugin.settings.showOptimizePreview = value;
						await this.plugin.saveSettings();
					})
			);

		// Show Optimize Menu
		new Setting(containerEl)
			.setName("显示优化菜单")
			.setDesc("在文件浏览器和编辑器右键菜单中显示 AI 优化文本选项")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showOptimizeMenu)
					.onChange(async (value) => {
						this.plugin.settings.showOptimizeMenu = value;
						await this.plugin.saveSettings();
						if (value) {
							this.plugin.addOptimizeContextMenus();
						} else {
							this.plugin.removeOptimizeContextMenus();
						}
					})
			);


	}
}
